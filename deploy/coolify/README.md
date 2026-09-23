# Deploy Coolify — WACRM em produção

Coolify: `http://168.231.100.18:8000`  
App público: **https://crm.euapoio.cloud**

## Arquitetura

| Fase | App | Auth + dados |
|------|-----|----------------|
| **Atual (A–C)** | Coolify | Supabase Cloud |
| **Alvo Onda D** | Coolify | VPS (`wacrm-db` + compose `onda-d`) |

Detalhes do cutover: [`onda-d/ONDA-D.md`](./onda-d/ONDA-D.md).

## Variáveis do app (enquanto Cloud)

- `NEXT_PUBLIC_SITE_URL=https://crm.euapoio.cloud`
- `NEXT_PUBLIC_SUPABASE_URL` / anon / service role → **Cloud**
- `PLATFORM_ADMIN_EMAILS`
- `ENCRYPTION_KEY`

## Após cutover Onda D

```text
NEXT_PUBLIC_SUPABASE_URL=https://api.crm.euapoio.cloud
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY gerado>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY gerado>
```

Gere chaves: `node scripts/generate-supabase-keys.mjs`  
**Rebuild** do app após mudar `NEXT_PUBLIC_*`.

## Domínio e HTTPS

1. App: `https://crm.euapoio.cloud`
2. API (Onda D): `https://api.crm.euapoio.cloud` → compose porta 8000

## Migrations

- Cloud (hoje): SQL Editor / CLI
- VPS: `DATABASE_URL=... node scripts/apply-migrations.mjs` + bootstrap em `onda-d/init/`

## Ondas

- [ONDA-A.md](./ONDA-A.md) — HTTPS + híbrido
- [ONDA-B.md](./ONDA-B.md) — comercial residual
- [ONDA-C.md](./ONDA-C.md) — painel dono
- [onda-d/ONDA-D.md](./onda-d/ONDA-D.md) — self-hosted Auth/DB
