-- ============================================================
-- 041_asaas_webhook_events.sql
-- Log + idempotência dos webhooks Asaas (Onda B).
-- ============================================================

CREATE TABLE IF NOT EXISTS asaas_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Chave estável: id do evento Asaas, ou event:paymentId / event:subscriptionId
  idempotency_key TEXT NOT NULL,
  event TEXT NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  payment_id TEXT,
  subscription_id TEXT,
  customer_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'processed'
    CHECK (status IN ('processed', 'ignored', 'missing_account', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT asaas_webhook_events_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_asaas_webhook_events_account
  ON asaas_webhook_events(account_id);

CREATE INDEX IF NOT EXISTS idx_asaas_webhook_events_created
  ON asaas_webhook_events(created_at DESC);

ALTER TABLE asaas_webhook_events ENABLE ROW LEVEL SECURITY;

-- Só service_role (webhook) escreve/lê; tenants não veem eventos de cobrança.
DROP POLICY IF EXISTS asaas_webhook_events_service ON asaas_webhook_events;
CREATE POLICY asaas_webhook_events_service ON asaas_webhook_events
  FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);
