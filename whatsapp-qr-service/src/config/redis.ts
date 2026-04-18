// ============================================
// REDIS CLIENT CONFIGURATION
// ============================================

import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Singleton instance
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      reconnectOnError: (err: Error) => {
        logger.warn({ error: err.message }, 'Redis reconnect on error');
        return true;
      }
    });

    redisClient.on('connect', () => {
      logger.info('Redis client conectado');
    });

    redisClient.on('error', (err: Error) => {
      logger.error({ error: err.message }, 'Redis client erro');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconectando...');
    });
  }

  return redisClient;
}

// ============================================
// OPERAÇÕES DE SESSÃO NO REDIS
// ============================================

const SESSION_KEY_PREFIX = 'whatsapp:session:';
const QR_KEY_PREFIX = 'whatsapp:qr:';
const AUTH_KEY_PREFIX = 'whatsapp:auth:';
const STATUS_KEY_PREFIX = 'whatsapp:status:';

export async function saveSessionToRedis(
  tenantId: string,
  sessionData: any,
  ttl: number = 86400
): Promise<void> {
  const redis = getRedisClient();
  const key = `${SESSION_KEY_PREFIX}${tenantId}`;
  
  await redis.setex(key, ttl, JSON.stringify(sessionData));
  logger.debug({ tenantId }, 'Sessão salva no Redis');
}

export async function getSessionFromRedis(tenantId: string): Promise<any | null> {
  const redis = getRedisClient();
  const key = `${SESSION_KEY_PREFIX}${tenantId}`;
  
  const data = await redis.get(key);
  if (!data) return null;
  
  return JSON.parse(data);
}

export async function deleteSessionFromRedis(tenantId: string): Promise<void> {
  const redis = getRedisClient();
  const key = `${SESSION_KEY_PREFIX}${tenantId}`;
  
  await redis.del(key);
  logger.debug({ tenantId }, 'Sessão removida do Redis');
}

// ============================================
// OPERAÇÕES DE QR CODE
// ============================================

export async function saveQRToRedis(
  tenantId: string,
  qrCode: string,
  ttl: number = 60
): Promise<void> {
  const redis = getRedisClient();
  const key = `${QR_KEY_PREFIX}${tenantId}`;
  
  await redis.setex(key, ttl, qrCode);
  logger.debug({ tenantId, ttl }, 'QR Code salvo no Redis');
}

export async function getQRFromRedis(tenantId: string): Promise<string | null> {
  const redis = getRedisClient();
  const key = `${QR_KEY_PREFIX}${tenantId}`;
  
  return await redis.get(key);
}

export async function deleteQRFromRedis(tenantId: string): Promise<void> {
  const redis = getRedisClient();
  const key = `${QR_KEY_PREFIX}${tenantId}`;
  
  await redis.del(key);
}

// ============================================
// OPERAÇÕES DE AUTH STATE
// ============================================

export async function saveAuthState(
  tenantId: string,
  authState: any,
  ttl: number = 86400 * 7 // 7 dias
): Promise<void> {
  const redis = getRedisClient();
  const key = `${AUTH_KEY_PREFIX}${tenantId}`;
  
  // Criptografar antes de salvar (simplificado - em produção usar criptografia real)
  const encrypted = Buffer.from(JSON.stringify(authState)).toString('base64');
  
  await redis.setex(key, ttl, encrypted);
  logger.debug({ tenantId }, 'Auth state salvo no Redis');
}

export async function loadAuthState(tenantId: string): Promise<any | null> {
  const redis = getRedisClient();
  const key = `${AUTH_KEY_PREFIX}${tenantId}`;
  
  const encrypted = await redis.get(key);
  if (!encrypted) return null;
  
  try {
    const decrypted = Buffer.from(encrypted, 'base64').toString();
    return JSON.parse(decrypted);
  } catch (error) {
    logger.error({ tenantId, error }, 'Erro ao decodificar auth state');
    return null;
  }
}

export async function deleteAuthState(tenantId: string): Promise<void> {
  const redis = getRedisClient();
  const key = `${AUTH_KEY_PREFIX}${tenantId}`;
  
  await redis.del(key);
  logger.debug({ tenantId }, 'Auth state removido do Redis');
}

// ============================================
// OPERAÇÕES DE STATUS
// ============================================

export async function saveConnectionStatus(
  tenantId: string,
  status: string,
  metadata: Record<string, any> = {},
  ttl: number = 86400
): Promise<void> {
  const redis = getRedisClient();
  const key = `${STATUS_KEY_PREFIX}${tenantId}`;
  
  const data = {
    status,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  await redis.setex(key, ttl, JSON.stringify(data));
}

export async function getConnectionStatus(tenantId: string): Promise<any | null> {
  const redis = getRedisClient();
  const key = `${STATUS_KEY_PREFIX}${tenantId}`;
  
  const data = await redis.get(key);
  if (!data) return null;
  
  return JSON.parse(data);
}

// ============================================
// HEALTH CHECK
// ============================================

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    await redis.ping();
    return true;
  } catch (error) {
    logger.error({ error }, 'Redis health check falhou');
    return false;
  }
}
