/**
 * Utilitários do webhook Asaas (idempotência / tipagem do payload).
 */

export type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
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

/**
 * Chave estável para não reprocessar o mesmo evento Asaas.
 * Prefere o id do webhook; senão event + id do pagamento/assinatura.
 */
export function buildAsaasIdempotencyKey(payload: AsaasWebhookPayload): string {
  const event = payload.event ?? "UNKNOWN";
  if (payload.id && String(payload.id).trim()) {
    return `asaas:${payload.id}`;
  }
  const paymentId = payload.payment?.id;
  if (paymentId) return `${event}:payment:${paymentId}`;
  const subId = payload.subscription?.id;
  if (subId) return `${event}:subscription:${subId}`;
  return `${event}:raw:${JSON.stringify(payload).slice(0, 200)}`;
}
