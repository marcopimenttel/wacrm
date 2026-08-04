-- ============================================================
-- 037_saas_foundation.sql — Espinha SaaS comercial (planos + módulos)
--
-- Base comercial multi-tenant sem alterar o CRM existente:
--   * catálogo plans + plan_modules
--   * accounts.subscription_status / plan_id / trial_ends_at
--   * plano "pro" padrão com todos os módulos WhatsApp ligados
--   * novos cadastros começam em trial (14 dias)
--
-- Módulos políticos futuros (lideranças, apoiadores, demandas, …)
-- ficam documentados, mas NÃO entram em plan_modules até existirem.
-- ============================================================

-- ------------------------------------------------------------
-- ENUM
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_enum') THEN
    CREATE TYPE subscription_status_enum AS ENUM (
      'trial',
      'active',
      'past_due',
      'canceled'
    );
  END IF;
END $$;

-- ------------------------------------------------------------
-- PLANOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_updated_at ON plans;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_select_authenticated ON plans;
CREATE POLICY plans_select_authenticated ON plans
  FOR SELECT TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS plans_select_service ON plans;
CREATE POLICY plans_select_service ON plans
  FOR SELECT TO service_role
  USING (TRUE);

-- ------------------------------------------------------------
-- MÓDULOS POR PLANO
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_modules (
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  PRIMARY KEY (plan_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_plan_modules_key ON plan_modules(module_key);

ALTER TABLE plan_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_modules_select_authenticated ON plan_modules;
CREATE POLICY plan_modules_select_authenticated ON plan_modules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plans p
      WHERE p.id = plan_modules.plan_id AND p.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS plan_modules_select_service ON plan_modules;
CREATE POLICY plan_modules_select_service ON plan_modules
  FOR SELECT TO service_role
  USING (TRUE);

-- ------------------------------------------------------------
-- COLUNAS SaaS EM ACCOUNTS
-- ------------------------------------------------------------
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id) ON DELETE SET NULL;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS subscription_status subscription_status_enum
    NOT NULL DEFAULT 'trial';

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_accounts_plan_id ON accounts(plan_id);
CREATE INDEX IF NOT EXISTS idx_accounts_subscription_status
  ON accounts(subscription_status);

-- ------------------------------------------------------------
-- SEED: PLANOS + MÓDULOS
-- ------------------------------------------------------------
INSERT INTO plans (id, key, name, description, sort_order)
VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'trial',
    'Trial',
    'Trial de 14 dias com módulos do CRM WhatsApp.',
    10
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'pro',
    'Pro',
    'CRM WhatsApp completo. Módulos políticos liberam conforme forem lançados.',
    20
  )
ON CONFLICT (key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

-- Chaves de módulo ativas hoje em trial + pro
WITH mods AS (
  SELECT unnest(ARRAY[
    'whatsapp',
    'whatsapp.dashboard',
    'whatsapp.inbox',
    'whatsapp.notifications',
    'whatsapp.contacts',
    'whatsapp.pipelines',
    'whatsapp.broadcasts',
    'whatsapp.automations',
    'whatsapp.flows',
    'whatsapp.agents'
  ]) AS module_key
),
plan_ids AS (
  SELECT id FROM plans WHERE key IN ('trial', 'pro')
)
INSERT INTO plan_modules (plan_id, module_key)
SELECT p.id, m.module_key
FROM plan_ids p
CROSS JOIN mods m
ON CONFLICT DO NOTHING;

-- Chaves políticas (roadmap) — ainda NÃO inseridas em plan_modules:
--   campaign.leaderships
--   campaign.supporters
--   campaign.demands
--   campaign.goals
--   campaign.agenda
--   campaign.stock
--   campaign.finance
--   campaign.tse

-- Contas existentes → pro + active (já usam o app).
UPDATE accounts
SET
  plan_id = COALESCE(plan_id, 'a0000000-0000-4000-8000-000000000002'),
  subscription_status = CASE
    WHEN subscription_status = 'trial' AND plan_id IS NULL THEN 'active'::subscription_status_enum
    ELSE subscription_status
  END
WHERE plan_id IS NULL;

-- ------------------------------------------------------------
-- SIGNUP: bootstrap em trial
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_account_id UUID;
  v_plan_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  SELECT id INTO v_plan_id FROM plans WHERE key = 'trial' AND is_active LIMIT 1;
  IF v_plan_id IS NULL THEN
    SELECT id INTO v_plan_id FROM plans WHERE key = 'pro' AND is_active LIMIT 1;
  END IF;

  INSERT INTO public.accounts (
    name,
    owner_user_id,
    plan_id,
    subscription_status,
    trial_ends_at
  )
  VALUES (
    COALESCE(NULLIF(v_full_name, ''), NEW.email, 'My account'),
    NEW.id,
    v_plan_id,
    'trial',
    NOW() + INTERVAL '14 days'
  )
  RETURNING id INTO v_account_id;

  INSERT INTO public.profiles (user_id, full_name, email, account_id, account_role)
  VALUES (NEW.id, v_full_name, NEW.email, v_account_id, 'owner');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Falha ao criar account/profile do usuário %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
