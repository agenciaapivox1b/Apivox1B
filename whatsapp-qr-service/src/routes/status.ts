// ============================================
// STATUS ROUTE
// 
// GET /api/status/:tenantId - Obter status detalhado
// GET /api/status - Obter status geral do serviço
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import { getSessionStatus, getAllActiveSessions } from '../baileys/SessionManager';
import { getQRSession } from '../config/database';
import { checkRedisHealth } from '../config/redis';
import { getConnectionStats } from '../services/websocketService';
import { logger } from '../utils/logger';
import { WhatsAppQRServiceError, ErrorCodes } from '../types';

const router = Router();

/**
 * GET /api/status/:tenantId
 * Obter status detalhado da sessão de um tenant
 */
router.get('/:tenantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      throw new WhatsAppQRServiceError(
        'tenantId é obrigatório',
        ErrorCodes.INVALID_TENANT,
        400
      );
    }

    // Status da memória
    const memoryStatus = getSessionStatus(tenantId);

    // Dados do banco
    const dbSession = await getQRSession(tenantId);

    const response = {
      success: true,
      status: memoryStatus.status,
      sessionId: memoryStatus.sessionId || dbSession?.session_id || null,
      connectedPhone: memoryStatus.connectedPhone || dbSession?.connected_phone_formatted || null,
      connectedAt: memoryStatus.connectedAt || dbSession?.connected_at || null,
      lastActivity: memoryStatus.lastActivity || dbSession?.last_activity_at || null,
      hasQR: memoryStatus.hasQR || !!dbSession?.current_qr_code,
      messagesSent: dbSession?.messages_sent || 0,
      messagesReceived: dbSession?.messages_received || 0,
      errorMessage: dbSession?.last_error_message || null
    };

    res.json(response);

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/status
 * Obter status geral do serviço (health check)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar Redis
    const redisHealth = await checkRedisHealth();

    // Estatísticas
    const activeSessions = getAllActiveSessions();
    const wsStats = getConnectionStats();

    const health = {
      success: true,
      service: 'whatsapp-qr-service',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      status: redisHealth ? 'healthy' : 'degraded',
      components: {
        redis: redisHealth ? 'connected' : 'disconnected',
        websocket: {
          status: 'active',
          connections: wsStats.total,
          byTenant: wsStats.byTenant
        }
      },
      sessions: {
        active: activeSessions.length,
        tenants: activeSessions
      }
    };

    res.status(redisHealth ? 200 : 503).json(health);

  } catch (error) {
    next(error);
  }
});

export default router;
