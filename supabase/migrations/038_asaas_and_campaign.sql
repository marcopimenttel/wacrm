-- ============================================================
-- 038_asaas_and_campaign.sql
--
-- 1) Billing Asaas: preço nos planos + IDs Asaas na account
-- 2) Campanha: Coordenador → Liderança → Apoiador
-- 3) Libera módulos campaign.* no plano pro
-- ============================================================

-- ------------------------------------------------------------
-- PLANOS: preços Asaas
-- ------------------------------------------------------------
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS price_monthly_brl NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS price_yearly_brl NUMERIC(10, 2) NOT NULL DEFAULT 0;

UPDATE plans SET
  price_monthly_brl = 0,
  price_yearly_brl = 0,
  description = 'Trial gratuito de 14 dias com CRM WhatsApp.'
WHERE key = 'trial';

UPDATE plans SET
  price_monthly_brl = 197.00,
  price_yearly_brl = 1970.00,
  description = 'CRM WhatsApp + módulos de campanha (coordenadores, lideranças, apoiadores).'
WHERE key = 'pro';

-- ------------------------------------------------------------
-- ACCOUNTS: espelho Asaas
-- ------------------------------------------------------------
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS asaas_invoice_url TEXT;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS billing_email TEXT;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS billing_cpf_cnpj TEXT;

CREATE INDEX IF NOT EXISTS idx_accounts_asaas_customer
  ON accounts(asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;

-- ------------------------------------------------------------
-- CAMPANHA: Coordenadores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_coordinators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_coordinators_account
  ON campaign_coordinators(account_id);

DROP TRIGGER IF EXISTS set_updated_at ON campaign_coordinators;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaign_coordinators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE campaign_coordinators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_coordinators_select ON campaign_coordinators;
CREATE POLICY campaign_coordinators_select ON campaign_coordinators FOR SELECT
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS campaign_coordinators_insert ON campaign_coordinators;
CREATE POLICY campaign_coordinators_insert ON campaign_coordinators FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS campaign_coordinators_update ON campaign_coordinators;
CREATE POLICY campaign_coordinators_update ON campaign_coordinators FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS campaign_coordinators_delete ON campaign_coordinators;
CREATE POLICY campaign_coordinators_delete ON campaign_coordinators FOR DELETE
  USING (is_account_member(account_id, 'admin'));

-- ------------------------------------------------------------
-- CAMPANHA: Lideranças (pertencem a um coordenador)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_leaderships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  coordinator_id UUID NOT NULL REFERENCES campaign_coordinators(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cpf TEXT,
  city TEXT,
  state TEXT,
  neighborhood TEXT,
  notes TEXT,
  registration_slug TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, registration_slug)
);

CREATE INDEX IF NOT EXISTS idx_campaign_leaderships_account
  ON campaign_leaderships(account_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leaderships_coordinator
  ON campaign_leaderships(coordinator_id);

DROP TRIGGER IF EXISTS set_updated_at ON campaign_leaderships;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaign_leaderships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE campaign_leaderships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_leaderships_select ON campaign_leaderships;
CREATE POLICY campaign_leaderships_select ON campaign_leaderships FOR SELECT
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS campaign_leaderships_insert ON campaign_leaderships;
CREATE POLICY campaign_leaderships_insert ON campaign_leaderships FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS campaign_leaderships_update ON campaign_leaderships;
CREATE POLICY campaign_leaderships_update ON campaign_leaderships FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS campaign_leaderships_delete ON campaign_leaderships;
CREATE POLICY campaign_leaderships_delete ON campaign_leaderships FOR DELETE
  USING (is_account_member(account_id, 'admin'));

-- ------------------------------------------------------------
-- CAMPANHA: Apoiadores (pertencem a uma liderança)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_supporters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  leadership_id UUID NOT NULL REFERENCES campaign_leaderships(id) ON DELETE RESTRICT,
  -- Ponte com o CRM WhatsApp (contacts)
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  neighborhood TEXT,
  notes TEXT,
  status_validacao TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status_validacao IN ('pendente', 'valido', 'invalido')),
  origem TEXT NOT NULL DEFAULT 'novo'
    CHECK (origem IN ('novo', 'importado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_supporters_account
  ON campaign_supporters(account_id);
CREATE INDEX IF NOT EXISTS idx_campaign_supporters_leadership
  ON campaign_supporters(leadership_id);
CREATE INDEX IF NOT EXISTS idx_campaign_supporters_contact
  ON campaign_supporters(contact_id)
  WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_supporters_phone
  ON campaign_supporters(account_id, phone);

DROP TRIGGER IF EXISTS set_updated_at ON campaign_supporters;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaign_supporters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE campaign_supporters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_supporters_select ON campaign_supporters;
CREATE POLICY campaign_supporters_select ON campaign_supporters FOR SELECT
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS campaign_supporters_insert ON campaign_supporters;
CREATE POLICY campaign_supporters_insert ON campaign_supporters FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS campaign_supporters_update ON campaign_supporters;
CREATE POLICY campaign_supporters_update ON campaign_supporters FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS campaign_supporters_delete ON campaign_supporters;
CREATE POLICY campaign_supporters_delete ON campaign_supporters FOR DELETE
  USING (is_account_member(account_id, 'admin'));

-- ------------------------------------------------------------
-- Módulos de campanha no plano pro
-- ------------------------------------------------------------
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m.module_key
FROM plans p
CROSS JOIN (
  SELECT unnest(ARRAY[
    'campaign',
    'campaign.coordinators',
    'campaign.leaderships',
    'campaign.supporters'
  ]) AS module_key
) m
WHERE p.key = 'pro'
ON CONFLICT DO NOTHING;

-- Trial também libera campanha durante o trial (produto completo para avaliar)
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m.module_key
FROM plans p
CROSS JOIN (
  SELECT unnest(ARRAY[
    'campaign',
    'campaign.coordinators',
    'campaign.leaderships',
    'campaign.supporters'
  ]) AS module_key
) m
WHERE p.key = 'trial'
ON CONFLICT DO NOTHING;
