import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/auth/account";
import { isSubscriptionStatus } from "@/lib/saas/modules";
import { requirePlatformAdmin } from "@/lib/saas/require-platform-admin";
import { accountSlugBase, uniqueSlug } from "@/lib/campaign/slug";

/**
 * GET /api/platform/accounts — lista tenants
 * POST — cria tenant (account) mínimo
 * PATCH — atualiza plano/status/trial/branding/dados
 */
export async function GET() {
  try {
    const gate = await requirePlatformAdmin();
    if ("error" in gate && gate.error) return gate.error;
    const { admin } = gate;

    const { data, error } = await admin
      .from("accounts")
      .select(
        "id, name, slug, owner_user_id, subscription_status, trial_ends_at, created_at, plan_id, cnpj, contact_phone, cep, address, address_number, neighborhood, city, state, primary_color, logo_url, favicon_url, candidate_ballot_name, candidate_full_name, candidate_party, candidate_uf, candidate_office, candidate_number, notes_internal, billing_email, billing_cpf_cnpj, plans(key, name)",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []).map((row) => {
      const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        owner_user_id: row.owner_user_id,
        subscription_status: row.subscription_status,
        trial_ends_at: row.trial_ends_at,
        created_at: row.created_at,
        plan_key: plan?.key ?? null,
        plan_name: plan?.name ?? null,
        cnpj: row.cnpj,
        contact_phone: row.contact_phone,
        cep: row.cep,
        address: row.address,
        address_number: row.address_number,
        neighborhood: row.neighborhood,
        city: row.city,
        state: row.state,
        primary_color: row.primary_color,
        logo_url: row.logo_url,
        favicon_url: row.favicon_url,
        candidate_ballot_name: row.candidate_ballot_name,
        candidate_full_name: row.candidate_full_name,
        candidate_party: row.candidate_party,
        candidate_uf: row.candidate_uf,
        candidate_office: row.candidate_office,
        candidate_number: row.candidate_number,
        notes_internal: row.notes_internal,
        billing_email: row.billing_email,
        billing_cpf_cnpj: row.billing_cpf_cnpj,
      };
    });

    return NextResponse.json({ accounts: rows });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requirePlatformAdmin();
    if ("error" in gate && gate.error) return gate.error;
    const { admin, ctx } = gate;

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      planKey?: string;
      subscriptionStatus?: string;
      trialDays?: number;
      ownerUserId?: string;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "name obrigatório" }, { status: 400 });
    }

    // Sem owner explícito, a conta fica com o próprio superadmin como owner
    // (pode transferir depois). Evita orphan accounts.
    const ownerUserId = body.ownerUserId || ctx.userId;

    let planId: string | null = null;
    const planKey = body.planKey ?? "trial";
    const { data: plan } = await admin
      .from("plans")
      .select("id, trial_days")
      .eq("key", planKey)
      .maybeSingle();
    if (plan) planId = plan.id;

    const trialDays = body.trialDays ?? plan?.trial_days ?? 14;
    const status = body.subscriptionStatus ?? "trial";
    if (!isSubscriptionStatus(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const base = accountSlugBase(name);
    const { data: existingSlugs } = await admin.from("accounts").select("slug");
    const taken = new Set(
      (existingSlugs ?? [])
        .map((r) => r.slug)
        .filter((s): s is string => typeof s === "string" && s.length > 0),
    );
    const slug = uniqueSlug(base, taken);

    const trialEnds =
      status === "trial"
        ? new Date(Date.now() + trialDays * 86400000).toISOString()
        : null;

    const { data, error } = await admin
      .from("accounts")
      .insert({
        name,
        slug,
        owner_user_id: ownerUserId,
        plan_id: planId,
        subscription_status: status,
        trial_ends_at: trialEnds,
      })
      .select("id, name, slug")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ account: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requirePlatformAdmin();
    if ("error" in gate && gate.error) return gate.error;
    const { admin } = gate;

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const accountId = body.accountId;
    if (typeof accountId !== "string" || !accountId) {
      return NextResponse.json({ error: "accountId obrigatório" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};

    if (typeof body.planKey === "string" && body.planKey) {
      const { data: plan } = await admin
        .from("plans")
        .select("id")
        .eq("key", body.planKey)
        .maybeSingle();
      if (!plan) {
        return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
      }
      patch.plan_id = plan.id;
    }

    if (typeof body.subscriptionStatus === "string") {
      if (!isSubscriptionStatus(body.subscriptionStatus)) {
        return NextResponse.json({ error: "Status inválido" }, { status: 400 });
      }
      patch.subscription_status = body.subscriptionStatus;
      if (body.subscriptionStatus === "active") {
        patch.trial_ends_at = null;
      }
    }

    // Estender trial em N dias a partir de agora (ou da data atual do trial)
    if (typeof body.extendTrialDays === "number" && body.extendTrialDays > 0) {
      const days = Math.min(365, Math.floor(body.extendTrialDays));
      const { data: current } = await admin
        .from("accounts")
        .select("trial_ends_at")
        .eq("id", accountId)
        .maybeSingle();
      const base =
        current?.trial_ends_at && new Date(current.trial_ends_at) > new Date()
          ? new Date(current.trial_ends_at)
          : new Date();
      base.setDate(base.getDate() + days);
      patch.trial_ends_at = base.toISOString();
      patch.subscription_status = "trial";
    }

    const stringFields = [
      "name",
      "cnpj",
      "contact_phone",
      "cep",
      "address",
      "address_number",
      "neighborhood",
      "city",
      "state",
      "logo_url",
      "favicon_url",
      "primary_color",
      "candidate_ballot_name",
      "candidate_full_name",
      "candidate_party",
      "candidate_uf",
      "candidate_office",
      "candidate_number",
      "notes_internal",
      "billing_email",
      "billing_cpf_cnpj",
    ] as const;

    for (const key of stringFields) {
      if (typeof body[key] === "string") {
        patch[key] = (body[key] as string).trim() || null;
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
    }

    const { error } = await admin.from("accounts").update(patch).eq("id", accountId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
