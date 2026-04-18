// ============================================
// SESSION MANAGER - CORE DO SERVIÇO BAILEYS
// 
// Gerencia todas as sessões WhatsApp por tenant
// Cria sockets, trata eventos, persiste estado
// ============================================

import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  ConnectionState
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../utils/logger';
import { loadAuthState, saveAuthState, deleteAuthState } from '../config/redis';
import {
  createQRSession,
  updateQRSessionStatus,
  updateQRCode,
  findOrCreateContact,
  findOrCreateConversation,
  saveInboundMessage
} from '../config/database';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import {
  SessionData,
  ConnectionStatus,
  CreateSessionResponse,
  SessionStatusResponse,
  IncomingMessage,
  ErrorCodes,
  WhatsAppQRServiceError
} from '../types';
import { broadcastToTenant } from '../services/websocketService';

// ============================================
// MAPA DE SESSÕES ATIVAS (MEMÓRIA)
// ============================================

const activeSessions = new Map<string, SessionData>();

// ============================================
// CRIAR NOVA SESSÃO
// ============================================

export async function createSession(
  tenantId: string,
  phoneNumber?: string
): Promise<CreateSessionResponse> {
  try {
    // Verificar se já existe sessão ativa
    const existingSession = activeSessions.get(tenantId);
    if (existingSession) {
      if (existingSession.status === 'connected') {
        logger.info({ tenantId }, 'Sessão já existe e está conectada');
        return {
          success: true,
          sessionId: existingSession.sessionId,
          status: 'connected',
          qrExpiresIn: 0
        };
      }

      // Se existe mas não está conectada, destruir antiga
      logger.info({ tenantId }, 'Destruindo sessão anterior não conectada');
      await destroySession(tenantId);
    }

    // Gerar novo sessionId
    const sessionId = `qr_${tenantId}_${uuidv4().slice(0, 8)}`;

    // Criar registro no banco
    await createQRSession(tenantId, sessionId);

    // Carregar auth state anterior (se existir)
    const previousAuth = await loadAuthState(tenantId);

    // Criar estado de autenticação
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${tenantId}`);

    // Se tem auth state anterior, restaurar
    if (previousAuth) {
      logger.info({ tenantId }, 'Restaurando auth state anterior');
      Object.assign(state.creds, previousAuth.creds);
    }

    // Criar socket Baileys
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['APIVOX WhatsApp', 'Chrome', '1.0'],
      connectTimeoutMs: 60000,
      qrTimeout: 60000,
      defaultQueryTimeoutMs: 60000,
      emitOwnEvents: true
    });

    // Inicializar dados da sessão
    const sessionData: SessionData = {
      tenantId,
      sessionId,
      socket,
      status: 'connecting',
      qrCode: null,
      qrExpiresAt: null,
      connectedPhone: null,
      connectedAt: null,
      lastActivity: new Date(),
      reconnectAttempts: 0,
      authState: state
    };

    // Armazenar na memória
    activeSessions.set(tenantId, sessionData);

    // Configurar eventos do Baileys
    setupBaileysEvents(socket, tenantId, sessionData, saveCreds);

    logger.info({ tenantId, sessionId }, 'Sessão Baileys criada com sucesso');

    return {
      success: true,
      sessionId,
      status: 'awaiting_qr',
      qrExpiresIn: 60
    };

  } catch (error: any) {
    logger.error({ tenantId, error: error.message }, 'Erro ao criar sessão');
    throw new WhatsAppQRServiceError(
      `Erro ao criar sessão: ${error.message}`,
      ErrorCodes.BAILEYS_ERROR,
      500
    );
  }
}

// ============================================
// CONFIGURAR EVENTOS BAILEYS
// ============================================

function setupBaileysEvents(
  socket: WASocket,
  tenantId: string,
  sessionData: SessionData,
  saveCreds: () => Promise<void>
): void {
  // Evento: Atualização de conexão (QR, conectado, desconectado)
  socket.ev.on('connection.update', async (update: ConnectionState) => {
    const { connection, lastDisconnect, qr } = update;

    try {
      // Novo QR Code disponível
      if (qr) {
        logger.info({ tenantId }, 'Novo QR Code gerado');
        
        sessionData.qrCode = qr;
        sessionData.status = 'awaiting_qr';
        sessionData.qrExpiresAt = new Date(Date.now() + 60000); // 60 segundos
        sessionData.lastActivity = new Date();

        // Salvar QR no banco e Redis
        await updateQRCode(tenantId, qr, sessionData.qrExpiresAt);

        // Notificar frontend via WebSocket
        broadcastToTenant(tenantId, {
          type: 'qr',
          payload: {
            qrCode: qr,
            expiresAt: sessionData.qrExpiresAt
          }
        });
      }

      // Conexão aberta (sucesso!)
      if (connection === 'open') {
        logger.info({ tenantId }, 'Conexão WhatsApp aberta!');

        const phone = socket.user?.id || 'unknown';
        const formattedPhone = formatPhoneNumber(phone);

        sessionData.status = 'connected';
        sessionData.connectedPhone = formattedPhone;
        sessionData.connectedAt = new Date();
        sessionData.qrCode = null; // Limpar QR após conexão
        sessionData.qrExpiresAt = null;
        sessionData.lastActivity = new Date();
        sessionData.reconnectAttempts = 0;

        // Atualizar banco
        await updateQRSessionStatus(tenantId, 'connected', {
          connected_phone: phone,
          connected_phone_formatted: formattedPhone,
          connected_at: new Date().toISOString(),
          current_qr_code: null
        });

        // Notificar frontend
        broadcastToTenant(tenantId, {
          type: 'connected',
          payload: {
            phone: formattedPhone,
            connectedAt: sessionData.connectedAt
          }
        });
      }

      // Conexão fechada
      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        const reason = getDisconnectReason(statusCode);

        logger.warn({ tenantId, statusCode, reason, shouldReconnect }, 'Conexão fechada');

        sessionData.status = 'disconnected';
        sessionData.lastActivity = new Date();

        // Atualizar banco
        await updateQRSessionStatus(tenantId, 'disconnected', {
          disconnected_at: new Date().toISOString(),
          last_error_message: reason
        });

        // Notificar frontend
        broadcastToTenant(tenantId, {
          type: 'disconnected',
          payload: { reason, shouldReconnect }
        });

        // Se não foi logout, tentar reconectar
        if (shouldReconnect && sessionData.reconnectAttempts < 5) {
          sessionData.reconnectAttempts++;
          logger.info({ tenantId, attempt: sessionData.reconnectAttempts }, 'Tentando reconectar...');
          
          setTimeout(() => {
            reconnectSession(tenantId);
          }, 5000 * sessionData.reconnectAttempts);
        } else {
          // Destruir sessão
          activeSessions.delete(tenantId);
        }
      }
    } catch (error: any) {
      logger.error({ tenantId, error: error.message }, 'Erro no handler de connection.update');
    }
  });

  // Evento: Atualização de credenciais (salvar quando mudar)
  socket.ev.on('creds.update', async () => {
    try {
      await saveCreds();
      // Também salvar no Redis para persistência
      await saveAuthState(tenantId, sessionData.authState);
      logger.debug({ tenantId }, 'Credenciais salvas');
    } catch (error: any) {
      logger.error({ tenantId, error: error.message }, 'Erro ao salvar credenciais');
    }
  });

  // Evento: Mensagens recebidas
  socket.ev.on('messages.upsert', async (messageUpdate: { messages: any[]; type: string }) => {
    try {
      const { messages, type } = messageUpdate;
      
      if (type !== 'notify') return;

      for (const msg of messages) {
        // Ignorar mensagens enviadas por nós
        if (msg.key.fromMe) continue;

        sessionData.lastActivity = new Date();

        // Extrair conteúdo
        const content = extractMessageContent(msg);
        if (!content) continue;

        const from = msg.key.remoteJid;
        const messageId = msg.key.id;
        const timestamp = msg.messageTimestamp 
          ? new Date(msg.messageTimestamp * 1000) 
          : new Date();

        logger.info({ tenantId, from, messageId }, 'Mensagem recebida');

        // Processar mensagem
        await processIncomingMessage(tenantId, from, content, messageId, timestamp);

        // Notificar frontend
        broadcastToTenant(tenantId, {
          type: 'message',
          payload: {
            from: formatPhoneNumber(from),
            content,
            timestamp
          }
        });
      }
    } catch (error: any) {
      logger.error({ tenantId, error: error.message }, 'Erro ao processar mensagem');
    }
  });
}

// ============================================
// PROCESSAR MENSAGEM INBOUND
// ============================================

async function processIncomingMessage(
  tenantId: string,
  from: string,
  content: string,
  messageId: string,
  timestamp: Date
): Promise<void> {
  try {
    // Formatar número do remetente
    const phoneNumber = formatPhoneNumber(from);

    // Criar ou buscar contato
    const contact = await findOrCreateContact(tenantId, phoneNumber, undefined);

    // Criar ou buscar conversa
    const conversation = await findOrCreateConversation(tenantId, contact.id);

    // Salvar mensagem
    await saveInboundMessage(
      tenantId,
      conversation.id,
      contact.id,
      messageId,
      content,
      timestamp
    );

    logger.debug({ tenantId, messageId, contactId: contact.id }, 'Mensagem processada');

  } catch (error: any) {
    logger.error({ tenantId, error: error.message }, 'Erro ao processar mensagem inbound');
  }
}

// ============================================
// ENVIAR MENSAGEM
// ============================================

export async function sendMessage(
  tenantId: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const session = activeSessions.get(tenantId);
    
    if (!session || session.status !== 'connected') {
      throw new WhatsAppQRServiceError(
        'Sessão não conectada',
        ErrorCodes.NOT_CONNECTED,
        400
      );
    }

    // Formatar número de destino
    const formattedNumber = formatPhoneNumber(to);
    const jid = formattedNumber.includes('@') 
      ? formattedNumber 
      : `${formattedNumber}@s.whatsapp.net`;

    logger.info({ tenantId, to: formattedNumber }, 'Enviando mensagem');

    // Enviar via Baileys
    const result = await session.socket.sendMessage(jid, { text: message });

    if (!result) {
      throw new WhatsAppQRServiceError(
        'Falha ao enviar mensagem',
        ErrorCodes.SEND_MESSAGE_FAILED,
        500
      );
    }

    session.lastActivity = new Date();

    logger.info({ tenantId, to: formattedNumber, messageId: result.key.id }, 'Mensagem enviada');

    return {
      success: true,
      messageId: result.key.id
    };

  } catch (error: any) {
    logger.error({ tenantId, to, error: error.message }, 'Erro ao enviar mensagem');
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// OBTER STATUS DA SESSÃO
// ============================================

export function getSessionStatus(tenantId: string): SessionStatusResponse {
  const session = activeSessions.get(tenantId);

  if (!session) {
    return {
      success: true,
      status: 'disconnected',
      sessionId: '',
      connectedPhone: null,
      connectedAt: null,
      lastActivity: new Date(),
      hasQR: false
    };
  }

  // Verificar se QR expirou
  const hasValidQR = session.qrCode && 
    session.qrExpiresAt && 
    new Date() < session.qrExpiresAt;

  return {
    success: true,
    status: session.status,
    sessionId: session.sessionId,
    connectedPhone: session.connectedPhone,
    connectedAt: session.connectedAt,
    lastActivity: session.lastActivity,
    hasQR: !!hasValidQR
  };
}

// ============================================
// OBTER QR CODE ATUAL
// ============================================

export function getCurrentQR(tenantId: string): { qrCode: string | null; expiresAt: Date | null } {
  const session = activeSessions.get(tenantId);

  if (!session || !session.qrCode || !session.qrExpiresAt) {
    return { qrCode: null, expiresAt: null };
  }

  // Verificar se QR ainda é válido
  if (new Date() > session.qrExpiresAt) {
    return { qrCode: null, expiresAt: null };
  }

  return {
    qrCode: session.qrCode,
    expiresAt: session.qrExpiresAt
  };
}

// ============================================
// RECONECTAR SESSÃO
// ============================================

async function reconnectSession(tenantId: string): Promise<void> {
  try {
    const session = activeSessions.get(tenantId);
    if (!session) return;

    logger.info({ tenantId }, 'Tentando reconectar sessão');

    // Carregar auth state
    const authState = await loadAuthState(tenantId);

    if (authState) {
      // Tentar reconectar com credenciais salvas
      await createSession(tenantId);
    } else {
      // Sem credenciais, criar sessão do zero
      logger.warn({ tenantId }, 'Sem credenciais para reconectar, criando nova sessão');
      await createSession(tenantId);
    }

  } catch (error: any) {
    logger.error({ tenantId, error: error.message }, 'Erro ao reconectar sessão');
  }
}

// ============================================
// DESTRUIR SESSÃO
// ============================================

export async function destroySession(tenantId: string): Promise<void> {
  try {
    const session = activeSessions.get(tenantId);
    
    if (session) {
      // Fechar socket
      if (session.socket) {
        try {
          await session.socket.logout();
        } catch (err) {
          // Ignorar erro no logout
        }
      }

      // Remover da memória
      activeSessions.delete(tenantId);
    }

    // Remover do Redis
    await deleteAuthState(tenantId);

    // Atualizar banco
    await updateQRSessionStatus(tenantId, 'disconnected', {
      disconnected_at: new Date().toISOString(),
      current_qr_code: null
    });

    logger.info({ tenantId }, 'Sessão destruída');

  } catch (error: any) {
    logger.error({ tenantId, error: error.message }, 'Erro ao destruir sessão');
  }
}

// ============================================
// VERIFICAR SE SESSÃO EXISTE
// ============================================

export function hasSession(tenantId: string): boolean {
  return activeSessions.has(tenantId);
}

// ============================================
// OBTER TODAS AS SESSÕES ATIVAS
// ============================================

export function getAllActiveSessions(): string[] {
  return Array.from(activeSessions.keys());
}

// ============================================
// HELPERS
// ============================================

function getDisconnectReason(statusCode: number | undefined): string {
  if (!statusCode) return 'unknown';
  
  const reasons: Record<number, string> = {
    [DisconnectReason.connectionClosed]: 'connectionClosed',
    [DisconnectReason.connectionLost]: 'connectionLost',
    [DisconnectReason.connectionReplaced]: 'connectionReplaced',
    [DisconnectReason.loggedOut]: 'loggedOut',
    [DisconnectReason.badSession]: 'badSession',
    [DisconnectReason.restartRequired]: 'restartRequired',
    [DisconnectReason.timedOut]: 'timedOut',
    [DisconnectReason.multideviceMismatch]: 'multideviceMismatch'
  };

  return reasons[statusCode] || `unknown_${statusCode}`;
}

function extractMessageContent(msg: any): string | null {
  try {
    // Texto simples
    if (msg.message?.conversation) {
      return msg.message.conversation;
    }

    // Mensagem extendida
    if (msg.message?.extendedTextMessage?.text) {
      return msg.message.extendedTextMessage.text;
    }

    // Outros tipos - retornar placeholder
    if (msg.message?.imageMessage) return '[Imagem]';
    if (msg.message?.videoMessage) return '[Vídeo]';
    if (msg.message?.audioMessage) return '[Áudio]';
    if (msg.message?.documentMessage) return '[Documento]';
    if (msg.message?.stickerMessage) return '[Sticker]';
    if (msg.message?.locationMessage) return '[Localização]';
    if (msg.message?.contactMessage) return '[Contato]';

    return null;
  } catch (error) {
    return null;
  }
}
