// ============================================
// QR CODE ROUTE
// 
// GET /api/qr/:tenantId - Obter QR code atual
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import { getCurrentQR } from '../baileys/SessionManager';
import { getQRFromRedis } from '../config/redis';
import { logger } from '../utils/logger';
import { WhatsAppQRServiceError, ErrorCodes } from '../types';

const router = Router();

/**
 * GET /api/qr/:tenantId
 * Obter QR code atual da sessão
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

    logger.debug({ tenantId }, 'Buscando QR code');

    // Tentar obter da memória primeiro (mais rápido)
    const memoryQR = getCurrentQR(tenantId);

    if (memoryQR.qrCode && memoryQR.expiresAt && new Date() < memoryQR.expiresAt) {
      return res.json({
        success: true,
        qrCode: memoryQR.qrCode,
        expiresAt: memoryQR.expiresAt,
        status: 'awaiting_qr',
        expiresIn: Math.floor((memoryQR.expiresAt.getTime() - Date.now()) / 1000)
      });
    }

    // Tentar obter do Redis (fallback)
    const redisQR = await getQRFromRedis(tenantId);

    if (redisQR) {
      return res.json({
        success: true,
        qrCode: redisQR,
        expiresAt: null,
        status: 'awaiting_qr',
        expiresIn: null,
        fromCache: true
      });
    }

    // Nenhum QR disponível
    res.status(404).json({
      success: false,
      error: 'QR code não disponível. Crie uma sessão primeiro ou aguarde a geração.',
      status: 'disconnected',
      needsRefresh: true
    });

  } catch (error) {
    next(error);
  }
});

export default router;
