import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, AlertTriangle } from "lucide-react";
import { money, type Assessment, type Transaction } from "@/lib/fraud-engine";

type Scored = { tx: Transaction; result: Assessment };

function narrative(tx: Transaction, result: Assessment) {
  const top = [...result.reasons].sort((a, b) => b.points - a.points);
  const lead = top[0];
  const rest = top.slice(1, 3).map((r) => r.label.toLowerCase());
  const base = `This ${money(tx.amount)} ${tx.channel} payment to ${tx.merchant} scored ${result.score}/100, above the block threshold of 70.`;
  if (!lead) return `${base} The score came from combined weak signals rather than one dominant driver.`;
  const also = rest.length ? ` It was compounded by ${rest.join(" and ")}.` : "";
  return `${base} The dominant driver was ${lead.label.toLowerCase()} (+${lead.points}): ${lead.detail}${also} Because the combined evidence crossed the block band, the payment was stopped before settlement and an alert was queued for an analyst.`;
}

export function BlockedExplained({ rows }: { rows: Scored[] }) {
  const blocked = rows.filter((r) => r.result.decision === "block").slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldX className="h-4 w-4 text-destructive" />
          Why these payments were blocked
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          A plain-English explanation for every blocked transaction: what fired, how much it
          added, and why the total crossed the threshold.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {blocked.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing blocked yet. As the stream runs, any payment scoring 70 or above appears here
            with a full breakdown.
          </p>
        ) : (
          blocked.map(({ tx, result }) => (
            <div key={tx.id} className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {money(tx.amount)} · {tx.merchant}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tx.customer} · {tx.country} · {tx.channel} ·{" "}
                    <span className="font-mono">{tx.id}</span>
                  </p>
                </div>
                <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground tabular-nums">
                  risk {result.score}/100
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed">{narrative(tx, result)}</p>

              {result.reasons.length > 0 && (
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {[...result.reasons]
                    .sort((a, b) => b.points - a.points)
                    .map((r) => (
                      <li
                        key={r.code}
                        className="flex items-start gap-2 rounded-md border border-border bg-background/70 px-2.5 py-2"
                      >
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                        <span className="text-xs">
                          <span className="font-medium">{r.label}</span>{" "}
                          <span className="font-mono text-muted-foreground">+{r.points}</span>
                          <span className="block text-muted-foreground">{r.detail}</span>
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
