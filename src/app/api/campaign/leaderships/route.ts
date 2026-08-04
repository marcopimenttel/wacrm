import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";

/** GET/POST /api/campaign/leaderships */
export async function GET(request: Request) {
  try {
    const ctx = await requireRole("viewer");
    const url = new URL(request.url);
    const coordinatorId = url.searchParams.get("coordinatorId");

    let q = ctx.supabase
      .from("campaign_leaderships")
      .select("*, campaign_coordinators(id, name)")
      .eq("account_id", ctx.accountId)
      .order("name");
    if (coordinatorId) {
      q = q.eq("coordinator_id", coordinatorId);
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ leaderships: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("agent");
    const body = (await request.json().catch(() => ({}))) as {
      coordinatorId?: string;
      name?: string;
      phone?: string;
      email?: string;
      city?: string;
      state?: string;
      notes?: string;
    };
    if (!body.coordinatorId || !body.name?.trim()) {
      return NextResponse.json(
        { error: "Coordenador e nome são obrigatórios" },
        { status: 400 },
      );
    }

    // Garante que o coordenador é da mesma conta
    const { data: coord } = await ctx.supabase
      .from("campaign_coordinators")
      .select("id")
      .eq("id", body.coordinatorId)
      .eq("account_id", ctx.accountId)
      .maybeSingle();
    if (!coord) {
      return NextResponse.json({ error: "Coordenador inválido" }, { status: 400 });
    }

    const { data, error } = await ctx.supabase
      .from("campaign_leaderships")
      .insert({
        account_id: ctx.accountId,
        coordinator_id: body.coordinatorId,
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        city: body.city?.trim() || null,
        state: body.state?.trim() || null,
        notes: body.notes?.trim() || null,
        status: "active",
      })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ leadership: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
