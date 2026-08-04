'use client';

import { useState } from 'react';
import { CreditCard, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/hooks/use-auth';
import { MODULE_LABEL_PT } from '@/lib/saas/modules';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SettingsPanelHead } from '@/components/settings/settings-panel-head';

/**
 * Painel Plano e assinatura — status + checkout Asaas.
 */
export function PlanSettings() {
  const t = useTranslations('Settings.plan');
  const {
    account,
    enabledModules,
    subscriptionStatus,
    profileLoading,
    canEditSettings,
    refreshProfile,
  } = useAuth();

  const [cpfCnpj, setCpfCnpj] = useState(account?.billing_cpf_cnpj ?? '');
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [busy, setBusy] = useState(false);

  if (profileLoading) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  const status = subscriptionStatus ?? account?.subscription_status ?? 'active';
  const trialEnds = account?.trial_ends_at
    ? new Date(account.trial_ends_at).toLocaleDateString('pt-BR')
    : null;

  const modules = (
    enabledModules.length ? enabledModules : (account?.enabled_modules ?? [])
  ).filter((k) => k !== 'whatsapp' && k !== 'campaign');

  const startCheckout = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/billing/asaas/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: 'pro', cycle, cpfCnpj }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? t('checkoutError'));
        return;
      }
      if (body.free) {
        toast.success(t('checkoutFree'));
        await refreshProfile();
        return;
      }
      if (body.invoiceUrl) {
        window.location.href = body.invoiceUrl as string;
        return;
      }
      toast.error(t('checkoutError'));
    } catch {
      toast.error(t('checkoutError'));
    } finally {
      setBusy(false);
    }
  };

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

          {account?.asaas_invoice_url ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(account.asaas_invoice_url!, '_blank', 'noopener,noreferrer')
              }
            >
              <ExternalLink className="size-4" />
              {t('openInvoice')}
            </Button>
          ) : null}

          {canEditSettings ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">{t('checkoutTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('checkoutHint')}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cpfCnpj">{t('cpfCnpj')}</Label>
                  <Input
                    id="cpfCnpj"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('cycle')}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={cycle === 'monthly' ? 'default' : 'outline'}
                      onClick={() => setCycle('monthly')}
                    >
                      {t('cycleMonthly')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={cycle === 'yearly' ? 'default' : 'outline'}
                      onClick={() => setCycle('yearly')}
                    >
                      {t('cycleYearly')}
                    </Button>
                  </div>
                </div>
              </div>
              <Button type="button" disabled={busy} onClick={startCheckout}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {t('checkoutCta')}
              </Button>
            </div>
          ) : null}
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
