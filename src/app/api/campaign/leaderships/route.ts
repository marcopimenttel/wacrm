import { NextResponse } from "next/server";

import { requireRole, toErrorResponse, ForbiddenError } from "@/lib/auth/account";
import { getCampaignScope, isLeadershipScope } from "@/lib/campaign/scope";
import { nameSlugBase, uniqueSlug } from "@/lib/campaign/slug";

function emptyToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** GET/POST /api/campaign/leaderships */
export async function GET(request: Request) {
  try {
    const ctx = await requireRole("viewer");
    const url = new URL(request.url);
    const coordinatorId = url.searchParams.get("coordinatorId");

    let q = ctx.supabase
      .from("campaign_leaderships")
      .select(
        "*, campaign_coordinators(id, name), campaign_leadership_segment_links(segment_id), campaign_leadership_flag_links(flag_id)",
      )
      .eq("account_id", ctx.accountId)
      .order("name");

    if (coordinatorId) q = q.eq("coordinator_id", coordinatorId);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const scope = await getCampaignScope(ctx);
    const rows = (data ?? []).map((row) => {
      const out = { ...row } as Record<string, unknown>;
      if (isLeadershipScope(scope)) {
        delete out.internal_notes;
        delete out.salary;
      }
      out.segment_ids =
        (row.campaign_leadership_segment_links as { segment_id: string }[] | null)?.map(
          (l) => l.segment_id,
        ) ?? [];
      out.flag_ids =
        (row.campaign_leadership_flag_links as { flag_id: string }[] | null)?.map(
          (l) => l.flag_id,
        ) ?? [];
      delete out.campaign_leadership_segment_links;
      delete out.campaign_leadership_flag_links;
      return out;
    });

    return NextResponse.json({
      leaderships: rows,
      scope: scope.kind,
      myLeadershipId: scope.leadershipId,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("agent");
    const scope = await getCampaignScope(ctx);
    if (isLeadershipScope(scope)) {
      throw new ForbiddenError("Liderança não pode cadastrar outras lideranças");
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (!body.coordinatorId || !String(body.name ?? "").trim()) {
      return NextResponse.json(
        { error: "Coordenador e nome são obrigatórios" },
        { status: 400 },
      );
    }

    const { data: coord } = await ctx.supabase
      .from("campaign_coordinators")
      .select("id")
      .eq("id", body.coordinatorId)
      .eq("account_id", ctx.accountId)
      .maybeSingle();
    if (!coord) {
      return NextResponse.json({ error: "Coordenador inválido" }, { status: 400 });
    }

    const name = String(body.name).trim();
    const { data: existingSlugs } = await ctx.supabase
      .from("campaign_leaderships")
      .select("registration_slug")
      .eq("account_id", ctx.accountId);
    const taken = new Set(
      (existingSlugs ?? [])
        .map((r) => r.registration_slug as string | null)
        .filter(Boolean) as string[],
    );
    const registration_slug = uniqueSlug(nameSlugBase(name), taken);

    const insert = {
      account_id: ctx.accountId,
      coordinator_id: body.coordinatorId as string,
      name,
      nickname: emptyToNull(body.nickname),
      cpf: emptyToNull(body.cpf),
      birth_date: emptyToNull(body.birth_date),
      gender: emptyToNull(body.gender),
      marital_status: emptyToNull(body.marital_status),
      mother_name: emptyToNull(body.mother_name),
      voter_title: emptyToNull(body.voter_title),
      electoral_zone: emptyToNull(body.electoral_zone),
      electoral_section: emptyToNull(body.electoral_section),
      phone: emptyToNull(body.phone),
      email: emptyToNull(body.email),
      instagram: emptyToNull(body.instagram),
      facebook: emptyToNull(body.facebook),
      twitter: emptyToNull(body.twitter),
      cep: emptyToNull(body.cep),
      address: emptyToNull(body.address),
      address_number: emptyToNull(body.address_number),
      neighborhood: emptyToNull(body.neighborhood),
      city: emptyToNull(body.city),
      state: emptyToNull(body.state),
      city_zone: emptyToNull(body.city_zone),
      complement: emptyToNull(body.complement),
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      status: (body.status as string) || "active",
      salary: body.salary ?? null,
      admission_date: emptyToNull(body.admission_date),
      estimated_votes: body.estimated_votes ?? null,
      commitment_level_id: emptyToNull(body.commitment_level_id),
      bond_type_id: emptyToNull(body.bond_type_id),
      internal_notes: emptyToNull(body.internal_notes),
      registration_slug,
      photo_url: emptyToNull(body.photo_url),
    };

    const { data, error } = await ctx.supabase
      .from("campaign_leaderships")
      .insert(insert)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const segmentIds = Array.isArray(body.segment_ids)
      ? (body.segment_ids as string[])
      : [];
    const flagIds = Array.isArray(body.flag_ids) ? (body.flag_ids as string[]) : [];

    if (segmentIds.length) {
      await ctx.supabase.from("campaign_leadership_segment_links").insert(
        segmentIds.map((segment_id) => ({
          leadership_id: data.id,
          segment_id,
        })),
      );
    }
    if (flagIds.length) {
      await ctx.supabase.from("campaign_leadership_flag_links").insert(
        flagIds.map((flag_id) => ({
          leadership_id: data.id,
          flag_id,
        })),
      );
    }

    return NextResponse.json({ leadership: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
