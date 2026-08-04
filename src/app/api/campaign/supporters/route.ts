import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { getCampaignScope, isLeadershipScope } from "@/lib/campaign/scope";

function emptyToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** GET/POST /api/campaign/supporters */
export async function GET(request: Request) {
  try {
    const ctx = await requireRole("viewer");
    const url = new URL(request.url);
    let leadershipId = url.searchParams.get("leadershipId");
    const scope = await getCampaignScope(ctx);
    if (isLeadershipScope(scope)) {
      leadershipId = scope.leadershipId;
    }

    let q = ctx.supabase
      .from("campaign_supporters")
      .select(
        "*, campaign_leaderships(id, name), campaign_supporter_family_members(*)",
      )
      .eq("account_id", ctx.accountId)
      .order("created_at", { ascending: false })
      .limit(300);

    if (leadershipId) q = q.eq("leadership_id", leadershipId);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      supporters: data ?? [],
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
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    let leadershipId = emptyToNull(body.leadershipId);
    if (isLeadershipScope(scope)) {
      leadershipId = scope.leadershipId;
    }
    if (!leadershipId || !String(body.name ?? "").trim()) {
      return NextResponse.json(
        { error: "Liderança e nome são obrigatórios" },
        { status: 400 },
      );
    }

    const { data: lead } = await ctx.supabase
      .from("campaign_leaderships")
      .select("id")
      .eq("id", leadershipId)
      .eq("account_id", ctx.accountId)
      .maybeSingle();
    if (!lead) {
      return NextResponse.json({ error: "Liderança inválida" }, { status: 400 });
    }

    const phone = emptyToNull(body.phone) ?? "";
    if (phone) {
      const { data: dup } = await ctx.supabase
        .from("campaign_supporters")
        .select("id")
        .eq("account_id", ctx.accountId)
        .eq("phone", phone)
        .maybeSingle();
      if (dup) {
        return NextResponse.json(
          { error: "Já existe apoiador com este WhatsApp nesta conta" },
          { status: 409 },
        );
      }
    }

    let contactId: string | null = null;
    if (phone) {
      const { data: existing } = await ctx.supabase
        .from("contacts")
        .select("id")
        .eq("account_id", ctx.accountId)
        .eq("phone", phone)
        .maybeSingle();
      if (existing) {
        contactId = existing.id;
        await ctx.supabase
          .from("contacts")
          .update({ name: String(body.name).trim() })
          .eq("id", existing.id);
      } else {
        const { data: created } = await ctx.supabase
          .from("contacts")
          .insert({
            account_id: ctx.accountId,
            user_id: ctx.userId,
            phone,
            name: String(body.name).trim(),
          })
          .select("id")
          .single();
        if (created) contactId = created.id;
      }
    }

    const insert = {
      account_id: ctx.accountId,
      leadership_id: leadershipId,
      contact_id: contactId,
      name: String(body.name).trim(),
      nickname: emptyToNull(body.nickname),
      profession: emptyToNull(body.profession),
      gender: emptyToNull(body.gender),
      marital_status: emptyToNull(body.marital_status),
      birth_date: emptyToNull(body.birth_date),
      phone: phone || null,
      email: emptyToNull(body.email),
      cep: emptyToNull(body.cep),
      address: emptyToNull(body.address),
      address_number: emptyToNull(body.address_number),
      neighborhood: emptyToNull(body.neighborhood),
      city_zone: emptyToNull(body.city_zone),
      city: emptyToNull(body.city),
      state: emptyToNull(body.state),
      complement: emptyToNull(body.complement),
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      notes: emptyToNull(body.notes),
      status_conquista:
        emptyToNull(body.status_conquista) ?? "nao_informado",
      origem: "novo",
      status_validacao: "pendente",
    };

    const { data, error } = await ctx.supabase
      .from("campaign_supporters")
      .insert(insert)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const family = Array.isArray(body.family) ? body.family : [];
    if (family.length) {
      const rows = family
        .filter((f: { name?: string }) => f?.name?.trim())
        .map(
          (f: {
            name: string;
            relationship: string;
            birth_date: string;
            phone?: string;
          }) => ({
            account_id: ctx.accountId,
            supporter_id: data.id,
            name: f.name.trim(),
            relationship: f.relationship,
            birth_date: f.birth_date,
            phone: emptyToNull(f.phone),
          }),
        );
      if (rows.length) {
        await ctx.supabase.from("campaign_supporter_family_members").insert(rows);
      }
    }

    return NextResponse.json({ supporter: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
