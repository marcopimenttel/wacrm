'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  BRAZIL_UF,
  GENDER_OPTIONS,
  SUPPORTER_MARITAL_OPTIONS,
} from '@/lib/campaign/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const selectClass =
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm';

/** Página pública de cadastro de apoiadores (link da liderança). */
export default function PublicCadastroPage() {
  const params = useParams<{ accountSlug: string; linkId: string }>();
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{
    account: { name: string };
    leadership: { name: string; nickname: string | null };
    cityZones: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/public/cadastro/${params.accountSlug}/${params.linkId}`,
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? 'Link inválido');
        return;
      }
      setMeta(body);
    } catch {
      setError('Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }, [params.accountSlug, params.linkId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(
        `/api/public/cadastro/${params.accountSlug}/${params.linkId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
          }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? 'Não foi possível cadastrar');
        return;
      }
      setDone(true);
    } catch {
      toast.error('Não foi possível cadastrar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">{error ?? 'Erro'}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">Cadastro recebido</h1>
          <p className="text-sm text-muted-foreground">
            Obrigado! Seu cadastro com {meta.leadership.name} foi registrado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">{meta.account.name}</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Cadastro de apoiador
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Liderança: {meta.leadership.name}
            {meta.leadership.nickname
              ? ` (${meta.leadership.nickname})`
              : ''}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome completo</Label>
              <Input className="bg-background" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Apelido</Label>
              <Input className="bg-background" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input className="bg-background" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Profissão</Label>
              <Input className="bg-background" value={profession} onChange={(e) => setProfession(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de nascimento</Label>
              <Input type="date" className="bg-background" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Gênero</Label>
              <select className={selectClass} value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">—</option>
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado civil</Label>
              <select className={selectClass} value={marital} onChange={(e) => setMarital(e.target.value)}>
                <option value="">—</option>
                {SUPPORTER_MARITAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input className="bg-background" value={cep} onChange={(e) => setCep(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input className="bg-background" value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Logradouro</Label>
              <Input className="bg-background" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Bairro</Label>
              <Input className="bg-background" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Zona da cidade</Label>
              {meta.cityZones.length ? (
                <select className={selectClass} value={cityZone} onChange={(e) => setCityZone(e.target.value)}>
                  <option value="">—</option>
                  {meta.cityZones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              ) : (
                <Input className="bg-background" value={cityZone} onChange={(e) => setCityZone(e.target.value)} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
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
              <Label>Complemento</Label>
              <Input className="bg-background" value={complement} onChange={(e) => setComplement(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Observações</Label>
              <Input className="bg-background" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Enviar cadastro
          </Button>
        </form>
      </div>
    </div>
  );
}
