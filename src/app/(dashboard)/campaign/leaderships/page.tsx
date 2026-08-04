'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Users } from 'lucide-react';
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

interface CoordinatorOption {
  id: string;
  name: string;
}

interface Leadership {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  status: string;
  coordinator_id: string;
  campaign_coordinators?: { id: string; name: string } | null;
}

/** Lideranças vinculadas a um coordenador. */
export default function LeadershipsPage() {
  const t = useTranslations('Campaign.leaderships');
  const canEdit = useCan('send-messages');
  const [rows, setRows] = useState<Leadership[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coordinatorId, setCoordinatorId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, coordRes] = await Promise.all([
        fetch('/api/campaign/leaderships'),
        fetch('/api/campaign/coordinators'),
      ]);
      const leadBody = await leadRes.json().catch(() => ({}));
      const coordBody = await coordRes.json().catch(() => ({}));
      if (!leadRes.ok) {
        toast.error(leadBody.error ?? t('loadError'));
        return;
      }
      setRows(leadBody.leaderships ?? []);
      setCoordinators(coordBody.coordinators ?? []);
      if (!coordinatorId && (coordBody.coordinators?.[0] as CoordinatorOption | undefined)?.id) {
        setCoordinatorId(coordBody.coordinators[0].id);
      }
    } catch {
      toast.error(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [coordinatorId, t]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/campaign/leaderships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinatorId, name, phone, city, state }),
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
      setState('');
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
            <Users className="h-6 w-6 text-primary" />
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
            disabled={coordinators.length === 0}
          >
            <Plus className="size-4" />
            {t('add')}
          </Button>
        ) : null}
      </div>

      {coordinators.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground">{t('needCoordinator')}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('colName')}</TableHead>
              <TableHead>{t('colCoordinator')}</TableHead>
              <TableHead>{t('colPhone')}</TableHead>
              <TableHead>{t('colCity')}</TableHead>
              <TableHead>{t('colStatus')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
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
                    {row.campaign_coordinators?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.phone ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[row.city, row.state].filter(Boolean).join(' / ') || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.status}</Badge>
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
              <Label htmlFor="lead-coord">{t('colCoordinator')}</Label>
              <select
                id="lead-coord"
                value={coordinatorId}
                onChange={(e) => setCoordinatorId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-name">{t('colName')}</Label>
              <Input
                id="lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">{t('colPhone')}</Label>
              <Input
                id="lead-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lead-city">{t('colCity')}</Label>
                <Input
                  id="lead-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-state">{t('colState')}</Label>
                <Input
                  id="lead-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              disabled={saving || !name.trim() || !coordinatorId}
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
