/**
 * Helpers compartilhados do painel /platform (superadmin).
 */

import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/account";
import { isPlatformAdminEmail } from "@/lib/saas/platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function requirePlatformAdmin() {
  const ctx = await requireRole("viewer");
  const { data: userData } = await ctx.supabase.auth.getUser();
  const email = userData.user?.email ?? null;

  if (isPlatformAdminEmail(email)) {
    return { ctx, email, admin: createServiceRoleClient() };
  }

  // Também aceita e-mails persistidos em platform_admins (migration 040).
  if (email) {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("platform_admins")
      .select("email")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (data?.email) {
      return { ctx, email, admin };
    }
  }

  return {
    error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}
