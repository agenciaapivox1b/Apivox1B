// =====================================================
// PROVIDERS WHATSAPP - INDEX
// 
// Exporta todos os providers e tipos
// =====================================================

export {
  BaseWhatsAppProvider,
  WhatsAppProviderFactory,
  type WhatsAppProviderType,
  type ConnectionStatus,
  type UnifiedMessage,
  type SendMessageResult,
  type UnifiedWhatsAppConfig,
} from './BaseWhatsAppProvider';

export { WhatsAppMetaProvider } from './WhatsAppMetaProvider';

// QR Code Provider - Fase A (estrutura pronta)
export { WhatsAppQRProvider, type QRSessionStatus } from './WhatsAppQRProvider';

