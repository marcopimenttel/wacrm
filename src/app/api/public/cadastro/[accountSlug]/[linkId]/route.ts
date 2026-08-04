import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service";

type Ctx = { params: Promise<{ accountSlug: string; linkId: string }> };

function emptyToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** GET — metadados públicos do link de cadastro da liderança. */
export async function GET(_request: Request, { params }: Ctx) {
  const { accountSlug, linkId } = await params;
  const admin = createServiceRoleClient();

  const { data: account } = await admin
    .from("accounts")
    .select("id, name, slug")
    .eq("slug", accountSlug)
    .maybeSingle();
  if (!account) {
    return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
  }

  const { data: leadership } = await admin
    .from("campaign_leaderships")
    .select("id, name, nickname, status, registration_slug, city, state")
    .eq("account_id", account.id)
    .eq("registration_slug", linkId)
    .maybeSingle();

  if (!leadership || leadership.status !== "active") {
    return NextResponse.json({ error: "Link inválido ou inativo" }, { status: 404 });
  }

  const { data: zones } = await admin
    .from("campaign_city_zones")
    .select("name")
    .eq("account_id", account.id)
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  return NextResponse.json({
    account: { name: account.name, slug: account.slug },
    leadership: {
      name: leadership.name,
      nickname: leadership.nickname,
      city: leadership.city,
      state: leadership.state,
    },
    cityZones: (zones ?? []).map((z) => z.name),
  });
}

/** POST — cadastro público de apoiador (origem=novo). */
export async function POST(request: Request, { params }: Ctx) {
  const { accountSlug, linkId } = await params;
  const admin = createServiceRoleClient();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const { data: account } = await admin
    .from("accounts")
    .select("id, name, slug, owner_user_id")
    .eq("slug", accountSlug)
    .maybeSingle();
  if (!account) {
    return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
  }

  const { data: leadership } = await admin
    .from("campaign_leaderships")
    .select("id, status")
    .eq("account_id", account.id)
    .eq("registration_slug", linkId)
    .maybeSingle();

  if (!leadership || leadership.status !== "active") {
    return NextResponse.json({ error: "Link inválido ou inativo" }, { status: 404 });
  }

  if (!String(body.name ?? "").trim() || !emptyToNull(body.phone)) {
    return NextResponse.json(
      { error: "Nome e WhatsApp são obrigatórios" },
      { status: 400 },
    );
  }

  const phone = emptyToNull(body.phone)!;
  const { data: dup } = await admin
    .from("campaign_supporters")
    .select("id")
    .eq("account_id", account.id)
    .eq("phone", phone)
    .maybeSingle();
  if (dup) {
    return NextResponse.json(
      { error: "Este WhatsApp já está cadastrado nesta campanha" },
      { status: 409 },
    );
  }

  let contactId: string | null = null;
  const { data: existingContact } = await admin
    .from("contacts")
    .select("id")
    .eq("account_id", account.id)
    .eq("phone", phone)
    .maybeSingle();
  if (existingContact) {
    contactId = existingContact.id;
  } else {
    const { data: created } = await admin
      .from("contacts")
      .insert({
        account_id: account.id,
        user_id: account.owner_user_id,
        phone,
        name: String(body.name).trim(),
      })
      .select("id")
      .single();
    if (created) contactId = created.id;
  }

  const { data, error } = await admin
    .from("campaign_supporters")
    .insert({
      account_id: account.id,
      leadership_id: leadership.id,
      contact_id: contactId,
      name: String(body.name).trim(),
      nickname: emptyToNull(body.nickname),
      profession: emptyToNull(body.profession),
      gender: emptyToNull(body.gender),
      marital_status: emptyToNull(body.marital_status),
      birth_date: emptyToNull(body.birth_date),
      phone,
      cep: emptyToNull(body.cep),
      address: emptyToNull(body.address),
      address_number: emptyToNull(body.address_number),
      neighborhood: emptyToNull(body.neighborhood),
      city_zone: emptyToNull(body.city_zone),
      city: emptyToNull(body.city),
      state: emptyToNull(body.state),
      complement: emptyToNull(body.complement),
      notes: emptyToNull(body.notes),
      origem: "novo",
      status_validacao: "pendente",
      status_conquista: "nao_informado",
    })
    .select("id, name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, supporter: data }, { status: 201 });
}
