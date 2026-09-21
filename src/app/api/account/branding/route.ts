import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";

/**
 * PATCH /api/account/branding — white-label do tenant (admin+).
 */
export async function PATCH(request: Request) {
  try {
    const ctx = await requireRole("admin");
    const body = (await request.json().catch(() => ({}))) as {
      logo_url?: string;
      favicon_url?: string;
      primary_color?: string;
      name?: string;
    };

    const patch: Record<string, unknown> = {};
    if (typeof body.logo_url === "string") {
      patch.logo_url = body.logo_url.trim() || null;
    }
    if (typeof body.favicon_url === "string") {
      patch.favicon_url = body.favicon_url.trim() || null;
    }
    if (typeof body.primary_color === "string") {
      patch.primary_color = body.primary_color.trim() || null;
    }
    if (typeof body.name === "string" && body.name.trim()) {
      patch.name = body.name.trim();
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
    }

    const { error } = await ctx.supabase
      .from("accounts")
      .update(patch)
      .eq("id", ctx.accountId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
