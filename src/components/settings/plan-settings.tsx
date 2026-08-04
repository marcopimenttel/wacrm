'use client';

import { CreditCard, Lock, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/hooks/use-auth';
import { MODULE_LABEL_PT } from '@/lib/saas/modules';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SettingsPanelHead } from '@/components/settings/settings-panel-head';

/**
 * Painel "Plano e assinatura" — mostra status comercial da conta.
 * Checkout (Asaas/Stripe) entra numa etapa seguinte; aqui só lemos
 * o que a migration 037 já gravou.
 */
export function PlanSettings() {
  const t = useTranslations('Settings.plan');
  const { account, enabledModules, subscriptionStatus, profileLoading } =
    useAuth();

  if (profileLoading) {
    return (
      <p className="text-sm text-muted-foreground">{t('loading')}</p>
    );
  }

  const status = subscriptionStatus ?? account?.subscription_status ?? 'active';
  const trialEnds = account?.trial_ends_at
    ? new Date(account.trial_ends_at).toLocaleDateString('pt-BR')
    : null;

  const modules = (enabledModules.length
    ? enabledModules
    : account?.enabled_modules ?? []
  ).filter((k) => k !== 'whatsapp');

  return (
    <div className="space-y-6">
      <SettingsPanelHead title={t('title')} description={t('description')} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <CreditCard className="size-4 text-primary" />
            {account?.plan_name ?? t('planUnknown')}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('planKey', { key: account?.plan_key ?? '—' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('statusLabel')}</span>
            <Badge variant="secondary">{t(`status.${status}`)}</Badge>
          </div>

          {status === 'trial' && trialEnds ? (
            <p className="text-sm text-muted-foreground">
              {t('trialEnds', { date: trialEnds })}
            </p>
          ) : null}

          <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>{t('billingSoon')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="size-4 text-primary" />
            {t('modulesTitle')}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('modulesDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('modulesEmpty')}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {modules.map((key) => (
                <li
                  key={key}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  {MODULE_LABEL_PT[key] ?? key}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
