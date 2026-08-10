import { cn } from "@/lib/utils";
import { decisionLabel, type Decision } from "@/lib/fraud-engine";

const styles: Record<Decision, string> = {
  approve: "bg-success/15 text-success border-success/30",
  review: "bg-warning/20 text-warning border-warning/40",
  block: "bg-destructive/15 text-destructive border-destructive/30",
};

export function RiskPill({ decision, className }: { decision: Decision; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[decision],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {decisionLabel[decision]}
    </span>
  );
}

export function ScoreBar({ score, decision }: { score: number; decision: Decision }) {
  const color =
    decision === "block" ? "bg-destructive" : decision === "review" ? "bg-warning" : "bg-success";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}