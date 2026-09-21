# Deploy Coolify — Postgres na VPS (sem Supabase Cloud)

## Objetivo

Rodar o **WACRM** com **PostgreSQL gerenciado na sua VPS (Coolify)**, sem depender do projeto hospedado em `*.supabase.co`.

O código ainda fala HTTP no formato `/auth/v1` e `/rest/v1` (cliente atual). Por isso, na VPS você sobe:

1. **Postgres** (este compose — obrigatório)
2. **Camada API de autenticação/dados** na mesma VPS (GoTrue + PostgREST + proxy, ou stack Supabase *self-hosted*)

O banco de verdade é o Postgres da Coolify; o “Supabase Cloud” fica fora.

## Passo a passo (Coolify)

1. Crie um serviço **PostgreSQL** (ou use o `docker-compose.yml` desta pasta).
2. Defina as variáveis de `.env.coolify.example` no Coolify.
3. Rode as migrations:
   - Via serviço `migrate` do compose, **ou**
   - Na máquina com acesso ao DB:  
     `DATABASE_URL=postgresql://... node scripts/apply-migrations.mjs`
4. Aplique a migration `040_saas_commercial.sql` (já incluída na pasta `supabase/migrations`).
5. Configure o app (`Dockerfile` na raiz) com `NEXT_PUBLIC_SUPABASE_URL` apontando para **sua** API na VPS (não para supabase.co).
6. Coloque seu e-mail em `PLATFORM_ADMIN_EMAILS`.

## Migrations

Todas as SQL em `supabase/migrations/*.sql` são Postgres padrão (com schema `auth` mínimo criado pelo `run-migrations.sh` se GoTrue ainda não existir).

## Desenvolvimento local

Enquanto a API self-hosted não estiver pronta, você pode continuar com `.env.local` apontando para um projeto temporário — mas o **alvo de produção** é:

```
DATABASE_URL → Postgres Coolify
NEXT_PUBLIC_SUPABASE_URL → API self-hosted na mesma VPS
```

## SaaS comercial (040+)

- Status `blocked`
- Quotas no plano
- `account_modules` (override)
- Branding por tenant em `accounts`
- `platform_settings` (white-label global)
- `platform_admins` (e-mails no banco)
