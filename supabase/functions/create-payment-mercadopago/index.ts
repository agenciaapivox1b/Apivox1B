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

interface MercadoPagoPaymentRequest {
  external_reference: string;
  notification_url?: string;
  title: string;
  description: string;
  unit_price: number;
  quantity: number;
  currency_id: string;
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return: string;
  payer: {
    name: string;
    email: string;
  };
  payment_methods?: {
    excluded_payment_types: Array<{ id: string }>;
    installments: number;
    default_installments?: number;
  };
}

interface MercadoPagoResponse {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
  status: string;
  external_reference: string;
  payer: {
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
  }>;
}

// ============================================================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================================================

const MERCADOPAGO_API_BASE = "https://api.mercadopago.com/v1";
const SUPPORTED_PAYMENT_METHODS = ["pix", "boleto", "creditCard"];
const REQUEST_TIMEOUT = 30000; // 30 segundos

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

  if (!req.amount || req.amount <= 0) {
    return { valid: false, error: "amount deve ser maior que 0" };
  }

  if (!req.description || typeof req.description !== "string") {
    return { valid: false, error: "description é obrigatória" };
  }

  if (!req.dueDate || isNaN(new Date(req.dueDate).getTime())) {
    return { valid: false, error: "dueDate é obrigatória e deve ser válida" };
  }

  if (!Array.isArray(req.paymentMethods) || req.paymentMethods.length === 0) {
    return { valid: false, error: "paymentMethods é obrigatório" };
  }

  const validMethods = req.paymentMethods.every((m) => SUPPORTED_PAYMENT_METHODS.includes(m));
  if (!validMethods) {
    return { valid: false, error: `Métodos de pagamento válidos: ${SUPPORTED_PAYMENT_METHODS.join(", ")}` };
  }

  if (!req.customerEmail || !req.customerEmail.includes("@")) {
    return { valid: false, error: "customerEmail é obrigatório e deve ser válido" };
  }

  return { valid: true };
}

// ============================================================================
// MERCADO PAGO INTEGRATION
// ============================================================================

async function createMercadoPagoPayment(
  req: CreatePaymentRequest,
  accessToken: string,
  useSandbox: boolean
): Promise<MercadoPagoResponse> {
  // Determinar métodos de pagamento excluídos
  const excludedMethods: Array<{ id: string }> = [];

  if (!req.paymentMethods.includes("creditCard")) {
    excludedMethods.push({ id: "credit_card" });
  }

  if (!req.paymentMethods.includes("boleto")) {
    excludedMethods.push({ id: "ticket" });
  }

  if (!req.paymentMethods.includes("pix")) {
    excludedMethods.push({ id: "account_money" });
  }

  // Construir URL de retorno (usar webhook URL se fornecida)
  const baseReturnUrl = req.webhookUrl || "https://apivox.app";

  const payload: MercadoPagoPaymentRequest = {
    external_reference: req.chargeId,
    title: "Cobrança APIVOX",
    description: req.description,
    unit_price: req.amount,
    quantity: 1,
    currency_id: "BRL",
    back_urls: {
      success: `${baseReturnUrl}?status=success`,
      failure: `${baseReturnUrl}?status=failure`,
      pending: `${baseReturnUrl}?status=pending`,
    },
    auto_return: "approved",
    payer: {
      name: req.customerName || "Cliente",
      email: req.customerEmail,
    },
    payment_methods: {
      excluded_payment_types: excludedMethods,
      installments: 1,
    },
  };

  if (req.webhookUrl) {
    payload.notification_url = req.webhookUrl;
  }

  try {
    const response = await fetch(`${MERCADOPAGO_API_BASE}/checkout/preferences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMsg = errorData.message || `HTTP ${response.status}`;
      throw new Error(`Mercado Pago API Error: ${errorMsg}`);
    }

    const data = (await response.json()) as MercadoPagoResponse;
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error("Falha ao conectar com API do Mercado Pago. Verifique sua conexão.");
    }
    throw error;
  }
}

// ============================================================================
// RESPOSTA PADRONIZADA
// ============================================================================

function formatResponse(payment: MercadoPagoResponse, chargeId: string, useSandbox: boolean): PaymentResponse {
  const paymentLink = useSandbox ? payment.sandbox_init_point || payment.init_point : payment.init_point;

  return {
    external_id: payment.id,
    status: "pending",
    payment_link: paymentLink || "",
    payment_method: "multiple",
    amount: payment.items[0]?.unit_price || 0,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    provider: "mercadopago",
    pix_qr_code: undefined,
    pix_copy_paste: undefined,
    boleto_barcode: undefined,
    boleto_url: undefined,
    created_at: new Date().toISOString(),
  };
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

serve(async (req: Request) => {
  // Validar método HTTP
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido. Use POST." }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Validar headers
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token de autorização inválido" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parsear request
    let body: CreatePaymentRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON inválido no corpo da requisição" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validar dados de entrada
    const validation = validateRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Obter credencial criptografada do tenant (NÃO usar token global APIVOX)
    const useSandbox = Deno.env.get("MERCADOPAGO_USE_SANDBOX") === "true";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ error: "Erro interno: banco de dados não configurado" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Chamar Edge Function de descriptografia para obter access token do tenant
    const decryptResponse = await fetch(
      `${supabaseUrl}/functions/v1/decrypt-api-key-secure`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: body.tenantId,
          gateway: "mercadopago",
        }),
      }
    );

    if (!decryptResponse.ok) {
      const decryptError = await decryptResponse.json();
      console.error(
        `Falha ao descriptografar token do tenant ${body.tenantId}:`,
        decryptError
      );
      return new Response(
        JSON.stringify({
          error: "Configuração de cobrança não encontrada ou inválida para este tenant",
          details: decryptError.error,
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const decryptData = await decryptResponse.json();
    if (!decryptData.success || !decryptData.apiKey) {
      console.error(
        `Token do Mercado Pago inválido para tenant ${body.tenantId}`
      );
      return new Response(
        JSON.stringify({ error: "Token de acesso do Mercado Pago não configurado corretamente" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const accessToken = decryptData.apiKey;

    // Criar pagamento no Mercado Pago usando credencial do CLIENTE
    const payment = await createMercadoPagoPayment(body, accessToken, useSandbox);

    // Formatar e retornar resposta
    const response = formatResponse(payment, body.chargeId, useSandbox);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    console.error("Error creating Mercado Pago payment:", errorMessage);

    return new Response(
      JSON.stringify({
        error: "Falha ao criar pagamento",
        details: errorMessage,
        provider: "mercadopago",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
