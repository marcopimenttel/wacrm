-- ============================================================
-- 040_saas_commercial.sql — SaaS comercial completo
--
-- Sprint 1–5: bloqueio, quotas, override de módulos, white-label
-- plataforma e branding por tenant. Compatível com Postgres
-- self-hosted (Coolify) e com Supabase Cloud.
-- ============================================================

-- ------------------------------------------------------------
-- Status blocked (superadmin / operacional)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'subscription_status_enum' AND e.enumlabel = 'blocked'
  ) THEN
    ALTER TYPE subscription_status_enum ADD VALUE 'blocked';
  END IF;
END $$;

-- ------------------------------------------------------------
-- Planos: trial_days + quotas
-- ------------------------------------------------------------
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS trial_days INT NOT NULL DEFAULT 14;

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS max_supporters INT;

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS max_leaderships INT;

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS max_team_members INT;

UPDATE plans SET trial_days = 14
WHERE key = 'trial' AND trial_days IS DISTINCT FROM 14;

UPDATE plans SET
  trial_days = 14,
  max_supporters = 5000,
  max_leaderships = 200,
  max_team_members = 20
WHERE key = 'pro';

-- ------------------------------------------------------------
-- Override de módulos por tenant (TenantModule)
-- enabled=true força liberar; enabled=false força negar
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_modules (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_account_modules_account
  ON account_modules(account_id);

ALTER TABLE account_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_modules_select ON account_modules;
CREATE POLICY account_modules_select ON account_modules FOR SELECT
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS account_modules_service ON account_modules;
CREATE POLICY account_modules_service ON account_modules FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- ------------------------------------------------------------
-- White-label / dados comerciais por tenant
-- ------------------------------------------------------------
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#2563eb';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS candidate_ballot_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS candidate_full_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS candidate_party TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS candidate_uf TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS candidate_office TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS candidate_number TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS notes_internal TEXT;

-- ------------------------------------------------------------
-- GlobalSettings (singleton da plataforma — só superadmin)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'WACRM',
  login_title TEXT NOT NULL DEFAULT 'Bem-vindo de volta',
  login_subtitle TEXT NOT NULL DEFAULT 'Entre para gerenciar sua campanha.',
  login_promo_title TEXT NOT NULL DEFAULT 'Tecnologia a serviço da estratégia política.',
  footer_text TEXT NOT NULL DEFAULT '© WACRM — Todos os direitos reservados.',
  login_logo_url TEXT,
  sidebar_logo_url TEXT,
  sidebar_logo_collapsed_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  login_background_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#2563eb',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Leitura pública (login/branding) — qualquer autenticado ou anon via API pública
DROP POLICY IF EXISTS platform_settings_select ON platform_settings;
CREATE POLICY platform_settings_select ON platform_settings FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS platform_settings_service ON platform_settings;
CREATE POLICY platform_settings_service ON platform_settings FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- ------------------------------------------------------------
-- Admins de plataforma no banco (além do .env)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_admins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_admins_service ON platform_admins;
CREATE POLICY platform_admins_service ON platform_admins FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

COMMENT ON TABLE account_modules IS 'Override de módulos por tenant (forçar on/off).';
COMMENT ON TABLE platform_settings IS 'White-label global do SaaS (GlobalSettings).';
COMMENT ON TABLE platform_admins IS 'E-mails superadmin persistidos (complementa PLATFORM_ADMIN_EMAILS).';
