// ============================================
// SUPABASE CLIENT CONFIGURATION
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import {
  QRSessionRecord,
  ContactRecord,
  ConversationRecord,
  MessageRecord
} from '../types';

// Singleton instance
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    logger.info('Supabase client inicializado');
  }

  return supabaseClient;
}

// ============================================
// OPERAÇÕES DE SESSÃO QR
// ============================================

export async function getQRSession(tenantId: string): Promise<QRSessionRecord | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('whatsapp_qr_sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    logger.error({ error, tenantId }, 'Erro ao buscar sessão QR');
    throw error;
  }

  return data;
}

export async function createQRSession(
  tenantId: string,
  sessionId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('whatsapp_qr_sessions')
    .upsert({
      tenant_id: tenantId,
      session_id: sessionId,
      provider_type: 'whatsapp_qr',
      connection_status: 'awaiting_qr',
      current_qr_code: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString()
    }, {
      onConflict: 'tenant_id'
    });

  if (error) {
    logger.error({ error, tenantId }, 'Erro ao criar sessão QR');
    throw error;
  }

  logger.info({ tenantId, sessionId }, 'Sessão QR criada no banco');
}

export async function updateQRSessionStatus(
  tenantId: string,
  status: string,
  updates: Partial<QRSessionRecord> = {}
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('whatsapp_qr_sessions')
    .update({
      connection_status: status,
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId);

  if (error) {
    logger.error({ error, tenantId, status }, 'Erro ao atualizar status da sessão');
    throw error;
  }

  logger.debug({ tenantId, status }, 'Status da sessão atualizado');
}

export async function updateQRCode(
  tenantId: string,
  qrCode: string | null,
  expiresAt: Date | null
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('whatsapp_qr_sessions')
    .update({
      current_qr_code: qrCode,
      qr_expires_at: expiresAt?.toISOString() || null,
      updated_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId);

  if (error) {
    logger.error({ error, tenantId }, 'Erro ao atualizar QR code');
    throw error;
  }
}

// ============================================
// OPERAÇÕES DE CONTATO
// ============================================

export async function findOrCreateContact(
  tenantId: string,
  phone: string,
  name?: string
): Promise<ContactRecord> {
  const supabase = getSupabaseClient();
  
  // Buscar contato existente
  const { data: existing, error: searchError } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('phone', phone)
    .maybeSingle();

  if (searchError) {
    logger.error({ error: searchError, tenantId, phone }, 'Erro ao buscar contato');
    throw searchError;
  }

  if (existing) {
    return existing;
  }

  // Criar novo contato
  const { data: created, error: createError } = await supabase
    .from('contacts')
    .insert({
      tenant_id: tenantId,
      phone: phone,
      name: name || phone,
      source: 'whatsapp_qr',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (createError) {
    logger.error({ error: createError, tenantId, phone }, 'Erro ao criar contato');
    throw createError;
  }

  logger.info({ tenantId, phone, contactId: created.id }, 'Contato criado');
  return created;
}

// ============================================
// OPERAÇÕES DE CONVERSA
// ============================================

export async function findOrCreateConversation(
  tenantId: string,
  contactId: string
): Promise<ConversationRecord> {
  const supabase = getSupabaseClient();
  
  // Buscar conversa existente
  const { data: existing, error: searchError } = await supabase
    .from('conversations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .eq('channel', 'whatsapp')
    .maybeSingle();

  if (searchError) {
    logger.error({ error: searchError, tenantId, contactId }, 'Erro ao buscar conversa');
    throw searchError;
  }

  if (existing) {
    return existing;
  }

  // Criar nova conversa
  const { data: created, error: createError } = await supabase
    .from('conversations')
    .insert({
      tenant_id: tenantId,
      contact_id: contactId,
      channel: 'whatsapp',
      status: 'active',
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (createError) {
    logger.error({ error: createError, tenantId, contactId }, 'Erro ao criar conversa');
    throw createError;
  }

  logger.info({ tenantId, contactId, conversationId: created.id }, 'Conversa criada');
  return created;
}

// ============================================
// OPERAÇÕES DE MENSAGEM
// ============================================

export async function saveInboundMessage(
  tenantId: string,
  conversationId: string,
  contactId: string,
  messageId: string,
  content: string,
  timestamp: Date
): Promise<MessageRecord> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      contact_id: contactId,
      direction: 'inbound',
      content: content,
      channel: 'whatsapp',
      provider: 'whatsapp_qr',
      provider_message_id: messageId,
      status: 'received',
      created_at: timestamp.toISOString()
    })
    .select()
    .single();

  if (error) {
    logger.error({ error, tenantId, messageId }, 'Erro ao salvar mensagem inbound');
    throw error;
  }

  // Atualizar last_message_at na conversa
  await supabase
    .from('conversations')
    .update({
      last_message_at: timestamp.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  // Incrementar contador de mensagens recebidas na sessão QR
  await supabase.rpc('increment_qr_messages_received', {
    p_tenant_id: tenantId
  });

  logger.debug({ tenantId, messageId, conversationId }, 'Mensagem inbound salva');
  return data;
}

export async function saveOutboundMessage(
  tenantId: string,
  conversationId: string,
  contactId: string,
  messageId: string,
  content: string
): Promise<MessageRecord> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      contact_id: contactId,
      direction: 'outbound',
      content: content,
      channel: 'whatsapp',
      provider: 'whatsapp_qr',
      provider_message_id: messageId,
      status: 'sent',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    logger.error({ error, tenantId, messageId }, 'Erro ao salvar mensagem outbound');
    throw error;
  }

  // Atualizar last_message_at na conversa
  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  // Incrementar contador de mensagens enviadas na sessão QR
  await supabase.rpc('increment_qr_messages_sent', {
    p_tenant_id: tenantId
  });

  logger.debug({ tenantId, messageId, conversationId }, 'Mensagem outbound salva');
  return data;
}

// ============================================
// BROADCAST REALTIME
// ============================================

export async function broadcastNewMessage(
  tenantId: string,
  conversationId: string,
  message: any
): Promise<void> {
  const supabase = getSupabaseClient();
  
  // Usar Supabase Realtime para notificar frontend
  const channel = supabase.channel(`tenant_${tenantId}_messages`);
  
  await channel.send({
    type: 'broadcast',
    event: 'new_message',
    payload: {
      conversation_id: conversationId,
      message: message
    }
  });

  logger.debug({ tenantId, conversationId }, 'Broadcast de nova mensagem enviado');
}
