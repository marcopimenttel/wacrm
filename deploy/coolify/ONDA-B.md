# Onda B — fechar comercial residual (concluída)

Data: **2026-09-23**

## Entregas

| Item | O quê |
|------|--------|
| Banner trial | `SubscriptionBanner` no dashboard: dias restantes + CTA Plano; urgente ≤3 dias; `past_due` em settings |
| Quota equipe | `assertUnderQuota(team_members)` no POST de convites (perfis + convites pendentes); redeem bloqueia se plano encolheu |
| Webhook Asaas | Tabela `asaas_webhook_events` + chave de idempotência; retries não reaplicam; estorno → `past_due` |

## Migration

- Arquivo: `supabase/migrations/041_asaas_webhook_events.sql`
- Aplicar no Supabase Cloud (já via MCP se disponível)

## Próximo: Onda C

Edição rica de tenant, CRUD de planos na UI, toggles de módulos.
