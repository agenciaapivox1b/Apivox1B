// =====================================================
// WHATSAPP QR STATUS
// 
// Edge Function para consultar status da sessão QR
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// @ts-ignore
import { getSessionStatus } from '../_shared/baileys-sessions.ts';

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

    const { tenantId } = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ success: false, error: 'tenantId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[QRStatus] Tenant: ${tenantId}`);

    // Verificar status na memória (sessão ativa)
    const memoryStatus = getSessionStatus(tenantId);

    // Buscar do banco para informações adicionais
    const { data, error } = await supabase
      .from('whatsapp_qr_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar status: ${error.message}`);
    }

    // Combinar informações da memória e do banco
    const response: any = {
      success: true,
      status: memoryStatus.status || data?.connection_status || 'disconnected',
      hasQR: memoryStatus.hasQR || !!data?.current_qr_code,
    };

    if (data) {
      response.sessionId = data.session_id;
      response.connectedPhone = memoryStatus.connectedPhone || data.connected_phone_formatted;
      response.qrCode = memoryStatus.hasQR ? null : data.current_qr_code; // Só retorna QR se não tiver na memória
      response.qrExpiresAt = data.qr_expires_at;
      response.connectedAt = data.connected_at;
      response.disconnectedAt = data.disconnected_at;
      response.lastActivityAt = data.last_activity_at;
      response.messagesSent = data.messages_sent;
      response.messagesReceived = data.messages_received;
      
      if (data.last_error_message) {
        response.errorMessage = data.last_error_message;
      }
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[QRStatus] Erro:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

