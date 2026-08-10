CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  customer_ref text NOT NULL,
  merchant text NOT NULL,
  category text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL DEFAULT 'USD',
  channel text NOT NULL,
  country char(2) NOT NULL,
  home_country char(2),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  risk_score numeric(5,2) NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  decision text NOT NULL CHECK (decision IN ('approve','review','block')),
  model_version text NOT NULL DEFAULT 'rules-v1',
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO anon, authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public demo transactions are viewable" ON public.transactions FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX transactions_occurred_at_idx ON public.transactions (occurred_at DESC);
CREATE INDEX transactions_decision_idx ON public.transactions (decision) WHERE decision <> 'approve';

CREATE TABLE public.fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  risk_score numeric(5,2) NOT NULL,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','confirmed_fraud','false_positive','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT ON public.fraud_alerts TO anon, authenticated;
GRANT ALL ON public.fraud_alerts TO service_role;
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public demo alerts are viewable" ON public.fraud_alerts FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX fraud_alerts_status_idx ON public.fraud_alerts (status, risk_score DESC);

CREATE TABLE public.alert_events (
  id bigserial PRIMARY KEY,
  alert_id uuid NOT NULL REFERENCES public.fraud_alerts(id) ON DELETE CASCADE,
  actor text NOT NULL DEFAULT 'demo-analyst',
  from_status text,
  to_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.alert_events TO anon, authenticated;
GRANT ALL ON public.alert_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.alert_events_id_seq TO service_role;
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public demo alert events are viewable" ON public.alert_events FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX alert_events_alert_idx ON public.alert_events (alert_id, created_at DESC);