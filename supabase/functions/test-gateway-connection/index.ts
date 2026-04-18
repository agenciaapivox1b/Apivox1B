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

// Mesmo algoritmo de descriptografia do create-payment-gateway
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
  const { decodeBase64 } = await import("https://deno.land/std@0.208.0/encoding/base64.ts");
  const combined = decodeBase64(encryptedBase64);
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);
  const key = await deriveKeyPbkdf2(`${masterKey}:${tenantId}`, salt);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

// Legado: iv:ciphertext com ENCRYPTION_SECRET + SHA-256
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

async function decryptGatewayApiKey(encryptedText: string, tenantId: string): Promise<string> {
  const masterKey = getMasterKey();
  try {
    return await decryptPbkdf2AesGcm(encryptedText, masterKey, tenantId);
  } catch (e) {
    console.warn("[test-gateway-connection] Decrypt PBKDF2 falhou, tentando legado:", e);
  }
  const legacySecret = Deno.env.get("ENCRYPTION_SECRET");
  if (!legacySecret) {
    throw new Error("Falha ao descriptografar chave do gateway");
  }
  try {
    return await decryptTextLegacy(encryptedText, legacySecret);
  } catch (err) {
    console.error("Erro na desencriptacao legada:", err);
    throw new Error("Falha ao descriptografar chave do gateway");
  }
}

// Testes de conexão por gateway
async function testAsaasConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  const baseUrl = Deno.env.get("ASAAS_USE_SANDBOX") === "true" 
    ? "https://api-sandbox.asaas.com/v3" 
    : "https://api.asaas.com/v3";

  try {
    const response = await fetch(`${baseUrl}/customers?limit=1`, {
      headers: {
        access_token: apiKey.trim(),
        "User-Agent": "Apivox/1.0 (test-connection)",
      },
    });

    if (response.ok) {
      return { success: true, message: "Conexão Asaas válida" };
    } else {
      const data = await response.json();
      if (response.status === 401) {
        return { success: false, message: "Chave Asaas inválida" };
      } else if (response.status === 403) {
        return { success: false, message: "Chave Asaas sem permissão" };
      } else {
        return { success: false, message: `Erro Asaas: ${data.errors?.[0]?.description || 'Falha na conexão'}` };
      }
    }
  } catch (error) {
    return { success: false, message: "Falha de rede com Asaas" };
  }
}

async function testMercadoPagoConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  const baseUrl = Deno.env.get("MERCADOPAGO_USE_SANDBOX") === "true" 
    ? "https://api.mercadopago.com" 
    : "https://api.mercadopago.com";

  try {
    const response = await fetch(`${baseUrl}/users/me`, {
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, message: `Conexão Mercado Pago válida (User: ${data.email || data.id})` };
    } else {
      const data = await response.json();
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: "Chave Mercado Pago inválida" };
      } else {
        return { success: false, message: `Erro Mercado Pago: ${data.message || 'Falha na conexão'}` };
      }
    }
  } catch (error) {
    return { success: false, message: "Falha de rede com Mercado Pago" };
  }
}

async function testStripeConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("https://api.stripe.com/v1/account", {
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, message: `Conexão Stripe válida (Account: ${data.display_name || data.id})` };
    } else {
      const data = await response.json();
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: "Chave Stripe inválida" };
      } else {
        return { success: false, message: `Erro Stripe: ${data.error?.message || 'Falha na conexão'}` };
      }
    }
  } catch (error) {
    return { success: false, message: "Falha de rede com Stripe" };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json();
    if (!body.tenantId || !body.gateway) {
      return jsonResponse({ error: "Invalid payload: missing tenantId or gateway" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validar JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return jsonResponse({ error: "Invalid Authentication JWT" }, 401);
    }

    // Buscar configurações do tenant
    const { data: settings, error: settingsError } = await supabase
      .from("tenant_charge_settings")
      .select("gateway_name, encrypted_api_key")
      .eq("tenant_id", body.tenantId)
      .single();

    if (settingsError || !settings) {
      return jsonResponse({ error: "Gateway não configurado para este tenant" }, 400);
    }

    // Validar que o gateway solicitado corresponde ao configurado
    const requestedGateway = body.gateway.toLowerCase();
    const configuredGateway = settings.gateway_name.toLowerCase();
    
    if (requestedGateway !== configuredGateway) {
      return jsonResponse({ 
        error: `Tenant configurado para ${configuredGateway}, não ${requestedGateway}` 
      }, 400);
    }

    // Descriptografar chave
    const apiKey = await decryptGatewayApiKey(settings.encrypted_api_key, body.tenantId);
    if (!apiKey.trim()) {
      return jsonResponse({ error: "Chave de API vazia após descriptografia" }, 400);
    }

    // Testar conexão específica do gateway
    let testResult: { success: boolean; message: string };
    
    try {
      if (configuredGateway === "asaas") {
        testResult = await testAsaasConnection(apiKey);
      } else if (configuredGateway === "mercadopago") {
        testResult = await testMercadoPagoConnection(apiKey);
      } else if (configuredGateway === "stripe") {
        testResult = await testStripeConnection(apiKey);
      } else {
        return jsonResponse({ error: `Gateway ${configuredGateway} não suportado` }, 400);
      }
    } catch (error: any) {
      testResult = { success: false, message: `Erro no teste: ${error.message}` };
    }

    // Salvar resultado do teste
    await supabase
      .from("tenant_charge_settings")
      .update({
        last_test_status: testResult.success ? "success" : "failed",
        last_test_message: testResult.message,
        last_test_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", body.tenantId);

    return jsonResponse({
      success: testResult.success,
      message: testResult.message,
      gateway: configuredGateway,
      tested_at: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error("Test connection error:", err);
    return jsonResponse({ error: "Erro interno: " + err.message }, 500);
  }
});
