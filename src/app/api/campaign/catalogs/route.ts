import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { getCampaignScope, isLeadershipScope } from "@/lib/campaign/scope";

type CatalogKind =
  | "segments"
  | "flags"
  | "commitment_levels"
  | "bond_types"
  | "city_zones";

const TABLE: Record<CatalogKind, string> = {
  segments: "campaign_leadership_segments",
  flags: "campaign_leadership_flags",
  commitment_levels: "campaign_leadership_commitment_levels",
  bond_types: "campaign_leadership_bond_types",
  city_zones: "campaign_city_zones",
};

/** GET /api/campaign/catalogs?kind=segments|flags|... */
export async function GET(request: Request) {
  try {
    const ctx = await requireRole("viewer");
    const kind = new URL(request.url).searchParams.get("kind") as CatalogKind | null;
    if (!kind || !TABLE[kind]) {
      return NextResponse.json({ error: "kind inválido" }, { status: 400 });
    }

    const { data, error } = await ctx.supabase
      .from(TABLE[kind])
      .select("*")
      .eq("account_id", ctx.accountId)
      .order("sort_order")
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** POST — cria item de catálogo (admin+; não disponível para liderança). */
export async function POST(request: Request) {
  try {
    const ctx = await requireRole("admin");
    const scope = await getCampaignScope(ctx);
    if (isLeadershipScope(scope)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      kind?: CatalogKind;
      name?: string;
      color?: string;
    };
    if (!body.kind || !TABLE[body.kind] || !body.name?.trim()) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const row: Record<string, unknown> = {
      account_id: ctx.accountId,
      name: body.name.trim(),
      is_active: true,
      sort_order: 0,
    };
    if (body.kind !== "city_zones") {
      row.color = body.color?.trim() || "slate";
    }

    const { data, error } = await ctx.supabase
      .from(TABLE[body.kind])
      .insert(row)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
