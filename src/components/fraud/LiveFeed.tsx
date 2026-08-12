import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskPill, ScoreBar } from "./RiskPill";
import { BlockedExplained } from "./BlockedExplained";
import { scoreTransaction } from "@/lib/fraud.functions";
import {
  assess,
  generateTransaction,
  money,
  seedTransactions,
  type Assessment,
  type Transaction,
} from "@/lib/fraud-engine";

type Scored = { tx: Transaction; result: Assessment };

export function LiveFeed() {
  const [rows, setRows] = useState<Scored[]>(() =>
    seedTransactions().map((tx) => ({ tx, result: assess(tx) })),
  );
  const [running, setRunning] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const score = useServerFn(scoreTransaction);
  const qc = useQueryClient();

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => {
      const { timestamp: _ts, ...payload } = generateTransaction();
      const tx = { ...payload, timestamp: _ts } as Transaction;
      setRows((prev) => [{ tx, result: assess(tx) }, ...prev].slice(0, 25));
      // Persist through the backend: it re-scores server-side and opens an alert.
      void score({ data: payload })
        .then((res) => {
          setRows((prev) =>
            prev.map((r) =>
              r.tx.id === tx.id
                ? { tx: r.tx, result: { score: res.score, decision: res.decision, reasons: res.reasons } }
                : r,
            ),
          );
          if (res.decision !== "approve") {
            void qc.invalidateQueries({ queryKey: ["fraud-alerts"] });
          }
        })
        .catch(() => {
          /* keep the client-side score if the backend is unreachable */
        });
    }, 2200);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, score, qc]);

  const stats = useMemo(() => {
    const blocked = rows.filter((r) => r.result.decision === "block").length;
    const review = rows.filter((r) => r.result.decision === "review").length;
    const value = rows
      .filter((r) => r.result.decision === "block")
      .reduce((s, r) => s + r.tx.amount, 0);
    return { blocked, review, approved: rows.length - blocked - review, value };
  }, [rows]);

  const active = rows.find((r) => r.tx.id === selected) ?? rows[0];

  return (
    <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Live transaction stream</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Every payment is scored in real time. Click a row to see why.
            </p>
          </div>
          <Button size="sm" variant={running ? "secondary" : "default"} onClick={() => setRunning((r) => !r)}>
            {running ? "Pause stream" : "Resume stream"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-4 gap-2 pb-2 text-center">
            <Stat label="Scored" value={String(rows.length)} />
            <Stat label="Approved" value={String(stats.approved)} tone="text-success" />
            <Stat label="Review" value={String(stats.review)} tone="text-warning" />
            <Stat label="Blocked" value={String(stats.blocked)} tone="text-destructive" />
          </div>
          <div className="max-h-[460px] space-y-1.5 overflow-y-auto pr-1">
            {rows.map(({ tx, result }) => (
              <button
                key={tx.id}
                onClick={() => setSelected(tx.id)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-accent ${
                  active?.tx.id === tx.id ? "border-ring bg-accent" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{tx.merchant}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tx.customer} · {tx.country} · {tx.channel}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{money(tx.amount)}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      risk {result.score}
                    </p>
                  </div>
                  <RiskPill decision={result.decision} />
                </div>
                <div className="mt-2">
                  <ScoreBar score={result.score} decision={result.decision} />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Why this decision</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Model explainability: the signals that moved the score.
          </p>
        </CardHeader>
        <CardContent>
          {active ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{active.tx.id}</span>
                  <RiskPill decision={active.result.decision} />
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {active.result.score}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/ 100 risk</span>
                </p>
                <div className="mt-2">
                  <ScoreBar score={active.result.score} decision={active.result.decision} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {money(active.tx.amount)} at {active.tx.merchant} ({active.tx.category}) ·{" "}
                  {active.tx.customer} · {String(active.tx.hour).padStart(2, "0")}:00 local
                </p>
              </div>

              {active.result.reasons.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No risk signals fired. The transaction matches this customer's established
                  behaviour, so it clears straight through.
                </p>
              ) : (
                <ul className="space-y-2">
                  {active.result.reasons.map((r) => (
                    <li key={r.code} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{r.label}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums">
                          +{r.points}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
    <BlockedExplained rows={rows} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border py-2">
      <p className={`text-lg font-semibold tabular-nums ${tone ?? ""}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}