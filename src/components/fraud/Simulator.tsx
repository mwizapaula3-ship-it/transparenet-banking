import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RiskPill, ScoreBar } from "./RiskPill";
import { assess, money, type Transaction } from "@/lib/fraud-engine";

const base: Transaction = {
  id: "TX-SANDBOX",
  timestamp: Date.now(),
  customer: "A. Mokoena",
  merchant: "ByteMart Online",
  category: "Electronics",
  amount: 250,
  channel: "ecommerce",
  country: "ZA",
  homeCountry: "ZA",
  hour: 14,
  avgAmount: 80,
  velocity10m: 1,
  impossibleTravelKmh: 40,
  newDevice: false,
  cardNotPresent: true,
  newBeneficiary: false,
  nearThreshold: false,
};

export function Simulator() {
  const [tx, setTx] = useState<Transaction>(base);
  const result = useMemo(() => assess(tx), [tx]);
  const set = <K extends keyof Transaction>(key: K, value: Transaction[K]) =>
    setTx((prev) => ({ ...prev, [key]: value }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Try it yourself</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Change the signals and watch the risk score respond instantly.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setTx(base)}>
          Reset
        </Button>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <Label>Amount</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {money(tx.amount)} · avg {money(tx.avgAmount)}
              </span>
            </div>
            <Slider
              className="mt-3"
              min={10}
              max={9000}
              step={10}
              value={[tx.amount]}
              onValueChange={([v]) => set("amount", v ?? 10)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Transactions in last 10 min</Label>
              <span className="text-sm tabular-nums text-muted-foreground">{tx.velocity10m}</span>
            </div>
            <Slider
              className="mt-3"
              min={1}
              max={12}
              step={1}
              value={[tx.velocity10m]}
              onValueChange={([v]) => set("velocity10m", v ?? 1)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Local hour</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {String(tx.hour).padStart(2, "0")}:00
              </span>
            </div>
            <Slider
              className="mt-3"
              min={0}
              max={23}
              step={1}
              value={[tx.hour]}
              onValueChange={([v]) => set("hour", v ?? 0)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Implied travel speed</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {tx.impossibleTravelKmh} km/h
              </span>
            </div>
            <Slider
              className="mt-3"
              min={0}
              max={2500}
              step={50}
              value={[tx.impossibleTravelKmh]}
              onValueChange={([v]) => set("impossibleTravelKmh", v ?? 0)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              label="Foreign country"
              checked={tx.country !== tx.homeCountry}
              onChange={(c) => set("country", c ? "RU" : tx.homeCountry)}
            />
            <Toggle
              label="New device"
              checked={tx.newDevice}
              onChange={(c) => set("newDevice", c)}
            />
            <Toggle
              label="New beneficiary"
              checked={tx.newBeneficiary}
              onChange={(c) => set("newBeneficiary", c)}
            />
            <Toggle
              label="Just below threshold"
              checked={tx.nearThreshold}
              onChange={(c) => set("nearThreshold", c)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk score</span>
              <RiskPill decision={result.decision} />
            </div>
            <p className="mt-2 text-4xl font-semibold tabular-nums">{result.score}</p>
            <div className="mt-3">
              <ScoreBar score={result.score} decision={result.decision} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Thresholds: under 40 approve · 40–69 manual review · 70+ block
            </p>
          </div>

          {result.reasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No signals fired — this looks like ordinary behaviour for the customer.
            </p>
          ) : (
            <ul className="space-y-2">
              {result.reasons.map((r) => (
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
      </CardContent>
    </Card>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}