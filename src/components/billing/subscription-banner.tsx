/**
 * Banner comercial no topo do dashboard (trial / alerta).
 * CTA leva para Configurações → Plano (checkout Asaas).
 */

'use client';

import Link from 'next/link';
import { AlertTriangle, Clock, CreditCard, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import {
  getTrialDaysLeft,
} from '@/lib/saas/subscription-access';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'wacrm.subscriptionBanner.dismissed';

export function SubscriptionBanner() {
  const t = useTranslations('Billing.banner');
  const { account, subscriptionStatus } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const status = subscriptionStatus ?? account?.subscription_status ?? null;
  const trialEndsAt = account?.trial_ends_at ?? null;

  const daysLeft =
    status === 'trial' ? getTrialDaysLeft(trialEndsAt) : null;

  // Variante visual: trial normal, trial urgente (≤3 dias), past_due em settings
  const variant = useMemo(() => {
    if (status === 'past_due') return 'past_due' as const;
    if (status === 'trial' && daysLeft !== null && daysLeft >= 0) {
      return daysLeft <= 3 ? ('trial_urgent' as const) : ('trial' as const);
    }
    return null;
  }, [status, daysLeft]);

  useEffect(() => {
    if (!variant) {
      setDismissed(false);
      return;
    }
    try {
      const raw = sessionStorage.getItem(DISMISS_KEY);
      setDismissed(raw === `${variant}:${trialEndsAt ?? ''}`);
    } catch {
      setDismissed(false);
    }
  }, [variant, trialEndsAt]);

  if (!variant || dismissed) return null;
  // past_due: middleware já manda para /billing/blocked na maioria das rotas;
  // o banner ainda aparece em /settings e /billing (rotas liberadas).

  const isUrgent = variant === 'trial_urgent' || variant === 'past_due';

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, `${variant}:${trialEndsAt ?? ''}`);
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  const title =
    variant === 'past_due'
      ? t('pastDueTitle')
      : daysLeft === 0
        ? t('trialEndsToday')
        : daysLeft === 1
          ? t('trialOneDay')
          : t('trialDays', { days: daysLeft ?? 0 });

  const description =
    variant === 'past_due' ? t('pastDueDescription') : t('trialDescription');

  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-3 border-b px-4 py-2.5 text-sm sm:px-6',
        isUrgent
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-50'
          : 'border-primary/20 bg-primary/5 text-foreground',
      )}
    >
      {isUrgent ? (
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      ) : (
        <Clock className="h-4 w-4 shrink-0 text-primary" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">{title}</p>
        <p className="text-xs opacity-80">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/settings?tab=plan"
          className={cn(
            buttonVariants({ size: 'sm' }),
            'h-8 gap-1.5',
            isUrgent &&
              'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400',
          )}
        >
          <CreditCard className="h-3.5 w-3.5" />
          {t('cta')}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-current/70 hover:bg-black/5 hover:text-current dark:hover:bg-white/10"
          aria-label={t('dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
