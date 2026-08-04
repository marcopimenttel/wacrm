import type { AccountContext } from "@/lib/auth/account";

export type CampaignScope =
  | { kind: "team"; leadershipId: null }
  | { kind: "leadership"; leadershipId: string };

/**
 * Se o usuário está vinculado a uma liderança, o escopo limita
 * apoiadores/listas àquela liderança (como no O Candidato).
 */
export async function getCampaignScope(
  ctx: AccountContext,
): Promise<CampaignScope> {
  const { data } = await ctx.supabase
    .from("campaign_leaderships")
    .select("id")
    .eq("account_id", ctx.accountId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (data?.id) {
    return { kind: "leadership", leadershipId: data.id };
  }
  return { kind: "team", leadershipId: null };
}

export function isLeadershipScope(
  scope: CampaignScope,
): scope is Extract<CampaignScope, { kind: "leadership" }> {
  return scope.kind === "leadership";
}
