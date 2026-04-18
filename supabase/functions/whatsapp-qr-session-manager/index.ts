// =====================================================
// WHATSAPP QR SESSION MANAGER
// 
// Edge Function para gerenciar sessões QR (criar, reconectar, desconectar)
// Usa Baileys para conectar ao WhatsApp Web
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// @ts-ignore - shared module
import { createSession, disconnectSession, hasSession, getSessionStatus } from '../_shared/baileys-sessions.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { tenantId, action, sessionId } = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ success: false, error: 'tenantId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SessionManager] ${action} - Tenant: ${tenantId}`);

    switch (action) {
      case 'create':
        return await createSessionHandler(supabase, tenantId);
      
      case 'reconnect':
        return await reconnectSessionHandler(supabase, tenantId, sessionId);
      
      case 'disconnect':
        return await disconnectSessionHandler(supabase, tenantId);
      
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: any) {
    console.error('[SessionManager] Erro:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Criar nova sessão
 */
async function createSessionHandler(supabase: any, tenantId: string): Promise<Response> {
  try {
    // Verificar se já existe sessão
    if (hasSession(tenantId)) {
      const status = getSessionStatus(tenantId);
      if (status.status === 'connected') {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Sessão já existe e está conectada',
            sessionId: `qr_${tenantId}`,
            status: 'connected',
            connectedPhone: status.connectedPhone
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Gerar novo sessionId
    const sessionId = `qr_${tenantId}_${Date.now()}`;

    // Criar registro no banco
    const { error: dbError } = await supabase
      .from('whatsapp_qr_sessions')
      .upsert({
        tenant_id: tenantId,
        session_id: sessionId,
        provider_type: 'whatsapp_qr',
        connection_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id' });

    if (dbError) {
      throw new Error(`Erro ao salvar no banco: ${dbError.message}`);
    }

    // Criar sessão Baileys
    // Nota: As callbacks serão chamadas quando os eventos acontecerem
    const result = await createSession(
      tenantId,
      sessionId,
      // onQR
      async (qr: string) => {
        // Salvar QR no banco
        await supabase
          .from('whatsapp_qr_sessions')
          .update({
            current_qr_code: qr,
            qr_generated_at: new Date().toISOString(),
            qr_expires_at: new Date(Date.now() + 60000).toISOString(), // 60 segundos
            connection_status: 'awaiting_qr',
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', tenantId);
        
        console.log(`[SessionManager] QR gerado para tenant ${tenantId}`);
      },
      // onConnect
      async (phone: string) => {
        // Atualizar status no banco
        await supabase
          .from('whatsapp_qr_sessions')
          .update({
            connection_status: 'connected',
            connected_phone: phone,
            connected_phone_formatted: formatPhone(phone),
            connected_at: new Date().toISOString(),
            current_qr_code: null, // Limpar QR após conexão
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', tenantId);
        
        console.log(`[SessionManager] Conectado! Tenant: ${tenantId}, Phone: ${phone}`);
      },
      // onDisconnect
      async (reason: string) => {
        // Atualizar status no banco
        await supabase
          .from('whatsapp_qr_sessions')
          .update({
            connection_status: 'disconnected',
            disconnected_at: new Date().toISOString(),
            last_error_message: reason,
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', tenantId);
        
        console.log(`[SessionManager] Desconectado. Tenant: ${tenantId}, Motivo: ${reason}`);
      },
      // onMessage
      async (message: any) => {
        // Processar mensagem recebida
        console.log(`[SessionManager] Mensagem de ${message.from}: ${message.content}`);
        
        // Aqui você salvaria a mensagem no banco (contacts, conversations, messages)
        // Isso será feito na Edge Function whatsapp-qr-webhook
      }
    );

    if (!result.success) {
      throw new Error(result.error || 'Erro ao criar sessão Baileys');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId,
        status: 'pending',
        message: 'Sessão criada. Aguardando leitura do QR Code.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[SessionManager] Erro ao criar sessão:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Reconectar sessão existente
 */
async function reconnectSessionHandler(supabase: any, tenantId: string, sessionId: string): Promise<Response> {
  try {
    // Buscar credenciais do banco
    const { data, error } = await supabase
      .from('whatsapp_qr_sessions')
      .select('auth_credentials_encrypted, connection_status')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se já conectado, retornar sucesso
    if (data.connection_status === 'connected' && hasSession(tenantId)) {
      return new Response(
        JSON.stringify({ success: true, message: 'Sessão já conectada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Tentar reconectar (usa as mesmas callbacks do create)
    // Por simplicidade, chamamos createSession que vai usar as credenciais salvas
    return await createSessionHandler(supabase, tenantId);

  } catch (error: any) {
    console.error('[SessionManager] Erro ao reconectar:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Desconectar sessão
 */
async function disconnectSessionHandler(supabase: any, tenantId: string): Promise<Response> {
  try {
    // Desconectar Baileys
    await disconnectSession(tenantId);

    // Atualizar banco
    await supabase
      .from('whatsapp_qr_sessions')
      .update({
        connection_status: 'disconnected',
        disconnected_at: new Date().toISOString(),
        current_qr_code: null,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId);

    return new Response(
      JSON.stringify({ success: true, message: 'Sessão desconectada' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[SessionManager] Erro ao desconectar:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Formatar número de telefone
 */
function formatPhone(phone: string): string {
  // Remove @s.whatsapp.net se existir
  const clean = phone.replace('@s.whatsapp.net', '').replace('@c.us', '');
  
  // Formata +55 11 99999-9999
  if (clean.length >= 12) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  
  return clean;
}

