// =====================================================
// WHATSAPP QR WEBHOOK
// 
// Edge Function para receber mensagens inbound via Baileys
// e salvar no pipeline (contacts, conversations, messages)
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncomingMessage {
  id: string;
  from: string;
  content: string;
  timestamp: number;
  tenantId: string;
}

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    const { message, tenantId }: { message: IncomingMessage; tenantId: string } = payload;

    if (!message || !tenantId) {
      return new Response(
        JSON.stringify({ success: false, error: 'message e tenantId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[QRWebhook] Mensagem de ${message.from} - Tenant: ${tenantId}`);

    // Formatar número do remetente
    const phoneNumber = message.from.replace('@s.whatsapp.net', '').replace('@c.us', '');

    // 1. Criar ou atualizar contato
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert({
        tenant_id: tenantId,
        phone: phoneNumber,
        name: phoneNumber, // Pode ser atualizado depois com o nome real
        source: 'whatsapp_qr',
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id,phone' })
      .select()
      .single();

    if (contactError) {
      console.error('[QRWebhook] Erro ao criar contato:', contactError.message);
      throw contactError;
    }

    // 2. Criar ou obter conversa
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .upsert({
        tenant_id: tenantId,
        contact_id: contact.id,
        channel: 'whatsapp',
        status: 'active',
        last_message_at: new Date(message.timestamp * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id,contact_id' })
      .select()
      .single();

    if (convError) {
      console.error('[QRWebhook] Erro ao criar conversa:', convError.message);
      throw convError;
    }

    // 3. Salvar mensagem
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenantId,
        conversation_id: conversation.id,
        contact_id: contact.id,
        direction: 'inbound',
        content: message.content,
        channel: 'whatsapp',
        provider: 'whatsapp_qr',
        provider_message_id: message.id,
        status: 'received',
        created_at: new Date(message.timestamp * 1000).toISOString()
      });

    if (msgError) {
      console.error('[QRWebhook] Erro ao salvar mensagem:', msgError.message);
      throw msgError;
    }

    // 4. Incrementar contador de mensagens recebidas
    await supabase.rpc('increment_qr_messages_received', { p_tenant_id: tenantId });

    // 5. Notificar via Realtime (para atualizar UI em tempo real)
    await supabase.channel(`tenant_${tenantId}_messages`)
      .send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          contact_id: contact.id,
          conversation_id: conversation.id,
          message: message.content,
          from: phoneNumber
        }
      });

    console.log(`[QRWebhook] Mensagem processada. Contact: ${contact.id}, Conversation: ${conversation.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Mensagem processada' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[QRWebhook] Erro:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

