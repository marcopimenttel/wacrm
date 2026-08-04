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

/**
 * Painel mínimo de plataforma (superadmin).
 * Acesso: e-mail em PLATFORM_ADMIN_EMAILS. Sem a env, a API nega 403.
 */
export default function PlatformPage() {
  const t = useTranslations('Platform');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [accounts, setAccounts] = useState<PlatformAccount[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [fetching, setFetching] = useState(true);

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
                    {a.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.plan_name ?? a.plan_key ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{a.subscription_status}</Badge>
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
