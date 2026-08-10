import { createFileRoute } from "@tanstack/react-router";
import { LiveFeed } from "@/components/fraud/LiveFeed";
import { Simulator } from "@/components/fraud/Simulator";
import { AlertQueue } from "@/components/fraud/AlertQueue";

const title = "AI Fraud Detection for Banking Transactions";
const description =
  "A working demo of how AI scores banking transactions in real time: anomaly detection, velocity checks, impossible travel, and explainable risk decisions.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TECHNIQUES = [
  {
    name: "Anomaly detection",
    body: "Learns each customer's baseline — amounts, merchants, hours, devices — and flags statistical outliers.",
    example: "A $4,800 electronics order at 3 a.m. on an account that averages $80.",
  },
  {
    name: "Supervised classification",
    body: "Gradient-boosted trees or neural nets trained on millions of labelled transactions predict a fraud probability.",
    example: "Card-not-present + new device + gift-card merchant scores 0.91 fraud probability.",
  },
  {
    name: "Velocity & card testing",
    body: "Counts events per card, device, or IP in short windows to catch automated probing.",
    example: "Seven small authorisations in ten minutes across unrelated merchants.",
  },
  {
    name: "Graph / network analysis",
    body: "Links accounts, devices, and beneficiaries to expose mule networks that look innocent individually.",
    example: "Twelve accounts funnelling funds into one beneficiary within an hour.",
  },
  {
    name: "Behavioural biometrics",
    body: "Typing cadence, swipe pressure, and navigation patterns confirm the human behind a valid password.",
    example: "Correct credentials, but the session pastes data no genuine user ever pastes.",
  },
  {
    name: "Explainability & governance",
    body: "Regulators require reasons, not just scores, so every decision ships with ranked contributing signals.",
    example: "Blocked: impossible travel (+22), amount anomaly (+18), new device (+12).",
  },
];

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Financial crime · Machine learning
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            How AI detects fraud in banking transactions
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Fraud models learn what normal looks like for each customer, then score every payment
            against that baseline in milliseconds. Below is a working scoring engine: watch it
            triage a live stream, then move the dials yourself.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="feed-heading">
        <h2 id="feed-heading" className="sr-only">
          Live scoring demo
        </h2>
        <LiveFeed />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10" aria-labelledby="sim-heading">
        <h2 id="queue-heading" className="sr-only">
          Analyst alert queue
        </h2>
        <AlertQueue />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10" aria-labelledby="sim-heading">
        <h2 id="sim-heading" className="sr-only">
          Interactive risk simulator
        </h2>
        <Simulator />
      </section>

      <section className="border-t border-border" aria-labelledby="tech-heading">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 id="tech-heading" className="text-2xl font-semibold tracking-tight">
            The techniques behind the score
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TECHNIQUES.map((t) => (
              <article key={t.name} className="rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold">{t.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
                <p className="mt-3 border-l-2 border-border pl-3 text-xs italic text-muted-foreground">
                  {t.example}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-border bg-muted/40 p-6">
            <h3 className="text-sm font-semibold">Where it gets hard</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>
                Fraud is rare — often under 0.1% of transactions — so models must handle extreme
                class imbalance without drowning analysts in false positives.
              </li>
              <li>
                Attack patterns drift weekly, so models are retrained continuously and monitored for
                decay.
              </li>
              <li>
                Declines have real cost: blocking a genuine customer's card is its own failure,
                which is why review queues and step-up authentication sit between approve and block.
              </li>
              <li>
                Fairness and auditability are regulated — every automated decision needs reasons a
                human can defend.
              </li>
            </ul>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            All data on this page is synthetic. Transactions are scored and stored by the backend,
            and every flagged payment creates an alert with a full audit trail.
          </p>
        </div>
      </section>
    </main>
  );
}
