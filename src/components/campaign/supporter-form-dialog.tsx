'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import {
  BRAZIL_UF,
  FAMILY_RELATIONSHIP_OPTIONS,
  GENDER_OPTIONS,
  SUPPORTER_CONQUISTA_OPTIONS,
  SUPPORTER_MARITAL_OPTIONS,
} from '@/lib/campaign/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FamilyRow {
  name: string;
  relationship: string;
  birth_date: string;
  phone: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaderships: { id: string; name: string }[];
  lockedLeadershipId?: string | null;
  onSaved: () => void;
}

const selectClass =
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground';

/** Formulário completo de apoiador (O Candidato → UI WACRM). */
export function SupporterFormDialog({
  open,
  onOpenChange,
  leaderships,
  lockedLeadershipId,
  onSaved,
}: Props) {
  const t = useTranslations('Campaign.supporters');
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [leadershipId, setLeadershipId] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [profession, setProfession] = useState('');
  const [gender, setGender] = useState('');
  const [marital, setMarital] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [cityZone, setCityZone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [complement, setComplement] = useState('');
  const [notes, setNotes] = useState('');
  const [conquista, setConquista] = useState('nao_informado');
  const [family, setFamily] = useState<FamilyRow[]>([]);

  useEffect(() => {
    if (!open) return;
    setLeadershipId(lockedLeadershipId || leaderships[0]?.id || '');
    setName('');
    setNickname('');
    setProfession('');
    setGender('');
    setMarital('');
    setBirthDate('');
    setPhone('');
    setCep('');
    setAddress('');
    setNumber('');
    setNeighborhood('');
    setCityZone('');
    setCity('');
    setState('');
    setComplement('');
    setNotes('');
    setConquista('nao_informado');
    setFamily([]);
    void fetch('/api/campaign/catalogs?kind=city_zones')
      .then((r) => r.json())
      .then((b) => setZones(b.items ?? []));
  }, [open, lockedLeadershipId, leaderships]);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/campaign/supporters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadershipId,
          name,
          nickname,
          profession,
          gender,
          marital_status: marital,
          birth_date: birthDate,
          phone,
          cep,
          address,
          address_number: number,
          neighborhood,
          city_zone: cityZone,
          city,
          state,
          complement,
          notes,
          status_conquista: conquista,
          family: family.filter((f) => f.name.trim()),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? t('saveError'));
        return;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 overflow-y-auto px-6 py-4">
          {!lockedLeadershipId ? (
            <div className="space-y-1.5">
              <Label>{t('colLeadership')}</Label>
              <select
                className={selectClass}
                value={leadershipId}
                onChange={(e) => setLeadershipId(e.target.value)}
              >
                {leaderships.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('colName')}</Label>
              <Input className="bg-background" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('fieldNickname')}</Label>
              <Input className="bg-background" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('fieldProfession')}</Label>
              <Input className="bg-background" value={profession} onChange={(e) => setProfession(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('colPhone')}</Label>
              <Input className="bg-background" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('fieldGender')}</Label>
              <select className={selectClass} value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">—</option>
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('fieldMarital')}</Label>
              <select className={selectClass} value={marital} onChange={(e) => setMarital(e.target.value)}>
                <option value="">—</option>
                {SUPPORTER_MARITAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('fieldBirth')}</Label>
              <Input type="date" className="bg-background" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('fieldConquista')}</Label>
              <select className={selectClass} value={conquista} onChange={(e) => setConquista(e.target.value)}>
                {SUPPORTER_CONQUISTA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input className="bg-background" value={cep} onChange={(e) => setCep(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('fieldNumber')}</Label>
              <Input className="bg-background" value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t('fieldAddress')}</Label>
              <Input className="bg-background" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('fieldNeighborhood')}</Label>
              <Input className="bg-background" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('fieldCityZone')}</Label>
              {zones.length ? (
                <select className={selectClass} value={cityZone} onChange={(e) => setCityZone(e.target.value)}>
                  <option value="">—</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.name}>{z.name}</option>
                  ))}
                </select>
              ) : (
                <Input className="bg-background" value={cityZone} onChange={(e) => setCityZone(e.target.value)} placeholder={t('cityZoneHint')} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t('colCity')}</Label>
              <Input className="bg-background" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <select className={selectClass} value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">—</option>
                {BRAZIL_UF.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t('fieldComplement')}</Label>
              <Input className="bg-background" value={complement} onChange={(e) => setComplement(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t('fieldNotes')}</Label>
              <Textarea className="bg-background" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{t('sectionFamily')}</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setFamily((f) => [
                    ...f,
                    { name: '', relationship: 'spouse', birth_date: '', phone: '' },
                  ])
                }
              >
                <Plus className="size-3.5" />
                {t('addFamily')}
              </Button>
            </div>
            {family.map((row, idx) => (
              <div key={idx} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
                <Input
                  placeholder={t('colName')}
                  className="bg-background"
                  value={row.name}
                  onChange={(e) => {
                    const next = [...family];
                    next[idx] = { ...row, name: e.target.value };
                    setFamily(next);
                  }}
                />
                <select
                  className={selectClass}
                  value={row.relationship}
                  onChange={(e) => {
                    const next = [...family];
                    next[idx] = { ...row, relationship: e.target.value };
                    setFamily(next);
                  }}
                >
                  {FAMILY_RELATIONSHIP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <Input
                  type="date"
                  className="bg-background"
                  value={row.birth_date}
                  onChange={(e) => {
                    const next = [...family];
                    next[idx] = { ...row, birth_date: e.target.value };
                    setFamily(next);
                  }}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder={t('colPhone')}
                    className="bg-background"
                    value={row.phone}
                    onChange={(e) => {
                      const next = [...family];
                      next[idx] = { ...row, phone: e.target.value };
                      setFamily(next);
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setFamily((f) => f.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
  );
}
