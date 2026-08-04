import { NextResponse } from "next/server";

import {
  ForbiddenError,
  requireRole,
  toErrorResponse,
} from "@/lib/auth/account";
import { getCampaignScope, isLeadershipScope } from "@/lib/campaign/scope";

type Ctx = { params: Promise<{ id: string }> };

function emptyToNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** PATCH /api/campaign/leaderships/[id] */
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const ctx = await requireRole("agent");
    const { id } = await params;
    const scope = await getCampaignScope(ctx);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (isLeadershipScope(scope) && scope.leadershipId !== id) {
      throw new ForbiddenError("Só pode editar o próprio perfil de liderança");
    }

    const allowLeadershipSelf = new Set([
      "phone",
      "email",
      "instagram",
      "facebook",
      "twitter",
      "cep",
      "address",
      "address_number",
      "neighborhood",
      "city",
      "state",
      "city_zone",
      "complement",
      "nickname",
    ]);
    const allowTeam = new Set([
      ...allowLeadershipSelf,
      "name",
      "cpf",
      "birth_date",
      "gender",
      "marital_status",
      "mother_name",
      "voter_title",
      "electoral_zone",
      "electoral_section",
      "status",
      "salary",
      "admission_date",
      "estimated_votes",
      "commitment_level_id",
      "bond_type_id",
      "internal_notes",
      "photo_url",
      "coordinator_id",
      "latitude",
      "longitude",
    ]);

    const allowed = isLeadershipScope(scope) ? allowLeadershipSelf : allowTeam;
    const patch: Record<string, unknown> = {};

    for (const key of allowed) {
      if (!(key in body)) continue;
      if (
        key === "salary" ||
        key === "estimated_votes" ||
        key === "latitude" ||
        key === "longitude"
      ) {
        const v = body[key];
        patch[key] = v === "" || v == null ? null : v;
      } else {
        patch[key] = emptyToNull(body[key]);
      }
    }

    if (Object.keys(patch).length === 0 && !("segment_ids" in body) && !("flag_ids" in body)) {
      return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
    }

    if (Object.keys(patch).length) {
      const { error } = await ctx.supabase
        .from("campaign_leaderships")
        .update(patch)
        .eq("id", id)
        .eq("account_id", ctx.accountId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (!isLeadershipScope(scope)) {
      if (Array.isArray(body.segment_ids)) {
        await ctx.supabase
          .from("campaign_leadership_segment_links")
          .delete()
          .eq("leadership_id", id);
        const ids = body.segment_ids as string[];
        if (ids.length) {
          await ctx.supabase.from("campaign_leadership_segment_links").insert(
            ids.map((segment_id) => ({ leadership_id: id, segment_id })),
          );
        }
      }
      if (Array.isArray(body.flag_ids)) {
        await ctx.supabase
          .from("campaign_leadership_flag_links")
          .delete()
          .eq("leadership_id", id);
        const ids = body.flag_ids as string[];
        if (ids.length) {
          await ctx.supabase.from("campaign_leadership_flag_links").insert(
            ids.map((flag_id) => ({ leadership_id: id, flag_id })),
          );
        }
      }
    }

    const { data } = await ctx.supabase
      .from("campaign_leaderships")
      .select("*")
      .eq("id", id)
      .single();

    return NextResponse.json({ leadership: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
