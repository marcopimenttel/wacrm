# Deploy Coolify — WACRM em produção

Coolify: `http://168.231.100.18:8000`  
App público: **https://crm.euapoio.cloud**

## Arquitetura atual (Onda A)

| Peça | Onde | Notas |
|------|------|--------|
| App Next.js | Coolify (`Dockerfile`, porta 3000) | Produção |
| Auth + Postgres/RLS | **Supabase Cloud** | Mantido até Onda D |
| `wacrm-db` (Postgres Coolify) | VPS | Provisionado; **não** alimenta o app ainda |

O código fala HTTP no formato Supabase (`/auth/v1`, `/rest/v1`). Por isso, enquanto não houver GoTrue + PostgREST na VPS, **produção usa Supabase Cloud** para Auth e dados. Detalhes da estabilização: [`ONDA-A.md`](./ONDA-A.md).

## Variáveis críticas (Coolify → Environment)

Copie de `env.coolify.example` e de `.env.local` (só chaves públicas/service role — nunca commitar secrets):

- `NEXT_PUBLIC_SITE_URL=https://crm.euapoio.cloud`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` → **Cloud**
- `PLATFORM_ADMIN_EMAILS` → e-mail do dono do SaaS
- `ENCRYPTION_KEY` → 32+ chars
- `DATABASE_URL` → opcional agora (útil na Onda D / migrations no `wacrm-db`)

## Domínio e HTTPS

1. Domains no serviço do app: `https://crm.euapoio.cloud`
2. Coolify gera Let's Encrypt (portas 80/443 abertas na VPS)
3. App força HTTPS via Traefik + middleware (`x-forwarded-proto`)

## Migrations (Cloud hoje)

Aplicar `supabase/migrations/*.sql` no projeto Supabase Cloud (SQL Editor ou CLI), incluindo `040_saas_commercial.sql`.

Quando for a Onda D, o mesmo runner (`scripts/apply-migrations.mjs` / `run-migrations.sh`) aponta para `DATABASE_URL` do `wacrm-db`.

## Guia passo a passo

Ver [`COOLIFY-PASSO-A-PASSO.md`](./COOLIFY-PASSO-A-PASSO.md).

## SaaS comercial (040+)

- Status `blocked`, quotas, `account_modules`
- Branding por tenant + `platform_settings`
- Painel `/platform` só para `PLATFORM_ADMIN_EMAILS`
