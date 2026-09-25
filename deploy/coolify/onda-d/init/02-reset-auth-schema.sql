-- ============================================================
-- Repara Auth após migrations GoTrue sem search_path=auth
-- Rode no wacrm-db: psql -U postgres -d wacrm
-- Depois: Restart do Auth no Coolify
-- ============================================================

-- Tipos/tabelas que podem ter caído em public
DROP TYPE IF EXISTS public.factor_type CASCADE;
DROP TYPE IF EXISTS public.factor_status CASCADE;
DROP TYPE IF EXISTS public.aal_level CASCADE;
DROP TYPE IF EXISTS public.code_challenge_method CASCADE;
DROP TYPE IF EXISTS public.one_time_token_type CASCADE;

DROP TABLE IF EXISTS public.schema_migrations CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.refresh_tokens CASCADE;
DROP TABLE IF EXISTS public.instances CASCADE;
DROP TABLE IF EXISTS public.audit_log_entries CASCADE;
DROP TABLE IF EXISTS public.identities CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.mfa_factors CASCADE;
DROP TABLE IF EXISTS public.mfa_challenges CASCADE;
DROP TABLE IF EXISTS public.mfa_amr_claims CASCADE;
DROP TABLE IF EXISTS public.sso_providers CASCADE;
DROP TABLE IF EXISTS public.sso_domains CASCADE;
DROP TABLE IF EXISTS public.saml_providers CASCADE;
DROP TABLE IF EXISTS public.saml_relay_states CASCADE;
DROP TABLE IF EXISTS public.flow_state CASCADE;
DROP TABLE IF EXISTS public.one_time_tokens CASCADE;

-- Schema auth limpo para o GoTrue migrar de novo
DROP SCHEMA IF EXISTS auth CASCADE;
CREATE SCHEMA auth AUTHORIZATION postgres;
GRANT ALL ON SCHEMA auth TO postgres;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
