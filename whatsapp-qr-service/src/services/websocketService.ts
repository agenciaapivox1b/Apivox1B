// ============================================
// WEBSOCKET SERVICE
// 
// Gerencia conexões WebSocket para notificações
// em tempo real aos clientes (frontends)
// ============================================

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from '../utils/logger';
import { WebSocketEvent } from '../types';

// Mapa de conexões por tenant
const connections = new Map<string, Set<WebSocket>>();

// Mapa de tenants por conexão (para cleanup)
const connectionToTenant = new Map<WebSocket, string>();

let wss: WebSocketServer | null = null;

/**
 * Inicializar servidor WebSocket
 */
export function initializeWebSocket(server: Server): void {
  wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket, req) => {
    // Extrair tenantId da URL
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const tenantId = url.searchParams.get('tenantId');

    if (!tenantId) {
      logger.warn('Conexão WebSocket sem tenantId');
      ws.close(1008, 'tenantId required');
      return;
    }

    logger.info({ tenantId }, 'Nova conexão WebSocket');

    // Adicionar ao mapa
    if (!connections.has(tenantId)) {
      connections.set(tenantId, new Set());
    }
    connections.get(tenantId)!.add(ws);
    connectionToTenant.set(ws, tenantId);

    // Enviar mensagem de boas-vindas
    ws.send(JSON.stringify({
      type: 'connected',
      tenantId,
      timestamp: new Date().toISOString()
    }));

    // Configurar heartbeat
    setupHeartbeat(ws, tenantId);

    // Handler de mensagens recebidas do cliente
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Responder a pings
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (error) {
        logger.warn({ tenantId, error }, 'Mensagem WebSocket inválida');
      }
    });

    // Handler de fechamento
    ws.on('close', () => {
      logger.info({ tenantId }, 'Conexão WebSocket fechada');
      removeConnection(ws, tenantId);
    });

    // Handler de erro
    ws.on('error', (error) => {
      logger.error({ tenantId, error }, 'Erro na conexão WebSocket');
      removeConnection(ws, tenantId);
    });
  });

  logger.info('WebSocket server inicializado');
}

/**
 * Configurar heartbeat para manter conexão viva
 */
function setupHeartbeat(ws: WebSocket, tenantId: string): void {
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      }));
    } else {
      clearInterval(interval);
    }
  }, 30000); // 30 segundos

  ws.on('close', () => {
    clearInterval(interval);
  });
}

/**
 * Remover conexão dos mapas
 */
function removeConnection(ws: WebSocket, tenantId: string): void {
  const tenantConnections = connections.get(tenantId);
  if (tenantConnections) {
    tenantConnections.delete(ws);
    if (tenantConnections.size === 0) {
      connections.delete(tenantId);
    }
  }
  connectionToTenant.delete(ws);
}

/**
 * Broadcast de evento para todos os clientes de um tenant
 */
export function broadcastToTenant(tenantId: string, event: Omit<WebSocketEvent, 'tenantId' | 'timestamp'>): void {
  const tenantConnections = connections.get(tenantId);
  
  if (!tenantConnections || tenantConnections.size === 0) {
    logger.debug({ tenantId, type: event.type }, 'Nenhum cliente conectado para broadcast');
    return;
  }

  const message = JSON.stringify({
    ...event,
    tenantId,
    timestamp: new Date().toISOString()
  });

  let sentCount = 0;
  tenantConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      sentCount++;
    }
  });

  logger.debug({ tenantId, type: event.type, clients: sentCount }, 'Broadcast enviado');
}

/**
 * Broadcast de QR Code para um tenant
 */
export function broadcastQRCode(tenantId: string, qrCode: string, expiresAt: Date): void {
  broadcastToTenant(tenantId, {
    type: 'qr',
    payload: { qrCode, expiresAt }
  });
}

/**
 * Broadcast de status de conexão
 */
export function broadcastConnectionStatus(
  tenantId: string, 
  status: string, 
  phone?: string, 
  message?: string
): void {
  broadcastToTenant(tenantId, {
    type: 'status',
    payload: { status, phone, message }
  });
}

/**
 * Broadcast de mensagem recebida
 */
export function broadcastMessage(tenantId: string, message: any): void {
  broadcastToTenant(tenantId, {
    type: 'message',
    payload: message
  });
}

/**
 * Obter estatísticas de conexões
 */
export function getConnectionStats(): { total: number; byTenant: Record<string, number> } {
  const byTenant: Record<string, number> = {};
  
  connections.forEach((conns, tenantId) => {
    byTenant[tenantId] = conns.size;
  });

  return {
    total: connectionToTenant.size,
    byTenant
  };
}

/**
 * Fechar todas as conexões (para shutdown gracefully)
 */
export function closeAllConnections(): void {
  logger.info('Fechando todas as conexões WebSocket');
  
  connections.forEach((conns, tenantId) => {
    conns.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1001, 'Server shutting down');
      }
    });
  });

  connections.clear();
  connectionToTenant.clear();

  if (wss) {
    wss.close();
  }
}
