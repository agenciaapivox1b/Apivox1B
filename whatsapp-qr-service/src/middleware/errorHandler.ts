// ============================================
// ERROR HANDLER MIDDLEWARE
// 
// Trata todos os erros da aplicação
// ============================================

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { WhatsAppQRServiceError } from '../types';

interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
}

/**
 * Middleware central de tratamento de erros
 */
export function errorHandler(
  err: Error | WhatsAppQRServiceError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Determinar status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let errorMessage = 'Erro interno do servidor';

  if (err instanceof WhatsAppQRServiceError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    errorMessage = err.message;
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    // Erro de parsing JSON
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    errorMessage = 'JSON inválido no body da requisição';
  } else if (err.message?.includes('ENOTFOUND') || err.message?.includes('ECONNREFUSED')) {
    // Erros de conexão
    statusCode = 503;
    errorCode = 'SERVICE_UNAVAILABLE';
    errorMessage = 'Serviço temporariamente indisponível';
  }

  // Log do erro
  logger.error({
    error: err.message,
    code: errorCode,
    statusCode,
    path: req.path,
    method: req.method,
    tenantId: req.body?.tenantId || req.params?.tenantId,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  }, `Erro ${statusCode}: ${errorMessage}`);

  // Resposta padronizada
  const response: ErrorResponse = {
    success: false,
    error: errorMessage,
    code: errorCode,
    timestamp: new Date().toISOString()
  };

  // Adicionar stack em desenvolvimento
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.details = { stack: err.stack };
  }

  res.status(statusCode).json(response);
}

/**
 * Handler para rotas não encontradas (404)
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn({ path: req.path, method: req.method }, 'Rota não encontrada');
  
  res.status(404).json({
    success: false,
    error: `Rota ${req.method} ${req.path} não encontrada`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
}
