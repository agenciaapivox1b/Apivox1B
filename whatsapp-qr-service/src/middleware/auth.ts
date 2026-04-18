// ============================================
// AUTH MIDDLEWARE
// 
// Valida API Key em todas as requisições
// ============================================

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { WhatsAppQRServiceError, ErrorCodes } from '../types';

// API Key do ambiente
const API_KEY = process.env.API_KEY;

/**
 * Middleware para validar API Key
 * Espera header: X-API-Key
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  try {
    // Skip em desenvolvimento se não tiver API_KEY configurada
    if (process.env.NODE_ENV === 'development' && !API_KEY) {
      logger.warn('API_KEY não configurada, pulando validação em desenvolvimento');
      return next();
    }

    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];

    if (!apiKey) {
      throw new WhatsAppQRServiceError(
        'API Key é obrigatória (header: X-API-Key)',
        ErrorCodes.AUTH_FAILED,
        401
      );
    }

    if (apiKey !== API_KEY) {
      throw new WhatsAppQRServiceError(
        'API Key inválida',
        ErrorCodes.AUTH_FAILED,
        401
      );
    }

    next();

  } catch (error) {
    next(error);
  }
}

/**
 * Middleware opcional para validar JWT (futuro)
 */
export function validateJWT(req: Request, res: Response, next: NextFunction): void {
  // Implementação futura para JWT
  next();
}
