# Deploy no Coolify (VPS) — WACRM / Meu Candidato

Coolify: `http://168.231.100.18:8000`  
Repo: `https://github.com/marcopimenttel/wacrm` (branch `main`)  
Produção: **https://crm.euapoio.cloud** (HTTPS Let's Encrypt — ver [`ONDA-A.md`](./ONDA-A.md))

## Visão dos recursos

No Coolify: **1 Project** e estes resources:

| Ordem | Resource | Tipo no Coolify | Função |
|------:|----------|-----------------|--------|
| 1 | `wacrm-db` | **PostgreSQL** | Reservado para Onda D (Auth+DB self-hosted) |
| 2 | `wacrm` (app) | **Dockerfile** (GitHub) | Next.js em produção |
| 3 | (Onda D) Auth API | Compose / serviço extra | GoTrue+PostgREST — só então sai do Cloud |

> **Onda A–C (atual):** app no Coolify + `NEXT_PUBLIC_SUPABASE_*` no **Supabase Cloud**.  
> `wacrm-db` fica healthy, mas o runtime do app **não** usa `DATABASE_URL` ainda.
>
> **Onda D:** compose em `deploy/coolify/onda-d` (GoTrue+PostgREST+Realtime+Storage) + domínio `api.crm.euapoio.cloud`. Guia: [`onda-d/ONDA-D.md`](./onda-d/ONDA-D.md).

---

## Passo 1 — Criar o Project

1. Abra **Projects**
2. Clique **+ Add**
3. Nome: `WACRM` (ou `Meu Candidato SaaS`)
4. Description: `SaaS político + WhatsApp CRM`
5. Salve

---

## Passo 2 — Adicionar PostgreSQL

Dentro do project **WACRM**:

1. **+ Add Resource** → **Database** → **PostgreSQL**
2. Nome: `wacrm-db`
3. Anote (Coolify mostra após criar):
   - Host interno (ex.: `wacrm-db` ou IP interno)
   - Porta `5432`
   - User / Password / Database
4. Exemplo de `DATABASE_URL` (rede interna Coolify):

```text
postgresql://USER:PASSWORD@NOME_DO_SERVICO_DB:5432/NOME_DB
```

5. Deploy / Start do database e espere ficar **healthy**

### Rodar migrations

Com o DB no ar, rode uma vez (Terminal do Coolify no container do DB, ou da sua máquina com IP liberado):

```bash
# No PC (com psql instalado), apontando para a porta publicada do Postgres:
DATABASE_URL="postgresql://USER:PASS@168.231.100.18:PORTA_PUBLICA/DB" \
  node scripts/apply-migrations.mjs
```

Ou copie as SQLs de `supabase/migrations/*.sql` em ordem no **psql** do Coolify.

---

## Passo 3 — Conectar o GitHub (Sources)

Se ainda não tiver o repo:

1. Sidebar → **Sources**
2. Add GitHub (OAuth ou Deploy Key)
3. Autorize `marcopimenttel/wacrm`

---

## Passo 4 — Adicionar o App (Dockerfile)

No project **WACRM**:

1. **+ Add Resource** → **Public Repository** ou **Private Repository** (GitHub)
2. Repo: `marcopimenttel/wacrm`
3. Branch: `main`
4. Build Pack: **Dockerfile** (raiz do repo — já existe `Dockerfile`)
5. Nome: `wacrm-app`
6. Port: `3000`

### Build Args (obrigatórios — entram no bundle)

No Coolify → Application → **Build** / **Args**:

| Arg | Exemplo |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL da Auth API (ou temporário supabase.co) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `NEXT_PUBLIC_SITE_URL` | `https://crm.seudominio.com.br` |
| `NEXT_PUBLIC_APP_LOCALE` | `pt-BR` |

### Runtime env (Environment Variables)

Copie de `deploy/coolify/env.coolify.example` e preencha:

- `DATABASE_URL` → aponta para o serviço `wacrm-db`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY` (64 hex)
- `META_APP_SECRET` (se usar WhatsApp)
- `PLATFORM_ADMIN_EMAILS=marcopimenttel@gmail.com`
- `NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS=marcopimenttel@gmail.com`
- `ASAAS_*` (quando for cobrar)

Gere `ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Domínio

1. Application → **Domains**
2. Adicione `crm.seudominio.com.br` (ou o domínio que quiser)
3. Coolify emite SSL (Let's Encrypt) se o DNS apontar para `168.231.100.18`

---

## Passo 5 — Deploy

1. Clique **Deploy** no `wacrm-app`
2. Acompanhe o build (Dockerfile multi-stage)
3. Se falhar: quase sempre é Build Arg `NEXT_PUBLIC_*` faltando

---

## Checklist rápido

- [ ] Project `WACRM` criado
- [ ] PostgreSQL `wacrm-db` healthy
- [ ] Migrations aplicadas
- [ ] Source GitHub `marcopimenttel/wacrm`
- [ ] App Dockerfile branch `main`
- [ ] Build args + env preenchidos
- [ ] Domínio + SSL
- [ ] Deploy verde
- [ ] Login funciona (Auth API ok)
- [ ] Menu **Plataforma** com seu e-mail admin

---

## Onda D (sair do Cloud) — na tela do Coolify

1. DNS: `api.crm.euapoio.cloud` → IP da VPS
2. `node scripts/generate-supabase-keys.mjs` (guarde as chaves)
3. **+ Add Resource** → Docker Compose → pasta `deploy/coolify/onda-d`
4. Env de `onda-d/.env.example` + senha do `wacrm-db`
5. Domain HTTPS na porta **8000**
6. Validar `/health` e `/auth/v1/health`
7. Export Cloud → restore VPS (se houver dados)
8. Trocar `NEXT_PUBLIC_SUPABASE_*` no app + **Rebuild**

Guia completo: [`onda-d/ONDA-D.md`](./onda-d/ONDA-D.md).

