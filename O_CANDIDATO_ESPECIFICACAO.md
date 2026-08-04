# Especificação: portar Meu Candidato → WACRM

> **Fonte da verdade (somente leitura):**  
> `C:\Users\Marcos Pimentel\Documents\o_candidato`  
> Repo de referência: “Meu Candidato” (Django multi-tenant).
>
> **Destino:** este projeto WACRM (Next.js + Supabase), mantendo o design system e o CRM WhatsApp atuais.
>
> **Regra de trabalho:** antes de implementar ou expandir qualquer módulo de campanha/SaaS político, **ler (só leitura)** os `models.py`, `forms.py`, views e templates correspondentes em `o_candidato` e alinhar campos, choices, relações e fluxos a este documento — atualizando o `.md` se a referência tiver mudado.

---

## 1. Objetivo

Reproduzir no WACRM a **funcionalidade e os campos** do sistema O Candidato (Meu Candidato), módulo a módulo:

- Mesmos campos de formulário e de exibição (labels, obrigatoriedade, máscaras, choices).
- Mesmas relações entre entidades.
- Mesmos fluxos principais (lista, detalhe, criar/editar, catálogos, links públicos, importação, validação, metas, etc.).
- UI do WACRM (shadcn / tokens atuais), **não** cópia visual pixel-a-pixel do Django/Tailwind do O Candidato.
- Stack WhatsApp: **manter WACRM (Meta Cloud API + inbox/CRM)** — **não** portar Evolution API do O Candidato.

---

## 2. Hierarquia de entidades

### No O Candidato (hoje)

```
Tenant (campanha/candidato)
  └── Leadership (liderança)  ← papel de usuário: admin | leadership | staff
        └── Supporter (apoiador)
              └── FamilyMember (familiares)
```

“**Coordenador**” no O Candidato **não é entidade**: é texto de **cargo** em `UserProfile.cargo` / nome de `PerfilAcesso` (ex.: “Coordenador de Campo”).

### No WACRM (decisão do produto — extensão)

```
Account (tenant)
  └── Coordenador          ← NOVO (entidade real)
        └── Liderança
              └── Apoiador (+ familiares)
```

Ao portar campos de Liderança/Apoiador do O Candidato, **adicionar** `coordinator_id` (e telas) sem remover campos da referência.

---

## 3. Módulos do menu (O Candidato)

Fonte: `templates/components/sidebar.html` + `apps/accounts/permissions.py` (`MODULOS_PERMISSOES`).

| Chave | Label | Escopo |
|-------|--------|--------|
| *(dashboard)* | Dashboard | Métricas gerais |
| `liderancas` | Lideranças | CRUD + catálogos + link público de cadastro |
| `apoiadores` | Apoiadores | CRUD + familiares + validação + importação + opt-out WA |
| `demandas` | Demandas | Internas/externas + portal público + mapa + histórico |
| `propostas` | Propostas | CRUD + categorias |
| `estoque` | Estoque | Materiais, movimentações, parceiros |
| `financeiro` | Financeiro | Categorias, lançamentos, veículos, folha |
| `agenda` | Agenda | Categorias, status, agendamentos |
| `whatsapp` | WhatsApp CRM | **No WACRM: já coberto pela suite WhatsApp** |
| `molduras` | Molduras | Upload + página pública |
| `qrcode` | QR Codes | Dinâmicos + analytics |
| `metas` | Metas | Metas gerais/individuais (apoiadores/demandas) |
| `resultados_eleitorais` | Resultados / Dados Eleitorais | TSE global + desempenho do candidato |
| `resumo_diario` | Resumo do Dia | Config + envio WhatsApp |
| *(accounts)* | Controle de acesso | Perfis granulares, equipe, auditoria |
| *(superadmin)* | Gestão de Clientes / Planos / Settings | Platform admin |
| *(faturamento)* | Planos & Assinaturas | Asaas |

Ações típicas por módulo: `criar`, `visualizar`, `editar`, `excluir`, `exportar`, `importar`, etc. (ver `MODULOS_PERMISSOES`).

---

## 4. Multi-tenant e SaaS

### Tenant (`apps/superadmin/models.py` → `Tenant`)

| Campo | Tipo | Notas |
|-------|------|--------|
| name | string | Nome da campanha/candidato |
| slug | slug único | Ex.: `joao-silva-manaus` |
| status | trial \| active \| blocked \| cancelled | |
| plan | FK Plan | |
| trial_ends_at | datetime? | |
| owner_email | email | |
| cnpj | string? | |
| contact_phone | string? | |
| cep, address, number, neighborhood, city, state | endereço | city/state obrigatórios na ref. |
| logo, favicon, login_background | arquivos | white-label |
| primary_color | hex | default `#1e40af` |
| candidato_sq, candidato_nome, candidato_nome_completo, candidato_partido, candidato_uf, candidato_cargo, candidato_numero | vínculo TSE | “Meu Desempenho” |
| whatsapp_broadcast_enabled | bool | |
| whatsapp_provider | evolution \| meta | **Ignorar no WACRM (sempre Meta/WACRM)** |
| created_at | datetime | |

### TenantModule

Override por tenant: `module_key`, `is_enabled`, `is_overridden` (plano = padrão).

### Plan / PlanModule / TenantSubscription (`faturamento`)

- Plan: `name`, `slug`, `price_brl`, `price_yearly_brl`, `trial_days`, `max_supporters`, `max_leaderships`, `max_team_members`, `is_active`
- PlanModule: `plan`, `module_key`, `is_included`
- TenantSubscription: `asaas_customer_id`, `asaas_subscription_id`, `cycle` monthly\|yearly, `status`, `payment_status`, `next_due_date`, `invoice_url`

### GlobalSettings (white-label plataforma)

`site_name`, textos de login, `footer_text`, logos (login/sidebar/dark/collapsed), favicon, background.

---

## 5. Contas e permissões (`accounts`)

### Roles

`admin` | `leadership` | `staff`

### UserProfile

| Campo | Notas |
|-------|--------|
| user | 1:1 |
| tenant | NULL = superadmin |
| role | |
| cargo | texto livre (ex. Coordenador de Campo) |
| modulos_ativos | JSON lista (staff) |
| perfil_acesso | FK PerfilAcesso |
| phone, address, cpf_cnpj, avatar, bio, birth_date | |
| email_notifications, push_notifications, weekly_reports | |
| theme_preference | light \| dark \| auto |
| language | pt-br \| en \| es |
| timezone | America/Sao_Paulo \| Manaus \| Rio_Branco |

### PerfilAcesso

`nome`, `descricao`, `permissoes` (JSON `{ modulo: { acao: bool } }`), `is_sistema`, `ativo`, `criado_por`

### AuditoriaPermissoes

Tipos: perfil/usuário criado/editado/excluído, perfil atribuído, ativado/desativado, acesso negado + IP/UA.

---

## 6. Coordenador (apenas WACRM — extensão)

Não existe model no O Candidato. Spec mínima sugerida (já iniciada no WACRM) + campos a **espelhar** de liderança quando fizer sentido:

Obrigatórios sugeridos: `account_id`, `name`, `status` (active\|inactive).  
Opcionais alinhados à liderança: `phone`, `email`, `photo`, `notes`, `user_id` (login opcional).

Cada liderança passa a ter **FK obrigatória** para coordenador.

---

## 7. Lideranças (`liderancas.Leadership`)

### Dados pessoais

| Campo | Obrig. | Choices / notas |
|-------|--------|-----------------|
| photo | não | Image |
| name | sim | Nome completo |
| nickname | não | |
| cpf | sim | unique; máscara `999.999.999-99` |
| birth_date | sim | `dd/mm/yyyy` |
| gender | sim | M \| F \| O |
| marital_status | sim | solteiro, casado, divorciado, viuvo, uniao_estavel |
| mother_name | não | |

### Dados eleitorais

| Campo | Obrig. |
|-------|--------|
| voter_title | não | máscara título |
| electoral_zone | não | |
| electoral_section | não | |

### Contato / redes

| Campo | Obrig. |
|-------|--------|
| phone | sim | WhatsApp; máscara |
| email | não | |
| instagram, facebook, twitter | não | |

### Endereço

| Campo | Obrig. |
|-------|--------|
| cep | sim | ViaCEP |
| address (logradouro) | sim | |
| number | sim | |
| neighborhood | sim | |
| city | sim | |
| state | sim | UF 2 chars |
| city_zone | não | ver §17 zonas |
| complement | não | |
| latitude, longitude | não | geocode / readonly no form |

### Profissional / campanha

| Campo | Obrig. | Notes |
|-------|--------|--------|
| status | sim | active \| inactive \| dismissed \| vacation |
| salary | não | decimal; máscara money |
| admission_date | não | |
| estimated_votes | não | int ≥ 0 |
| commitment_level | não | FK catálogo |
| bond_type | não | FK catálogo |
| segments | M2M | catálogo |
| flags | M2M | catálogo |
| internal_notes | não | só equipe; oculto da liderança |

### Link público de cadastro de apoiadores

| Campo | Notes |
|-------|--------|
| registration_token | UUID único |
| registration_slug | único por tenant (quando preenchido) |
| URL | `/{tenant_slug}/.../{slug}` (ver views `public_register`) |

### Relação usuário

- `user` OneToOne opcional → cria login da liderança  
- Form extra: `password`, `confirm_password`, `perfil_acesso`

### Catálogos (tenant-scoped)

Todos: `name`, `color` (slate/red/orange/yellow/green/blue/purple/pink), `is_active`, `order`, unique `(tenant, name)`

- `LeadershipSegment` (Segmentos)
- `LeadershipFlag` (Bandeiras)
- `LeadershipCommitmentLevel` (Grau de comprometimento)
- `LeadershipBondType` (Vínculo)

### Metas (`Goal`) — mesmo app

| Campo | Choices |
|-------|---------|
| goal_type | general \| individual |
| title | |
| objective | supporters \| demands |
| target_quantity | |
| start_date, end_date | |
| motivational_message | |
| status | active \| completed \| expired \| cancelled |
| leaderships | M2M (vazio = geral) |
| created_by | |

Progresso: conta apoiadores `origem=novo` ou demandas no período (ver `get_progress` no model).

---

## 8. Apoiadores (`apoiadores.Supporter`)

| Campo | Obrig. | Notes |
|-------|--------|--------|
| leadership | sim | FK (no WACRM: via coordenador) |
| name | sim | |
| nickname | não | |
| profession | não | |
| gender | sim | M \| F \| O |
| marital_status | sim | single, married, widowed, separated, stable_union |
| birth_date | sim | `dd/mm/yyyy` |
| phone | sim | WhatsApp; unicidade por tenant no form |
| cep, address, number, neighborhood, city, state | sim | |
| city_zone | não | |
| complement | não | |
| latitude, longitude | não | |
| notes | não | |
| whatsapp_opt_out | bool | default false |
| whatsapp_opt_out_date | datetime? | |
| status_validacao | pendente \| valido \| invalido | default pendente |
| validado_por, validado_em, validacao_origem | manual \| whatsapp | |
| status_conquista | positivo \| a_conquistar \| negativo \| nao_informado | |
| origem | novo \| importado | |

Form de criação **exclui** do input: validação e origem (sistema define).

### Familiares (`FamilyMember`)

| Campo | Obrig. | Choices parentesco |
|-------|--------|-------------------|
| name | sim | |
| relationship | sim | spouse, father, mother, son, sibling, other |
| birth_date | sim | |
| phone | não | |

### Telas / fluxos a espelhar

- Lista com filtros (liderança, validação, conquista, origem, cidade/bairro/zona)
- Detalhe + editar
- Validação em lote / individual
- Importação de base antiga
- Cadastro público via link da liderança
- Sync com contatos WhatsApp no WACRM quando houver telefone

---

## 9. Demandas (`demandas`)

### Catálogos (tenant): Type, Priority, Situation, Classification, Area

Campos: `name`, `color`, `is_active`, `order`

### InternalDemand (interna e externa no mesmo model)

| Campo | Notes |
|-------|--------|
| protocol | único; DEMI… / DEME… (signal) |
| source | internal \| external |
| leadership | FK? (interna) |
| supporter | FK? |
| external_name, external_phone, external_birth_date | externa |
| demand_type, priority, situation, classification, area | FKs tratamento (admin) |
| title, description | |
| endereço completo + lat/lng | como apoiador |
| status | pending \| in_progress \| resolved \| cancelled |

### DemandHistory

Alterações de campos de tratamento: `field_name`, `field_display_name`, `old_value`, `new_value`, `user`, `timestamp`

### DemandAttachment

`file`, `uploaded_at`

### ExternalDemandSettings (portal público)

`page_title`, `page_subtitle`, `primary_color`, `header_type` color\|image, `header_image`, `logo`, `success_message` (com `{protocolo}`)

---

## 10. Estoque (`estoque`)

- **CategoriaEstoque:** nome, descricao, cor, ativo  
- **UnidadeMedida:** nome, sigla, ativo  
- **Parceiro:** nome, documento, telefone, email, endereco, observacoes, ativo  
- **Material:** nome, codigo_sku?, categoria, unidade, estoque_minimo, estoque_atual, descricao, observacoes_internas, ativo, criado_por  
- **MovimentacaoEstoque:** tipo entrada\|saida\|devolucao; destinatário lideranca\|parceiro; FK liderança/parceiro; observacoes; movimentacao_origem  
- **ItemMovimentacao:** material, quantidade, quantidade_devolvida, observacoes  

---

## 11. Financeiro (`financeiro`)

- **CategoriaFinanceira:** nome, tipo receita\|despesa, cor, icone, descricao, ativa  
- **FormaPagamento:** nome, tipo (dinheiro, credito, debito, pix, ticket_combustivel, transferencia, cheque, outros), taxa_percentual, observacoes, ativa  
- **Veiculo:** modelo, placa unique, tipo, ano, cor, renavam, chassi, status, km_atual, observacoes  
- **LancamentoFinanceiro:** tipo, categoria, forma_pagamento?, descricao, valor, data_vencimento, data_pagamento?, status pendente\|pago\|cancelado, observacoes, comprovante, veiculo?  
- **FolhaPagamento:** mes/ano referência unique por tenant, status aberta\|processada\|paga\|cancelada, valores, datas  
- **ItemFolhaPagamento:** lideranca, valor_base, bonus, descontos, valor_liquido, forma_pagamento?, pago, comprovante  

---

## 12. Agenda (`agenda`)

- **CategoriaAgenda / StatusAgenda:** nome, cor, icone, ativo (, ordem em categoria)  
- **Agendamento:** titulo, data_hora, local, localizacao, responsavel, categoria?, status?, observacoes  

---

## 13. Propostas (`propostas`)

- **CategoriaPropostas:** nome, cor, icone, ordem, ativa  
- **Proposta:** categoria, titulo, resumo (≤500), texto, imagem?, anexo PDF?, status ativa\|inativa, visualizacoes  

---

## 14. Molduras (`molduras`)

- **ConfiguracaoMoldura:** slug público `/molduras/{slug}`, logotipo, imagem_header, cor_primaria, titulo, descricao, ativo, total_visualizacoes  
- **Moldura:** nome, tipo perfil (2000×2000) \| storie (1080×1920), arquivo, miniatura, ordem, ativo, total_downloads  
- **DownloadMoldura:** ip, user_agent  

---

## 15. QR Codes (`qrcode`)

- **CategoriaQRCode:** nome, cor, icone, ativo, ordem  
- **QRCode:** nome_interno, categoria?, url_destino, slug único, notas, status ativo\|inativo, total_acessos, ultimo_acesso  
- **AcessoQRCode:** UA, tipo dispositivo, OS, navegador, geo, referrer  
- **HistoricoURLQRCode:** url_anterior/nova, alterado_por  

---

## 16. Resultados eleitorais (`resultados_eleitorais`)

### Global (sem tenant)

ImportacaoEleitoral, CandidatoEleitoral, ResultadoEleitoral (mun/zona), PerfilEleitorado, LocalVotacao + tabelas de controle de importação.

### Por tenant

- VotacaoSecaoCandidato (candidato vinculado ao tenant)  
- ImportacaoVotacaoSecao  
- Campos `candidato_*` no Tenant para “Meu Desempenho”

---

## 17. Resumo do Dia (`resumo_diario`)

`ResumoDiarioConfig`: enviar_automatico, horario_envio, timezone, destinatarios (WA), toggles incluir_* (apoiadores, demandas int/ext, estoque, financeiro, metas, agenda), ultimo_envio.  
*(Evolution auxiliar: não portar; usar canal WhatsApp do WACRM.)*

---

## 18. Notificações (`notifications`)

Tipos: supporter_*, demand_*, goal_*, stock_*, leadership_*, system.  
Campos: recipient, title, message, priority low\|normal\|high\|urgent, data JSON, action_url, is_read, read_at.

*(WACRM já tem notificações de inbox — unificar ou separar por tipo de produto.)*

---

## 19. Core auxiliar

- **MunicipioCalha:** UF + município → calha/região (ex. Amazonas)  
- **city_zones:** hoje **Manaus-centric** (Norte/Sul/Leste/Oeste/Centro-Oeste/Centro-Sul/Rural + mapa bairro→zona). Decidir se fica configurável por tenant.

---

## 20. WhatsApp

| O Candidato | WACRM |
|-------------|--------|
| Evolution + opcional Meta | Meta Cloud API + inbox/pipelines/broadcasts/agents |
| Contatos de apoiadores | `contacts` + link `campaign_supporters.contact_id` |

**Não** reimplementar Evolution. Integrar apoiadores/demandas ao CRM WhatsApp existente.

---

## 21. Gap atual WACRM vs O Candidato

| Área | O Candidato | WACRM hoje |
|------|-------------|------------|
| Coordenador entidade | Não | Sim (MVP enxuto) |
| Liderança campos completos | Sim | Parcial (name/phone/email/city…) |
| Apoiador campos completos | Sim | Parcial |
| Familiares | Sim | Não |
| Catálogos liderança | Sim | Não |
| Metas | Sim | Não |
| Demandas + portal | Sim | Não |
| Estoque / Financeiro / Agenda / Propostas / Molduras / QR / TSE / Resumo | Sim | Não |
| Perfis granulares | Sim | Roles owner/admin/agent/viewer |
| Asaas | Sim | Checkout/webhook básico |
| Superadmin tenants | Sim | Lista + patch plano/status |
| WhatsApp CRM | Evolution-heavy | Suite WACRM completa |

---

## 22. Ordem sugerida de portabilidade (campos 1:1)

1. **Expandir Lideranças** (todos os campos + catálogos + link público)  
2. **Expandir Apoiadores** (todos os campos + familiares + validação + importação)  
3. **Ajustar Coordenador** (campos ricos + FK em liderança; UI espelhando lista/detalhe)  
4. **Demandas** (+ catálogos + portal externo)  
5. **Metas**  
6. **Agenda**  
7. **Estoque**  
8. **Financeiro** (+ folha)  
9. **Propostas**  
10. **QR Codes**  
11. **Molduras**  
12. **Resultados TSE**  
13. **Resumo do Dia**  
14. **Controle de acesso granular** (se desejado além dos roles WACRM)  
15. **White-label tenant** (logo/cores)

A cada item: ler `o_candidato/apps/<modulo>/` completo antes de migrar schema/UI.

---

## 23. Convenções de implementação no WACRM

- Migrations SQL em `supabase/migrations/` com comentários **pt-BR**  
- Tabelas sugeridas: `campaign_*` (ou nomes alinhados) com `account_id` + RLS `is_account_member`  
- i18n: `messages/pt-BR.json`  
- Forms: mesmos labels/choices; máscaras CEP/CPF/telefone/data BR  
- Não commit de secrets; Asaas via env  
- Commit/push conforme regra do repo após entregas

---

## 24. Checklist por módulo (antes de marcar “feito”)

- [ ] Li `models.py` + `forms.py` (+ views/templates se existirem) em `o_candidato`  
- [ ] Schema WACRM tem **todos** os campos listados neste doc  
- [ ] Choices e defaults iguais  
- [ ] Lista + formulário criar/editar + detalhe cobrem os campos  
- [ ] Relacionamentos (FK/M2M) e regras de unicidade  
- [ ] Fluxos extras (público, import, validação, histórico) se existirem na ref.  
- [ ] i18n pt-BR  
- [ ] Atualizei este `.md` se a referência mudou  

---

*Gerado a partir da leitura dos models/forms/permissions/sidebar do O Candidato em 2026-08-03. Atualizar sempre que a referência ou o escopo WACRM mudar.*
