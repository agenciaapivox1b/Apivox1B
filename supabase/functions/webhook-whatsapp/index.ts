import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
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
    console.warn("[webhook-whatsapp] Decrypt PBKDF2 falhou, tentando legado:", e);
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

// Encontrar tenant pelo phone number ID do WhatsApp
async function findTenantByPhoneNumberId(phoneNumberId: string, supabase: any): Promise<any> {
  const { data, error } = await supabase
    .from("tenant_whatsapp_settings")
    .select("tenant_id, encrypted_access_token, verify_token")
    .eq("phone_number_id", phoneNumberId)
    .single();

  if (error || !data) {
    throw new Error(`Tenant não encontrado para phone_number_id: ${phoneNumberId}`);
  }

  return data;
}

// Criar ou atualizar contato
async function upsertContact(supabase: any, tenantId: string, phone: string, name?: string): Promise<string> {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Buscar contato existente
  const { data: existing } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("phone", cleanPhone)
    .single();

  if (existing) {
    // Atualizar nome se veio novo
    if (name && name !== existing.name) {
      await supabase
        .from("contacts")
        .update({ 
          name: name,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    }
    return existing.id;
  }

  // Criar novo contato
  const { data: newContact } = await supabase
    .from("contacts")
    .insert({
      tenant_id: tenantId,
      phone: cleanPhone,
      name: name || cleanPhone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return newContact.id;
}

// Criar ou atualizar conversa
async function upsertConversation(supabase: any, tenantId: string, contactId: string): Promise<string> {
  // Buscar conversa existente
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("contact_id", contactId)
    .eq("channel", "whatsapp")
    .single();

  if (existing) {
    // Atualizar última mensagem
    await supabase
      .from("conversations")
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);
    return existing.id;
  }

  // Criar nova conversa
  const { data: newConversation } = await supabase
    .from("conversations")
    .insert({
      tenant_id: tenantId,
      contact_id: contactId,
      channel: "whatsapp",
      status: "active",
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return newConversation.id;
}

// Gerenciamento de Follow-ups Automáticos
// Marcar follow-ups como concluídos quando cliente responde
async function completePendingFollowUps(
  supabase: any, 
  tenantId: string, 
  contactId: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    // Buscar follow-ups pendentes para este contato
    const { data: followUps, error: fetchError } = await supabase
      .from('opportunity_follow_ups')
      .select('id, opportunity_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .or(`opportunity_id.contact_id.eq.${contactId}`);
    
    if (fetchError) {
      console.error('[webhook-whatsapp] Erro ao buscar follow-ups:', fetchError);
      return;
    }
    
    if (!followUps || followUps.length === 0) {
      return;
    }
    
    // Marcar todos como concluídos
    for (const followUp of followUps) {
      const { error: updateError } = await supabase
        .from('opportunity_follow_ups')
        .update({
          status: 'done',
          completed_at: now,
          updated_at: now
        })
        .eq('id', followUp.id)
        .eq('tenant_id', tenantId);
      
      if (updateError) {
        console.error(`[webhook-whatsapp] Erro ao concluir follow-up ${followUp.id}:`, updateError);
      } else {
        console.log(`[webhook-whatsapp] Follow-up ${followUp.id} concluído - cliente respondeu`);
      }
    }
  } catch (error) {
    console.error('[webhook-whatsapp] Erro ao completar follow-ups:', error);
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
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[webhook-whatsapp] Erro ao verificar follow-up existente:', checkError);
      return;
    }
    
    if (existingFollowUp) {
      console.log('[webhook-whatsapp] Follow-up pendente já existe para este contato');
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
      .single();
    
    if (oppError) {
      console.log('[webhook-whatsapp] Nenhuma oportunidade ativa encontrada para criar follow-up');
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
      console.error('[webhook-whatsapp] Erro ao criar follow-up automático:', createError);
    } else {
      console.log('[webhook-whatsapp] Follow-up automático criado para oportunidade:', opportunity.id);
    }
  } catch (error) {
    console.error('[webhook-whatsapp] Erro ao criar follow-up automático:', error);
  }
}

// Salvar mensagem
async function saveMessage(
  supabase: any, 
  tenantId: string, 
  conversationId: string, 
  contactId: string,
  direction: 'inbound' | 'outbound',
  content: string,
  providerMessageId: string,
  messageType: string = 'text'
): Promise<void> {
  await supabase
    .from("messages")
    .insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      contact_id: contactId,
      direction: direction,
      content: content,
      provider_message_id: providerMessageId,
      message_type: messageType,
      status: direction === 'inbound' ? 'delivered' : 'sent',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
}

serve(async (req: Request) => {
  // Webhook verification (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
      // Verificar token com todos os tenants
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: settings } = await supabase
        .from("tenant_whatsapp_settings")
        .select("verify_token")
        .eq("verify_token", token)
        .limit(1);

      if (settings && settings.length > 0) {
        console.log("[webhook-whatsapp] Webhook verified successfully");
        return new Response(challenge, {
          status: 200,
          headers: { "Content-Type": "text/plain" }
        });
      }
    }

    return new Response("Invalid verification", { status: 403 });
  }

  // Webhook events (POST)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("[webhook-whatsapp] Received webhook:", JSON.stringify(body).substring(0, 500));

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Processar mensagens
      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry || []) {
          const phoneNumberId = entry.changes?.[0]?.value?.metadata?.phone_number_id;
          
          if (!phoneNumberId) {
            console.log("[webhook-whatsapp] No phone_number_id found");
            continue;
          }

          try {
            // Encontrar tenant
            const tenantConfig = await findTenantByPhoneNumberId(phoneNumberId, supabase);
            const tenantId = tenantConfig.tenant_id;

            // Processar mensagens
            const messages = entry.changes?.[0]?.value?.messages || [];
            for (const message of messages) {
              if (message.type === "text") {
                const from = message.from; // WhatsApp ID do cliente
                const text = message.text?.body;
                const messageId = message.id;

                if (!from || !text) continue;

                console.log(`[webhook-whatsapp] Processing message from ${from}: ${text.substring(0, 50)}`);

                // Criar/atualizar contato
                const contactId = await upsertContact(supabase, tenantId, from);

                // Criar/atualizar conversa
                const conversationId = await upsertConversation(supabase, tenantId, contactId);

                // Salvar mensagem
                await saveMessage(
                  supabase,
                  tenantId,
                  conversationId,
                  contactId,
                  'inbound',
                  text,
                  messageId,
                  'text'
                );

                console.log(`[webhook-whatsapp] Message saved: ${messageId}`);

                // Cliente respondeu - marcar follow-ups pendentes como concluídos
                await completePendingFollowUps(supabase, tenantId, contactId);
              }
            }

            // Processar status de mensagens enviadas
            const statuses = entry.changes?.[0]?.value?.statuses || [];
            for (const status of statuses) {
              const messageId = status.id;
              const statusValue = status.status; // sent, delivered, read, failed
              const timestamp = status.timestamp;

              if (!messageId || !statusValue) continue;

              console.log(`[webhook-whatsapp] Message ${messageId} status: ${statusValue}`);

              // Atualizar status da mensagem
              await supabase
                .from("messages")
                .update({
                  status: statusValue,
                  updated_at: new Date(timestamp * 1000).toISOString(),
                })
                .eq("provider_message_id", messageId);
            }

          } catch (error: any) {
            console.error("[webhook-whatsapp] Error processing entry:", error.message);
          }
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });

    } catch (error: any) {
      console.error("[webhook-whatsapp] Webhook error:", error);
      return new Response("Error processing webhook", { status: 500, headers: corsHeaders });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
