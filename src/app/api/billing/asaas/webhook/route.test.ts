import { describe, expect, it } from "vitest";

import { buildAsaasIdempotencyKey } from "@/lib/saas/asaas-webhook";

describe("buildAsaasIdempotencyKey", () => {
  it("prefers o id do evento Asaas", () => {
    expect(
      buildAsaasIdempotencyKey({
        id: "evt_123",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay_1" },
      }),
    ).toBe("asaas:evt_123");
  });

  it("usa event + payment.id quando não há id de evento", () => {
    expect(
      buildAsaasIdempotencyKey({
        event: "PAYMENT_OVERDUE",
        payment: { id: "pay_9" },
      }),
    ).toBe("PAYMENT_OVERDUE:payment:pay_9");
  });

  it("usa subscription.id como fallback", () => {
    expect(
      buildAsaasIdempotencyKey({
        event: "SUBSCRIPTION_DELETED",
        subscription: { id: "sub_1" },
      }),
    ).toBe("SUBSCRIPTION_DELETED:subscription:sub_1");
  });
});
