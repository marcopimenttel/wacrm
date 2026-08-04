'use client';

import { useCallback, useEffect, useState } from 'react';
import { Handshake, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { useCan } from '@/hooks/use-can';
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
import { SupporterFormDialog } from '@/components/campaign/supporter-form-dialog';

interface Supporter {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  status_validacao: string;
  status_conquista: string;
  contact_id: string | null;
  campaign_leaderships?: { id: string; name: string } | null;
}

export default function SupportersPage() {
  const t = useTranslations('Campaign.supporters');
  const canEdit = useCan('send-messages');
  const [rows, setRows] = useState<Supporter[]>([]);
  const [leaderships, setLeaderships] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [myLeadershipId, setMyLeadershipId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [supRes, leadRes] = await Promise.all([
        fetch('/api/campaign/supporters'),
        fetch('/api/campaign/leaderships'),
      ]);
      const supBody = await supRes.json().catch(() => ({}));
      const leadBody = await leadRes.json().catch(() => ({}));
      if (!supRes.ok) {
        toast.error(supBody.error ?? t('loadError'));
        return;
      }
      setRows(supBody.supporters ?? []);
      setMyLeadershipId(supBody.myLeadershipId ?? null);
      setLeaderships(
        (leadBody.leaderships ?? []).map((l: { id: string; name: string }) => ({
          id: l.id,
          name: l.name,
        })),
      );
    } catch {
      toast.error(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Handshake className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('title')}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>
        {canEdit ? (
          <Button
            type="button"
            onClick={() => setOpen(true)}
            disabled={leaderships.length === 0}
          >
            <Plus className="size-4" />
            {t('add')}
          </Button>
        ) : null}
      </div>

      {leaderships.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground">{t('needLeadership')}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('colName')}</TableHead>
              <TableHead>{t('colLeadership')}</TableHead>
              <TableHead>{t('colPhone')}</TableHead>
              <TableHead>{t('colCity')}</TableHead>
              <TableHead>{t('colValidation')}</TableHead>
              <TableHead>{t('fieldConquista')}</TableHead>
              <TableHead>{t('colCrm')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
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
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.campaign_leaderships?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.phone ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.city ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.status_validacao}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.status_conquista}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.contact_id ? t('linked') : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SupporterFormDialog
        open={open}
        onOpenChange={setOpen}
        leaderships={leaderships}
        lockedLeadershipId={myLeadershipId}
        onSaved={load}
      />
    </div>
  );
}
