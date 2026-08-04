-- ============================================================
-- 039_campaign_leadership_supporter_full.sql
--
-- Expande Lideranças/Apoiadores aos campos do O Candidato,
-- catálogos (segmentos, bandeiras, etc.), zonas por conta (BR),
-- familiares, slug da account para links públicos e RLS
-- escopada quando o usuário é a própria liderança.
-- ============================================================

-- ------------------------------------------------------------
-- ACCOUNT: slug para URLs públicas
-- ------------------------------------------------------------
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Slug inicial a partir do nome (transliteração simples sem extensão unaccent)
UPDATE accounts
SET slug = lower(regexp_replace(
  regexp_replace(
    translate(
      coalesce(name, id::text),
      'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
      'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
    ),
    '[^a-zA-Z0-9]+', '-', 'g'
  ),
  '(^-|-$)', '', 'g'
))
WHERE slug IS NULL OR slug = '';

-- Garante unicidade (colisão entre contas)
DO $$
DECLARE
  r RECORD;
  base TEXT;
  candidate TEXT;
  n INT;
BEGIN
  FOR r IN
    SELECT a.id, a.slug
    FROM accounts a
    WHERE a.slug IS NULL
       OR a.slug = ''
       OR a.slug IN (SELECT slug FROM accounts GROUP BY slug HAVING COUNT(*) > 1)
    ORDER BY a.created_at
  LOOP
    base := left(coalesce(nullif(r.slug, ''), 'conta'), 60);
    IF base = '' THEN base := 'conta'; END IF;
    n := 2;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM accounts WHERE slug = candidate AND id <> r.id) LOOP
      candidate := base || '-' || n;
      n := n + 1;
    END LOOP;
    UPDATE accounts SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE accounts ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_slug ON accounts(slug);

-- ------------------------------------------------------------
-- CATÁLOGOS DE LIDERANÇA (tenant-scoped)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_leadership_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'slate',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, name)
);

CREATE TABLE IF NOT EXISTS campaign_leadership_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'slate',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, name)
);

CREATE TABLE IF NOT EXISTS campaign_leadership_commitment_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'slate',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, name)
);

CREATE TABLE IF NOT EXISTS campaign_leadership_bond_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'slate',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, name)
);

-- Zonas da cidade configuráveis por conta (Brasil inteiro)
CREATE TABLE IF NOT EXISTS campaign_city_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, name)
);

-- ------------------------------------------------------------
-- LIDERANÇAS: campos completos
-- ------------------------------------------------------------
ALTER TABLE campaign_leaderships
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IS NULL OR gender IN ('M', 'F', 'O')),
  ADD COLUMN IF NOT EXISTS marital_status TEXT
    CHECK (marital_status IS NULL OR marital_status IN (
      'solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel'
    )),
  ADD COLUMN IF NOT EXISTS mother_name TEXT,
  ADD COLUMN IF NOT EXISTS voter_title TEXT,
  ADD COLUMN IF NOT EXISTS electoral_zone TEXT,
  ADD COLUMN IF NOT EXISTS electoral_section TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT,
  ADD COLUMN IF NOT EXISTS twitter TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS city_zone TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS salary NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS admission_date DATE,
  ADD COLUMN IF NOT EXISTS estimated_votes INT,
  ADD COLUMN IF NOT EXISTS commitment_level_id UUID
    REFERENCES campaign_leadership_commitment_levels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bond_type_id UUID
    REFERENCES campaign_leadership_bond_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS registration_token UUID DEFAULT gen_random_uuid();

-- Status: incluir vacation (recria CHECK)
ALTER TABLE campaign_leaderships DROP CONSTRAINT IF EXISTS campaign_leaderships_status_check;
ALTER TABLE campaign_leaderships
  ADD CONSTRAINT campaign_leaderships_status_check
  CHECK (status IN ('active', 'inactive', 'dismissed', 'vacation'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_leaderships_reg_token
  ON campaign_leaderships(registration_token);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_leaderships_cpf
  ON campaign_leaderships(account_id, cpf)
  WHERE cpf IS NOT NULL AND btrim(cpf) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_leaderships_user
  ON campaign_leaderships(user_id)
  WHERE user_id IS NOT NULL;

-- M2M segmentos / bandeiras
CREATE TABLE IF NOT EXISTS campaign_leadership_segment_links (
  leadership_id UUID NOT NULL REFERENCES campaign_leaderships(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES campaign_leadership_segments(id) ON DELETE CASCADE,
  PRIMARY KEY (leadership_id, segment_id)
);

CREATE TABLE IF NOT EXISTS campaign_leadership_flag_links (
  leadership_id UUID NOT NULL REFERENCES campaign_leaderships(id) ON DELETE CASCADE,
  flag_id UUID NOT NULL REFERENCES campaign_leadership_flags(id) ON DELETE CASCADE,
  PRIMARY KEY (leadership_id, flag_id)
);

-- ------------------------------------------------------------
-- APOIADORES: campos completos
-- ------------------------------------------------------------
ALTER TABLE campaign_supporters
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IS NULL OR gender IN ('M', 'F', 'O')),
  ADD COLUMN IF NOT EXISTS marital_status TEXT
    CHECK (marital_status IS NULL OR marital_status IN (
      'single', 'married', 'widowed', 'separated', 'stable_union'
    )),
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS city_zone TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS validado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validacao_origem TEXT
    CHECK (validacao_origem IS NULL OR validacao_origem IN ('manual', 'whatsapp')),
  ADD COLUMN IF NOT EXISTS status_conquista TEXT NOT NULL DEFAULT 'nao_informado'
    CHECK (status_conquista IN ('positivo', 'a_conquistar', 'negativo', 'nao_informado'));

-- Remove email se não existir no O Candidato apoiador — mantém (extra WACRM ok)
CREATE INDEX IF NOT EXISTS idx_campaign_supporters_conquista
  ON campaign_supporters(leadership_id, status_conquista);
CREATE INDEX IF NOT EXISTS idx_campaign_supporters_origem
  ON campaign_supporters(account_id, origem);

CREATE TABLE IF NOT EXISTS campaign_supporter_family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  supporter_id UUID NOT NULL REFERENCES campaign_supporters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL
    CHECK (relationship IN ('spouse', 'father', 'mother', 'son', 'sibling', 'other')),
  birth_date DATE NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_family_supporter
  ON campaign_supporter_family_members(supporter_id);

-- ------------------------------------------------------------
-- Triggers updated_at nos catálogos
-- ------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'campaign_leadership_segments',
    'campaign_leadership_flags',
    'campaign_leadership_commitment_levels',
    'campaign_leadership_bond_types',
    'campaign_city_zones',
    'campaign_supporter_family_members'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      t
    );
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- Helper: liderança do usuário autenticado (escopo)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION campaign_my_leadership_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM campaign_leaderships
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION campaign_my_leadership_id() TO authenticated, service_role;

-- ------------------------------------------------------------
-- RLS catálogos
-- ------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'campaign_leadership_segments',
    'campaign_leadership_flags',
    'campaign_leadership_commitment_levels',
    'campaign_leadership_bond_types',
    'campaign_city_zones'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_select ON %I FOR SELECT USING (is_account_member(account_id, ''viewer''))',
      t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_insert ON %I FOR INSERT WITH CHECK (is_account_member(account_id, ''admin''))',
      t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_update ON %I FOR UPDATE USING (is_account_member(account_id, ''admin''))',
      t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_delete ON %I FOR DELETE USING (is_account_member(account_id, ''admin''))',
      t, t
    );
  END LOOP;
END $$;

-- Familiares
ALTER TABLE campaign_supporter_family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_family_select ON campaign_supporter_family_members;
CREATE POLICY campaign_family_select ON campaign_supporter_family_members FOR SELECT
  USING (
    is_account_member(account_id, 'viewer')
    AND (
      campaign_my_leadership_id() IS NULL
      OR EXISTS (
        SELECT 1 FROM campaign_supporters s
        WHERE s.id = supporter_id
          AND s.leadership_id = campaign_my_leadership_id()
      )
    )
  );

DROP POLICY IF EXISTS campaign_family_insert ON campaign_supporter_family_members;
CREATE POLICY campaign_family_insert ON campaign_supporter_family_members FOR INSERT
  WITH CHECK (
    is_account_member(account_id, 'agent')
    AND (
      campaign_my_leadership_id() IS NULL
      OR EXISTS (
        SELECT 1 FROM campaign_supporters s
        WHERE s.id = supporter_id
          AND s.leadership_id = campaign_my_leadership_id()
      )
    )
  );

DROP POLICY IF EXISTS campaign_family_update ON campaign_supporter_family_members;
CREATE POLICY campaign_family_update ON campaign_supporter_family_members FOR UPDATE
  USING (
    is_account_member(account_id, 'agent')
    AND (
      campaign_my_leadership_id() IS NULL
      OR EXISTS (
        SELECT 1 FROM campaign_supporters s
        WHERE s.id = supporter_id
          AND s.leadership_id = campaign_my_leadership_id()
      )
    )
  );

DROP POLICY IF EXISTS campaign_family_delete ON campaign_supporter_family_members;
CREATE POLICY campaign_family_delete ON campaign_supporter_family_members FOR DELETE
  USING (
    is_account_member(account_id, 'agent')
    AND (
      campaign_my_leadership_id() IS NULL
      OR EXISTS (
        SELECT 1 FROM campaign_supporters s
        WHERE s.id = supporter_id
          AND s.leadership_id = campaign_my_leadership_id()
      )
    )
  );

-- Junction tables: via membership na liderança
ALTER TABLE campaign_leadership_segment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leadership_flag_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_seg_links_all ON campaign_leadership_segment_links;
CREATE POLICY campaign_seg_links_all ON campaign_leadership_segment_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaign_leaderships l
      WHERE l.id = leadership_id
        AND is_account_member(l.account_id, 'viewer')
        AND (campaign_my_leadership_id() IS NULL OR l.id = campaign_my_leadership_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaign_leaderships l
      WHERE l.id = leadership_id
        AND is_account_member(l.account_id, 'agent')
        AND campaign_my_leadership_id() IS NULL
    )
  );

DROP POLICY IF EXISTS campaign_flag_links_all ON campaign_leadership_flag_links;
CREATE POLICY campaign_flag_links_all ON campaign_leadership_flag_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaign_leaderships l
      WHERE l.id = leadership_id
        AND is_account_member(l.account_id, 'viewer')
        AND (campaign_my_leadership_id() IS NULL OR l.id = campaign_my_leadership_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaign_leaderships l
      WHERE l.id = leadership_id
        AND is_account_member(l.account_id, 'agent')
        AND campaign_my_leadership_id() IS NULL
    )
  );

-- ------------------------------------------------------------
-- RLS lideranças / apoiadores com escopo
-- ------------------------------------------------------------
DROP POLICY IF EXISTS campaign_leaderships_select ON campaign_leaderships;
CREATE POLICY campaign_leaderships_select ON campaign_leaderships FOR SELECT
  USING (
    is_account_member(account_id, 'viewer')
    AND (campaign_my_leadership_id() IS NULL OR id = campaign_my_leadership_id())
  );

DROP POLICY IF EXISTS campaign_leaderships_insert ON campaign_leaderships;
CREATE POLICY campaign_leaderships_insert ON campaign_leaderships FOR INSERT
  WITH CHECK (
    is_account_member(account_id, 'agent')
    AND campaign_my_leadership_id() IS NULL
  );

DROP POLICY IF EXISTS campaign_leaderships_update ON campaign_leaderships;
CREATE POLICY campaign_leaderships_update ON campaign_leaderships FOR UPDATE
  USING (
    is_account_member(account_id, 'agent')
    AND (
      campaign_my_leadership_id() IS NULL
      OR id = campaign_my_leadership_id()
    )
  );

DROP POLICY IF EXISTS campaign_leaderships_delete ON campaign_leaderships;
CREATE POLICY campaign_leaderships_delete ON campaign_leaderships FOR DELETE
  USING (
    is_account_member(account_id, 'admin')
    AND campaign_my_leadership_id() IS NULL
  );

DROP POLICY IF EXISTS campaign_supporters_select ON campaign_supporters;
CREATE POLICY campaign_supporters_select ON campaign_supporters FOR SELECT
  USING (
    is_account_member(account_id, 'viewer')
    AND (
      campaign_my_leadership_id() IS NULL
      OR leadership_id = campaign_my_leadership_id()
    )
  );

DROP POLICY IF EXISTS campaign_supporters_insert ON campaign_supporters;
CREATE POLICY campaign_supporters_insert ON campaign_supporters FOR INSERT
  WITH CHECK (
    is_account_member(account_id, 'agent')
    AND (
      campaign_my_leadership_id() IS NULL
      OR leadership_id = campaign_my_leadership_id()
    )
  );

DROP POLICY IF EXISTS campaign_supporters_update ON campaign_supporters;
CREATE POLICY campaign_supporters_update ON campaign_supporters FOR UPDATE
  USING (
    is_account_member(account_id, 'agent')
    AND (
      campaign_my_leadership_id() IS NULL
      OR leadership_id = campaign_my_leadership_id()
    )
  );

DROP POLICY IF EXISTS campaign_supporters_delete ON campaign_supporters;
CREATE POLICY campaign_supporters_delete ON campaign_supporters FOR DELETE
  USING (
    is_account_member(account_id, 'admin')
    AND campaign_my_leadership_id() IS NULL
  );

-- Coordenadores: liderança não gerencia
DROP POLICY IF EXISTS campaign_coordinators_select ON campaign_coordinators;
CREATE POLICY campaign_coordinators_select ON campaign_coordinators FOR SELECT
  USING (
    is_account_member(account_id, 'viewer')
    AND campaign_my_leadership_id() IS NULL
  );

DROP POLICY IF EXISTS campaign_coordinators_insert ON campaign_coordinators;
CREATE POLICY campaign_coordinators_insert ON campaign_coordinators FOR INSERT
  WITH CHECK (
    is_account_member(account_id, 'agent')
    AND campaign_my_leadership_id() IS NULL
  );

DROP POLICY IF EXISTS campaign_coordinators_update ON campaign_coordinators;
CREATE POLICY campaign_coordinators_update ON campaign_coordinators FOR UPDATE
  USING (
    is_account_member(account_id, 'agent')
    AND campaign_my_leadership_id() IS NULL
  );

DROP POLICY IF EXISTS campaign_coordinators_delete ON campaign_coordinators;
CREATE POLICY campaign_coordinators_delete ON campaign_coordinators FOR DELETE
  USING (
    is_account_member(account_id, 'admin')
    AND campaign_my_leadership_id() IS NULL
  );

-- Slug automático em novas contas
CREATE OR REPLACE FUNCTION public.accounts_set_slug_if_null()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  n INT := 2;
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    base := lower(regexp_replace(
      regexp_replace(
        translate(
          coalesce(NEW.name, NEW.id::text),
          'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
          'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
        ),
        '[^a-zA-Z0-9]+', '-', 'g'
      ),
      '(^-|-$)', '', 'g'
    ));
    IF base IS NULL OR base = '' THEN base := 'conta'; END IF;
    base := left(base, 60);
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM accounts WHERE slug = candidate AND id <> NEW.id) LOOP
      candidate := base || '-' || n;
      n := n + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS accounts_set_slug ON accounts;
CREATE TRIGGER accounts_set_slug
  BEFORE INSERT OR UPDATE OF name, slug ON accounts
  FOR EACH ROW EXECUTE FUNCTION public.accounts_set_slug_if_null();
