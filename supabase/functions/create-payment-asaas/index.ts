import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// ============================================================================
// TIPOS
// ============================================================================

interface CreatePaymentRequest {
  tenantId: string;
  chargeId: string;
  amount: number;
  description: string;
  dueDate: string;
  paymentMethods: Array<"pix" | "boleto" | "creditCard">;
  customerEmail: string;
  customerName?: string;
  customerDocument?: string;
  webhookUrl?: string;
  metadata?: Record<string, string>;
}

interface PaymentResponse {
  external_id: string;
  status: string;
  payment_link: string;
  payment_method: string;
  amount: number;
  due_date: string;
  provider: string;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  boleto_barcode?: string;
  boleto_url?: string;
  created_at: string;
}

interface AsaasErrorResponse {
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  cpfCnpj?: string;
}

interface AsaasCustomerListResponse {
  data?: AsaasCustomer[];
}

interface AsaasPaymentResponse {
  id: string;
  status: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
  dueDate: string;
  value: number;
  billingType?: "BOLETO" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "UNDEFINED";
  dateCreated?: string;
}

interface AsaasPixQrCodeResponse {
  encodedImage?: string;
  payload?: string;
}

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

const ASAAS_API_BASE = "https://api.asaas.com/v3";
/** URL oficial da API sandbox (não usar sandbox.asaas.com para /v3). */
const ASAAS_SANDBOX_BASE = "https://api-sandbox.asaas.com/v3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// ============================================================================
// HELPERS
// ============================================================================

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function sanitizeDocument(value?: string) {
  if (!value) return undefined;
  const clean = value.replace(/\D/g, "");
  return clean || undefined;
}

function normalizeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function asaasFetch<T>(
  path: string,
  apiKey: string,
  options: RequestInit = {},
  useSandbox = false,
): Promise<T> {
  const baseUrl = useSandbox ? ASAAS_SANDBOX_BASE : ASAAS_API_BASE;

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorData = data as AsaasErrorResponse | null;
    const errorMsg =
      errorData?.errors?.[0]?.message ||
      (data && typeof data === "object" && "message" in data ? String((data as { message: string }).message) : null) ||
      `HTTP ${response.status}`;

    throw new Error(`Asaas API Error: ${errorMsg}`);
  }

  return data as T;
}

// ============================================================================
// VALIDAÇÃO
// ============================================================================

function validateRequest(req: CreatePaymentRequest): { valid: boolean; error?: string } {
  if (!req.tenantId || typeof req.tenantId !== "string") {
    return { valid: false, error: "tenantId é obrigatório" };
  }

  if (!req.chargeId || typeof req.chargeId !== "string") {
    return { valid: false, error: "chargeId é obrigatório" };
  }

  if (typeof req.amount !== "number" || req.amount <= 0) {
    return { valid: false, error: "amount deve ser maior que 0" };
  }

  if (!req.description || typeof req.description !== "string") {
    return { valid: false, error: "description é obrigatória" };
  }

  const normalizedDueDate = normalizeDate(req.dueDate);
  if (!req.dueDate || !normalizedDueDate) {
    return { valid: false, error: "dueDate é obrigatória e deve ser válida" };
  }

  if (!Array.isArray(req.paymentMethods) || req.paymentMethods.length === 0) {
    return { valid: false, error: "paymentMethods é obrigatório" };
  }

  if (!req.customerEmail || typeof req.customerEmail !== "string" || !req.customerEmail.includes("@")) {
    return { valid: false, error: "customerEmail é obrigatório e deve ser válido" };
  }

  return { valid: true };
}

// ============================================================================
// ASAAS CUSTOMER
// ============================================================================

async function findAsaasCustomerByEmailOrDocument(
  apiKey: string,
  useSandbox: boolean,
  email: string,
  document?: string,
): Promise<AsaasCustomer | null> {
  const cleanDocument = sanitizeDocument(document);

  if (cleanDocument) {
    const byDocument = await asaasFetch<AsaasCustomerListResponse>(
      `/customers?cpfCnpj=${encodeURIComponent(cleanDocument)}`,
      apiKey,
      { method: "GET" },
      useSandbox,
    );

    if (byDocument.data?.length) {
      return byDocument.data[0];
    }
  }

  const byEmail = await asaasFetch<AsaasCustomerListResponse>(
    `/customers?email=${encodeURIComponent(email)}`,
    apiKey,
    { method: "GET" },
    useSandbox,
  );

  if (byEmail.data?.length) {
    return byEmail.data[0];
  }

  return null;
}

async function createAsaasCustomer(
  apiKey: string,
  useSandbox: boolean,
  customerName: string,
  customerEmail: string,
  customerDocument?: string,
): Promise<AsaasCustomer> {
  const cleanDocument = sanitizeDocument(customerDocument);

  const payload = {
    name: customerName,
    email: customerEmail,
    cpfCnpj: cleanDocument,
  };

  return await asaasFetch<AsaasCustomer>(
    "/customers",
    apiKey,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    useSandbox,
  );
}

async function getOrCreateAsaasCustomer(
  apiKey: string,
  useSandbox: boolean,
  customerEmail: string,
  customerName?: string,
  customerDocument?: string,
): Promise<AsaasCustomer> {
  const existing = await findAsaasCustomerByEmailOrDocument(
    apiKey,
    useSandbox,
    customerEmail,
    customerDocument,
  );

  if (existing) return existing;

  return await createAsaasCustomer(
    apiKey,
    useSandbox,
    customerName || "Cliente",
    customerEmail,
    customerDocument,
  );
}

// ============================================================================
// ASAAS PAYMENT
// ============================================================================

async function createAsaasPayment(
  req: CreatePaymentRequest,
  apiKey: string,
  useSandbox: boolean,
): Promise<AsaasPaymentResponse> {
  const billingTypeMap: Record<string, "PIX" | "BOLETO" | "CREDIT_CARD"> = {
    pix: "PIX",
    boleto: "BOLETO",
    creditCard: "CREDIT_CARD",
  };

  const selectedPaymentMethod = req.paymentMethods[0];
  const billingType = billingTypeMap[selectedPaymentMethod] || "PIX";

  const customer = await getOrCreateAsaasCustomer(
    apiKey,
    useSandbox,
    req.customerEmail,
    req.customerName,
    req.customerDocument,
  );

  const normalizedDueDate = normalizeDate(req.dueDate);
  if (!normalizedDueDate) {
    throw new Error("dueDate inválida");
  }

  const payload = {
    customer: customer.id,
    billingType,
    value: req.amount,
    dueDate: normalizedDueDate,
    description: req.description,
    externalReference: req.chargeId,
  };

  return await asaasFetch<AsaasPaymentResponse>(
    "/payments",
    apiKey,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    useSandbox,
  );
}

async function getPixQrCode(
  paymentId: string,
  apiKey: string,
  useSandbox: boolean,
): Promise<AsaasPixQrCodeResponse | null> {
  try {
    return await asaasFetch<AsaasPixQrCodeResponse>(
      `/payments/${paymentId}/pixQrCode`,
      apiKey,
      { method: "GET" },
      useSandbox,
    );
  } catch (_error) {
    return null;
  }
}

// ============================================================================
// RESPOSTA PADRONIZADA
// ============================================================================

async function formatResponse(
  payment: AsaasPaymentResponse,
  requestBody: CreatePaymentRequest,
  apiKey: string,
  useSandbox: boolean,
): Promise<PaymentResponse> {
  let pixQrCode: string | undefined;
  let pixCopyPaste: string | undefined;

  if (payment.billingType === "PIX") {
    const pixData = await getPixQrCode(payment.id, apiKey, useSandbox);
    pixQrCode = pixData?.encodedImage;
    pixCopyPaste = pixData?.payload;
  }

  return {
    external_id: payment.id,
    status: payment.status?.toLowerCase() || "pending",
    payment_link: payment.invoiceUrl || payment.bankSlipUrl || payment.transactionReceiptUrl || "",
    payment_method: payment.billingType?.toLowerCase() || requestBody.paymentMethods[0],
    amount: requestBody.amount,
    due_date: payment.dueDate || normalizeDate(requestBody.dueDate) || requestBody.dueDate,
    provider: "asaas",
    pix_qr_code: pixQrCode,
    pix_copy_paste: pixCopyPaste,
    boleto_barcode: undefined,
    boleto_url: payment.bankSlipUrl || payment.invoiceUrl,
    created_at: payment.dateCreated || new Date().toISOString(),
  };
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido. Use POST." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Token de autorização inválido" }, 401);
    }

    let body: CreatePaymentRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "JSON inválido no corpo da requisição" }, 400);
    }

    const validation = validateRequest(body);
    if (!validation.valid) {
      return jsonResponse({ error: validation.error }, 400);
    }

    const useSandbox = Deno.env.get("ASAAS_USE_SANDBOX") === "true";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials not configured");
      return jsonResponse(
        { error: "Erro interno: banco de dados não configurado" },
        500,
      );
    }

    const decryptResponse = await fetch(`${supabaseUrl}/functions/v1/decrypt-api-key-secure`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantId: body.tenantId,
        gateway: "asaas",
      }),
    });

    const decryptData = await decryptResponse.json().catch(() => null);

    if (!decryptResponse.ok) {
      console.error(`Falha ao descriptografar chave do tenant ${body.tenantId}:`, decryptData);

      return jsonResponse(
        {
          error: "Configuração de cobrança não encontrada ou inválida para este tenant",
          details: decryptData?.error || decryptData?.message || "Erro ao obter chave do gateway",
        },
        401,
      );
    }

    if (!decryptData?.success || !decryptData?.apiKey) {
      console.error(`Chave do Asaas inválida para tenant ${body.tenantId}`);

      return jsonResponse(
        { error: "Chave de API do Asaas não configurada corretamente" },
        401,
      );
    }

    const asaasApiKey = String(decryptData.apiKey ?? "").trim();
    console.log("[create-payment-asaas] Chave pós-decrypt:", {
      length: asaasApiKey.length,
      prefix: asaasApiKey.length >= 6 ? `${asaasApiKey.slice(0, 6)}…` : asaasApiKey.length ? "(curta)" : "(vazia)",
      empty: asaasApiKey.length === 0,
      useSandbox,
    });
    if (!asaasApiKey) {
      return jsonResponse({ error: "Chave de API do Asaas vazia após descriptografia" }, 401);
    }

    const payment = await createAsaasPayment(body, asaasApiKey, useSandbox);
    const response = await formatResponse(payment, body, asaasApiKey, useSandbox);

    return jsonResponse(response, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    console.error("Error creating Asaas payment:", errorMessage);

    return jsonResponse(
      {
        error: "Falha ao criar pagamento",
        details: errorMessage,
        provider: "asaas",
      },
      500,
    );
  }
});