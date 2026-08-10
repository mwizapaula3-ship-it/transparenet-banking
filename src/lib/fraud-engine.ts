export type Channel = "card-present" | "ecommerce" | "atm" | "wire" | "mobile-wallet";

export type Transaction = {
  id: string;
  timestamp: number;
  customer: string;
  merchant: string;
  category: string;
  amount: number;
  channel: Channel;
  country: string;
  /** Customer's usual country */
  homeCountry: string;
  /** Local hour of the transaction, 0-23 */
  hour: number;
  /** Customer's 90-day average transaction amount */
  avgAmount: number;
  /** Transactions by this customer in the last 10 minutes */
  velocity10m: number;
  /** Km from the previous transaction, divided by hours elapsed */
  impossibleTravelKmh: number;
  newDevice: boolean;
  cardNotPresent: boolean;
  /** Beneficiary account first seen in the last 24h */
  newBeneficiary: boolean;
  /** Amount just below a reporting threshold (structuring) */
  nearThreshold: boolean;
};

export type Reason = {
  code: string;
  label: string;
  detail: string;
  points: number;
};

export type Decision = "approve" | "review" | "block";

export type Assessment = {
  score: number;
  decision: Decision;
  reasons: Reason[];
};

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

/**
 * A transparent, rule + statistics hybrid risk model.
 * Each signal mirrors a feature a production fraud model would learn,
 * and contributes explainable points to the final risk score.
 */
export function assess(tx: Transaction): Assessment {
  const reasons: Reason[] = [];
  const add = (code: string, label: string, detail: string, points: number) => {
    if (points > 0) reasons.push({ code, label, detail, points: Math.round(points) });
  };

  // 1. Amount anomaly — how many times the customer's normal spend
  const ratio = tx.amount / Math.max(tx.avgAmount, 1);
  if (ratio > 2) {
    add(
      "AMT_ANOM",
      "Amount anomaly",
      `${ratio.toFixed(1)}x the customer's 90-day average of ${money(tx.avgAmount)}`,
      Math.min(28, (ratio - 2) * 7 + 6),
    );
  }

  // 2. Geo anomaly
  if (tx.country !== tx.homeCountry) {
    add(
      "GEO",
      "Out-of-pattern geography",
      `Transaction in ${tx.country}, customer normally transacts in ${tx.homeCountry}`,
      14,
    );
  }

  // 3. Impossible travel
  if (tx.impossibleTravelKmh > 900) {
    add(
      "TRAVEL",
      "Impossible travel",
      `Implied speed of ${Math.round(tx.impossibleTravelKmh)} km/h since the previous transaction`,
      22,
    );
  }

  // 4. Velocity / card testing
  if (tx.velocity10m >= 4) {
    add(
      "VELOCITY",
      "Transaction velocity",
      `${tx.velocity10m} transactions in the last 10 minutes (card-testing pattern)`,
      Math.min(24, 8 + (tx.velocity10m - 4) * 4),
    );
  }

  // 5. Odd hour
  if (tx.hour >= 1 && tx.hour <= 5) {
    add("HOUR", "Unusual hour", `Executed at ${String(tx.hour).padStart(2, "0")}:00 local time`, 8);
  }

  // 6. New device
  if (tx.newDevice) {
    add("DEVICE", "Unrecognised device", "Device fingerprint never seen on this account", 12);
  }

  // 7. Card-not-present in high-risk category
  if (tx.cardNotPresent && HIGH_RISK_CATEGORIES.includes(tx.category)) {
    add(
      "CNP_MCC",
      "High-risk card-not-present",
      `Online purchase in a high-chargeback category (${tx.category})`,
      10,
    );
  }

  // 8. New beneficiary on a large transfer
  if (tx.newBeneficiary && tx.amount > 1000) {
    add(
      "NEW_BENE",
      "New beneficiary, large transfer",
      `${money(tx.amount)} to an account first seen in the last 24 hours`,
      16,
    );
  }

  // 9. Structuring
  if (tx.nearThreshold) {
    add(
      "STRUCTURING",
      "Possible structuring",
      "Amount sits just below the regulatory reporting threshold",
      15,
    );
  }

  // 10. Trusted-pattern credit — a familiar merchant reduces risk
  const trusted = TRUSTED_MERCHANTS.includes(tx.merchant) && tx.country === tx.homeCountry;

  let score = reasons.reduce((sum, r) => sum + r.points, 0);
  if (trusted) score -= 10;

  // Compounding: several independent weak signals are stronger together
  if (reasons.length >= 3) score += (reasons.length - 2) * 4;

  score = clamp(score);

  const decision: Decision = score >= 70 ? "block" : score >= 40 ? "review" : "approve";
  reasons.sort((a, b) => b.points - a.points);

  return { score, decision, reasons };
}

export const HIGH_RISK_CATEGORIES = ["Electronics", "Crypto", "Gift Cards", "Gambling"];
const TRUSTED_MERCHANTS = ["Woolworths", "Shell", "Uber", "Spotify", "City Transit"];

export function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export const decisionLabel: Record<Decision, string> = {
  approve: "Approved",
  review: "Manual review",
  block: "Blocked",
};

/* ----------------------------- demo generator ----------------------------- */

type Persona = {
  customer: string;
  homeCountry: string;
  avgAmount: number;
};

const PERSONAS: Persona[] = [
  { customer: "A. Mokoena", homeCountry: "ZA", avgAmount: 62 },
  { customer: "J. Rivera", homeCountry: "US", avgAmount: 140 },
  { customer: "L. Chen", homeCountry: "SG", avgAmount: 210 },
  { customer: "M. Dubois", homeCountry: "FR", avgAmount: 95 },
  { customer: "S. Patel", homeCountry: "IN", avgAmount: 48 },
];

const NORMAL_MERCHANTS = [
  ["Woolworths", "Groceries"],
  ["Shell", "Fuel"],
  ["Uber", "Transport"],
  ["Spotify", "Subscriptions"],
  ["City Transit", "Transport"],
  ["Cafe Lumen", "Dining"],
];

const RISKY_MERCHANTS = [
  ["ByteMart Online", "Electronics"],
  ["CoinSwift", "Crypto"],
  ["GiftCardHub", "Gift Cards"],
  ["LuckySpin", "Gambling"],
];

const FOREIGN = ["RU", "NG", "BR", "UA", "TR", "VN"];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

let counter = 0;

/** Generates a plausible transaction; roughly 1 in 4 is fraud-flavoured. */
export function generateTransaction(fraudBias = 0.28): Transaction {
  const p = pick(PERSONAS);
  const fraud = Math.random() < fraudBias;
  counter += 1;
  const id = `TX-${(100000 + counter * 7 + Math.floor(Math.random() * 900)).toString()}`;
  const now = Date.now();

  if (!fraud) {
    const [merchant, category] = pick(NORMAL_MERCHANTS) as [string, string];
    return {
      id,
      timestamp: now,
      customer: p.customer,
      merchant,
      category,
      amount: Math.round(rand(0.3, 1.8) * p.avgAmount),
      channel: pick<Channel>(["card-present", "ecommerce", "mobile-wallet"]),
      country: p.homeCountry,
      homeCountry: p.homeCountry,
      hour: Math.floor(rand(7, 22)),
      avgAmount: p.avgAmount,
      velocity10m: Math.floor(rand(1, 3)),
      impossibleTravelKmh: Math.round(rand(0, 90)),
      newDevice: Math.random() < 0.08,
      cardNotPresent: Math.random() < 0.4,
      newBeneficiary: false,
      nearThreshold: false,
    };
  }

  const [merchant, category] = pick(RISKY_MERCHANTS) as [string, string];
  return {
    id,
    timestamp: now,
    customer: p.customer,
    merchant,
    category,
    amount: Math.round(rand(4, 30) * p.avgAmount),
    channel: pick<Channel>(["ecommerce", "wire", "atm"]),
    country: Math.random() < 0.75 ? pick(FOREIGN) : p.homeCountry,
    homeCountry: p.homeCountry,
    hour: Math.floor(rand(1, 6)),
    avgAmount: p.avgAmount,
    velocity10m: Math.floor(rand(3, 9)),
    impossibleTravelKmh: Math.random() < 0.6 ? Math.round(rand(950, 2400)) : Math.round(rand(0, 200)),
    newDevice: Math.random() < 0.8,
    cardNotPresent: true,
    newBeneficiary: Math.random() < 0.6,
    nearThreshold: Math.random() < 0.3,
  };
}

/** Deterministic starter set so the first render is never empty. */
export function seedTransactions(count = 6): Transaction[] {
  return Array.from({ length: count }, (_, i) =>
    generateTransaction(i % 3 === 0 ? 1 : 0),
  ).map((tx, i) => ({ ...tx, timestamp: Date.now() - (count - i) * 9000 }));
}