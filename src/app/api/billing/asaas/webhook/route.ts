import { NextResponse } from "next/server";

import {
  buildAsaasIdempotencyKey,
  type AsaasWebhookPayload,
} from "@/lib/saas/asaas-webhook";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * POST /api/billing/asaas/webhook
 * Header: asaas-access-token = ASAAS_WEBHOOK_TOKEN
 *
 * Atualiza subscription_status com log + idempotência (Onda B).
 */
export async function POST(request: Request) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN ?? "";
  const token = request.headers.get("asaas-access-token") ?? "";
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as AsaasWebhookPayload;
  const event = payload.event ?? "";
  const admin = createServiceRoleClient();
  const idempotencyKey = buildAsaasIdempotencyKey(payload);

  // Reserva a chave antes de mutar a conta — conflito = já processado
  const { error: insertError } = await admin.from("asaas_webhook_events").insert({
    idempotency_key: idempotencyKey,
    event: event || "UNKNOWN",
    payment_id: payload.payment?.id ?? null,
    subscription_id:
      payload.payment?.subscription ?? payload.subscription?.id ?? null,
    customer_id:
      payload.payment?.customer ?? payload.subscription?.customer ?? null,
    payload,
    status: "processed",
  });

  if (insertError) {
    // unique_violation → evento duplicado (retry Asaas)
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[asaas/webhook] falha ao registrar evento", insertError);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }

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
    await admin
      .from("asaas_webhook_events")
      .update({ status: "ignored" })
      .eq("idempotency_key", idempotencyKey);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { data: accounts } = await query.limit(1);
  const account = accounts?.[0];
  if (!account) {
    console.warn("[asaas/webhook] conta não encontrada", event);
    await admin
      .from("asaas_webhook_events")
      .update({ status: "missing_account" })
      .eq("idempotency_key", idempotencyKey);
    return NextResponse.json({ ok: true, missing: true });
  }

  await admin
    .from("asaas_webhook_events")
    .update({ account_id: account.id })
    .eq("idempotency_key", idempotencyKey);

  try {
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
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
      event === "PAYMENT_REFUNDED" ||
      event === "PAYMENT_DELETED" ||
      event === "PAYMENT_RECEIVED_IN_CASH_UNDONE"
    ) {
      // Estorno / exclusão / desfazer pagamento em dinheiro → inadimplente
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
    } else {
      await admin
        .from("asaas_webhook_events")
        .update({ status: "ignored" })
        .eq("idempotency_key", idempotencyKey);
      return NextResponse.json({ ok: true, ignored: true, event });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[asaas/webhook] erro ao atualizar conta", message);
    await admin
      .from("asaas_webhook_events")
      .update({ status: "error", error_message: message })
      .eq("idempotency_key", idempotencyKey);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
