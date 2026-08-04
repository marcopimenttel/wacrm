import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import {
  AsaasApiError,
  createAsaasCustomer,
  createAsaasSubscription,
  defaultNextDueDate,
  getSubscriptionInvoiceUrl,
} from "@/lib/saas/asaas";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * POST /api/billing/asaas/checkout
 * Body: { planKey: 'pro', cycle: 'monthly' | 'yearly', cpfCnpj?: string }
 * Cria customer+assinatura no Asaas e devolve invoiceUrl.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireRole("admin");
    const body = (await request.json().catch(() => ({}))) as {
      planKey?: string;
      cycle?: "monthly" | "yearly";
      cpfCnpj?: string;
    };

    const planKey = body.planKey ?? "pro";
    const cycle = body.cycle === "yearly" ? "YEARLY" : "MONTHLY";

    const admin = createServiceRoleClient();

    const { data: plan, error: planErr } = await admin
      .from("plans")
      .select("id, key, name, price_monthly_brl, price_yearly_brl")
      .eq("key", planKey)
      .eq("is_active", true)
      .maybeSingle();

    if (planErr || !plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }

    const value =
      cycle === "YEARLY"
        ? Number(plan.price_yearly_brl)
        : Number(plan.price_monthly_brl);

    if (!value || value <= 0) {
      // Plano gratuito: ativa direto sem Asaas
      await admin
        .from("accounts")
        .update({
          plan_id: plan.id,
          subscription_status: "active",
          trial_ends_at: null,
        })
        .eq("id", ctx.accountId);
      return NextResponse.json({ ok: true, free: true });
    }

    const { data: account, error: accErr } = await admin
      .from("accounts")
      .select(
        "id, name, asaas_customer_id, asaas_subscription_id, billing_email, billing_cpf_cnpj",
      )
      .eq("id", ctx.accountId)
      .single();

    if (accErr || !account) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    const { data: userData } = await ctx.supabase.auth.getUser();
    const email =
      account.billing_email ||
      userData.user?.email ||
      "";
    if (!email) {
      return NextResponse.json(
        { error: "E-mail de cobrança obrigatório" },
        { status: 400 },
      );
    }

    const cpfCnpj = (body.cpfCnpj || account.billing_cpf_cnpj || "").replace(
      /\D/g,
      "",
    );
    if (cpfCnpj.length < 11) {
      return NextResponse.json(
        { error: "Informe um CPF ou CNPJ válido para o Asaas" },
        { status: 400 },
      );
    }

    let customerId = account.asaas_customer_id as string | null;
    if (!customerId) {
      customerId = await createAsaasCustomer({
        name: account.name,
        email,
        cpfCnpj,
        externalReference: account.id,
      });
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      new URL(request.url).origin;

    const { subscriptionId } = await createAsaasSubscription({
      customerId,
      value,
      cycle,
      description: `${plan.name} (${cycle === "YEARLY" ? "anual" : "mensal"})`,
      externalReference: account.id,
      nextDueDate: defaultNextDueDate(),
      successUrl: `${siteUrl}/settings?tab=plan&paid=1`,
    });

    const invoiceUrl = await getSubscriptionInvoiceUrl(subscriptionId);

    await admin
      .from("accounts")
      .update({
        plan_id: plan.id,
        asaas_customer_id: customerId,
        asaas_subscription_id: subscriptionId,
        asaas_invoice_url: invoiceUrl,
        billing_email: email,
        billing_cpf_cnpj: cpfCnpj,
        // Mantém trial/past_due até o webhook confirmar pagamento
      })
      .eq("id", ctx.accountId);

    return NextResponse.json({ ok: true, invoiceUrl });
  } catch (err) {
    if (err instanceof AsaasApiError) {
      console.error("[asaas/checkout]", err.message, err.payload);
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return toErrorResponse(err);
  }
}
