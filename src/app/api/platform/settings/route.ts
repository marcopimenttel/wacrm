import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/auth/account";
import { requirePlatformAdmin } from "@/lib/saas/require-platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * GET público (anon/authed) — branding da plataforma no login.
 * PATCH — só superadmin.
 */
export async function GET() {
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("platform_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      settings: data ?? {
        site_name: "WACRM",
        login_title: "Bem-vindo de volta",
        login_subtitle: "Entre para gerenciar sua campanha.",
        login_promo_title: "Tecnologia a serviço da estratégia política.",
        footer_text: "© WACRM — Todos os direitos reservados.",
        primary_color: "#2563eb",
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requirePlatformAdmin();
    if ("error" in gate && gate.error) return gate.error;
    const { admin } = gate;

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const allowed = [
      "site_name",
      "login_title",
      "login_subtitle",
      "login_promo_title",
      "footer_text",
      "login_logo_url",
      "sidebar_logo_url",
      "sidebar_logo_collapsed_url",
      "logo_dark_url",
      "favicon_url",
      "login_background_url",
      "primary_color",
    ] as const;

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (typeof body[key] === "string") {
        patch[key] = (body[key] as string).trim() || null;
      }
    }

    const { error } = await admin
      .from("platform_settings")
      .upsert({ id: 1, ...patch });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
