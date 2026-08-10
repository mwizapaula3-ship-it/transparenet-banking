import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/fraud-engine";
import { listAlerts, updateAlertStatus } from "@/lib/fraud.functions";

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  investigating: "Investigating",
  confirmed_fraud: "Confirmed fraud",
  false_positive: "False positive",
  resolved: "Resolved",
};

const severityTone: Record<string, string> = {
  critical: "text-destructive",
  high: "text-destructive",
  medium: "text-warning",
  low: "text-muted-foreground",
};

export function AlertQueue() {
  const fetchAlerts = useServerFn(listAlerts);
  const setStatus = useServerFn(updateAlertStatus);
  const qc = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["fraud-alerts"],
    queryFn: () => fetchAlerts(),
    refetchInterval: 5000,
  });

  const mutate = useMutation({
    mutationFn: (vars: { alertId: string; status: string }) =>
      setStatus({ data: vars as never }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fraud-alerts"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Analyst alert queue</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Every reviewed or blocked payment is written to the database and lands here with its
          reasons. Dispositions are recorded to an audit trail.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading alerts…</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No alerts yet — let the live stream run for a few seconds.
          </p>
        ) : (
          <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {alerts.map((a) => {
              const tx = a.transactions;
              return (
                <li key={a.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {tx?.merchant ?? "Unknown merchant"}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {tx ? money(Number(tx.amount)) : "—"}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {tx?.customer_ref} · {tx?.country} · {tx?.channel} · {tx?.ref}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-semibold tabular-nums ${severityTone[a.severity] ?? ""}`}>
                        {Number(a.risk_score).toFixed(0)}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {a.severity}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(a.reasons as { code: string; label: string }[] | null)?.map((r) => (
                      <span key={r.code} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                        {r.label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                    <div className="ml-auto flex gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={mutate.isPending}
                        onClick={() => mutate.mutate({ alertId: a.id, status: "investigating" })}
                      >
                        Investigate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mutate.isPending}
                        onClick={() => mutate.mutate({ alertId: a.id, status: "false_positive" })}
                      >
                        False positive
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={mutate.isPending}
                        onClick={() => mutate.mutate({ alertId: a.id, status: "confirmed_fraud" })}
                      >
                        Confirm fraud
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
