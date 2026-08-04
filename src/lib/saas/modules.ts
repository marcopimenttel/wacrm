/**
 * Catálogo de módulos SaaS + helpers.
 *
 * As chaves espelham `plan_modules.module_key` (migration 037).
 * O grupo WhatsApp tem pai (`whatsapp`) e filhos por rota, para
 * vender o pacote inteiro ou fatiar no futuro.
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

/** Chaves de roadmap — só entram no plano quando o módulo existir. */
export const CAMPAIGN_MODULES = [
  "campaign.leaderships",
  "campaign.supporters",
  "campaign.demands",
  "campaign.goals",
  "campaign.agenda",
  "campaign.stock",
  "campaign.finance",
  "campaign.tse",
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
  | "canceled";

export function isSubscriptionStatus(
  value: unknown,
): value is SubscriptionStatus {
  return (
    value === "trial" ||
    value === "active" ||
    value === "past_due" ||
    value === "canceled"
  );
}

/**
 * Indica se a conta pode usar o módulo.
 * - Lista vazia/ausente → libera (fail-open na transição).
 * - Pai `whatsapp` libera todos os filhos `whatsapp.*`.
 * - past_due / canceled ainda veem módulos; o bloqueio duro vem com o checkout.
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
  return false;
}

export function moduleForPath(pathname: string): ModuleKey | null {
  if (ROUTE_MODULE[pathname]) return ROUTE_MODULE[pathname];
  const match = Object.entries(ROUTE_MODULE).find(([path]) =>
    pathname.startsWith(path),
  );
  return match ? match[1] : null;
}
