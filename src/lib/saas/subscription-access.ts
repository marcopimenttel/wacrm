/**
 * Regras de acesso comercial da assinatura (Sprint 1).
 *
 * Conta liberada: active, ou trial ainda válido.
 * Conta bloqueada: blocked, canceled, past_due, trial expirado.
 */

import type { SubscriptionStatus } from "@/lib/saas/modules";

export type SubscriptionAccess = {
  allowed: boolean;
  reason:
    | "ok"
    | "blocked"
    | "canceled"
    | "past_due"
    | "trial_expired"
    | "unknown";
  trialExpired: boolean;
  daysLeftInTrial: number | null;
};

export function getTrialDaysLeft(
  trialEndsAt: string | Date | null | undefined,
  now = new Date(),
): number | null {
  if (!trialEndsAt) return null;
  const end = trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function isTrialExpired(
  trialEndsAt: string | Date | null | undefined,
  now = new Date(),
): boolean {
  const days = getTrialDaysLeft(trialEndsAt, now);
  if (days === null) return false;
  return days < 0;
}

/**
 * Avalia se o tenant pode usar o produto (exceto rotas de billing/settings/platform).
 */
export function evaluateSubscriptionAccess(input: {
  status: SubscriptionStatus | string | null | undefined;
  trialEndsAt?: string | Date | null;
  now?: Date;
}): SubscriptionAccess {
  const now = input.now ?? new Date();
  const status = input.status ?? "unknown";
  const trialExpired = isTrialExpired(input.trialEndsAt, now);
  const daysLeftInTrial =
    status === "trial" ? getTrialDaysLeft(input.trialEndsAt, now) : null;

  if (status === "blocked") {
    return { allowed: false, reason: "blocked", trialExpired, daysLeftInTrial };
  }
  if (status === "canceled") {
    return {
      allowed: false,
      reason: "canceled",
      trialExpired,
      daysLeftInTrial,
    };
  }
  if (status === "past_due") {
    return {
      allowed: false,
      reason: "past_due",
      trialExpired,
      daysLeftInTrial,
    };
  }
  if (status === "trial") {
    if (trialExpired) {
      return {
        allowed: false,
        reason: "trial_expired",
        trialExpired: true,
        daysLeftInTrial,
      };
    }
    return { allowed: true, reason: "ok", trialExpired: false, daysLeftInTrial };
  }
  if (status === "active") {
    return { allowed: true, reason: "ok", trialExpired, daysLeftInTrial };
  }

  return { allowed: true, reason: "unknown", trialExpired, daysLeftInTrial };
}

/** Rotas liberadas mesmo com assinatura bloqueada. */
export function isSubscriptionExemptPath(pathname: string): boolean {
  if (pathname.startsWith("/billing")) return true;
  if (pathname.startsWith("/settings")) return true;
  if (pathname.startsWith("/platform")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/signup")) return true;
  if (pathname.startsWith("/api/billing")) return true;
  if (pathname.startsWith("/api/platform")) return true;
  if (pathname.startsWith("/api/account")) return true;
  if (pathname.startsWith("/api/cep")) return true;
  if (pathname.startsWith("/api/public")) return true;
  if (pathname.startsWith("/cadastro")) return true;
  if (pathname.startsWith("/join")) return true;
  return false;
}
