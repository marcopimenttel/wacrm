import { NextResponse } from "next/server";

import {
  ForbiddenError,
  requireRole,
  toErrorResponse,
} from "@/lib/auth/account";
import { getCampaignScope, isLeadershipScope } from "@/lib/campaign/scope";
import { createServiceRoleClient } from "@/lib/supabase/service";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/campaign/leaderships/[id]/access
 * Body: { email, password, fullName? }
 * Cria usuário (ou redefine senha) e vincula à liderança com role agent.
 */
export async function POST(request: Request, { params }: Ctx) {
  try {
    const ctx = await requireRole("admin");
    const scope = await getCampaignScope(ctx);
    if (isLeadershipScope(scope)) {
      throw new ForbiddenError("Forbidden");
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      fullName?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || password.length < 6) {
      return NextResponse.json(
        { error: "E-mail e senha (mín. 6) são obrigatórios" },
        { status: 400 },
      );
    }

    const { data: leadership, error: lErr } = await ctx.supabase
      .from("campaign_leaderships")
      .select("id, name, user_id, account_id")
      .eq("id", id)
      .eq("account_id", ctx.accountId)
      .maybeSingle();

    if (lErr || !leadership) {
      return NextResponse.json({ error: "Liderança não encontrada" }, { status: 404 });
    }

    const admin = createServiceRoleClient();
    let userId = leadership.user_id as string | null;

    if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        email,
        password,
        email_confirm: true,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: body.fullName?.trim() || leadership.name,
        },
      });
      if (error || !created.user) {
        return NextResponse.json(
          { error: error?.message ?? "Falha ao criar usuário" },
          { status: 502 },
        );
      }
      userId = created.user.id;

      // O trigger de signup cria uma conta pessoal — remove o órfão
      // e vincula o perfil à conta da campanha (como equipe/liderança).
      const { data: orphanAccounts } = await admin
        .from("accounts")
        .select("id")
        .eq("owner_user_id", userId);

      await admin
        .from("profiles")
        .update({
          account_id: ctx.accountId,
          account_role: "agent",
          full_name: body.fullName?.trim() || leadership.name,
          email,
        })
        .eq("user_id", userId);

      for (const acc of orphanAccounts ?? []) {
        if (acc.id !== ctx.accountId) {
          await admin.from("accounts").delete().eq("id", acc.id);
        }
      }

      await ctx.supabase
        .from("campaign_leaderships")
        .update({ user_id: userId, email })
        .eq("id", id);
    }

    // Garante vínculo e role
    await admin
      .from("profiles")
      .update({
        account_id: ctx.accountId,
        account_role: "agent",
        email,
      })
      .eq("user_id", userId);

    if (!leadership.user_id) {
      await ctx.supabase
        .from("campaign_leaderships")
        .update({ user_id: userId, email })
        .eq("id", id);
    }

    return NextResponse.json({ ok: true, userId });
  } catch (err) {
    return toErrorResponse(err);
  }
}
