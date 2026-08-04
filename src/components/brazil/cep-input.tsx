"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  formatCep,
  lookupCep,
  type BrazilAddressFromCep,
} from "@/lib/brazil/cep";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (maskedCep: string) => void;
  /** Preenche logradouro, bairro, cidade e UF ao resolver o CEP. */
  onResolved: (address: BrazilAddressFromCep) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * Campo CEP BR com máscara 99999-999 e busca ViaCEP no blur
 * (mesmo comportamento do O Candidato).
 */
export function CepInput({
  value,
  onChange,
  onResolved,
  className,
  id,
  disabled,
  placeholder = "00000-000",
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleBlur = async () => {
    try {
      setLoading(true);
      const result = await lookupCep(value);
      if (!result) return;
      onResolved(result);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "CEP não encontrado",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="postal-code"
        disabled={disabled || loading}
        placeholder={placeholder}
        className={cn("bg-background pr-9", className)}
        value={value}
        onChange={(e) => onChange(formatCep(e.target.value))}
        onBlur={() => {
          void handleBlur();
        }}
      />
      {loading ? (
        <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : null}
    </div>
  );
}
