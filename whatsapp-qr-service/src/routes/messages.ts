// ============================================
// MESSAGES ROUTE
// 
// POST /api/messages/send - Enviar mensagem
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import { sendMessage } from '../baileys/SessionManager';
import { findOrCreateContact, findOrCreateConversation, saveOutboundMessage } from '../config/database';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { logger } from '../utils/logger';
import { WhatsAppQRServiceError, ErrorCodes } from '../types';

const router = Router();

/**
 * POST /api/messages/send
 * Enviar mensagem via WhatsApp QR
 */
router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, to, message } = req.body;

    // Validações
    if (!tenantId) {
      throw new WhatsAppQRServiceError(
        'tenantId é obrigatório',
        ErrorCodes.INVALID_TENANT,
        400
      );
    }

    if (!to) {
      throw new WhatsAppQRServiceError(
        'to (número de destino) é obrigatório',
        ErrorCodes.INVALID_TENANT,
        400
      );
    }

    if (!message || message.trim().length === 0) {
      throw new WhatsAppQRServiceError(
        'message é obrigatório',
        ErrorCodes.SEND_MESSAGE_FAILED,
        400
      );
    }

    logger.info({ tenantId, to }, 'Enviando mensagem');

    // Enviar via Baileys
    const result = await sendMessage(tenantId, to, message);

    if (!result.success) {
      throw new WhatsAppQRServiceError(
        result.error || 'Falha ao enviar mensagem',
        ErrorCodes.SEND_MESSAGE_FAILED,
        500
      );
    }

    // Salvar no banco (criar contato/conversa se não existir)
    try {
      const phoneNumber = formatPhoneNumber(to);
      const contact = await findOrCreateContact(tenantId, phoneNumber, undefined);
      const conversation = await findOrCreateConversation(tenantId, contact.id);
      
      await saveOutboundMessage(
        tenantId,
        conversation.id,
        contact.id,
        result.messageId!,
        message
      );

      logger.info({ tenantId, to, messageId: result.messageId }, 'Mensagem enviada e salva');
    } catch (dbError: any) {
      // Não falhar o envio se falhar ao salvar no banco
      logger.warn({ tenantId, error: dbError.message }, 'Mensagem enviada mas falhou ao salvar no banco');
    }

    res.json({
      success: true,
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
});

export default router;
