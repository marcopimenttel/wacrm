/**
 * CEP (Brasil) — máscara e consulta ViaCEP (mesmo fluxo do O Candidato).
 */

export type ViaCepResult = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
  mensagem?: string;
};

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Máscara BR: 99999-999 */
export function formatCep(value: string): string {
  const d = digitsOnly(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function isValidCepDigits(value: string): boolean {
  return digitsOnly(value).length === 8;
}

/** Endereço normalizado para preencher formulários WACRM. */
export type BrazilAddressFromCep = {
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
};

export function mapViaCepToAddress(data: ViaCepResult): BrazilAddressFromCep {
  return {
    address: data.logradouro ?? "",
    neighborhood: data.bairro ?? "",
    city: data.localidade ?? "",
    state: (data.uf ?? "").toUpperCase(),
    complement: data.complemento ?? "",
  };
}

/**
 * Consulta `/api/cep/{cep}` (proxy ViaCEP).
 * Retorna null se CEP incompleto; lança Error se não encontrado / falha de rede.
 */
export async function lookupCep(
  cep: string,
): Promise<BrazilAddressFromCep | null> {
  const clean = digitsOnly(cep);
  if (clean.length !== 8) return null;

  const res = await fetch(`/api/cep/${clean}`);
  const data = (await res.json().catch(() => ({}))) as ViaCepResult;

  if (!res.ok || data.erro) {
    throw new Error(
      data.mensagem || "CEP não encontrado",
    );
  }

  return mapViaCepToAddress(data);
}
