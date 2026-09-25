# Onda D — Auth + dados self-hosted na VPS

## Objetivo

Sair do **Supabase Cloud**: Auth, REST/RLS, Realtime e Storage passam a rodar na VPS (Coolify), usando o Postgres `wacrm-db`.

> **Não desligue o Cloud** até o checklist de cutover estar verde. O app em produção continua no Cloud até você trocar as env e fazer redeploy.

## Arquitetura alvo

| Peça | Resource Coolify | URL |
|------|------------------|-----|
| App Next.js | `wacrm` (já existe) | https://crm.euapoio.cloud |
| Postgres | `wacrm-db` (imagem **supabase/postgres**) | interno |
| API gateway | compose `deploy/coolify/onda-d` | https://apicrm.euapoio.cloud |

O cliente JS continua falando `/auth/v1`, `/rest/v1`, `/realtime/v1`, `/storage/v1` — só muda o host.

## Pré-requisitos

1. `wacrm-db` healthy com imagem **supabase/postgres** (não Postgres “vanilla”, se possível).
2. DNS: `apicrm.euapoio.cloud` → IP da VPS (`168.231.100.18`).
3. Node local com `pg_dump`/`psql` se for migrar dados do Cloud.

## Passo a passo (Coolify)

### 1. Gerar chaves JWT

No repo:

```bash
node scripts/generate-supabase-keys.mjs
```

Guarde `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `SECRET_KEY_BASE`.

### 2. Criar resource Compose `wacrm-api`

1. Project **WACRM** → **+ Add Resource** → **Docker Compose**
2. Base directory: `deploy/coolify/onda-d`
3. Compose file: `docker-compose.yml`
4. Cole as variáveis de `.env.example` (com senha real do `wacrm-db`)
5. Garanta que o compose está na **mesma rede** do `wacrm-db` (mesmo project Coolify costuma bastar; senão use rede `coolify` external)
6. Domains: `https://apicrm.euapoio.cloud` na porta **80** (Caddy; padrão Coolify/Traefik)
7. Deploy

### 3. Bootstrap + migrations no DB

Com `DATABASE_URL` interno/público do `wacrm-db`:

```bash
# Roles (também roda no one-shot vector-ready do compose)
psql "$DATABASE_URL" -f deploy/coolify/onda-d/init/01-bootstrap-roles.sql

# Schema do produto
DATABASE_URL="$DATABASE_URL" node scripts/apply-migrations.mjs
```

### 4. Migrar dados do Cloud (se já há produção)

No painel Supabase Cloud → **Database** → Connection string (URI):

```bash
CLOUD_DATABASE_URL="postgresql://postgres:[SENHA]@db.[REF].supabase.co:5432/postgres" \
  node scripts/export-cloud-db.mjs

psql "$DATABASE_URL" -f deploy/coolify/onda-d/exports/cloud-YYYYMMDD.sql
```

Arquivos de Storage (avatars/mídia) não vêm no dump — sincronize o bucket depois, se necessário.

### 5. Validar API (antes de trocar o app)

```bash
curl -s https://apicrm.euapoio.cloud/health
curl -s https://apicrm.euapoio.cloud/auth/v1/health
# REST (precisa apikey):
curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  https://apicrm.euapoio.cloud/rest/v1/plans?select=key&limit=1
```

Crie um usuário de teste via signup/login na API nova.

### 6. Cutover do app (janela curta)

No Coolify → app `wacrm` → Environment:

```text
NEXT_PUBLIC_SUPABASE_URL=https://apicrm.euapoio.cloud
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY gerado>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY gerado>
```

**Rebuild** (não só restart): `NEXT_PUBLIC_*` entra no bundle no build.

Confirme login em https://crm.euapoio.cloud e inbox (realtime).

### 7. Rollback

Se algo falhar, reverta as três variáveis para o projeto Cloud e faça rebuild. O Cloud permanece intacto até você apagar o projeto.

## Arquivos desta pasta

| Arquivo | Função |
|---------|--------|
| `docker-compose.yml` | GoTrue + PostgREST + Realtime + Storage + Caddy |
| `Caddyfile` | Roteamento estilo Kong |
| `init/01-bootstrap-roles.sql` | Roles/schemas mínimos |
| `.env.example` | Variáveis do compose |

## Limitações conscientes

- Studio / Edge Functions / Logflare **não** entram nesta onda (não são necessários ao CRM).
- Realtime e Storage exigem imagem Postgres compatível; se `wacrm-db` for vanilla, troque para `supabase/postgres`.
- SMTP: com `ENABLE_EMAIL_AUTOCONFIRM=true` o login por senha funciona sem e-mail; magic link precisa de SMTP.

## Status

Stack e scripts **prontos no repo**. Cutover em produção é operacional no Coolify (passos 2–6).
