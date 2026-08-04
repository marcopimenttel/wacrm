import { NextResponse } from "next/server";

import { digitsOnly, type ViaCepResult } from "@/lib/brazil/cep";

type Params = { params: Promise<{ cep: string }> };

/**
 * GET /api/cep/[cep]
 * Proxy ViaCEP (padrão O Candidato: evita CORS e HTTPS misto).
 */
export async function GET(_request: Request, { params }: Params) {
  const { cep } = await params;
  const cepLimpo = digitsOnly(cep);

  if (cepLimpo.length !== 8) {
    return NextResponse.json(
      { erro: true, mensagem: "CEP deve conter 8 dígitos" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `https://viacep.com.br/ws/${cepLimpo}/json/`,
      {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          erro: true,
          mensagem: `Erro na API: ${response.status}`,
        },
        { status: response.status },
      );
    }

    const data = (await response.json()) as ViaCepResult;

    if (data.erro) {
      return NextResponse.json(
        { erro: true, mensagem: "CEP não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");

    if (isTimeout) {
      return NextResponse.json(
        { erro: true, mensagem: "Tempo esgotado ao buscar CEP" },
        { status: 504 },
      );
    }

    console.error("[api/cep]", err);
    return NextResponse.json(
      { erro: true, mensagem: "Erro ao conectar com o serviço de CEP" },
      { status: 500 },
    );
  }
}
