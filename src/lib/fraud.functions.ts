import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assess, type Transaction } from "@/lib/fraud-engine";

const TxInput = z.object({
  id: z.string().min(1).max(64),
  customer: z.string().min(1).max(120),
  merchant: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  amount: z.number().min(0).max(10_000_000),
  channel: z.enum(["card-present", "ecommerce", "atm", "wire", "mobile-wallet"]),
  country: z.string().length(2),
  homeCountry: z.string().length(2),
  hour: z.number().int().min(0).max(23),
  avgAmount: z.number().min(0).max(10_000_000),
  velocity10m: z.number().int().min(0).max(1000),
  impossibleTravelKmh: z.number().min(0).max(100_000),
  newDevice: z.boolean(),
  cardNotPresent: z.boolean(),
  newBeneficiary: z.boolean(),
  nearThreshold: z.boolean(),
});

const severityFor = (score: number) =>
  score >= 85 ? "critical" : score >= 70 ? "high" : "medium";

/** Scores a transaction server-side, persists it, and opens an alert when needed. */
export const scoreTransaction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TxInput.parse(input))
  .handler(async ({ data }) => {
    const result = assess({ ...data, timestamp: Date.now() } as Transaction);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tx, error } = await supabaseAdmin
      .from("transactions")
      .insert({
        ref: data.id,
        customer_ref: data.customer,
        merchant: data.merchant,
        category: data.category,
        amount: data.amount,
        channel: data.channel,
        country: data.country,
        home_country: data.homeCountry,
        risk_score: result.score,
        decision: result.decision,
        features: data,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (result.decision !== "approve") {
      const { error: alertError } = await supabaseAdmin.from("fraud_alerts").insert({
        transaction_id: tx.id,
        severity: severityFor(result.score),
        risk_score: result.score,
        reasons: result.reasons,
      });
      if (alertError) throw new Error(alertError.message);
    }

    return { transactionId: tx.id, ...result };
  });

/** Open + in-progress alerts joined with their transaction, highest risk first. */
export const listAlerts = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("fraud_alerts")
    .select(
      "id, severity, risk_score, reasons, status, created_at, transactions(ref, merchant, category, amount, country, channel, customer_ref)",
    )
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw new Error(error.message);
  return data ?? [];
});

const StatusInput = z.object({
  alertId: z.string().uuid(),
  status: z.enum(["open", "investigating", "confirmed_fraud", "false_positive", "resolved"]),
});

/** Analyst disposition — records the change and writes an audit event. */
export const updateAlertStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => StatusInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current } = await supabaseAdmin
      .from("fraud_alerts")
      .select("status")
      .eq("id", data.alertId)
      .single();

    const closed = data.status === "confirmed_fraud" || data.status === "false_positive" || data.status === "resolved";
    const { error } = await supabaseAdmin
      .from("fraud_alerts")
      .update({ status: data.status, resolved_at: closed ? new Date().toISOString() : null })
      .eq("id", data.alertId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("alert_events").insert({
      alert_id: data.alertId,
      from_status: current?.status ?? null,
      to_status: data.status,
    });

    return { ok: true };
  });
