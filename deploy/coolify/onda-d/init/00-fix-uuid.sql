-- ============================================================
-- Pré-migrations: libera uuid-ossp no supabase/postgres (Coolify)
-- ============================================================

-- Necessário para o hook CREATE EXTENSION do supabase/postgres
DO $$
BEGIN
  BEGIN
    EXECUTE 'GRANT pg_read_server_files TO CURRENT_USER';
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;
END $$;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- uuid-ossp (pode falhar no hook; o fallback abaixo cobre)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'uuid-ossp via extension falhou: %', SQLERRM;
END $$;

-- Fallback: mesmo nome que as migrations usam
CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS uuid
LANGUAGE sql
VOLATILE
AS $$
  SELECT gen_random_uuid();
$$;
