/**
 * Criar / editar plano (preço, quotas, módulos do catálogo).
 */

'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  FORM_GRID_CLASS,
  FORM_SPAN_2,
  FORM_SPAN_FULL,
} from '@/lib/campaign/form-layout';
import {
  ALL_MODULE_KEYS,
  MODULE_LABEL_PT,
} from '@/lib/saas/modules';

export type PlanEditData = {
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
};

type FormState = {
  key: string;
  name: string;
  description: string;
  isActive: boolean;
  priceMonthly: string;
  priceYearly: string;
  trialDays: string;
  maxSupporters: string;
  maxLeaderships: string;
  maxTeamMembers: string;
  modules: Set<string>;
};

function emptyForm(): FormState {
  return {
    key: '',
    name: '',
    description: '',
    isActive: true,
    priceMonthly: '0',
    priceYearly: '0',
    trialDays: '14',
    maxSupporters: '',
    maxLeaderships: '',
    maxTeamMembers: '',
    modules: new Set(),
  };
}

function fromPlan(p: PlanEditData): FormState {
  return {
    key: p.key,
    name: p.name,
    description: p.description ?? '',
    isActive: p.is_active,
    priceMonthly: String(p.price_monthly_brl ?? 0),
    priceYearly: String(p.price_yearly_brl ?? 0),
    trialDays: String(p.trial_days ?? 14),
    maxSupporters:
      p.max_supporters == null ? '' : String(p.max_supporters),
    maxLeaderships:
      p.max_leaderships == null ? '' : String(p.max_leaderships),
    maxTeamMembers:
      p.max_team_members == null ? '' : String(p.max_team_members),
    modules: new Set(p.modules ?? []),
  };
}

function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = criar novo plano */
  plan: PlanEditData | null;
  onSaved: () => void;
};

export function PlanEditDialog({
  open,
  onOpenChange,
  plan,
  onSaved,
}: Props) {
  const t = useTranslations('Platform.planEdit');
  const isCreate = !plan;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(plan ? fromPlan(plan) : emptyForm());
  }, [open, plan]);

  function toggleModule(key: string, checked: boolean) {
    setForm((prev) => {
      const next = new Set(prev.modules);
      if (checked) next.add(key);
      else next.delete(key);
      return { ...prev, modules: next };
    });
  }

  async function handleSave() {
    if (!form.name.trim() || (isCreate && !form.key.trim())) {
      toast.error(t('required'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isActive: form.isActive,
        priceMonthly: Number(form.priceMonthly) || 0,
        priceYearly: Number(form.priceYearly) || 0,
        trialDays: Number(form.trialDays) || 14,
        maxSupporters: parseOptionalInt(form.maxSupporters),
        maxLeaderships: parseOptionalInt(form.maxLeaderships),
        maxTeamMembers: parseOptionalInt(form.maxTeamMembers),
        modules: [...form.modules],
      };

      const res = await fetch('/api/platform/plans', {
        method: isCreate ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isCreate
            ? { key: form.key.trim().toLowerCase(), ...payload }
            : { planId: plan!.id, ...payload },
        ),
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
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>
            {isCreate ? t('titleCreate') : t('titleEdit')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className={FORM_GRID_CLASS}>
            {isCreate ? (
              <div className="space-y-1.5">
                <Label>{t('key')}</Label>
                <Input
                  className="bg-background font-mono text-sm"
                  placeholder="pro"
                  value={form.key}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      key: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_-]/g, ''),
                    })
                  }
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>{t('key')}</Label>
                <Input
                  className="bg-muted font-mono text-sm"
                  value={form.key}
                  disabled
                />
              </div>
            )}
            <div className={`space-y-1.5 ${FORM_SPAN_2}`}>
              <Label>{t('name')}</Label>
              <Input
                className="bg-background"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className={`space-y-1.5 ${FORM_SPAN_FULL}`}>
              <Label>{t('description')}</Label>
              <Textarea
                className="bg-background min-h-16"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('priceMonthly')}</Label>
              <Input
                className="bg-background"
                type="number"
                min={0}
                step="0.01"
                value={form.priceMonthly}
                onChange={(e) =>
                  setForm({ ...form, priceMonthly: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('priceYearly')}</Label>
              <Input
                className="bg-background"
                type="number"
                min={0}
                step="0.01"
                value={form.priceYearly}
                onChange={(e) =>
                  setForm({ ...form, priceYearly: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('trialDays')}</Label>
              <Input
                className="bg-background"
                type="number"
                min={0}
                value={form.trialDays}
                onChange={(e) =>
                  setForm({ ...form, trialDays: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('maxSupporters')}</Label>
              <Input
                className="bg-background"
                placeholder={t('unlimited')}
                value={form.maxSupporters}
                onChange={(e) =>
                  setForm({ ...form, maxSupporters: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('maxLeaderships')}</Label>
              <Input
                className="bg-background"
                placeholder={t('unlimited')}
                value={form.maxLeaderships}
                onChange={(e) =>
                  setForm({ ...form, maxLeaderships: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('maxTeam')}</Label>
              <Input
                className="bg-background"
                placeholder={t('unlimited')}
                value={form.maxTeamMembers}
                onChange={(e) =>
                  setForm({ ...form, maxTeamMembers: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label>{t('isActive')}</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('modules')}</Label>
            <p className="text-xs text-muted-foreground">{t('modulesHint')}</p>
            <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
              {ALL_MODULE_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={form.modules.has(key)}
                    onCheckedChange={(v) => toggleModule(key, v === true)}
                  />
                  <span>{MODULE_LABEL_PT[key] ?? key}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
