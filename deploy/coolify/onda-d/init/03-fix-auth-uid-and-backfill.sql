-- Onda D — corrige auth.uid()/auth.role()/auth.jwt() para PostgREST 12
-- (que envia request.jwt.claims em JSON) e cria account/profile para
-- usuários que ficaram sem vínculo. Idempotente: pode rodar várias vezes.
-- Rodar no terminal do wacrm-db: psql -U postgres -d wacrm -f <arquivo>
-- ou colar o conteúdo dentro do psql.

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  )::text;
$$;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')
  )::jsonb;
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.role(), auth.jwt()
  TO anon, authenticated, service_role;

-- Grants nas tabelas do public (RLS continua filtrando as linhas)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Garante o trigger de signup em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: usuários sem profile vinculado a uma account
DO $$
DECLARE
  u RECORD;
  v_plan_id UUID;
  v_account_id UUID;
  v_name TEXT;
BEGIN
  SELECT id INTO v_plan_id FROM public.plans WHERE key = 'trial' AND is_active LIMIT 1;
  IF v_plan_id IS NULL THEN
    SELECT id INTO v_plan_id FROM public.plans WHERE key = 'pro' AND is_active LIMIT 1;
  END IF;

  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    WHERE p.user_id IS NULL OR p.account_id IS NULL OR p.account_role IS NULL
  LOOP
    v_name := COALESCE(u.raw_user_meta_data->>'full_name', '');

    SELECT id INTO v_account_id FROM public.accounts
      WHERE owner_user_id = u.id ORDER BY created_at LIMIT 1;

    IF v_account_id IS NULL THEN
      INSERT INTO public.accounts (name, owner_user_id, plan_id, subscription_status, trial_ends_at)
      VALUES (COALESCE(NULLIF(v_name, ''), u.email, 'My account'), u.id, v_plan_id,
              'trial', NOW() + INTERVAL '14 days')
      RETURNING id INTO v_account_id;
    END IF;

    INSERT INTO public.profiles (user_id, full_name, email, account_id, account_role)
    VALUES (u.id, v_name, u.email, v_account_id, 'owner')
    ON CONFLICT (user_id) DO UPDATE
      SET account_id = EXCLUDED.account_id,
          account_role = COALESCE(public.profiles.account_role, 'owner'),
          email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email);

    RAISE NOTICE 'Vinculado usuário % (%) à account %', u.email, u.id, v_account_id;
  END LOOP;
END $$;

-- Conferência
SELECT p.user_id, p.email, p.account_id, p.account_role, a.name AS account_name
FROM public.profiles p
LEFT JOIN public.accounts a ON a.id = p.account_id;
