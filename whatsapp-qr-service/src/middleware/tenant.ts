// ============================================
// TENANT MIDDLEWARE
// 
// Extrai e valida tenantId das requisições
// ============================================

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { WhatsAppQRServiceError, ErrorCodes } from '../types';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Extrai tenantId do body ou params
 */
export function extractTenantId(req: Request, res: Response, next: NextFunction): void {
  try {
    // Tentar extrair de várias fontes
    const tenantId = 
      req.body?.tenantId || 
      req.params?.tenantId || 
      req.query?.tenantId as string ||
      req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      // Não obrigatório em todos os endpoints
      return next();
    }

    // Validar formato UUID
    if (!UUID_REGEX.test(tenantId)) {
      logger.warn({ tenantId }, 'Formato de tenantId inválido');
      throw new WhatsAppQRServiceError(
        'tenantId deve ser um UUID válido',
        ErrorCodes.INVALID_TENANT,
        400
      );
    }

    // Adicionar ao request para uso posterior
    (req as any).tenantId = tenantId;

    next();

  } catch (error) {
    next(error);
  }
}

/**
 * Middleware que garante que tenantId está presente
 */
export function requireTenantId(req: Request, res: Response, next: NextFunction): void {
  const tenantId = (req as any).tenantId || req.body?.tenantId || req.params?.tenantId;

  if (!tenantId) {
    throw new WhatsAppQRServiceError(
      'tenantId é obrigatório',
      ErrorCodes.INVALID_TENANT,
      400
    );
  }

  next();
}
