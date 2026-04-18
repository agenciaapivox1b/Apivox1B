import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Mesmo algoritmo de descriptografia
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
    console.warn("[send-whatsapp] Decrypt PBKDF2 falhou, tentando legado:", e);
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

// Enviar mensagem via WhatsApp Cloud API
async function sendWhatsAppMessage(phoneNumberId: string, accessToken: string, to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const payload = {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ''), // Limpar telefone
      text: {
        body: message
      }
    };

    console.log("[send-whatsapp] Sending message:", JSON.stringify(payload));

    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      const messageId = data.messages?.[0]?.id;
      if (messageId) {
        console.log("[send-whatsapp] Message sent successfully:", messageId);
        return { success: true, messageId };
      } else {
        return { success: false, error: "Message ID not found in response" };
      }
    } else {
      const errorMsg = data.error?.message || data.error?.user_title || "Failed to send message";
      console.error("[send-whatsapp] API Error:", data);
      return { success: false, error: errorMsg };
    }
  } catch (error: any) {
    console.error("[send-whatsapp] Network error:", error);
    return { success: false, error: "Network error: " + error.message };
  }
}

// Criar follow-up automático quando empresa envia mensagem
async function createAutoFollowUp(
  supabase: any,
  tenantId: string,
  contactId: string,
  conversationId: string,
  messageText: string
): Promise<void> {
  try {
    // Verificar se já existe follow-up pendente para este contato
    const { data: existingFollowUp, error: checkError } = await supabase
      .from('opportunity_follow_ups')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (checkError) {
      console.error('[send-whatsapp] Erro ao verificar follow-up existente:', checkError);
      return;
    }

    if (existingFollowUp) {
      console.log('[send-whatsapp] Follow-up pendente já existe para este contato');
      return;
    }

    // Buscar oportunidade ativa vinculada a este contato
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId)
      .in('stage', ['lead', 'meeting', 'proposal', 'negotiation'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (oppError || !opportunity) {
      console.log('[send-whatsapp] Nenhuma oportunidade ativa encontrada para criar follow-up');
      return;
    }

    // Calcular data de vencimento (24 horas depois)
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 24);

    // Criar follow-up
    const { error: createError } = await supabase
      .from('opportunity_follow_ups')
      .insert({
        tenant_id: tenantId,
        opportunity_id: opportunity.id,
        action: 'Aguardando resposta do cliente',
        description: `Mensagem enviada: "${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}"`,
        due_date: dueDate.toISOString(),
        status: 'pending',
        source: 'automated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (createError) {
      console.error('[send-whatsapp] Erro ao criar follow-up automático:', createError);
    } else {
      console.log('[send-whatsapp] Follow-up automático criado para oportunidade:', opportunity.id);
    }
  } catch (error) {
    console.error('[send-whatsapp] Erro ao criar follow-up automático:', error);
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
    if (!body.tenantId || !body.to || !body.message) {
      return new Response(JSON.stringify({ error: "Invalid payload: missing tenantId, to, or message" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validar JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Invalid Authentication JWT" }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    // Buscar configurações do WhatsApp do tenant
    const { data: settings, error: settingsError } = await supabase
      .from("tenant_whatsapp_settings")
      .select("phone_number_id, encrypted_access_token")
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

    // Enviar mensagem
    const sendResult = await sendWhatsAppMessage(
      settings.phone_number_id,
      accessToken,
      body.to,
      body.message
    );

    if (!sendResult.success) {
      return new Response(JSON.stringify({ 
        error: "Falha ao enviar mensagem: " + sendResult.error 
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Salvar mensagem no banco se temos conversation_id
    if (body.conversationId && sendResult.messageId) {
      try {
        // Buscar contact_id da conversa
        const { data: conversation } = await supabase
          .from("conversations")
          .select("contact_id")
          .eq("id", body.conversationId)
          .single();

        if (conversation) {
          await supabase
            .from("messages")
            .insert({
              tenant_id: body.tenantId,
              conversation_id: body.conversationId,
              contact_id: conversation.contact_id,
              direction: 'outbound',
              content: body.message,
              provider_message_id: sendResult.messageId,
              message_type: 'text',
              status: 'sent',
              sent_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            });

          // Atualizar última mensagem da conversa
          await supabase
            .from("conversations")
            .update({
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", body.conversationId);

          // Criar follow-up automático para aguardar resposta do cliente
          await createAutoFollowUp(
            supabase,
            body.tenantId,
            conversation.contact_id,
            body.conversationId,
            body.message
          );
        }
      } catch (dbError: any) {
        console.error("[send-whatsapp] Error saving message:", dbError);
        // Não falhar o request, mas logar o erro
      }
    }

    return new Response(JSON.stringify({
      success: true,
      messageId: sendResult.messageId,
      sent_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err: any) {
    console.error("Send WhatsApp message error:", err);
    return new Response(JSON.stringify({ error: "Erro interno: " + err.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
