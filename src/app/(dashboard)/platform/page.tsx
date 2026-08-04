'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PlatformAccount {
  id: string;
  name: string;
  owner_user_id: string;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
  plan_key: string | null;
  plan_name: string | null;
}

const PLAN_OPTIONS = ['trial', 'pro'] as const;
const STATUS_OPTIONS = ['trial', 'active', 'past_due', 'canceled'] as const;

/**
 * Painel de plataforma (superadmin).
 * Acesso: e-mail em PLATFORM_ADMIN_EMAILS.
 */
export default function PlatformPage() {
  const t = useTranslations('Platform');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [accounts, setAccounts] = useState<PlatformAccount[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/platform/accounts');
      if (res.status === 403) {
        setForbidden(true);
        setAccounts([]);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? t('loadError'));
        return;
      }
      const body = (await res.json()) as { accounts: PlatformAccount[] };
      setAccounts(body.accounts);
      setForbidden(false);
    } catch {
      toast.error(t('loadError'));
    } finally {
      setFetching(false);
    }
  }, [t]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    load();
  }, [user, loading, load, router]);

  const patchAccount = async (
    accountId: string,
    patch: { planKey?: string; subscriptionStatus?: string },
  ) => {
    setSavingId(accountId);
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
      setSavingId(null);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <Shield className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{t('forbiddenTitle')}</p>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {t('forbiddenDesc')}
        </p>
      </div>
    );
  }

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

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('colName')}</TableHead>
              <TableHead>{t('colPlan')}</TableHead>
              <TableHead>{t('colStatus')}</TableHead>
              <TableHead>{t('colCreated')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(accounts ?? []).length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              (accounts ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {a.name}
                      {savingId === a.id ? (
                        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <select
                      value={a.plan_key ?? 'pro'}
                      disabled={savingId === a.id}
                      onChange={(e) =>
                        patchAccount(a.id, { planKey: e.target.value })
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      aria-label={t('colPlan')}
                    >
                      {PLAN_OPTIONS.map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <select
                        value={a.subscription_status}
                        disabled={savingId === a.id}
                        onChange={(e) =>
                          patchAccount(a.id, {
                            subscriptionStatus: e.target.value,
                          })
                        }
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        aria-label={t('colStatus')}
                      >
                        {STATUS_OPTIONS.map((key) => (
                          <option key={key} value={key}>
                            {t(`status.${key}`)}
                          </option>
                        ))}
                      </select>
                      <Badge variant="secondary" className="hidden sm:inline-flex">
                        {a.subscription_status}
                      </Badge>
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
  );
}
