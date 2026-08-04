import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";

/** GET/POST /api/campaign/coordinators */
export async function GET() {
  try {
    const ctx = await requireRole("viewer");
    const { data, error } = await ctx.supabase
      .from("campaign_coordinators")
      .select("*")
      .eq("account_id", ctx.accountId)
      .order("name");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ coordinators: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("agent");
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      phone?: string;
      email?: string;
      notes?: string;
    };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    }
    const { data, error } = await ctx.supabase
      .from("campaign_coordinators")
      .insert({
        account_id: ctx.accountId,
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        notes: body.notes?.trim() || null,
        status: "active",
      })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ coordinator: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
