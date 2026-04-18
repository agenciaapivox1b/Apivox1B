// =====================================================
// GERENCIAMENTO DE SESSÕES BAILEYS - SHARED MODULE
// 
// Este arquivo gerencia todas as sessões QR ativas
// em memória (stateless Edge Functions)
// =====================================================

// @ts-ignore - Baileys só existe no deploy
import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
// @ts-ignore - Boom só existe no deploy
import { Boom } from '@hapi/boom';

// Interface da sessão ativa
interface SessionData {
  socket: any;
  qrCode: string | null;
  status: 'pending' | 'connected' | 'disconnected' | 'error';
  connectedPhone: string | null;
  lastActivity: number;
  authState: any;
}

// Mapa de sessões ativas (tenantId -> SessionData)
const activeSessions = new Map<string, SessionData>();

// Timeout de inatividade (30 minutos)
const SESSION_TIMEOUT = 30 * 60 * 1000;

/**
 * Criar nova sessão Baileys para um tenant
 */
export async function createSession(
  tenantId: string,
  sessionId: string,
  onQR: (qr: string) => void,
  onConnect: (phone: string) => void,
  onDisconnect: (reason: string) => void,
  onMessage: (message: any) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar se já existe sessão ativa
    if (activeSessions.has(tenantId)) {
      const existing = activeSessions.get(tenantId);
      if (existing && existing.status === 'connected') {
        return { success: true }; // Já conectado
      }
      // Se existe mas não conectado, remover antiga
      await disconnectSession(tenantId);
    }

    // Criar estado de autenticação em memória (ou carregar do banco)
    // Nota: Edge Functions são efêmeras, então idealmente usamos
    // Supabase Storage ou Redis para persistir auth state
    
    const { state, saveCreds } = await useMultiFileAuthState(`./auth_${tenantId}`);

    // Criar socket Baileys
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['APIVOX', 'Chrome', '1.0'],
      connectTimeoutMs: 60000,
      qrTimeout: 60000,
    });

    // Configurar eventos
    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      // Novo QR Code disponível
      if (qr) {
        console.log(`[Baileys] Novo QR para tenant ${tenantId}`);
        const session = activeSessions.get(tenantId);
        if (session) {
          session.qrCode = qr;
          session.status = 'pending';
          session.lastActivity = Date.now();
        }
        onQR(qr);
      }

      // Conectado
      if (connection === 'open') {
        console.log(`[Baileys] Conectado! Tenant: ${tenantId}`);
        const session = activeSessions.get(tenantId);
        if (session) {
          session.status = 'connected';
          session.connectedPhone = sock.user?.id || 'unknown';
          session.lastActivity = Date.now();
        }
        onConnect(sock.user?.id || 'unknown');
      }

      // Desconectado
      if (connection === 'close') {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = reason !== DisconnectReason.loggedOut;
        
        console.log(`[Baileys] Desconectado. Tenant: ${tenantId}, Motivo: ${reason}`);
        
        const session = activeSessions.get(tenantId);
        if (session) {
          session.status = 'disconnected';
          session.lastActivity = Date.now();
        }
        
        onDisconnect(DisconnectReason[reason] || 'unknown');
        
        if (!shouldReconnect) {
          activeSessions.delete(tenantId);
        }
      }
    });

    // Receber mensagens
    sock.ev.on('messages.upsert', async (m: any) => {
      console.log(`[Baileys] Mensagem recebida. Tenant: ${tenantId}`);
      const session = activeSessions.get(tenantId);
      if (session) {
        session.lastActivity = Date.now();
      }
      
      // Processar cada mensagem
      for (const msg of m.messages) {
        if (!msg.key.fromMe && m.type === 'notify') {
          onMessage({
            id: msg.key.id,
            from: msg.key.remoteJid,
            content: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '',
            timestamp: msg.messageTimestamp,
          });
        }
      }
    });

    // Salvar credenciais quando mudarem
    sock.ev.on('creds.update', saveCreds);

    // Armazenar sessão
    activeSessions.set(tenantId, {
      socket: sock,
      qrCode: null,
      status: 'pending',
      connectedPhone: null,
      lastActivity: Date.now(),
      authState: state,
    });

    console.log(`[Baileys] Sessão criada. Tenant: ${tenantId}, Session: ${sessionId}`);
    return { success: true };

  } catch (error: any) {
    console.error(`[Baileys] Erro ao criar sessão: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Obter QR Code atual de uma sessão
 */
export function getQRCode(tenantId: string): string | null {
  const session = activeSessions.get(tenantId);
  return session?.qrCode || null;
}

/**
 * Obter status da sessão
 */
export function getSessionStatus(tenantId: string): {
  status: string;
  connectedPhone: string | null;
  hasQR: boolean;
} {
  const session = activeSessions.get(tenantId);
  if (!session) {
    return { status: 'disconnected', connectedPhone: null, hasQR: false };
  }
  
  return {
    status: session.status,
    connectedPhone: session.connectedPhone,
    hasQR: !!session.qrCode,
  };
}

/**
 * Enviar mensagem
 */
export async function sendMessage(
  tenantId: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const session = activeSessions.get(tenantId);
    if (!session || session.status !== 'connected') {
      return { success: false, error: 'Sessão não conectada' };
    }

    // Formatar número (adicionar @s.whatsapp.net se não tiver)
    const formattedNumber = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    const result = await session.socket.sendMessage(formattedNumber, {
      text: message,
    });

    session.lastActivity = Date.now();

    return {
      success: true,
      messageId: result.key.id,
    };

  } catch (error: any) {
    console.error(`[Baileys] Erro ao enviar mensagem: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Desconectar sessão
 */
export async function disconnectSession(tenantId: string): Promise<void> {
  try {
    const session = activeSessions.get(tenantId);
    if (session) {
      await session.socket.logout();
      activeSessions.delete(tenantId);
      console.log(`[Baileys] Sessão desconectada. Tenant: ${tenantId}`);
    }
  } catch (error: any) {
    console.error(`[Baileys] Erro ao desconectar: ${error.message}`);
    activeSessions.delete(tenantId);
  }
}

/**
 * Limpar sessões inativas (chamar periodicamente)
 */
export function cleanupInactiveSessions(): void {
  const now = Date.now();
  for (const [tenantId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      console.log(`[Baileys] Removendo sessão inativa. Tenant: ${tenantId}`);
      disconnectSession(tenantId);
    }
  }
}

/**
 * Verificar se sessão existe
 */
export function hasSession(tenantId: string): boolean {
  return activeSessions.has(tenantId);
}

// Iniciar cleanup periódico (a cada 10 minutos)
setInterval(cleanupInactiveSessions, 10 * 60 * 1000);

