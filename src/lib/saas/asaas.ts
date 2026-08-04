/**
 * Cliente HTTP da API v3 do Asaas (sandbox ou produção).
 */

export class AsaasApiError extends Error {
  statusCode?: number;
  payload?: unknown;

  constructor(message: string, statusCode?: number, payload?: unknown) {
    super(message);
    this.name = "AsaasApiError";
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

type AsaasJson = Record<string, unknown>;

function baseUrl(): string {
  return (
    process.env.ASAAS_API_URL?.replace(/\/$/, "") ||
    "https://sandbox.asaas.com/api/v3"
  );
}

function apiKey(): string {
  const key = process.env.ASAAS_API_KEY ?? "";
  if (!key) {
    throw new AsaasApiError("ASAAS_API_KEY não configurada");
  }
  return key;
}

async function asaasRequest(
  method: string,
  path: string,
  body?: AsaasJson,
): Promise<AsaasJson> {
  const res = await fetch(`${baseUrl()}/${path.replace(/^\//, "")}`, {
    method,
    headers: {
      access_token: apiKey(),
      "Content-Type": "application/json",
      "User-Agent": "wacrm-saas/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: AsaasJson = {};
  try {
    data = (await res.json()) as AsaasJson;
  } catch {
    data = {};
  }

  if (!res.ok) {
    const errors = Array.isArray(data.errors) ? data.errors : [];
    const msg =
      errors
        .map((e) =>
          typeof e === "object" && e && "description" in e
            ? String((e as { description: string }).description)
            : "",
        )
        .filter(Boolean)
        .join("; ") || `Asaas HTTP ${res.status}`;
    throw new AsaasApiError(msg, res.status, data);
  }

  return data;
}

export async function createAsaasCustomer(input: {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  externalReference: string;
}): Promise<string> {
  const payload: AsaasJson = {
    name: input.name,
    email: input.email,
    externalReference: input.externalReference,
    notificationDisabled: false,
  };
  if (input.cpfCnpj) {
    payload.cpfCnpj = input.cpfCnpj.replace(/\D/g, "");
  }
  if (input.phone) {
    payload.mobilePhone = input.phone.replace(/\D/g, "");
  }
  const data = await asaasRequest("POST", "customers", payload);
  const id = typeof data.id === "string" ? data.id : "";
  if (!id) throw new AsaasApiError("Asaas não retornou id do customer");
  return id;
}

export async function createAsaasSubscription(input: {
  customerId: string;
  value: number;
  cycle: "MONTHLY" | "YEARLY";
  description: string;
  externalReference: string;
  nextDueDate: string; // YYYY-MM-DD
  successUrl?: string;
}): Promise<{ subscriptionId: string; raw: AsaasJson }> {
  const payload: AsaasJson = {
    customer: input.customerId,
    billingType: "UNDEFINED",
    value: input.value,
    nextDueDate: input.nextDueDate,
    cycle: input.cycle,
    description: input.description,
    externalReference: input.externalReference,
  };
  if (input.successUrl) {
    payload.callback = {
      successUrl: input.successUrl,
      autoRedirect: true,
    };
  }
  const data = await asaasRequest("POST", "subscriptions", payload);
  const subscriptionId = typeof data.id === "string" ? data.id : "";
  if (!subscriptionId) {
    throw new AsaasApiError("Asaas não retornou id da assinatura");
  }
  return { subscriptionId, raw: data };
}

export async function getSubscriptionInvoiceUrl(
  subscriptionId: string,
): Promise<string> {
  const data = await asaasRequest(
    "GET",
    `subscriptions/${subscriptionId}/payments`,
  );
  const list = Array.isArray(data.data) ? data.data : [];
  const first = list[0] as AsaasJson | undefined;
  const url = first && typeof first.invoiceUrl === "string" ? first.invoiceUrl : "";
  if (!url) {
    throw new AsaasApiError("Nenhuma fatura encontrada para a assinatura");
  }
  return url;
}

/** Data de vencimento (hoje + 1 dia) no fuso local, formato Asaas. */
export function defaultNextDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
