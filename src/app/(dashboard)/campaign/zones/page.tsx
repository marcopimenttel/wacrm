'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPinned, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { useCan } from '@/hooks/use-can';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Catálogo de zonas da cidade por conta (Brasil inteiro —
 * cada campanha define as zonas da sua cidade).
 */
export default function CityZonesPage() {
  const t = useTranslations('Campaign.zones');
  const canEdit = useCan('edit-settings');
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campaign/catalogs?kind=city_zones');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? t('loadError'));
        return;
      }
      setItems(body.items ?? []);
    } catch {
      toast.error(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/campaign/catalogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'city_zones', name }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? t('saveError'));
        return;
      }
      setName('');
      toast.success(t('saveOk'));
      await load();
    } catch {
      toast.error(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <MapPinned className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t('title')}
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      {canEdit ? (
        <div className="flex max-w-md gap-2">
          <Input
            className="bg-background"
            placeholder={t('placeholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add();
            }}
          />
          <Button type="button" disabled={saving || !name.trim()} onClick={add}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {t('add')}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="max-w-md space-y-2">
          {items.map((z) => (
            <li
              key={z.id}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            >
              {z.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
