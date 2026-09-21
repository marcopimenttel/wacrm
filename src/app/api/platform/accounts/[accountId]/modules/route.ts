import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/auth/account";
import { requirePlatformAdmin } from "@/lib/saas/require-platform-admin";

type Ctx = { params: Promise<{ accountId: string }> };

/**
 * GET/PUT /api/platform/accounts/[accountId]/modules
 * Override de módulos por tenant.
 */
export async function GET(_request: Request, { params }: Ctx) {
  try {
    const gate = await requirePlatformAdmin();
    if ("error" in gate && gate.error) return gate.error;
    const { admin } = gate;
    const { accountId } = await params;

    const { data, error } = await admin
      .from("account_modules")
      .select("module_key, enabled")
      .eq("account_id", accountId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ modules: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PUT(request: Request, { params }: Ctx) {
  try {
    const gate = await requirePlatformAdmin();
    if ("error" in gate && gate.error) return gate.error;
    const { admin } = gate;
    const { accountId } = await params;

    const body = (await request.json().catch(() => ({}))) as {
      modules?: { module_key: string; enabled: boolean }[];
    };

    await admin.from("account_modules").delete().eq("account_id", accountId);

    if (body.modules?.length) {
      const { error } = await admin.from("account_modules").insert(
        body.modules.map((m) => ({
          account_id: accountId,
          module_key: m.module_key,
          enabled: m.enabled,
        })),
      );
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
