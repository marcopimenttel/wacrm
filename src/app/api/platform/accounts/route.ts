import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { isPlatformAdminEmail } from "@/lib/saas/platform-admin";

/**
 * GET /api/platform/accounts
 * Lista contas (tenants) para o superadmin da plataforma.
 * Exige usuário autenticado cujo e-mail está em PLATFORM_ADMIN_EMAILS.
 */
export async function GET() {
  try {
    const ctx = await requireRole("viewer");
    const { data: userData } = await ctx.supabase.auth.getUser();
    const email = userData.user?.email;
    if (!isPlatformAdminEmail(email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Service role não configurada" },
        { status: 500 },
      );
    }

    const admin = createServiceClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

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
