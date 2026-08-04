/**
 * SaaS module catalogue + helpers.
 *
 * Module keys mirror `plan_modules.module_key` (migration 037).
 * The WhatsApp group is both a parent (`whatsapp`) and per-route
 * children so we can sell the suite or slice it later.
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

/** Roadmap keys — not enabled on default plans until features ship. */
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

/** Map dashboard routes → required module key. */
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
 * Whether the account may use a module.
 * - Empty / unknown module list → allow (fail-open during rollout).
 * - Parent `whatsapp` grants every `whatsapp.*` child.
 * - past_due / canceled still see modules but billing UI can warn;
 *   hard lock comes later with the checkout flow.
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
