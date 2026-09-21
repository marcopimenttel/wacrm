'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CreditCard, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/hooks/use-auth';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const REASON_KEYS: Record<string, string> = {
  trial_expired: 'reasonTrialExpired',
  past_due: 'reasonPastDue',
  canceled: 'reasonCanceled',
  blocked: 'reasonBlocked',
};

function BlockedInner() {
  const t = useTranslations('Billing.blocked');
  const params = useSearchParams();
  const reason = params.get('reason') ?? 'trial_expired';
  const { account } = useAuth();
  const reasonKey = REASON_KEYS[reason] ?? 'reasonTrialExpired';

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t(reasonKey)}</p>
        {account?.name ? (
          <p className="text-xs text-muted-foreground">
            {t('accountLabel', { name: account.name })}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/settings?tab=plan"
          className={cn(buttonVariants(), 'gap-1.5')}
        >
          <CreditCard className="h-4 w-4" />
          {t('ctaPlan')}
        </Link>
        <Link
          href="/settings"
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          {t('ctaSettings')}
        </Link>
      </div>
    </div>
  );
}

/** Paywall — trial expirado / inadimplente / bloqueado. */
export default function BillingBlockedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          …
        </div>
      }
    >
      <BlockedInner />
    </Suspense>
  );
}
