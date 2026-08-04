import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";

/**
 * GET/POST /api/campaign/supporters
 * No POST, se houver telefone, cria/atualiza contact do CRM WhatsApp
 * e grava contact_id no apoiador.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireRole("viewer");
    const url = new URL(request.url);
    const leadershipId = url.searchParams.get("leadershipId");

    let q = ctx.supabase
      .from("campaign_supporters")
      .select("*, campaign_leaderships(id, name)")
      .eq("account_id", ctx.accountId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (leadershipId) {
      q = q.eq("leadership_id", leadershipId);
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ supporters: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("agent");
    const body = (await request.json().catch(() => ({}))) as {
      leadershipId?: string;
      name?: string;
      phone?: string;
      email?: string;
      city?: string;
      state?: string;
      neighborhood?: string;
      notes?: string;
    };

    if (!body.leadershipId || !body.name?.trim()) {
      return NextResponse.json(
        { error: "Liderança e nome são obrigatórios" },
        { status: 400 },
      );
    }

    const { data: lead } = await ctx.supabase
      .from("campaign_leaderships")
      .select("id")
      .eq("id", body.leadershipId)
      .eq("account_id", ctx.accountId)
      .maybeSingle();
    if (!lead) {
      return NextResponse.json({ error: "Liderança inválida" }, { status: 400 });
    }

    let contactId: string | null = null;
    const phone = body.phone?.trim() || "";
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
          .update({ name: body.name.trim() })
          .eq("id", existing.id);
      } else {
        const { data: created, error: cErr } = await ctx.supabase
          .from("contacts")
          .insert({
            account_id: ctx.accountId,
            user_id: ctx.userId,
            phone,
            name: body.name.trim(),
            email: body.email?.trim() || null,
          })
          .select("id")
          .single();
        if (!cErr && created) contactId = created.id;
      }
    }

    const { data, error } = await ctx.supabase
      .from("campaign_supporters")
      .insert({
        account_id: ctx.accountId,
        leadership_id: body.leadershipId,
        contact_id: contactId,
        name: body.name.trim(),
        phone: phone || null,
        email: body.email?.trim() || null,
        city: body.city?.trim() || null,
        state: body.state?.trim() || null,
        neighborhood: body.neighborhood?.trim() || null,
        notes: body.notes?.trim() || null,
        origem: "novo",
        status_validacao: "pendente",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ supporter: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
