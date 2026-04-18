// =====================================================
// WHATSAPP QR SEND
// 
// Edge Function para enviar mensagens via sessão QR
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// @ts-ignore
import { sendMessage, getSessionStatus } from '../_shared/baileys-sessions.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tenantId, to, message } = await req.json();

    if (!tenantId || !to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'tenantId, to e message são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[QRSend] Tenant: ${tenantId}, To: ${to}`);

    // Verificar se sessão está conectada
    const status = getSessionStatus(tenantId);
    if (status.status !== 'connected') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Sessão não conectada',
          status: status.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar mensagem
    const result = await sendMessage(tenantId, to, message);

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Incrementar contador de mensagens enviadas
    await supabase.rpc('increment_qr_messages_sent', { p_tenant_id: tenantId });

    // Salvar mensagem no banco (outbound)
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenantId,
        direction: 'outbound',
        content: message,
        channel: 'whatsapp',
        provider: 'whatsapp_qr',
        provider_message_id: result.messageId,
        status: 'sent',
        created_at: new Date().toISOString()
      });

    if (msgError) {
      console.warn('[QRSend] Erro ao salvar mensagem:', msgError.message);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messageId,
        message: 'Mensagem enviada com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[QRSend] Erro:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

