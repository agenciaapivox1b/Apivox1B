import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

/**
 * Edge Function: Decrypt API Key (BACKEND ONLY)
 * 
 * This function:
 * 1. Receives tenantId + optional gateway_name
 * 2. Fetches encryption settings from tenant_payment_settings
 * 3. Decrypts the API key using PBKDF2 + AES-GCM
 * 4. Returns DECRYPTED key (only for backend processing)
 * 5. NEVER exposes key to frontend
 * 
 * POST /functions/v1/decrypt-api-key-secure
 * Headers: Authorization: Bearer {supabase_jwt_token}
 * Body: { "tenantId": "uuid", "gateway": "asaas" }
 * 
 * Response:
 * {
 *   "success": true,
 *   "apiKey": "actual_api_key_value"
 * }
 */

const getMasterKey = (): string => {
  const envKey = Deno.env.get("ENCRYPTION_MASTER_KEY");
  return envKey || "apivox-master-key-2026-secure";
};

const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

const bytesToString = (bytes: Uint8Array): string => {
  return new TextDecoder().decode(bytes);
};

// Deriva chave usando PBKDF2 (mesmo algoritmo da criptografia)
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    256
  );

  return crypto.subtle.importKey(
    "raw",
    derivedBits,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
};

// Descriptografa string usando AES-GCM (reverso da encriptação)
const decryptData = async (
  encryptedBase64: string,
  masterKey: string,
  tenantId: string
): Promise<string> => {
  try {
    // Decodificar base64
    const combined = decodeBase64(encryptedBase64);

    // Extrair componentes
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    // Derivar chave
    const key = await deriveKey(`${masterKey}:${tenantId}`, salt);

    // Descriptografar
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted
    );

    return bytesToString(new Uint8Array(decrypted));
  } catch (error) {
    throw new Error(`Falha ao descriptografar: ${error instanceof Error ? error.message : "desconhecido"}`);
  }
};

serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Criar cliente Supabase com service role (backend-only)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ error: "Internal error: database not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validação manual de segurança (já que verify_jwt será false)
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${supabaseKey}`) {
      console.error("Unauthorized request to decrypt-api-key-secure");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { tenantId, gateway } = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "tenantId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configurações de pagamento do tenant
    const { data: settings, error: fetchError } = await supabase
      .from("tenant_charge_settings")
      .select("encrypted_api_key, gateway_name")
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !settings) {
      console.error(`Payment settings not found for tenant ${tenantId}:`, fetchError);
      return new Response(
        JSON.stringify({ error: "Payment settings not configured for this tenant" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!settings.encrypted_api_key) {
      return new Response(
        JSON.stringify({ error: "API key not configured for this tenant" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Se gateway foi especificado, validar que corresponde
    if (gateway && settings.gateway_name !== gateway) {
      return new Response(
        JSON.stringify({
          error: `Tenant is configured for ${settings.gateway_name}, not ${gateway}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Descriptografar API key
    const masterKey = getMasterKey();
    const decryptedApiKey = await decryptData(settings.encrypted_api_key, masterKey, tenantId);

    // ⚠️ IMPORTANTE: Retornar a chave APENAS para processamento backend
    // NUNCA expor para frontend via logs ou responses públicas
    return new Response(
      JSON.stringify({
        success: true,
        apiKey: decryptedApiKey,
        gateway: settings.gateway_name,
        note: "API key decrypted - use immediately and discard",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          // Não cachear pois contém dado sensível
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Decryption error:", errorMessage);

    return new Response(
      JSON.stringify({
        error: "Failed to decrypt API key",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
