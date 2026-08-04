'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import {
  BRAZIL_UF,
  GENDER_OPTIONS,
  LEADERSHIP_MARITAL_OPTIONS,
  LEADERSHIP_STATUS_OPTIONS,
} from '@/lib/campaign/constants';
import {
  FORM_GRID_CLASS,
  FORM_SPAN_2,
  FORM_SPAN_FULL,
} from '@/lib/campaign/form-layout';
import { CepInput } from '@/components/brazil/cep-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type LeadershipFormValues = Record<string, unknown>;

interface CatalogItem {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinators: { id: string; name: string }[];
  initial?: LeadershipFormValues | null;
  onSaved: () => void;
  /** Se true, esconde campos internos / acesso */
  isLeadershipUser?: boolean;
}

const empty: LeadershipFormValues = {
  coordinatorId: '',
  name: '',
  nickname: '',
  cpf: '',
  birth_date: '',
  gender: '',
  marital_status: '',
  mother_name: '',
  voter_title: '',
  electoral_zone: '',
  electoral_section: '',
  phone: '',
  email: '',
  instagram: '',
  facebook: '',
  twitter: '',
  cep: '',
  address: '',
  address_number: '',
  neighborhood: '',
  city: '',
  state: '',
  city_zone: '',
  complement: '',
  status: 'active',
  salary: '',
  admission_date: '',
  estimated_votes: '',
  commitment_level_id: '',
  bond_type_id: '',
  internal_notes: '',
  segment_ids: [] as string[],
  flag_ids: [] as string[],
  accessEmail: '',
  accessPassword: '',
};

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-foreground">{label}</Label>
      {children}
    </div>
  );
}

const selectClass =
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground';

/** Formulário completo de liderança (campos O Candidato, visual WACRM). */
export function LeadershipFormDialog({
  open,
  onOpenChange,
  coordinators,
  initial,
  onSaved,
  isLeadershipUser = false,
}: Props) {
  const t = useTranslations('Campaign.leaderships');
  const [form, setForm] = useState<LeadershipFormValues>(empty);
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<CatalogItem[]>([]);
  const [segments, setSegments] = useState<CatalogItem[]>([]);
  const [flags, setFlags] = useState<CatalogItem[]>([]);
  const [levels, setLevels] = useState<CatalogItem[]>([]);
  const [bonds, setBonds] = useState<CatalogItem[]>([]);

  const set = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!open) return;
    setForm({
      ...empty,
      ...initial,
      coordinatorId:
        (initial?.coordinator_id as string) ||
        (initial?.coordinatorId as string) ||
        coordinators[0]?.id ||
        '',
      segment_ids: (initial?.segment_ids as string[]) ?? [],
      flag_ids: (initial?.flag_ids as string[]) ?? [],
    });

    const load = async () => {
      const kinds = [
        'city_zones',
        'segments',
        'flags',
        'commitment_levels',
        'bond_types',
      ] as const;
      const results = await Promise.all(
        kinds.map((kind) =>
          fetch(`/api/campaign/catalogs?kind=${kind}`).then((r) => r.json()),
        ),
      );
      setZones(results[0].items ?? []);
      setSegments(results[1].items ?? []);
      setFlags(results[2].items ?? []);
      setLevels(results[3].items ?? []);
      setBonds(results[4].items ?? []);
    };
    void load();
  }, [open, initial, coordinators]);

  const submit = async () => {
    if (!String(form.name ?? '').trim()) {
      toast.error(t('saveError'));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.accessEmail;
      delete payload.accessPassword;
      delete payload.campaign_coordinators;
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.user_id;
      delete payload.registration_slug;
      delete payload.registration_token;
      delete payload.account_id;

      const isEdit = !!initial?.id;
      const res = await fetch(
        isEdit
          ? `/api/campaign/leaderships/${initial!.id}`
          : '/api/campaign/leaderships',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? t('saveError'));
        return;
      }

      const leadershipId = isEdit
        ? (initial!.id as string)
        : (body.leadership?.id as string);

      if (
        !isLeadershipUser &&
        leadershipId &&
        String(form.accessEmail ?? '').trim() &&
        String(form.accessPassword ?? '').length >= 6
      ) {
        const acc = await fetch(
          `/api/campaign/leaderships/${leadershipId}/access`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: form.accessEmail,
              password: form.accessPassword,
              fullName: form.name,
            }),
          },
        );
        const accBody = await acc.json().catch(() => ({}));
        if (!acc.ok) {
          toast.error(accBody.error ?? t('accessError'));
        } else {
          toast.success(t('accessOk'));
        }
      }

      toast.success(t('saveOk'));
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const toggleMulti = (key: 'segment_ids' | 'flag_ids', id: string) => {
    const cur = new Set((form[key] as string[]) ?? []);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    set(key, [...cur]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="form"
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>
            {initial?.id ? t('dialogEdit') : t('dialogTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto px-6 py-4">
          {!isLeadershipUser ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('sectionCoord')}
              </h3>
              <div className={FORM_GRID_CLASS}>
              <Field label={t('colCoordinator')} className={FORM_SPAN_2}>
                <select
                  className={selectClass}
                  value={String(form.coordinatorId ?? '')}
                  onChange={(e) => set('coordinatorId', e.target.value)}
                >
                  {coordinators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t('sectionPersonal')}
            </h3>
            <div className={FORM_GRID_CLASS}>
              <Field label={t('colName')}>
                <Input
                  className="bg-background"
                  value={String(form.name ?? '')}
                  onChange={(e) => set('name', e.target.value)}
                  disabled={isLeadershipUser}
                />
              </Field>
              <Field label={t('fieldNickname')}>
                <Input
                  className="bg-background"
                  value={String(form.nickname ?? '')}
                  onChange={(e) => set('nickname', e.target.value)}
                />
              </Field>
              <Field label={t('fieldCpf')}>
                <Input
                  className="bg-background"
                  value={String(form.cpf ?? '')}
                  onChange={(e) => set('cpf', e.target.value)}
                  disabled={isLeadershipUser}
                />
              </Field>
              <Field label={t('fieldBirth')}>
                <Input
                  type="date"
                  className="bg-background"
                  value={String(form.birth_date ?? '').slice(0, 10)}
                  onChange={(e) => set('birth_date', e.target.value)}
                  disabled={isLeadershipUser}
                />
              </Field>
              <Field label={t('fieldGender')}>
                <select
                  className={selectClass}
                  value={String(form.gender ?? '')}
                  onChange={(e) => set('gender', e.target.value)}
                  disabled={isLeadershipUser}
                >
                  <option value="">—</option>
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('fieldMarital')}>
                <select
                  className={selectClass}
                  value={String(form.marital_status ?? '')}
                  onChange={(e) => set('marital_status', e.target.value)}
                  disabled={isLeadershipUser}
                >
                  <option value="">—</option>
                  {LEADERSHIP_MARITAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('fieldMother')} className={FORM_SPAN_2}>
                <Input
                  className="bg-background"
                  value={String(form.mother_name ?? '')}
                  onChange={(e) => set('mother_name', e.target.value)}
                  disabled={isLeadershipUser}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t('sectionElectoral')}
            </h3>
            <div className={FORM_GRID_CLASS}>
              <Field label={t('fieldVoterTitle')}>
                <Input
                  className="bg-background"
                  value={String(form.voter_title ?? '')}
                  onChange={(e) => set('voter_title', e.target.value)}
                  disabled={isLeadershipUser}
                />
              </Field>
              <Field label={t('fieldElectoralZone')}>
                <Input
                  className="bg-background"
                  value={String(form.electoral_zone ?? '')}
                  onChange={(e) => set('electoral_zone', e.target.value)}
                  disabled={isLeadershipUser}
                />
              </Field>
              <Field label={t('fieldElectoralSection')}>
                <Input
                  className="bg-background"
                  value={String(form.electoral_section ?? '')}
                  onChange={(e) => set('electoral_section', e.target.value)}
                  disabled={isLeadershipUser}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t('sectionContact')}
            </h3>
            <div className={FORM_GRID_CLASS}>
              <Field label={t('colPhone')}>
                <Input
                  className="bg-background"
                  value={String(form.phone ?? '')}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </Field>
              <Field label={t('colEmail')}>
                <Input
                  type="email"
                  className="bg-background"
                  value={String(form.email ?? '')}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
              <Field label="Instagram">
                <Input
                  className="bg-background"
                  value={String(form.instagram ?? '')}
                  onChange={(e) => set('instagram', e.target.value)}
                />
              </Field>
              <Field label="Facebook">
                <Input
                  className="bg-background"
                  value={String(form.facebook ?? '')}
                  onChange={(e) => set('facebook', e.target.value)}
                />
              </Field>
              <Field label="Twitter/X">
                <Input
                  className="bg-background"
                  value={String(form.twitter ?? '')}
                  onChange={(e) => set('twitter', e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t('sectionAddress')}
            </h3>
            <div className={FORM_GRID_CLASS}>
              <Field label="CEP">
                <CepInput
                  value={String(form.cep ?? '')}
                  onChange={(masked) => set('cep', masked)}
                  onResolved={(addr) => {
                    set('address', addr.address);
                    set('neighborhood', addr.neighborhood);
                    set('city', addr.city);
                    set('state', addr.state);
                    if (addr.complement) set('complement', addr.complement);
                  }}
                />
              </Field>
              <Field label={t('fieldNumber')}>
                <Input
                  className="bg-background"
                  value={String(form.address_number ?? '')}
                  onChange={(e) => set('address_number', e.target.value)}
                />
              </Field>
              <Field label={t('fieldNeighborhood')}>
                <Input
                  className="bg-background"
                  value={String(form.neighborhood ?? '')}
                  onChange={(e) => set('neighborhood', e.target.value)}
                />
              </Field>
              <Field label={t('fieldAddress')} className={FORM_SPAN_2}>
                <Input
                  className="bg-background"
                  value={String(form.address ?? '')}
                  onChange={(e) => set('address', e.target.value)}
                />
              </Field>
              <Field label={t('colCity')}>
                <Input
                  className="bg-background"
                  value={String(form.city ?? '')}
                  onChange={(e) => set('city', e.target.value)}
                />
              </Field>
              <Field label={t('colState')}>
                <select
                  className={selectClass}
                  value={String(form.state ?? '')}
                  onChange={(e) => set('state', e.target.value)}
                >
                  <option value="">—</option>
                  {BRAZIL_UF.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('fieldCityZone')}>
                {zones.length ? (
                  <select
                    className={selectClass}
                    value={String(form.city_zone ?? '')}
                    onChange={(e) => set('city_zone', e.target.value)}
                  >
                    <option value="">—</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.name}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    className="bg-background"
                    value={String(form.city_zone ?? '')}
                    onChange={(e) => set('city_zone', e.target.value)}
                    placeholder={t('cityZoneHint')}
                  />
                )}
              </Field>
              <Field label={t('fieldComplement')} className={FORM_SPAN_2}>
                <Input
                  className="bg-background"
                  value={String(form.complement ?? '')}
                  onChange={(e) => set('complement', e.target.value)}
                />
              </Field>
            </div>
          </section>

          {!isLeadershipUser ? (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {t('sectionCampaign')}
                </h3>
                <div className={FORM_GRID_CLASS}>
                  <Field label={t('colStatus')}>
                    <select
                      className={selectClass}
                      value={String(form.status ?? 'active')}
                      onChange={(e) => set('status', e.target.value)}
                    >
                      {LEADERSHIP_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t('fieldSalary')}>
                    <Input
                      className="bg-background"
                      value={String(form.salary ?? '')}
                      onChange={(e) => set('salary', e.target.value)}
                    />
                  </Field>
                  <Field label={t('fieldAdmission')}>
                    <Input
                      type="date"
                      className="bg-background"
                      value={String(form.admission_date ?? '').slice(0, 10)}
                      onChange={(e) => set('admission_date', e.target.value)}
                    />
                  </Field>
                  <Field label={t('fieldVotes')}>
                    <Input
                      type="number"
                      min={0}
                      className="bg-background"
                      value={String(form.estimated_votes ?? '')}
                      onChange={(e) => set('estimated_votes', e.target.value)}
                    />
                  </Field>
                  <Field label={t('fieldCommitment')}>
                    <select
                      className={selectClass}
                      value={String(form.commitment_level_id ?? '')}
                      onChange={(e) => set('commitment_level_id', e.target.value)}
                    >
                      <option value="">—</option>
                      {levels.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t('fieldBond')}>
                    <select
                      className={selectClass}
                      value={String(form.bond_type_id ?? '')}
                      onChange={(e) => set('bond_type_id', e.target.value)}
                    >
                      <option value="">—</option>
                      {bonds.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {segments.length ? (
                  <div className="space-y-2">
                    <Label>{t('fieldSegments')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {segments.map((s) => {
                        const on = ((form.segment_ids as string[]) ?? []).includes(
                          s.id,
                        );
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleMulti('segment_ids', s.id)}
                            className={
                              on
                                ? 'rounded-md border border-primary bg-primary/10 px-2 py-1 text-xs text-primary'
                                : 'rounded-md border border-border px-2 py-1 text-xs text-muted-foreground'
                            }
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {flags.length ? (
                  <div className="space-y-2">
                    <Label>{t('fieldFlags')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {flags.map((s) => {
                        const on = ((form.flag_ids as string[]) ?? []).includes(
                          s.id,
                        );
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleMulti('flag_ids', s.id)}
                            className={
                              on
                                ? 'rounded-md border border-primary bg-primary/10 px-2 py-1 text-xs text-primary'
                                : 'rounded-md border border-border px-2 py-1 text-xs text-muted-foreground'
                            }
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <Field label={t('fieldInternalNotes')} className={FORM_SPAN_FULL}>
                  <Textarea
                    className="bg-background"
                    rows={3}
                    value={String(form.internal_notes ?? '')}
                    onChange={(e) => set('internal_notes', e.target.value)}
                  />
                </Field>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {t('sectionAccess')}
                </h3>
                <p className="text-xs text-muted-foreground">{t('accessHint')}</p>
                <div className={FORM_GRID_CLASS}>
                  <Field label={t('accessEmail')}>
                    <Input
                      type="email"
                      className="bg-background"
                      value={String(form.accessEmail ?? '')}
                      onChange={(e) => set('accessEmail', e.target.value)}
                    />
                  </Field>
                  <Field label={t('accessPassword')}>
                    <Input
                      type="password"
                      className="bg-background"
                      value={String(form.accessPassword ?? '')}
                      onChange={(e) => set('accessPassword', e.target.value)}
                    />
                  </Field>
                </div>
              </section>
            </>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button type="button" disabled={saving} onClick={submit}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
