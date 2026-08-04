'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link2, Loader2, Pencil, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { useCan } from '@/hooks/use-can';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LeadershipFormDialog,
  type LeadershipFormValues,
} from '@/components/campaign/leadership-form-dialog';

interface LeadershipRow extends LeadershipFormValues {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  status: string;
  registration_slug: string | null;
  campaign_coordinators?: { id: string; name: string } | null;
}

/** Lista + formulário completo de lideranças. */
export default function LeadershipsPage() {
  const t = useTranslations('Campaign.leaderships');
  const canEdit = useCan('send-messages');
  const { account } = useAuth();
  const [rows, setRows] = useState<LeadershipRow[]>([]);
  const [coordinators, setCoordinators] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<LeadershipRow | null>(null);
  const [scope, setScope] = useState<'team' | 'leadership'>('team');
  const [accountSlug, setAccountSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, coordRes, meRes] = await Promise.all([
        fetch('/api/campaign/leaderships'),
        fetch('/api/campaign/coordinators'),
        fetch('/api/campaign/me'),
      ]);
      const leadBody = await leadRes.json().catch(() => ({}));
      const coordBody = await coordRes.json().catch(() => ({}));
      const meBody = await meRes.json().catch(() => ({}));
      if (!leadRes.ok) {
        toast.error(leadBody.error ?? t('loadError'));
        return;
      }
      setRows(leadBody.leaderships ?? []);
      setScope(leadBody.scope === 'leadership' ? 'leadership' : 'team');
      setCoordinators(coordBody.coordinators ?? []);
      setAccountSlug(meBody.accountSlug ?? null);
    } catch {
      toast.error(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const copyLink = (row: LeadershipRow) => {
    if (!accountSlug || !row.registration_slug) {
      toast.error(t('linkMissing'));
      return;
    }
    const url = `${window.location.origin}/cadastro/${accountSlug}/${row.registration_slug}`;
    void navigator.clipboard.writeText(url);
    toast.success(t('linkCopied'));
  };

  const isLeadershipUser = scope === 'leadership';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('title')}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>
        {canEdit && !isLeadershipUser ? (
          <Button
            type="button"
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
            disabled={coordinators.length === 0}
          >
            <Plus className="size-4" />
            {t('add')}
          </Button>
        ) : null}
      </div>

      {coordinators.length === 0 && !loading && !isLeadershipUser ? (
        <p className="text-sm text-muted-foreground">{t('needCoordinator')}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('colName')}</TableHead>
              {!isLeadershipUser ? (
                <TableHead>{t('colCoordinator')}</TableHead>
              ) : null}
              <TableHead>{t('colPhone')}</TableHead>
              <TableHead>{t('colCity')}</TableHead>
              <TableHead>{t('colStatus')}</TableHead>
              <TableHead className="w-[1%]">{t('colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-foreground">
                    {row.name}
                    {row.nickname ? (
                      <span className="ml-1 text-muted-foreground">
                        ({String(row.nickname)})
                      </span>
                    ) : null}
                  </TableCell>
                  {!isLeadershipUser ? (
                    <TableCell className="text-muted-foreground">
                      {row.campaign_coordinators?.name ?? '—'}
                    </TableCell>
                  ) : null}
                  <TableCell className="text-muted-foreground">
                    {row.phone ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[row.city, row.state].filter(Boolean).join(' / ') || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {canEdit ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEdit(row);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      ) : null}
                      {!isLeadershipUser ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => copyLink(row)}
                          title={t('copyLink')}
                        >
                          <Link2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <LeadershipFormDialog
        open={open}
        onOpenChange={setOpen}
        coordinators={coordinators}
        initial={edit}
        onSaved={load}
        isLeadershipUser={isLeadershipUser}
      />

      {account?.name ? null : null}
    </div>
  );
}
