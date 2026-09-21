'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CreditCard,
  Loader2,
  Palette,
  Plus,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/hooks/use-auth';
import { isPlatformAdminEmail } from '@/lib/saas/platform-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Tab = 'tenants' | 'plans' | 'branding';

interface PlatformAccount {
  id: string;
  name: string;
  slug: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
  plan_key: string | null;
  plan_name: string | null;
  city: string | null;
  state: string | null;
}

interface PlanRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  price_monthly_brl: number;
  price_yearly_brl: number;
  trial_days: number;
  max_supporters: number | null;
  max_leaderships: number | null;
  max_team_members: number | null;
  modules: string[];
}

interface BrandingSettings {
  site_name: string;
  login_title: string;
  login_subtitle: string;
  login_promo_title: string;
  footer_text: string;
  primary_color: string;
  login_logo_url: string | null;
  sidebar_logo_url: string | null;
  favicon_url: string | null;
}

const STATUS_OPTIONS = [
  'trial',
  'active',
  'past_due',
  'canceled',
  'blocked',
] as const;

/**
 * Painel superadmin: tenants, planos e white-label da plataforma.
 */
export default function PlatformPage() {
  const t = useTranslations('Platform');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('tenants');
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [fetching, setFetching] = useState(true);
  const [q, setQ] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const [aRes, pRes, sRes] = await Promise.all([
        fetch('/api/platform/accounts'),
        fetch('/api/platform/plans'),
        fetch('/api/platform/settings'),
      ]);
      if (aRes.status === 403) {
        router.replace('/dashboard');
        return;
      }
      if (aRes.ok) {
        const body = await aRes.json();
        setAccounts(body.accounts ?? []);
      }
      if (pRes.ok) {
        const body = await pRes.json();
        setPlans(body.plans ?? []);
      }
      if (sRes.ok) {
        const body = await sRes.json();
        setBranding(body.settings);
      }
    } catch {
      toast.error(t('loadError'));
    } finally {
      setFetching(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isPlatformAdminEmail(user.email)) {
      router.replace('/dashboard');
      return;
    }
    load();
  }, [user, loading, load, router]);

  const patchAccount = async (
    accountId: string,
    patch: Record<string, unknown>,
  ) => {
    setSaving(true);
    try {
      const res = await fetch('/api/platform/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, ...patch }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? t('saveError'));
        return;
      }
      toast.success(t('saveOk'));
      await load();
    } catch {
      toast.error(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const createAccount = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/platform/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), planKey: 'trial' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? t('saveError'));
        return;
      }
      toast.success(t('createOk'));
      setNewName('');
      await load();
    } catch {
      toast.error(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const saveBranding = async () => {
    if (!branding) return;
    setSaving(true);
    try {
      const res = await fetch('/api/platform/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      });
      if (!res.ok) {
        toast.error(t('saveError'));
        return;
      }
      toast.success(t('saveOk'));
    } catch {
      toast.error(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const filtered = accounts.filter((a) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      a.name.toLowerCase().includes(s) ||
      (a.slug ?? '').toLowerCase().includes(s) ||
      (a.city ?? '').toLowerCase().includes(s)
    );
  });

  if (loading || fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Building2 }[] = [
    { id: 'tenants', label: t('tabTenants'), icon: Building2 },
    { id: 'plans', label: t('tabPlans'), icon: CreditCard },
    { id: 'branding', label: t('tabBranding'), icon: Palette },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t('title')}
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === item.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'tenants' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="bg-background pl-8"
                placeholder={t('searchPlaceholder')}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Input
                className="bg-background w-56"
                placeholder={t('newTenantName')}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button disabled={saving || !newName.trim()} onClick={createAccount}>
                <Plus className="h-4 w-4" />
                {t('createTenant')}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('colName')}</TableHead>
                  <TableHead>{t('colPlan')}</TableHead>
                  <TableHead>{t('colStatus')}</TableHead>
                  <TableHead>{t('colActions')}</TableHead>
                  <TableHead>{t('colCreated')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-foreground">
                        <div>{a.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.slug}
                          {a.city ? ` · ${a.city}/${a.state ?? ''}` : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <select
                          value={a.plan_key ?? 'pro'}
                          disabled={saving}
                          onChange={(e) =>
                            patchAccount(a.id, { planKey: e.target.value })
                          }
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          {plans.map((p) => (
                            <option key={p.id} value={p.key}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          value={a.subscription_status}
                          disabled={saving}
                          onChange={(e) =>
                            patchAccount(a.id, {
                              subscriptionStatus: e.target.value,
                            })
                          }
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          {STATUS_OPTIONS.map((key) => (
                            <option key={key} value={key}>
                              {t(`status.${key}`)}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={saving}
                            onClick={() =>
                              patchAccount(a.id, { extendTrialDays: 7 })
                            }
                          >
                            {t('extendTrial')}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={saving}
                            onClick={() =>
                              patchAccount(a.id, {
                                subscriptionStatus: 'active',
                              })
                            }
                          >
                            {t('activate')}
                          </Button>
                          <Button
                            size="xs"
                            variant="destructive"
                            disabled={saving}
                            onClick={() =>
                              patchAccount(a.id, {
                                subscriptionStatus: 'blocked',
                              })
                            }
                          >
                            {t('block')}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {tab === 'plans' ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('planKey')}</TableHead>
                <TableHead>{t('planName')}</TableHead>
                <TableHead>{t('planPrice')}</TableHead>
                <TableHead>{t('planQuotas')}</TableHead>
                <TableHead>{t('planModules')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.key}</TableCell>
                  <TableCell>
                    {p.name}
                    {!p.is_active ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({t('inactive')})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    R$ {Number(p.price_monthly_brl).toFixed(2)} /{' '}
                    {t('month')}
                    <div className="text-xs text-muted-foreground">
                      R$ {Number(p.price_yearly_brl).toFixed(2)} / {t('year')}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    trial {p.trial_days}d · apo {p.max_supporters ?? '∞'} ·
                    lid {p.max_leaderships ?? '∞'} · team{' '}
                    {p.max_team_members ?? '∞'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {(p.modules ?? []).join(', ') || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {tab === 'branding' && branding ? (
        <div className="mx-auto max-w-2xl space-y-4 rounded-xl border border-border p-6">
          {(
            [
              ['site_name', t('fieldSiteName')],
              ['login_title', t('fieldLoginTitle')],
              ['login_subtitle', t('fieldLoginSubtitle')],
              ['login_promo_title', t('fieldPromoTitle')],
              ['footer_text', t('fieldFooter')],
              ['primary_color', t('fieldPrimaryColor')],
              ['login_logo_url', t('fieldLoginLogo')],
              ['sidebar_logo_url', t('fieldSidebarLogo')],
              ['favicon_url', t('fieldFavicon')],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input
                className="bg-background"
                value={String(branding[key] ?? '')}
                onChange={(e) =>
                  setBranding({ ...branding, [key]: e.target.value })
                }
              />
            </div>
          ))}
          <Button disabled={saving} onClick={saveBranding}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('saveBranding')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
