import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { getCampaignScope } from "@/lib/campaign/scope";

/** GET /api/campaign/me — escopo + slug da conta para links públicos. */
export async function GET() {
  try {
    const ctx = await requireRole("viewer");
    const scope = await getCampaignScope(ctx);
    const { data: account } = await ctx.supabase
      .from("accounts")
      .select("slug, name")
      .eq("id", ctx.accountId)
      .maybeSingle();

    return NextResponse.json({
      scope: scope.kind,
      myLeadershipId: scope.leadershipId,
      accountSlug: account?.slug ?? null,
      accountName: account?.name ?? ctx.account.name,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
