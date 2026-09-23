/**
 * Diálogo de edição rica do tenant (CNPJ, endereço, candidato, marca).
 */

'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { CepInput } from '@/components/brazil/cep-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FORM_GRID_CLASS,
  FORM_SPAN_2,
  FORM_SPAN_FULL,
} from '@/lib/campaign/form-layout';

export type TenantEditData = {
  id: string;
  name: string;
  cnpj: string | null;
  contact_phone: string | null;
  cep: string | null;
  address: string | null;
  address_number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  primary_color: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  candidate_ballot_name: string | null;
  candidate_full_name: string | null;
  candidate_party: string | null;
  candidate_uf: string | null;
  candidate_office: string | null;
  candidate_number: string | null;
  notes_internal: string | null;
  billing_email: string | null;
  billing_cpf_cnpj: string | null;
};

type FormState = {
  name: string;
  cnpj: string;
  contact_phone: string;
  cep: string;
  address: string;
  address_number: string;
  neighborhood: string;
  city: string;
  state: string;
  primary_color: string;
  logo_url: string;
  favicon_url: string;
  candidate_ballot_name: string;
  candidate_full_name: string;
  candidate_party: string;
  candidate_uf: string;
  candidate_office: string;
  candidate_number: string;
  notes_internal: string;
  billing_email: string;
  billing_cpf_cnpj: string;
};

function fromTenant(t: TenantEditData): FormState {
  return {
    name: t.name ?? '',
    cnpj: t.cnpj ?? '',
    contact_phone: t.contact_phone ?? '',
    cep: t.cep ?? '',
    address: t.address ?? '',
    address_number: t.address_number ?? '',
    neighborhood: t.neighborhood ?? '',
    city: t.city ?? '',
    state: t.state ?? '',
    primary_color: t.primary_color ?? '#2563eb',
    logo_url: t.logo_url ?? '',
    favicon_url: t.favicon_url ?? '',
    candidate_ballot_name: t.candidate_ballot_name ?? '',
    candidate_full_name: t.candidate_full_name ?? '',
    candidate_party: t.candidate_party ?? '',
    candidate_uf: t.candidate_uf ?? '',
    candidate_office: t.candidate_office ?? '',
    candidate_number: t.candidate_number ?? '',
    notes_internal: t.notes_internal ?? '',
    billing_email: t.billing_email ?? '',
    billing_cpf_cnpj: t.billing_cpf_cnpj ?? '',
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantEditData | null;
  onSaved: () => void;
};

export function TenantEditDialog({
  open,
  onOpenChange,
  tenant,
  onSaved,
}: Props) {
  const t = useTranslations('Platform.tenantEdit');
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && tenant) setForm(fromTenant(tenant));
  }, [open, tenant]);

  const set = (key: keyof FormState, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  async function handleSave() {
    if (!tenant || !form || !form.name.trim()) {
      toast.error(t('nameRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/platform/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: tenant.id, ...form }),
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
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        {form ? (
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('sectionAccount')}
              </h3>
              <div className={FORM_GRID_CLASS}>
                <div className={`space-y-1.5 ${FORM_SPAN_2}`}>
                  <Label>{t('name')}</Label>
                  <Input
                    className="bg-background"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('cnpj')}</Label>
                  <Input
                    className="bg-background"
                    value={form.cnpj}
                    onChange={(e) => set('cnpj', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('phone')}</Label>
                  <Input
                    className="bg-background"
                    value={form.contact_phone}
                    onChange={(e) => set('contact_phone', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('billingEmail')}</Label>
                  <Input
                    className="bg-background"
                    type="email"
                    value={form.billing_email}
                    onChange={(e) => set('billing_email', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('billingDoc')}</Label>
                  <Input
                    className="bg-background"
                    value={form.billing_cpf_cnpj}
                    onChange={(e) => set('billing_cpf_cnpj', e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('sectionAddress')}
              </h3>
              <div className={FORM_GRID_CLASS}>
                <div className="space-y-1.5">
                  <Label>{t('cep')}</Label>
                  <CepInput
                    value={form.cep}
                    onChange={(v) => set('cep', v)}
                    onResolved={(addr) => {
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              address: addr.address || prev.address,
                              neighborhood:
                                addr.neighborhood || prev.neighborhood,
                              city: addr.city || prev.city,
                              state: addr.state || prev.state,
                            }
                          : prev,
                      );
                    }}
                  />
                </div>
                <div className={`space-y-1.5 ${FORM_SPAN_2}`}>
                  <Label>{t('address')}</Label>
                  <Input
                    className="bg-background"
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('number')}</Label>
                  <Input
                    className="bg-background"
                    value={form.address_number}
                    onChange={(e) => set('address_number', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('neighborhood')}</Label>
                  <Input
                    className="bg-background"
                    value={form.neighborhood}
                    onChange={(e) => set('neighborhood', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('city')}</Label>
                  <Input
                    className="bg-background"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('state')}</Label>
                  <Input
                    className="bg-background"
                    maxLength={2}
                    value={form.state}
                    onChange={(e) =>
                      set('state', e.target.value.toUpperCase())
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('sectionCandidate')}
              </h3>
              <div className={FORM_GRID_CLASS}>
                <div className="space-y-1.5">
                  <Label>{t('ballotName')}</Label>
                  <Input
                    className="bg-background"
                    value={form.candidate_ballot_name}
                    onChange={(e) =>
                      set('candidate_ballot_name', e.target.value)
                    }
                  />
                </div>
                <div className={`space-y-1.5 ${FORM_SPAN_2}`}>
                  <Label>{t('fullName')}</Label>
                  <Input
                    className="bg-background"
                    value={form.candidate_full_name}
                    onChange={(e) =>
                      set('candidate_full_name', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('party')}</Label>
                  <Input
                    className="bg-background"
                    value={form.candidate_party}
                    onChange={(e) => set('candidate_party', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('office')}</Label>
                  <Input
                    className="bg-background"
                    value={form.candidate_office}
                    onChange={(e) => set('candidate_office', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('numberCandidate')}</Label>
                  <Input
                    className="bg-background"
                    value={form.candidate_number}
                    onChange={(e) => set('candidate_number', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('uf')}</Label>
                  <Input
                    className="bg-background"
                    maxLength={2}
                    value={form.candidate_uf}
                    onChange={(e) =>
                      set('candidate_uf', e.target.value.toUpperCase())
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('sectionBrand')}
              </h3>
              <div className={FORM_GRID_CLASS}>
                <div className="space-y-1.5">
                  <Label>{t('primaryColor')}</Label>
                  <Input
                    className="bg-background"
                    value={form.primary_color}
                    onChange={(e) => set('primary_color', e.target.value)}
                  />
                </div>
                <div className={`space-y-1.5 ${FORM_SPAN_2}`}>
                  <Label>{t('logoUrl')}</Label>
                  <Input
                    className="bg-background"
                    value={form.logo_url}
                    onChange={(e) => set('logo_url', e.target.value)}
                  />
                </div>
                <div className={`space-y-1.5 ${FORM_SPAN_FULL}`}>
                  <Label>{t('faviconUrl')}</Label>
                  <Input
                    className="bg-background"
                    value={form.favicon_url}
                    onChange={(e) => set('favicon_url', e.target.value)}
                  />
                </div>
                <div className={`space-y-1.5 ${FORM_SPAN_FULL}`}>
                  <Label>{t('notes')}</Label>
                  <Textarea
                    className="bg-background min-h-20"
                    value={form.notes_internal}
                    onChange={(e) => set('notes_internal', e.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>
        ) : null}
        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button disabled={saving || !form} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
