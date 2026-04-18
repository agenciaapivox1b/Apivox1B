import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { decodeBase64 } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

/** Mesmo algoritmo que encrypt-api-key / decrypt-api-key-secure (PBKDF2 + AES-GCM). */
const getMasterKey = (): string => {
  return Deno.env.get("ENCRYPTION_MASTER_KEY") || "apivox-master-key-2026-secure";
};

const deriveKeyPbkdf2 = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    256,
  );

  return crypto.subtle.importKey(
    "raw",
    derivedBits,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
};

async function decryptPbkdf2AesGcm(
  encryptedBase64: string,
  masterKey: string,
  tenantId: string,
): Promise<string> {
  const combined = decodeBase64(encryptedBase64);
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);
  const key = await deriveKeyPbkdf2(`${masterKey}:${tenantId}`, salt);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

/** Legado: iv:ciphertext com ENCRYPTION_SECRET + SHA-256 (compatibilidade multi-tenant antigo). */
async function decryptTextLegacy(encryptedText: string, secret: string) {
  const [ivB64, ciphertextB64] = encryptedText.split(":");
  if (!ivB64 || !ciphertextB64) throw new Error("Formato de chave invalida (iv:hash)");

  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));

  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["decrypt"]);

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

/**
 * Descriptografa a chave do tenant: primeiro formato encrypt-api-key (PBKDF2), depois legado.
 */
async function decryptGatewayApiKey(encryptedText: string, tenantId: string): Promise<string> {
  const masterKey = getMasterKey();
  try {
    return await decryptPbkdf2AesGcm(encryptedText, masterKey, tenantId);
  } catch (e) {
    console.warn(
      "[create-payment-gateway] Decrypt PBKDF2 falhou, tentando legado:",
      e instanceof Error ? e.message : e,
    );
  }
  const legacySecret = Deno.env.get("ENCRYPTION_SECRET");
  if (!legacySecret) {
    throw new Error("Falha ao descriptografar chave do gateway (formato atual ou legado)");
  }
  try {
    return await decryptTextLegacy(encryptedText, legacySecret);
  } catch (err) {
    console.error("Erro na desencriptacao legada:", err instanceof Error ? err.message : err);
    throw new Error("Falha ao descriptografar chave do gateway");
  }
}

function asaasBaseUrl(): string {
  const useSandbox = Deno.env.get("ASAAS_USE_SANDBOX") === "true";
  // Documentação oficial: sandbox em api-sandbox.asaas.com (não sandbox.asaas.com)
  return useSandbox ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";
}

function logAsaasDebug(apiKey: string, baseUrl: string, customerPayload: Record<string, unknown>) {
  const trimmed = apiKey.trim();
  const prefix = trimmed.length <= 6 ? "(curta)" : `${trimmed.slice(0, 6)}…`;
  const empty = trimmed.length === 0;
  const looksSandboxKey = trimmed.includes("hmlg") || trimmed.startsWith("$aact_hmlg");
  const looksProdKey = trimmed.includes("prod") || trimmed.startsWith("$aact_prod");
  const sandbox = Deno.env.get("ASAAS_USE_SANDBOX") === "true";
  console.log("[create-payment-gateway][Asaas debug]", {
    baseUrl,
    ASAAS_USE_SANDBOX: sandbox,
    apiKeyEmpty: empty,
    apiKeyPrefix: prefix,
    keyEnvHint: looksSandboxKey ? "sandbox_key" : looksProdKey ? "production_key" : "unknown_prefix",
    customerPayload,
  });
}

function normalizeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function asaasHeaders(apiKey: string, withJsonContentType = true) {
  const h: Record<string, string> = {
    access_token: apiKey,
    "User-Agent": "Apivox/1.0 (create-payment-gateway)",
  };
  if (withJsonContentType) h["Content-Type"] = "application/json";
  return h;
}

async function findAsaasCustomerByDoc(cpfCnpj: string, apiKey: string, baseUrl: string) {
  const clean = cpfCnpj.replace(/\D/g, "");
  const res = await fetch(`${baseUrl}/customers?cpfCnpj=${clean}`, {
    headers: asaasHeaders(apiKey, false),
  });
  const data = await res.json();
  return data.data?.[0]?.id || null;
}

async function createAsaasCustomer(payload: any, apiKey: string, baseUrl: string) {
  const customerBody = {
    name: payload.customerName || "Cliente APIVOX",
    email: payload.customerEmail,
    cpfCnpj: payload.customerDocument?.replace(/\D/g, "") || undefined,
  };
  logAsaasDebug(apiKey, baseUrl, customerBody);

  const res = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers: asaasHeaders(apiKey),
    body: JSON.stringify(customerBody),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Erro Asaas Customer: " + (data.errors?.[0]?.description || data.errors?.[0]?.message || JSON.stringify(data)));
  return data.id;
}

async function createAsaasPayment(payload: any, apiKey: string) {
  const baseUrl = asaasBaseUrl();
  const key = apiKey.trim();
  if (!key) {
    throw new Error("Chave de API do Asaas vazia após descriptografia");
  }
  console.log("[create-payment-gateway] Asaas baseUrl:", baseUrl, "key prefix:", key.length >= 6 ? `${key.slice(0, 6)}…` : "(curta)");

  let customerId = payload.customerDocument
    ? await findAsaasCustomerByDoc(payload.customerDocument, key, baseUrl)
    : null;
  if (!customerId) customerId = await createAsaasCustomer(payload, key, baseUrl);

  const billingMap: Record<string, string> = {
    pix: "PIX",
    boleto: "BOLETO",
    creditCard: "CREDIT_CARD",
    credit_card: "CREDIT_CARD",
  };
  const billingType = billingMap[payload.paymentMethods?.[0]] || "PIX";

  const asaasPayload = {
    customer: customerId,
    billingType,
    value: payload.amount,
    dueDate: normalizeDate(payload.dueDate),
    description: payload.description,
    externalReference: payload.chargeId,
  };

  console.log("[create-payment-gateway] Payload pagamento Asaas:", JSON.stringify(asaasPayload));

  const response = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers: asaasHeaders(key),
    body: JSON.stringify(asaasPayload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.errors?.[0]?.description || data.errors?.[0]?.message || JSON.stringify(data));

  let pixQrCode, pixCopyPaste;
  if (billingType === "PIX") {
    try {
      const pixRes = await fetch(`${baseUrl}/payments/${data.id}/pixQrCode`, {
        headers: asaasHeaders(key),
      });
      const pixData = await pixRes.json();
      pixQrCode = pixData.encodedImage;
      pixCopyPaste = pixData.payload;
    } catch (_) { /* ignore */ }
  }

  return {
    external_id: data.id,
    status: (data.status || "PENDING").toLowerCase(),
    payment_link: data.bankSlipUrl || data.invoiceUrl || null,
    pix_qr_code: pixQrCode || null,
    /** Mesmo significado que Asaas "payload"; coluna no DB é `pix_code`. */
    pix_code: pixCopyPaste || null,
    provider: "asaas",
  };
}

async function createMercadoPagoPayment(payload: any, accessToken: string) {
  const baseUrl = Deno.env.get("MERCADOPAGO_USE_SANDBOX") === "true" 
    ? "https://api.mercadopago.com/sandbox" 
    : "https://api.mercadopago.com";
    
  const key = accessToken.trim();
  if (!key) {
    throw new Error("Chave de API do Mercado Pago vazia após descriptografia");
  }
  console.log("[create-payment-gateway] Mercado Pago baseUrl:", baseUrl, "key prefix:", key.length >= 6 ? `${key.slice(0, 6)}...` : "(curta)");

  // Determinar métodos de pagamento excluídos
  const excludedPaymentTypes = [];
  if (!payload.paymentMethods?.includes("creditCard") && !payload.paymentMethods?.includes("credit_card")) {
    excludedPaymentTypes.push({ id: "credit_card" });
  }
  if (!payload.paymentMethods?.includes("boleto")) {
    excludedPaymentTypes.push({ id: "ticket" });
  }

  const mpPayload = {
    external_reference: payload.chargeId,
    items: [{ 
      title: payload.description || "Cobrança APIVOX", 
      unit_price: payload.amount, 
      quantity: 1, 
      currency_id: "BRL" 
    }],
    payer: { 
      name: payload.customerName || "Cliente APIVOX", 
      email: payload.customerEmail 
    },
    back_urls: { 
      success: "https://apivox.app/pagamento-sucesso", 
      failure: "https://apivox.app/pagamento-erro", 
      pending: "https://apivox.app/pagamento-pendente" 
    },
    auto_return: "approved",
    payment_methods: {
      excluded_payment_types: excludedPaymentTypes,
      installments: 1
    }
  };

  console.log("[create-payment-gateway] Payload pagamento Mercado Pago:", JSON.stringify(mpPayload));

  const response = await fetch(`${baseUrl}/v1/checkout/preferences`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${key}` 
    },
    body: JSON.stringify(mpPayload)
  });
  
  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.message || data.error || JSON.stringify(data);
    throw new Error("Erro Mercado Pago: " + errorMsg);
  }

  return {
    external_id: data.id,
    status: "pending",
    payment_link: data.init_point || data.sandbox_init_point,
    provider: "mercadopago",
  };
}

async function createStripePayment(payload: any, apiKey: string) {
  const key = apiKey.trim();
  if (!key) {
    throw new Error("Chave de API do Stripe vazia após descriptografia");
  }
  console.log("[create-payment-gateway] Stripe key prefix:", key.length >= 6 ? `${key.slice(0, 6)}...` : "(curta)");

  // Mapear métodos de pagamento para Stripe
  const paymentMethodTypes = [];
  if (payload.paymentMethods?.includes("creditCard") || payload.paymentMethods?.includes("credit_card")) {
    paymentMethodTypes.push("card");
  }
  if (payload.paymentMethods?.includes("pix")) {
    paymentMethodTypes.push("pix");
  }
  if (payload.paymentMethods?.includes("boleto")) {
    paymentMethodTypes.push("boleto");
  }

  // Se nenhum método especificado, usar cartão como padrão
  if (paymentMethodTypes.length === 0) {
    paymentMethodTypes.push("card");
  }

  const params = new URLSearchParams();
  params.append("client_reference_id", payload.chargeId);
  params.append("success_url", "https://apivox.app/pagamento-sucesso");
  params.append("cancel_url", "https://apivox.app/pagamento-erro");
  params.append("customer_email", payload.customerEmail);
  params.append("line_items[0][price_data][currency]", "brl");
  params.append("line_items[0][price_data][product_data][name]", payload.description || "Cobrança APIVOX");
  params.append("line_items[0][price_data][unit_amount]", String(Math.round(payload.amount * 100)));
  params.append("line_items[0][quantity]", "1");
  params.append("mode", "payment");

  // Adicionar métodos de pagamento
  paymentMethodTypes.forEach((method, index) => {
    params.append(`payment_method_types[${index}]`, method);
  });

  // Adicionar metadados
  params.append("metadata[charge_id]", payload.chargeId);
  params.append("metadata[tenant_id]", payload.tenantId || "");
  params.append("metadata[customer_name]", payload.customerName || "Cliente APIVOX");

  console.log("[create-payment-gateway] Payload pagamento Stripe:", Object.fromEntries(params));

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { 
      "Content-Type": "application/x-www-form-urlencoded", 
      "Authorization": `Bearer ${key}` 
    },
    body: params.toString()
  });
  
  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.error?.message || JSON.stringify(data);
    throw new Error("Erro Stripe: " + errorMsg);
  }

  return {
    external_id: data.id,
    status: data.payment_status?.toLowerCase() || "pending",
    payment_link: data.url,
    provider: "stripe",
  };
}


// ============== MAIN HANDLER ==============
serve(async (req: Request) => {
  // LOG INICIAL - ANTES DE QUALQUER VALIDAÇÃO
  console.log("[create-payment-gateway] ===== REQUEST RECEIVED =====");
  console.log("[create-payment-gateway] Method:", req.method);
  console.log("[create-payment-gateway] Headers:", Object.fromEntries(req.headers.entries()));
  
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    console.log("[create-payment-gateway] ===== AUTH DEBUG START =====");
    
    // Check for Authorization header (when called via direct fetch from frontend)
    const authHeader = req.headers.get("Authorization");
    console.log("[create-payment-gateway] ===== NEW DEPLOY =====");
    console.log("[create-payment-gateway] Authorization header present:", !!authHeader);
    console.log("[create-payment-gateway] Authorization header value:", authHeader ? authHeader.substring(0, 30) + "..." : "null");
    
    let userId: string | undefined;
    let userEmail: string | undefined;
    
    // Priority 1: Check Authorization header (from direct fetch calls)
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      console.log("[create-payment-gateway] Token received, length:", token.length);
      console.log("[create-payment-gateway] Token prefix:", token.substring(0, 20) + "...");
      
      try {
        // Decode JWT payload (base64)
        const base64Payload = token.split('.')[1];
        const payload = JSON.parse(atob(base64Payload));
        userId = payload.sub;
        userEmail = payload.email;
        console.log("[create-payment-gateway] User ID from Authorization header:", userId);
      } catch (e) {
        console.error("[create-payment-gateway] Failed to decode JWT from Authorization:", e);
      }
    }
    
    // Priority 2: Check x-sb-jwt-claim (from supabase.functions.invoke calls)
    if (!userId) {
      const jwtClaim = req.headers.get("x-sb-jwt-claim");
      console.log("[create-payment-gateway] x-sb-jwt-claim present:", !!jwtClaim);
      
      if (jwtClaim) {
        try {
          const jwtPayload = JSON.parse(jwtClaim);
          userId = jwtPayload.sub;
          userEmail = jwtPayload.email;
          console.log("[create-payment-gateway] User ID from x-sb-jwt-claim:", userId);
        } catch (e) {
          console.error("[create-payment-gateway] Failed to parse x-sb-jwt-claim:", e);
        }
      }
    }
    
    // Priority 3: Check x-sb-user header (fallback)
    if (!userId) {
      const userHeader = req.headers.get("x-sb-user");
      if (userHeader) {
        userId = userHeader;
        console.log("[create-payment-gateway] User ID from x-sb-user:", userId);
      }
    }
    
    // If no user found, return 401
    if (!userId) {
      console.error("[create-payment-gateway] No authentication found in request");
      return jsonResponse({ error: "Unauthorized - No valid authentication found" }, 401);
    }
    
    console.log("[create-payment-gateway] All headers for debug:", Object.fromEntries(req.headers.entries()));

    const body = await req.json();
    console.log("[create-payment-gateway] Request body.tenantId:", body.tenantId);
    
    if (!body.tenantId || !body.chargeId || !body.amount) {
      return jsonResponse({ error: "Invalid payload: missing tenantId, chargeId, or amount" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    console.log("[create-payment-gateway] SUPABASE_URL configured:", !!supabaseUrl);
    console.log("[create-payment-gateway] SUPABASE_SERVICE_ROLE_KEY configured:", !!supabaseKey);

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("[create-payment-gateway] User:", userId || "not found in headers");
    console.log("[create-payment-gateway] ===== AUTH DEBUG END =====");
    
    // Create user object for compatibility with rest of code
    const user = { id: userId || 'anonymous', email: userEmail };

    // BUSCAR O TENANT CORRETO DO USUÁRIO
    console.log("[create-payment-gateway] Buscando tenant para userId:", userId);
    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .select("id")
      .eq("owner_id", userId)
      .single();
    
    if (tenantError || !tenantData) {
      console.error("[create-payment-gateway] Erro ao buscar tenant:", tenantError);
      return jsonResponse({ error: "Tenant não encontrado para este usuário" }, 400);
    }
    
    const realTenantId = tenantData.id;
    console.log("[create-payment-gateway] Tenant encontrado:", realTenantId);
    console.log("[create-payment-gateway] tenantId do body:", body.tenantId);
    console.log("[create-payment-gateway] Usando tenantId:", realTenantId);

    // 1. Get gateway config for this tenant usando o tenant correto
    console.log("[create-payment-gateway] Buscando config para tenantId:", realTenantId);
    const { data: settings, error: settingsError } = await supabase
      .from("tenant_charge_settings")
      .select("gateway_name, tenant_id")
      .eq("tenant_id", realTenantId)
      .single();

    console.log("[create-payment-gateway] Query result:", { settings, settingsError });

    if (settingsError || !settings?.gateway_name) {
      console.error("[create-payment-gateway] Settings error:", settingsError);
      console.error("[create-payment-gateway] Settings data:", settings);
      return jsonResponse({ error: "Gateway nao configurado para este tenant" }, 400);
    }

    const gatewayName = settings.gateway_name.toLowerCase();

    // 2. Decrypt API Key — mesmo formato que encrypt-api-key / decrypt-api-key-secure (PBKDF2), com fallback legado
    const { data: encryptedData, error: dbErr } = await supabase
      .from("tenant_charge_settings")
      .select("encrypted_api_key")
      .eq("tenant_id", realTenantId)
      .single();

    if (dbErr || !encryptedData?.encrypted_api_key) {
      return jsonResponse({ error: "Nenhuma chave encriptada encontrada para este tenant" }, 400);
    }

    const apiKeyRaw = await decryptGatewayApiKey(encryptedData.encrypted_api_key, realTenantId);
    const apiKey = apiKeyRaw.trim();
    console.log("[create-payment-gateway] Chave pós-decrypt:", {
      length: apiKey.length,
      prefix: apiKey.length >= 6 ? `${apiKey.slice(0, 6)}…` : apiKey.length ? "(curta)" : "(vazia)",
      empty: apiKey.length === 0,
    });
    if (!apiKey) {
      return jsonResponse({ error: "Chave de API vazia após descriptografia" }, 500);
    }

    // 3. Create payment with the appropriate gateway
    let gatewayResult: any;
    try {
      if (gatewayName === "asaas") {
        gatewayResult = await createAsaasPayment(body, apiKey);
      } else if (gatewayName === "mercadopago") {
        gatewayResult = await createMercadoPagoPayment(body, apiKey);
      } else if (gatewayName === "stripe") {
        gatewayResult = await createStripePayment(body, apiKey);
      } else {
        return jsonResponse({ error: `Gateway ${gatewayName} nao suportado` }, 400);
      }
    } catch (gErr: any) {
      console.error("Gateway error:", gErr.message);
      return jsonResponse({ error: "Falha na operadora: " + gErr.message }, 502);
    }

    // 4. Persist to charges table
    const chargePayload = {
      id: body.chargeId,
      tenant_id: body.tenantId,
      gateway: gatewayName,
      gateway_payment_id: gatewayResult.external_id,
      payment_link: gatewayResult.payment_link,
      status: gatewayResult.status,
      customer_name: body.customerName,
      customer_email: body.customerEmail,
      customer_phone: body.customerPhone,
      description: body.description,
      amount: body.amount,
      due_date: normalizeDate(body.dueDate),
      payment_method: body.paymentMethods?.[0] || "link",
      pix_qr_code: gatewayResult.pix_qr_code || null,
      pix_code: gatewayResult.pix_code ?? null,
    };

    const { error: insertError } = await supabase
      .from("charges")
      .upsert(chargePayload, { onConflict: "id" });

    if (insertError) {
      console.error("DB Insert Error:", insertError);
      return jsonResponse({ error: "Falha ao salvar cobranca: " + insertError.message }, 500);
    }

    // 5. Send email notification if requested
    let emailStatus = 'skipped';
    let emailError = null;
    
    if (body.shouldSendEmail && body.customerEmail) {
      console.log("[create-payment-gateway] shouldSendEmail=true, invoking send-email for:", body.customerEmail);
      try {
        // Get tenant name for better email template
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("name")
          .eq("id", body.tenantId)
          .single();

        const companyName = tenantData?.name || "Sua Empresa";

        // Prepare charge data for email
        const emailPayload = {
          tenantId: body.tenantId,
          chargeData: {
            to: body.customerEmail,
            clientName: body.customerName,
            description: body.description || "Cobrança",
            value: String(body.amount),
            dueDate: body.dueDate,
            chargeLink: gatewayResult.payment_link,
            chargeCode: gatewayResult.pix_code,
            chargeId: body.chargeId,
          }
        };

        console.log("[create-payment-gateway] Calling send-email with payload:", JSON.stringify(emailPayload));

        // Call send-email function using internal fetch (function-to-function)
        // Chamada interna: NÃO enviar Authorization header (verify_jwt = false no config.toml)
        const functionUrl = `${supabaseUrl}/functions/v1/send-email`;
        const emailResponse = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        const emailResult = await emailResponse.json();
        console.log("[create-payment-gateway] send-email response:", emailResult);

        if (emailResponse.ok && emailResult.success) {
          emailStatus = 'sent';
          console.log("[create-payment-gateway] Email sent successfully:", emailResult.messageId);
        } else {
          emailStatus = 'failed';
          emailError = emailResult.error || "Failed to send email";
          console.error("[create-payment-gateway] Email failed:", emailError);
        }
      } catch (emailErr: any) {
        emailStatus = 'failed';
        emailError = emailErr.message || "Error calling send-email function";
        console.error("[create-payment-gateway] Exception calling send-email:", emailErr);
      }
    } else {
      console.log("[create-payment-gateway] Email skipped. shouldSendEmail:", body.shouldSendEmail, "email:", body.customerEmail);
    }

    return jsonResponse({
      success: true,
      charge: chargePayload,
      message: "Cobranca criada com sucesso no " + gatewayName,
      emailStatus,
      emailError,
    });

  } catch (err: any) {
    console.error("Unhandled error:", err.message);
    return jsonResponse({ error: "Erro interno: " + err.message }, 500);
  }
});
