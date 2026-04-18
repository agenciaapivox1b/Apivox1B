// ============================================
// SERVER ENTRY POINT
// 
// Inicializa o servidor Express + WebSocket
// ============================================

import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

import { logger } from './utils/logger';
import { initializeWebSocket, closeAllConnections } from './services/websocketService';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { validateApiKey } from './middleware/auth';
import { extractTenantId } from './middleware/tenant';

// Rotas
import sessionsRouter from './routes/sessions';
import qrRouter from './routes/qr';
import statusRouter from './routes/status';
import messagesRouter from './routes/messages';

// Configuração
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

// Criar app Express
const app = express();
const server = createServer(app);

// ============================================
// MIDDLEWARES GLOBAIS
// ============================================

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Tenant-Id']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Tenant extraction
app.use(extractTenantId);

// Rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente mais tarde.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting em desenvolvimento
  skip: () => NODE_ENV === 'development'
});
app.use(limiter);

// ============================================
// HEALTH CHECK (público)
// ============================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'whatsapp-qr-service',
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// API ROUTES (protegidas por API Key)
// ============================================

// Todas as rotas da API requerem API Key
app.use('/api', validateApiKey);

// Sessions
app.use('/api/sessions', sessionsRouter);

// QR Code
app.use('/api/qr', qrRouter);

// Status
app.use('/api/status', statusRouter);

// Messages
app.use('/api/messages', messagesRouter);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

async function startServer(): Promise<void> {
  try {
    // Verificar variáveis obrigatórias
    const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'REDIS_URL'];
    const missing = requiredEnv.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      logger.error({ missing }, 'Variáveis de ambiente obrigatórias faltando');
      process.exit(1);
    }

    // Inicializar WebSocket
    initializeWebSocket(server);

    // Iniciar servidor HTTP
    server.listen(PORT, () => {
      logger.info({
        port: PORT,
        env: NODE_ENV,
        rateLimitWindow: RATE_LIMIT_WINDOW,
        rateLimitMax: RATE_LIMIT_MAX
      }, 'WhatsApp QR Service iniciado');
    });

  } catch (error) {
    logger.error({ error }, 'Erro ao iniciar servidor');
    process.exit(1);
  }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

function gracefulShutdown(signal: string): void {
  logger.info({ signal }, 'Iniciando shutdown gracioso...');

  // Fechar conexões WebSocket
  closeAllConnections();

  // Fechar servidor HTTP
  server.close(() => {
    logger.info('Servidor HTTP fechado');
    process.exit(0);
  });

  // Timeout de segurança
  setTimeout(() => {
    logger.error('Forçando shutdown após timeout');
    process.exit(1);
  }, 30000);
}

// Handlers de sinais
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handlers de erros não tratados
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
});

// Iniciar
startServer();
