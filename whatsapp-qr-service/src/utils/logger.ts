// ============================================
// LOGGER CONFIGURATION (Pino)
// ============================================

import pino from 'pino';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = pino({
  level: logLevel,
  transport: process.env.NODE_ENV === 'development' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    : undefined,
  base: {
    pid: process.pid,
    env: process.env.NODE_ENV || 'development'
  }
});

// Helper functions para logs estruturados
export function logSessionCreated(tenantId: string, sessionId: string): void {
  logger.info({ tenantId, sessionId }, 'Sessão WhatsApp criada');
}

export function logSessionConnected(tenantId: string, phone: string): void {
  logger.info({ tenantId, phone }, 'Sessão WhatsApp conectada');
}

export function logSessionDisconnected(tenantId: string, reason: string): void {
  logger.info({ tenantId, reason }, 'Sessão WhatsApp desconectada');
}

export function logQRGenerated(tenantId: string): void {
  logger.debug({ tenantId }, 'QR Code gerado');
}

export function logMessageReceived(tenantId: string, from: string): void {
  logger.debug({ tenantId, from }, 'Mensagem recebida');
}

export function logMessageSent(tenantId: string, to: string, messageId: string): void {
  logger.debug({ tenantId, to, messageId }, 'Mensagem enviada');
}

export function logError(context: string, error: Error, metadata?: Record<string, any>): void {
  logger.error({
    context,
    error: error.message,
    stack: error.stack,
    ...metadata
  }, `Erro em ${context}`);
}
