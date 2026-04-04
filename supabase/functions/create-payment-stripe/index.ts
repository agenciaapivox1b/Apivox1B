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

interface StripeCheckoutSessionRequest {
  payment_method_types: string[];
  line_items: Array<{
    price_data: {
      currency: string;
      product_data: {
        name: string;
        description?: string;
        metadata?: Record<string, string>;
      };
      unit_amount: number;
    };
    quantity: number;
  }>;
  mode: "payment" | "subscription";
  success_url: string;
  cancel_url: string;
  customer_email: string;
  metadata?: Record<string, string>;
  expires_at?: number;
}

interface StripeCheckoutSessionResponse {
  id: string;
  object: string;
  url: string;
  payment_intent: string;
  customer: string;
  customer_email: string;
  status: string;
  payment_status: string;
  amount_total: number;
  currency: string;
  expires_at: number;
  created: number;
}

interface StripeErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

// ============================================================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================================================

const STRIPE_API_BASE = "https://api.stripe.com/v1";
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
// STRIPE INTEGRATION
// ============================================================================

async function createStripeCheckoutSession(
  req: CreatePaymentRequest,
  secretKey: string
): Promise<StripeCheckoutSessionResponse> {
  // Mapear métodos de pagamento para Stripe
  const paymentMethodTypes: string[] = [];

  if (req.paymentMethods.includes("creditCard")) {
    paymentMethodTypes.push("card");
  }

  if (req.paymentMethods.includes("pix")) {
    paymentMethodTypes.push("pix");
  }

  if (req.paymentMethods.includes("boleto")) {
    paymentMethodTypes.push("boleto");
  }

  // Se nenhum método especificado, usar cartão
  if (paymentMethodTypes.length === 0) {
    paymentMethodTypes.push("card");
  }

  // Calcular data de expiração (24 horas)
  const expiresAt = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);

  // Construir metadados
  const metadata: Record<string, string> = {
    charge_id: req.chargeId,
    tenant_id: req.tenantId,
    customer_name: req.customerName || "Cliente",
    ...req.metadata,
  };

  const checkoutPayload: StripeCheckoutSessionRequest = {
    payment_method_types: paymentMethodTypes,
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: "Cobrança APIVOX",
            description: req.description,
            metadata: metadata,
          },
          unit_amount: Math.round(req.amount * 100), // Stripe usa centavos
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: req.webhookUrl ? `${req.webhookUrl}?status=success&session_id={CHECKOUT_SESSION_ID}` : "https://apivox.app/success",
    cancel_url: req.webhookUrl ? `${req.webhookUrl}?status=cancelled&session_id={CHECKOUT_SESSION_ID}` : "https://apivox.app/cancelled",
    customer_email: req.customerEmail,
    metadata: metadata,
    expires_at: expiresAt,
  };

  try {
    // Convertendo para FormData para Stripe
    const formData = new URLSearchParams();

    // Adicionar payment_method_types
    paymentMethodTypes.forEach((method) => {
      formData.append("payment_method_types[]", method);
    });

    // Adicionar line_items
    formData.append("line_items[0][price_data][currency]", "brl");
    formData.append("line_items[0][price_data][product_data][name]", "Cobrança APIVOX");
    formData.append("line_items[0][price_data][product_data][description]", req.description);

    // Adicionar metadata para produto
    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(`line_items[0][price_data][product_data][metadata][${key}]`, value);
    });

    formData.append("line_items[0][price_data][unit_amount]", Math.round(req.amount * 100).toString());
    formData.append("line_items[0][quantity]", "1");
    formData.append("mode", "payment");
    formData.append(
      "success_url",
      req.webhookUrl ? `${req.webhookUrl}?status=success&session_id={CHECKOUT_SESSION_ID}` : "https://apivox.app/success"
    );
    formData.append(
      "cancel_url",
      req.webhookUrl ? `${req.webhookUrl}?status=cancelled&session_id={CHECKOUT_SESSION_ID}` : "https://apivox.app/cancelled"
    );
    formData.append("customer_email", req.customerEmail);
    formData.append("expires_at", expiresAt.toString());

    // Adicionar metadata globais
    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(`metadata[${key}]`, value);
    });

    const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as StripeErrorResponse;
      const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
      throw new Error(`Stripe API Error: ${errorMsg}`);
    }

    const data = (await response.json()) as StripeCheckoutSessionResponse;
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error("Falha ao conectar com API do Stripe. Verifique sua conexão.");
    }
    throw error;
  }
}

// ============================================================================
// RESPOSTA PADRONIZADA
// ============================================================================

function formatResponse(session: StripeCheckoutSessionResponse, chargeId: string): PaymentResponse {
  return {
    external_id: session.id,
    status: session.payment_status.toLowerCase(),
    payment_link: session.url || "",
    payment_method: "multiple",
    amount: session.amount_total / 100, // Converter de centavos
    due_date: new Date(session.expires_at * 1000).toISOString().split("T")[0],
    provider: "stripe",
    pix_qr_code: undefined,
    pix_copy_paste: undefined,
    boleto_barcode: undefined,
    boleto_url: undefined,
    created_at: new Date(session.created * 1000).toISOString(),
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

    // Obter credencial criptografada do tenant (NÃO usar chave global APIVOX)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ error: "Erro interno: banco de dados não configurado" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Chamar Edge Function de descriptografia para obter secret key do tenant
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
          gateway: "stripe",
        }),
      }
    );

    if (!decryptResponse.ok) {
      const decryptError = await decryptResponse.json();
      console.error(
        `Falha ao descriptografar chave do tenant ${body.tenantId}:`,
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
        `Chave do Stripe inválida para tenant ${body.tenantId}`
      );
      return new Response(
        JSON.stringify({ error: "Chave secreta do Stripe não configurada corretamente" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const secretKey = decryptData.apiKey;

    // Criar sessão de checkout no Stripe usando credencial do CLIENTE
    const session = await createStripeCheckoutSession(body, secretKey);

    // Formatar e retornar resposta
    const response = formatResponse(session, body.chargeId);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    console.error("Error creating Stripe checkout session:", errorMessage);

    return new Response(
      JSON.stringify({
        error: "Falha ao criar pagamento",
        details: errorMessage,
        provider: "stripe",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
