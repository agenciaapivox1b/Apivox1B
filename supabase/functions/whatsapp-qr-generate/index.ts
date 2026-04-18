// =====================================================
// WHATSAPP QR GENERATE
// 
// Edge Function para retornar o QR Code atual da sessão
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// @ts-ignore
import { getQRCode } from '../_shared/baileys-sessions.ts';

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

    console.log(`[QRGenerate] Tenant: ${tenantId}`);

    // Tentar pegar QR da memória (sessão ativa)
    let qrCode = getQRCode(tenantId);

    // Se não tem na memória, tentar do banco
    if (!qrCode) {
      const { data, error } = await supabase
        .from('whatsapp_qr_sessions')
        .select('current_qr_code, qr_expires_at, connection_status')
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar QR: ${error.message}`);
      }

      if (!data) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nenhuma sessão encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar se QR expirou
      if (data.qr_expires_at && new Date(data.qr_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'QR Code expirado',
            status: data.connection_status,
            needsRefresh: true
          }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      qrCode = data.current_qr_code;
    }

    if (!qrCode) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'QR Code ainda não gerado. Aguarde ou recrie a sessão.',
          needsRefresh: true
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        qrCode,
        expiresIn: 45 // segundos restantes estimados
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[QRGenerate] Erro:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

