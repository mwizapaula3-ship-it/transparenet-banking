DROP POLICY IF EXISTS "Public demo alert events are viewable" ON public.alert_events;
DROP POLICY IF EXISTS "Public demo alerts are viewable" ON public.fraud_alerts;
DROP POLICY IF EXISTS "Public demo transactions are viewable" ON public.transactions;

REVOKE ALL ON public.alert_events FROM anon, authenticated;
REVOKE ALL ON public.fraud_alerts FROM anon, authenticated;
REVOKE ALL ON public.transactions FROM anon, authenticated;

GRANT ALL ON public.alert_events TO service_role;
GRANT ALL ON public.fraud_alerts TO service_role;
GRANT ALL ON public.transactions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.alert_events_id_seq TO service_role;