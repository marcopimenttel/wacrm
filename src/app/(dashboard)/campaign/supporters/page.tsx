'use client';

import { useCallback, useEffect, useState } from 'react';
import { Handshake, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { useCan } from '@/hooks/use-can';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface LeadershipOption {
  id: string;
  name: string;
}

interface Supporter {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  status_validacao: string;
  contact_id: string | null;
  campaign_leaderships?: { id: string; name: string } | null;
}

/** Apoiadores vinculados a uma liderança (sincroniza contato WhatsApp se houver telefone). */
export default function SupportersPage() {
  const t = useTranslations('Campaign.supporters');
  const canEdit = useCan('send-messages');
  const [rows, setRows] = useState<Supporter[]>([]);
  const [leaderships, setLeaderships] = useState<LeadershipOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leadershipId, setLeadershipId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

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
      setLeaderships(leadBody.leaderships ?? []);
      if (!leadershipId && (leadBody.leaderships?.[0] as LeadershipOption | undefined)?.id) {
        setLeadershipId(leadBody.leaderships[0].id);
      }
    } catch {
      toast.error(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [leadershipId, t]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/campaign/supporters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadershipId, name, phone, city }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? t('saveError'));
        return;
      }
      toast.success(t('saveOk'));
      setOpen(false);
      setName('');
      setPhone('');
      setCity('');
      await load();
    } catch {
      toast.error(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

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
              <TableHead>{t('colCrm')}</TableHead>
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
                  <TableCell className="text-muted-foreground">
                    {row.contact_id ? t('linked') : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sup-lead">{t('colLeadership')}</Label>
              <select
                id="sup-lead"
                value={leadershipId}
                onChange={(e) => setLeadershipId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {leaderships.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-name">{t('colName')}</Label>
              <Input
                id="sup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-phone">{t('colPhone')}</Label>
              <Input
                id="sup-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-background"
                placeholder={t('phoneHint')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-city">{t('colCity')}</Label>
              <Input
                id="sup-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              disabled={saving || !name.trim() || !leadershipId}
              onClick={submit}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
