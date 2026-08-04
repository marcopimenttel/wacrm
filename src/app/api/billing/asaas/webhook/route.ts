import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * POST /api/billing/asaas/webhook
 * Header: asaas-access-token = ASAAS_WEBHOOK_TOKEN
 * Atualiza subscription_status da account conforme eventos Asaas.
 */
export async function POST(request: Request) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN ?? "";
  const token = request.headers.get("asaas-access-token") ?? "";
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    event?: string;
    payment?: {
      subscription?: string;
      customer?: string;
      externalReference?: string;
      value?: number;
    };
    subscription?: {
      id?: string;
      customer?: string;
      externalReference?: string;
    };
  };

  const event = payload.event ?? "";
  const admin = createServiceRoleClient();

  const accountId =
    payload.payment?.externalReference ||
    payload.subscription?.externalReference ||
    null;
  const subscriptionId =
    payload.payment?.subscription || payload.subscription?.id || null;
  const customerId =
    payload.payment?.customer || payload.subscription?.customer || null;

  let query = admin.from("accounts").select("id");
  if (accountId) {
    query = query.eq("id", accountId);
  } else if (subscriptionId) {
    query = query.eq("asaas_subscription_id", subscriptionId);
  } else if (customerId) {
    query = query.eq("asaas_customer_id", customerId);
  } else {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { data: accounts } = await query.limit(1);
  const account = accounts?.[0];
  if (!account) {
    console.warn("[asaas/webhook] conta não encontrada", event);
    return NextResponse.json({ ok: true, missing: true });
  }

  if (
    event === "PAYMENT_RECEIVED" ||
    event === "PAYMENT_CONFIRMED" ||
    event === "PAYMENT_RECEIVED_IN_CASH_UNDONE"
  ) {
    await admin
      .from("accounts")
      .update({
        subscription_status: "active",
        trial_ends_at: null,
      })
      .eq("id", account.id);
  } else if (event === "PAYMENT_OVERDUE") {
    await admin
      .from("accounts")
      .update({ subscription_status: "past_due" })
      .eq("id", account.id);
  } else if (
    event === "SUBSCRIPTION_DELETED" ||
    event === "SUBSCRIPTION_INACTIVATED"
  ) {
    await admin
      .from("accounts")
      .update({ subscription_status: "canceled" })
      .eq("id", account.id);
  }

  return NextResponse.json({ ok: true });
}
