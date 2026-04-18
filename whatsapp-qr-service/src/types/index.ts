// ============================================
// TIPOS DO SERVIÇO WHATSAPP QR
// ============================================

import { WASocket } from '@whiskeysockets/baileys';

// ============================================
// SESSÃO E CONEXÃO
// ============================================

export type ConnectionStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'awaiting_qr' 
  | 'qr_scanned' 
  | 'connected' 
  | 'error';

export interface SessionData {
  tenantId: string;
  sessionId: string;
  socket: WASocket;
  status: ConnectionStatus;
  qrCode: string | null;
  qrExpiresAt: Date | null;
  connectedPhone: string | null;
  connectedAt: Date | null;
  lastActivity: Date;
  reconnectAttempts: number;
  authState: any;
}

export interface CreateSessionRequest {
  tenantId: string;
  phoneNumber?: string;
}

export interface CreateSessionResponse {
  success: boolean;
  sessionId: string;
  status: ConnectionStatus;
  qrExpiresIn: number;
  error?: string;
}

export interface SessionStatusResponse {
  success: boolean;
  status: ConnectionStatus;
  sessionId: string;
  connectedPhone: string | null;
  connectedAt: Date | null;
  lastActivity: Date;
  hasQR: boolean;
  error?: string;
}

// ============================================
// QR CODE
// ============================================

export interface QRCodeResponse {
  success: boolean;
  qrCode: string | null;
  qrBase64: string | null;
  expiresAt: Date | null;
  status: ConnectionStatus;
  error?: string;
}

// ============================================
// MENSAGENS
// ============================================

export interface SendMessageRequest {
  tenantId: string;
  to: string;
  message: string;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  timestamp?: Date;
  error?: string;
}

export interface IncomingMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document';
  hasMedia: boolean;
  mediaUrl?: string;
}

// ============================================
// SUPABASE INTEGRATION
// ============================================

export interface ContactRecord {
  id: string;
  tenant_id: string;
  phone: string;
  name: string | null;
  profile_picture: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationRecord {
  id: string;
  tenant_id: string;
  contact_id: string;
  channel: string;
  status: string;
  assigned_to: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRecord {
  id: string;
  tenant_id: string;
  conversation_id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  channel: string;
  provider: string;
  provider_message_id: string;
  status: string;
  created_at: string;
}

export interface QRSessionRecord {
  id: string;
  tenant_id: string;
  session_id: string;
  provider_type: string;
  connection_status: string;
  current_qr_code: string | null;
  connected_phone: string | null;
  connected_phone_formatted: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  last_activity_at: string;
  messages_sent: number;
  messages_received: number;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// WEBSOCKET EVENTS
// ============================================

export interface WebSocketEvent {
  type: 'qr' | 'connected' | 'disconnected' | 'message' | 'error' | 'status';
  tenantId: string;
  timestamp: Date;
  payload: any;
}

export interface QRUpdateEvent {
  qrCode: string;
  expiresAt: Date;
}

export interface ConnectionUpdateEvent {
  status: ConnectionStatus;
  phone?: string;
  message?: string;
}

export interface MessageEvent {
  message: IncomingMessage;
  contact: ContactRecord;
  conversation: ConversationRecord;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  apiKey: string;
  jwtSecret: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  redisUrl: string;
  sessionTtl: number;
  qrTimeout: number;
  reconnectInterval: number;
  logLevel: string;
  wsHeartbeatInterval: number;
  wsPingTimeout: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

// ============================================
// ERROS
// ============================================

export class WhatsAppQRServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'WhatsAppQRServiceError';
  }
}

export enum ErrorCodes {
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_ALREADY_EXISTS = 'SESSION_ALREADY_EXISTS',
  QR_NOT_AVAILABLE = 'QR_NOT_AVAILABLE',
  NOT_CONNECTED = 'NOT_CONNECTED',
  SEND_MESSAGE_FAILED = 'SEND_MESSAGE_FAILED',
  INVALID_TENANT = 'INVALID_TENANT',
  AUTH_FAILED = 'AUTH_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUPABASE_ERROR = 'SUPABASE_ERROR',
  BAILEYS_ERROR = 'BAILEYS_ERROR'
}
