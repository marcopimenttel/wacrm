/**
 * Catálogo de módulos SaaS + helpers.
 *
 * As chaves espelham `plan_modules.module_key` (migrations 037/038).
 * Grupos: `whatsapp` e `campaign` com filhos por rota.
 */

export const WHATSAPP_MODULES = [
  "whatsapp",
  "whatsapp.dashboard",
  "whatsapp.inbox",
  "whatsapp.notifications",
  "whatsapp.contacts",
  "whatsapp.pipelines",
  "whatsapp.broadcasts",
  "whatsapp.automations",
  "whatsapp.flows",
  "whatsapp.agents",
] as const;

/** Hierarquia: Account → Coordenador → Liderança → Apoiador. */
export const CAMPAIGN_MODULES = [
  "campaign",
  "campaign.coordinators",
  "campaign.leaderships",
  "campaign.supporters",
  "campaign.demands",
  "campaign.goals",
  "campaign.agenda",
  "campaign.stock",
  "campaign.finance",
  "campaign.tse",
] as const;

/** Catálogo completo para UI de planos / overrides. */
export const ALL_MODULE_KEYS = [
  ...WHATSAPP_MODULES,
  ...CAMPAIGN_MODULES,
] as const;

export type WhatsappModule = (typeof WHATSAPP_MODULES)[number];
export type CampaignModule = (typeof CAMPAIGN_MODULES)[number];
export type ModuleKey = WhatsappModule | CampaignModule | (string & {});

/** Rotas do dashboard → módulo obrigatório. */
export const ROUTE_MODULE: Record<string, ModuleKey> = {
  "/dashboard": "whatsapp.dashboard",
  "/inbox": "whatsapp.inbox",
  "/notifications": "whatsapp.notifications",
  "/contacts": "whatsapp.contacts",
  "/pipelines": "whatsapp.pipelines",
  "/broadcasts": "whatsapp.broadcasts",
  "/automations": "whatsapp.automations",
  "/flows": "whatsapp.flows",
  "/agents": "whatsapp.agents",
  "/campaign/coordinators": "campaign.coordinators",
  "/campaign/leaderships": "campaign.leaderships",
  "/campaign/supporters": "campaign.supporters",
};

/** Rótulos amigáveis (pt-BR) para exibir módulos na UI. */
export const MODULE_LABEL_PT: Record<string, string> = {
  whatsapp: "Suite WhatsApp",
  "whatsapp.dashboard": "Painel WhatsApp",
  "whatsapp.inbox": "Caixa de entrada",
  "whatsapp.notifications": "Notificações",
  "whatsapp.contacts": "Contatos",
  "whatsapp.pipelines": "Funis",
  "whatsapp.broadcasts": "Disparos",
  "whatsapp.automations": "Automações",
  "whatsapp.flows": "Fluxos",
  "whatsapp.agents": "Agentes de IA",
  campaign: "Suite Campanha",
  "campaign.coordinators": "Coordenadores",
  "campaign.leaderships": "Lideranças",
  "campaign.supporters": "Apoiadores",
  "campaign.demands": "Demandas",
  "campaign.goals": "Metas",
  "campaign.agenda": "Agenda",
  "campaign.stock": "Estoque",
  "campaign.finance": "Financeiro",
  "campaign.tse": "Resultados TSE",
};

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "canceled"
  | "blocked";

export function isSubscriptionStatus(
  value: unknown,
): value is SubscriptionStatus {
  return (
    value === "trial" ||
    value === "active" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "blocked"
  );
}

/**
 * Indica se a conta pode usar o módulo.
 * - Lista vazia/ausente → libera (fail-open na transição).
 * - Pai `whatsapp` / `campaign` libera os filhos `*.`.
 * - Overrides em `account_modules` já devem estar mesclados em `enabledModules`.
 */
export function canUseModule(
  enabledModules: readonly string[] | null | undefined,
  moduleKey: ModuleKey,
): boolean {
  if (!enabledModules || enabledModules.length === 0) return true;
  if (enabledModules.includes(moduleKey)) return true;
  if (
    moduleKey.startsWith("whatsapp.") &&
    enabledModules.includes("whatsapp")
  ) {
    return true;
  }
  if (
    moduleKey.startsWith("campaign.") &&
    enabledModules.includes("campaign")
  ) {
    return true;
  }
  return false;
}

/**
 * Mescla módulos do plano com overrides por tenant.
 * `overrides`: mapa module_key → enabled.
 */
export function mergeModuleAccess(
  planModules: readonly string[] | null | undefined,
  overrides: Record<string, boolean> | null | undefined,
): string[] {
  const base = new Set(planModules ?? []);
  if (!overrides) return [...base];
  for (const [key, enabled] of Object.entries(overrides)) {
    if (enabled) base.add(key);
    else base.delete(key);
  }
  return [...base];
}

export function moduleForPath(pathname: string): ModuleKey | null {
  if (ROUTE_MODULE[pathname]) return ROUTE_MODULE[pathname];
  const match = Object.entries(ROUTE_MODULE).find(([path]) =>
    pathname.startsWith(path),
  );
  return match ? match[1] : null;
}
