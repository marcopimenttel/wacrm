/**
 * Quotas do plano — validação no create de recursos.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanQuotas = {
  max_supporters: number | null;
  max_leaderships: number | null;
  max_team_members: number | null;
};

export async function getAccountQuotas(
  supabase: SupabaseClient,
  accountId: string,
): Promise<PlanQuotas> {
  const { data } = await supabase
    .from("accounts")
    .select("plans(max_supporters, max_leaderships, max_team_members)")
    .eq("id", accountId)
    .maybeSingle();

  const plan = Array.isArray(data?.plans) ? data?.plans[0] : data?.plans;
  return {
    max_supporters: plan?.max_supporters ?? null,
    max_leaderships: plan?.max_leaderships ?? null,
    max_team_members: plan?.max_team_members ?? null,
  };
}

export async function assertUnderQuota(
  supabase: SupabaseClient,
  accountId: string,
  kind: "supporters" | "leaderships" | "team_members",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const quotas = await getAccountQuotas(supabase, accountId);
  const max =
    kind === "supporters"
      ? quotas.max_supporters
      : kind === "leaderships"
        ? quotas.max_leaderships
        : quotas.max_team_members;

  if (max == null) return { ok: true };

  let count = 0;
  if (kind === "supporters") {
    const { count: c } = await supabase
      .from("campaign_supporters")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId);
    count = c ?? 0;
  } else if (kind === "leaderships") {
    const { count: c } = await supabase
      .from("campaign_leaderships")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId);
    count = c ?? 0;
  } else {
    // Membros = perfis na conta + convites pendentes (ainda ocupam vaga)
    const { count: members } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId);
    const { count: pendingInvites } = await supabase
      .from("account_invitations")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString());
    count = (members ?? 0) + (pendingInvites ?? 0);
  }

  if (count >= max) {
    return {
      ok: false,
      error: `Limite do plano atingido (${count}/${max}). Faça upgrade ou peça ao administrador.`,
    };
  }
  return { ok: true };
}
