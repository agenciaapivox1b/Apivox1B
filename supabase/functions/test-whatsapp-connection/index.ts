import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Content-Type": "application/json",
};

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

async function decryptWhatsAppApiKey(encryptedText: string, tenantId: string): Promise<string> {
  const masterKey = getMasterKey();
  try {
    return await decryptPbkdf2AesGcm(encryptedText, masterKey, tenantId);
  } catch (e) {
    console.warn("[test-whatsapp-connection] Decrypt PBKDF2 falhou, tentando legado:", e);
  }
  const legacySecret = Deno.env.get("ENCRYPTION_SECRET");
  if (!legacySecret) {
    throw new Error("Falha ao descriptografar chave do WhatsApp");
  }
  try {
    return await decryptTextLegacy(encryptedText, legacySecret);
  } catch (err) {
    console.error("Erro na desencriptacao legada:", err);
    throw new Error("Falha ao descriptografar chave do WhatsApp");
  }
}

// Teste de conexão com WhatsApp Cloud API
async function testWhatsAppConnection(phoneNumberId: string, accessToken: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken.trim()}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { 
        success: true, 
        message: `Conexão WhatsApp válida (Phone: ${data.display_phone_number || data.id})` 
      };
    } else {
      const data = await response.json();
      if (response.status === 400 || response.status === 401) {
        return { success: false, message: "Chave WhatsApp inválida ou expirada" };
      } else if (response.status === 404) {
        return { success: false, message: "Phone Number ID não encontrado" };
      } else {
        return { success: false, message: `Erro WhatsApp: ${data.error?.message || 'Falha na conexão'}` };
      }
    }
  } catch (error) {
    return { success: false, message: "Falha de rede com WhatsApp Cloud API" };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { 
    status: 405, 
    headers: corsHeaders 
  });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const body = await req.json();
    if (!body.tenantId) {
      return new Response(JSON.stringify({ error: "Invalid payload: missing tenantId" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validar JWT decodificando o token (service role não consegue usar auth.getUser com anon JWT)
    const token = authHeader.replace("Bearer ", "");
    let userId: string | undefined;
    
    try {
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(atob(base64Payload));
      userId = payload.sub;
      console.log("[test-whatsapp-connection] User ID from JWT:", userId);
    } catch (e) {
      console.error("[test-whatsapp-connection] Failed to decode JWT:", e);
      return new Response(JSON.stringify({ error: "Invalid JWT format" }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid Authentication - No user ID" }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    // Buscar configurações do WhatsApp do tenant
    const { data: settings, error: settingsError } = await supabase
      .from("tenant_whatsapp_settings")
      .select("phone_number_id, encrypted_access_token, webhook_status")
      .eq("tenant_id", body.tenantId)
      .single();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: "WhatsApp não configurado para este tenant" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    if (!settings.phone_number_id || !settings.encrypted_access_token) {
      return new Response(JSON.stringify({ error: "Configuração incompleta do WhatsApp" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Descriptografar access token
    const accessToken = await decryptWhatsAppApiKey(settings.encrypted_access_token, body.tenantId);
    if (!accessToken.trim()) {
      return new Response(JSON.stringify({ error: "Access token vazia após descriptografia" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Testar conexão
    let testResult: { success: boolean; message: string };
    
    try {
      testResult = await testWhatsAppConnection(settings.phone_number_id, accessToken);
    } catch (error: any) {
      testResult = { success: false, message: `Erro no teste: ${error.message}` };
    }

    // Salvar resultado do teste
    await supabase
      .from("tenant_whatsapp_settings")
      .update({
        last_test_status: testResult.success ? "success" : "failed",
        last_test_message: testResult.message,
        last_test_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", body.tenantId);

    return new Response(JSON.stringify({
      success: testResult.success,
      message: testResult.message,
      tested_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err: any) {
    console.error("Test WhatsApp connection error:", err);
    return new Response(JSON.stringify({ error: "Erro interno: " + err.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
