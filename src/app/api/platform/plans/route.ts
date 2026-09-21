import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/auth/account";
import { requirePlatformAdmin } from "@/lib/saas/require-platform-admin";

/**
 * GET/POST/PATCH /api/platform/plans — CRUD de planos (superadmin).
 */
export async function GET() {
  try {
    const gate = await requirePlatformAdmin();
    if ("error" in gate && gate.error) return gate.error;
    const { admin } = gate;

    const { data: plans, error } = await admin
      .from("plans")
      .select(
        "id, key, name, description, is_active, sort_order, price_monthly_brl, price_yearly_brl, trial_days, max_supporters, max_leaderships, max_team_members, plan_modules(module_key)",
      )
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (plans ?? []).map((p) => ({
      ...p,
      modules: Array.isArray(p.plan_modules)
        ? p.plan_modules.map((m: { module_key: string }) => m.module_key)
        : [],
      plan_modules: undefined,
    }));

    return NextResponse.json({ plans: rows });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requirePlatformAdmin();
    if ("error" in gate && gate.error) return gate.error;
    const { admin } = gate;

    const body = (await request.json().catch(() => ({}))) as {
      key?: string;
      name?: string;
      description?: string;
      priceMonthly?: number;
      priceYearly?: number;
      trialDays?: number;
      maxSupporters?: number | null;
      maxLeaderships?: number | null;
      maxTeamMembers?: number | null;
      modules?: string[];
    };

    const key = body.key?.trim().toLowerCase();
    const name = body.name?.trim();
    if (!key || !name) {
      return NextResponse.json(
        { error: "key e name obrigatórios" },
        { status: 400 },
      );
    }

    const { data: plan, error } = await admin
      .from("plans")
      .insert({
        key,
        name,
        description: body.description ?? null,
        price_monthly_brl: body.priceMonthly ?? 0,
        price_yearly_brl: body.priceYearly ?? 0,
        trial_days: body.trialDays ?? 14,
        max_supporters: body.maxSupporters ?? null,
        max_leaderships: body.maxLeaderships ?? null,
        max_team_members: body.maxTeamMembers ?? null,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (body.modules?.length) {
      await admin.from("plan_modules").insert(
        body.modules.map((module_key) => ({
          plan_id: plan.id,
          module_key,
        })),
      );
    }

    return NextResponse.json({ id: plan.id }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requirePlatformAdmin();
    if ("error" in gate && gate.error) return gate.error;
    const { admin } = gate;

    const body = (await request.json().catch(() => ({}))) as {
      planId?: string;
      name?: string;
      description?: string;
      isActive?: boolean;
      priceMonthly?: number;
      priceYearly?: number;
      trialDays?: number;
      maxSupporters?: number | null;
      maxLeaderships?: number | null;
      maxTeamMembers?: number | null;
      modules?: string[];
    };

    if (!body.planId) {
      return NextResponse.json({ error: "planId obrigatório" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string") patch.name = body.name.trim();
    if (typeof body.description === "string") patch.description = body.description;
    if (typeof body.isActive === "boolean") patch.is_active = body.isActive;
    if (typeof body.priceMonthly === "number") patch.price_monthly_brl = body.priceMonthly;
    if (typeof body.priceYearly === "number") patch.price_yearly_brl = body.priceYearly;
    if (typeof body.trialDays === "number") patch.trial_days = body.trialDays;
    if (body.maxSupporters !== undefined) patch.max_supporters = body.maxSupporters;
    if (body.maxLeaderships !== undefined) patch.max_leaderships = body.maxLeaderships;
    if (body.maxTeamMembers !== undefined) patch.max_team_members = body.maxTeamMembers;

    if (Object.keys(patch).length) {
      const { error } = await admin.from("plans").update(patch).eq("id", body.planId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (Array.isArray(body.modules)) {
      await admin.from("plan_modules").delete().eq("plan_id", body.planId);
      if (body.modules.length) {
        await admin.from("plan_modules").insert(
          body.modules.map((module_key) => ({
            plan_id: body.planId,
            module_key,
          })),
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
