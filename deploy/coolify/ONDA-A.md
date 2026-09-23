# Onda A — estabilizar produção (concluída)

Data de verificação: **2026-09-23**

## Decisão de arquitetura (até a Onda D)

| Camada | Onde | Status |
|--------|------|--------|
| App Next.js | Coolify VPS (`wacrm`, Dockerfile) | Em produção |
| Domínio | `https://crm.euapoio.cloud` | HTTPS Let's Encrypt |
| Auth + dados (Postgres/RLS) | **Supabase Cloud** (`*.supabase.co`) | Mantido de propósito |
| Postgres Coolify (`wacrm-db`) | VPS | Pronto, **não usado em runtime** até Onda D |

**Por quê:** o app autentica e consulta dados via cliente Supabase (`/auth/v1`, `/rest/v1`). Só o Postgres Coolify não basta para login. Migrar Auth+DB self-hosted é a **Onda D**; agora o alvo é app estável + HTTPS + SaaS comercial no Cloud.

`DATABASE_URL` no Coolify pode apontar para `wacrm-db` (migrations futuras / Onda D). Em runtime o Next **não** usa `DATABASE_URL` — usa `NEXT_PUBLIC_SUPABASE_URL` + service role.

## Checklist executado

### 1. HTTPS

- [x] DNS `crm.euapoio.cloud` → `168.231.100.18`
- [x] Certificado Let's Encrypt (CN=`crm.euapoio.cloud`, emissor YR2)
- [x] `https://crm.euapoio.cloud/login` → **200**
- [x] Header `Strict-Transport-Security` presente
- [x] `http://` → **307** para `https://` (Traefik) + reforço 308 no middleware do app

**No browser:** abra sempre `https://crm.euapoio.cloud` (cadeado). Se ainda aparecer “Não seguro”, limpe cache ou confira se a barra não ficou em `http://`.

### 2. Login + `/platform`

- [x] `/login` público responde 200
- [x] `/platform` sem sessão redireciona para login (matcher de rotas protegidas)
- [ ] **Manual (você):** login com `marcopimenttel@gmail.com` → dashboard → menu **Plataforma** → `/platform` com lista de contas

Confirme no Coolify → Environment:

```text
NEXT_PUBLIC_SITE_URL=https://crm.euapoio.cloud
PLATFORM_ADMIN_EMAILS=marcopimenttel@gmail.com
NEXT_PUBLIC_SUPABASE_URL=<projeto cloud>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon cloud>
SUPABASE_SERVICE_ROLE_KEY=<service role cloud>
```

### 3. Documentação híbrida

- Este arquivo + `README.md` atualizado: Cloud Auth/data até Onda D; `wacrm-db` reservado.

## Próximo: Onda B

Banner de trial, quota de equipe no invite, webhook Asaas idempotente.
