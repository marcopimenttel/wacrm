/**
 * Override de módulos por tenant (herdar / forçar on / forçar off).
 */

'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  ALL_MODULE_KEYS,
  MODULE_LABEL_PT,
} from '@/lib/saas/modules';

type OverrideMode = 'inherit' | 'on' | 'off';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string | null;
  accountName: string;
  planModules: string[];
  onSaved: () => void;
};

export function TenantModulesDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
  planModules,
  onSaved,
}: Props) {
  const t = useTranslations('Platform.modulesEdit');
  const [modes, setModes] = useState<Record<string, OverrideMode>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !accountId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/platform/accounts/${accountId}/modules`,
        );
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        const next: Record<string, OverrideMode> = {};
        for (const key of ALL_MODULE_KEYS) {
          next[key] = 'inherit';
        }
        for (const row of body.modules ?? []) {
          if (row?.module_key) {
            next[row.module_key] = row.enabled ? 'on' : 'off';
          }
        }
        setModes(next);
      } catch {
        toast.error(t('loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, accountId, t]);

  async function handleSave() {
    if (!accountId) return;
    setSaving(true);
    try {
      const modules = Object.entries(modes)
        .filter(([, mode]) => mode !== 'inherit')
        .map(([module_key, mode]) => ({
          module_key,
          enabled: mode === 'on',
        }));

      const res = await fetch(
        `/api/platform/accounts/${accountId}/modules`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modules }),
        },
      );
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

  const planSet = new Set(planModules);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{t('title', { name: accountName })}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <p className="text-xs text-muted-foreground">{t('hint')}</p>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {ALL_MODULE_KEYS.map((key) => {
                const inPlan = planSet.has(key);
                return (
                  <div
                    key={key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Label className="text-sm">
                        {MODULE_LABEL_PT[key] ?? key}
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        {inPlan ? t('inPlan') : t('notInPlan')}
                      </p>
                    </div>
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={modes[key] ?? 'inherit'}
                      onChange={(e) =>
                        setModes((prev) => ({
                          ...prev,
                          [key]: e.target.value as OverrideMode,
                        }))
                      }
                    >
                      <option value="inherit">{t('inherit')}</option>
                      <option value="on">{t('forceOn')}</option>
                      <option value="off">{t('forceOff')}</option>
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button disabled={saving || loading} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
