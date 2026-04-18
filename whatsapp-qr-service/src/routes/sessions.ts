// ============================================
// SESSIONS ROUTE
// 
// POST /api/sessions - Criar nova sessão
// DELETE /api/sessions/:tenantId - Destruir sessão
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import { createSession, destroySession, getSessionStatus, hasSession } from '../baileys/SessionManager';
import { logger } from '../utils/logger';
import { WhatsAppQRServiceError, ErrorCodes } from '../types';

const router = Router();

/**
 * POST /api/sessions
 * Criar nova sessão WhatsApp QR
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.body;
    const phoneNumber = req.body.phoneNumber;

    if (!tenantId) {
      throw new WhatsAppQRServiceError(
        'tenantId é obrigatório',
        ErrorCodes.INVALID_TENANT,
        400
      );
    }

    logger.info({ tenantId }, 'Criando nova sessão');

    const result = await createSession(tenantId, phoneNumber);

    res.status(201).json(result);

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:tenantId/status
 * Obter status da sessão
 */
router.get('/:tenantId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      throw new WhatsAppQRServiceError(
        'tenantId é obrigatório',
        ErrorCodes.INVALID_TENANT,
        400
      );
    }

    const status = getSessionStatus(tenantId);

    res.json(status);

  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/sessions/:tenantId
 * Destruir sessão e desconectar
 */
router.delete('/:tenantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      throw new WhatsAppQRServiceError(
        'tenantId é obrigatório',
        ErrorCodes.INVALID_TENANT,
        400
      );
    }

    if (!hasSession(tenantId)) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada'
      });
    }

    logger.info({ tenantId }, 'Destruindo sessão');

    await destroySession(tenantId);

    res.json({
      success: true,
      message: 'Sessão desconectada com sucesso'
    });

  } catch (error) {
    next(error);
  }
});

export default router;
