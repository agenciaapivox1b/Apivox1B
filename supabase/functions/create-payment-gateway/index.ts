import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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

async function decryptText(encryptedText: string, secret: string) {
  try {
    const [ivB64, ciphertextB64] = encryptedText.split(":");
    if (!ivB64 || !ciphertextB64) throw new Error("Formato de chave invalida (iv:hash)");

    const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));

    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
    const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["decrypt"]);

    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error("Erro na desencriptacao local:", err.message);
    throw new Error("Falha ao descriptografar chave do gateway");
  }
}

function normalizeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function findAsaasCustomerByDoc(cpfCnpj: string, apiKey: string, baseUrl: string) {
  const clean = cpfCnpj.replace(/\D/g, "");
  const res = await fetch(`${baseUrl}/customers?cpfCnpj=${clean}`, {
    headers: { "access_token": apiKey }
  });
  const data = await res.json();
  return data.data?.[0]?.id || null;
}

async function createAsaasCustomer(payload: any, apiKey: string, baseUrl: string) {
  const res = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "access_token": apiKey },
    body: JSON.stringify({
      name: payload.customerName || "Cliente APIVOX",
      email: payload.customerEmail,
      cpfCnpj: payload.customerDocument?.replace(/\D/g, "") || undefined
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Erro Asaas Customer: " + (data.errors?.[0]?.description || data.errors?.[0]?.message || JSON.stringify(data)));
  return data.id;
}

async function createAsaasPayment(payload: any, apiKey: string) {
  const baseUrl = "https://api.asaas.com/v3";
  let customerId = payload.customerDocument
    ? await findAsaasCustomerByDoc(payload.customerDocument, apiKey, baseUrl)
    : null;
  if (!customerId) customerId = await createAsaasCustomer(payload, apiKey, baseUrl);

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

  const response = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "access_token": apiKey },
    body: JSON.stringify(asaasPayload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.errors?.[0]?.description || data.errors?.[0]?.message || JSON.stringify(data));

  let pixQrCode, pixCopyPaste;
  if (billingType === "PIX") {
    try {
      const pixRes = await fetch(`${baseUrl}/payments/${data.id}/pixQrCode`, {
        headers: { "access_token": apiKey }
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
    pix_copy_paste: pixCopyPaste || null,
    provider: "asaas"
  };
}

async function createMercadoPagoPayment(payload: any, accessToken: string) {
  const response = await fetch("https://api.mercadopago.com/v1/checkout/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    body: JSON.stringify({
      external_reference: payload.chargeId,
      items: [{ title: payload.description || "Cobranca APIVOX", unit_price: payload.amount, quantity: 1, currency_id: "BRL" }],
      payer: { name: payload.customerName, email: payload.customerEmail },
      back_urls: { success: "https://apivox.app/pagamento-sucesso", failure: "https://apivox.app/pagamento-erro", pending: "https://apivox.app/pagamento-pendente" },
      auto_return: "approved"
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || JSON.stringify(data));
  return { external_id: data.id, status: "pending", payment_link: data.init_point, provider: "mercadopago" };
}

async function createStripePayment(payload: any, apiKey: string) {
  const params = new URLSearchParams();
  params.append("client_reference_id", payload.chargeId);
  params.append("success_url", "https://apivox.app/pagamento-sucesso");
  params.append("cancel_url", "https://apivox.app/pagamento-erro");
  params.append("customer_email", payload.customerEmail);
  params.append("line_items[0][price_data][currency]", "brl");
  params.append("line_items[0][price_data][product_data][name]", payload.description || "Cobranca APIVOX");
  params.append("line_items[0][price_data][unit_amount]", String(Math.round(payload.amount * 100)));
  params.append("line_items[0][quantity]", "1");
  params.append("mode", "payment");
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Bearer ${apiKey}` },
    body: params.toString()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || JSON.stringify(data));
  return { external_id: data.id, status: "pending", payment_link: data.url, provider: "stripe" };
}


// ============== MAIN HANDLER ==============
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json();
    if (!body.tenantId || !body.chargeId || !body.amount) {
      return jsonResponse({ error: "Invalid payload: missing tenantId, chargeId, or amount" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate that the JWT is legitimate (user must be authenticated)
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return jsonResponse({ error: "Invalid Authentication JWT" }, 401);
    }

    // 1. Get gateway config for this tenant
    const { data: settings, error: settingsError } = await supabase
      .from("tenant_charge_settings")
      .select("gateway_name")
      .eq("tenant_id", body.tenantId)
      .single();

    if (settingsError || !settings?.gateway_name) {
      console.error("Settings error:", settingsError);
      return jsonResponse({ error: "Gateway nao configurado para este tenant" }, 400);
    }

    const gatewayName = settings.gateway_name.toLowerCase();

    // 2. Decrypt API Key - Internal Resilient Logic
    const encryptionSecret = Deno.env.get("ENCRYPTION_SECRET");
    if (!encryptionSecret) {
      console.error("ENCRYPTION_SECRET nao configurada no Supabase");
      return jsonResponse({ error: "Erro de configuracao de seguranca no servidor" }, 500);
    }

    // Obter dado encriptado do banco primeiro
    const { data: encryptedData, error: dbErr } = await supabase
      .from("tenant_charge_settings")
      .select("encrypted_api_key")
      .eq("tenant_id", body.tenantId)
      .single();

    if (dbErr || !encryptedData?.encrypted_api_key) {
      return jsonResponse({ error: "Nenhuma chave encriptada encontrada para este tenant" }, 400);
    }

    const apiKey = await decryptText(encryptedData.encrypted_api_key, encryptionSecret);

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
      pix_copy_paste: gatewayResult.pix_copy_paste || null,
    };

    const { error: insertError } = await supabase
      .from("charges")
      .upsert(chargePayload, { onConflict: "id" });

    if (insertError) {
      console.error("DB Insert Error:", insertError);
      return jsonResponse({ error: "Falha ao salvar cobranca: " + insertError.message }, 500);
    }

    return jsonResponse({
      success: true,
      charge: chargePayload,
      message: "Cobranca criada com sucesso no " + gatewayName,
    });

  } catch (err: any) {
    console.error("Unhandled error:", err.message);
    return jsonResponse({ error: "Erro interno: " + err.message }, 500);
  }
});
