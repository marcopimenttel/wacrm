import { createServiceRoleClient } from "@/lib/supabase/service";
import { hashInviteToken } from "@/lib/auth/invitations";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

function rpcErrorToResponse(err: PostgrestError): NextResponse {
  if (err.code === "42501") {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err.code === "22023") {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err.code === "23505") {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
  console.error("[redeem] unexpected RPC error:", err);
  return NextResponse.json(
    { error: "Failed to redeem invitation" },
    { status: 500 },
  );
}

/**
 * Antes do RPC: se o plano encolheu após o convite, bloqueia o redeem
 * contando só perfis (o convite atual ainda não virou membro).
 */
async function assertRedeemUnderTeamQuota(
  tokenHash: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: invite } = await admin
    .from("account_invitations")
    .select("account_id, accepted_at, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!invite?.account_id) return { ok: true };
  if (invite.accepted_at) return { ok: true };
  if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
    return { ok: true };
  }

  const { data: account } = await admin
    .from("accounts")
    .select("plans(max_team_members)")
    .eq("id", invite.account_id)
    .maybeSingle();

  const plan = Array.isArray(account?.plans)
    ? account?.plans[0]
    : account?.plans;
  const max = plan?.max_team_members ?? null;
  if (max == null) return { ok: true };

  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("account_id", invite.account_id);

  if ((count ?? 0) >= max) {
    return {
      ok: false,
      error: `Limite do plano atingido (${count}/${max}). Peça um upgrade ao administrador.`,
    };
  }
  return { ok: true };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`redeem:${ip}`, RATE_LIMITS.invitationRedeem);
  if (!limit.success) return rateLimitResponse(limit);

  const { token } = await params;
  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { error: "Missing invitation token" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // O RPC verifica auth.uid(); falhar cedo evita round-trip no caso comum
  // de clicar no link antes de estar logado.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokenHash = hashInviteToken(token);
  const quota = await assertRedeemUnderTeamQuota(tokenHash);
  if (!quota.ok) {
    return NextResponse.json({ error: quota.error }, { status: 403 });
  }

  const { data: accountId, error } = await supabase.rpc("redeem_invitation", {
    p_token_hash: tokenHash,
  });

  if (error) return rpcErrorToResponse(error);

  return NextResponse.json({ ok: true, accountId });
}
