import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { isSubscriptionStatus } from "@/lib/saas/modules";
import { isPlatformAdminEmail } from "@/lib/saas/platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";

async function requirePlatformAdmin() {
  const ctx = await requireRole("viewer");
  const { data: userData } = await ctx.supabase.auth.getUser();
  if (!isPlatformAdminEmail(userData.user?.email)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ctx };
}

/**
 * GET /api/platform/accounts
 * Lista contas (tenants) para o superadmin da plataforma.
 */
export async function GET() {
  try {
    const gate = await requirePlatformAdmin();
    if ("error" in gate && gate.error) return gate.error;

    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("accounts")
      .select(
        "id, name, owner_user_id, subscription_status, trial_ends_at, created_at, plan_id, plans(key, name)",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[platform/accounts]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []).map((row) => {
      const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
      return {
        id: row.id,
        name: row.name,
        owner_user_id: row.owner_user_id,
        subscription_status: row.subscription_status,
        trial_ends_at: row.trial_ends_at,
        created_at: row.created_at,
        plan_key: plan?.key ?? null,
        plan_name: plan?.name ?? null,
      };
    });

    return NextResponse.json({ accounts: rows });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * PATCH /api/platform/accounts
 * Body: { accountId, planKey?, subscriptionStatus? }
 */
export async function PATCH(request: Request) {
  try {
    const gate = await requirePlatformAdmin();
    if ("error" in gate && gate.error) return gate.error;

    const body = (await request.json().catch(() => ({}))) as {
      accountId?: string;
      planKey?: string;
      subscriptionStatus?: string;
    };

    if (!body.accountId) {
      return NextResponse.json({ error: "accountId obrigatório" }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const patch: Record<string, unknown> = {};

    if (body.planKey) {
      const { data: plan } = await admin
        .from("plans")
        .select("id")
        .eq("key", body.planKey)
        .maybeSingle();
      if (!plan) {
        return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
      }
      patch.plan_id = plan.id;
    }

    if (body.subscriptionStatus) {
      if (!isSubscriptionStatus(body.subscriptionStatus)) {
        return NextResponse.json({ error: "Status inválido" }, { status: 400 });
      }
      patch.subscription_status = body.subscriptionStatus;
      if (body.subscriptionStatus === "active") {
        patch.trial_ends_at = null;
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
    }

    const { error } = await admin
      .from("accounts")
      .update(patch)
      .eq("id", body.accountId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
