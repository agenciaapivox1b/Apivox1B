// =====================================================
// FEATURE FLAGS - APIVOX
// 
// Controle de funcionalidades para ativar/desativar
// sem remover código do projeto
// =====================================================

/**
 * ⚙️ CONFIGURAÇÃO DE FEATURES
 * 
 * Para ativar uma feature, mude para `true`
 * Para desativar, mantenha `false`
 */
export const FEATURE_FLAGS = {
  /**
   * 🔐 WhatsApp QR Code Provider
   * 
   * ATIVADO (true): Mostra seleção entre Meta API e QR Code no dashboard
   * DESATIVADO (false): Mostra apenas Meta Cloud API (padrão para produção)
   * 
   * Para reativar no futuro:
   * 1. Altere para `true`
   * 2. A interface mostrará automaticamente o seletor de providers
   * 3. Todo o código QR continua funcional
   */
  WHATSAPP_QR_PROVIDER: false,

  /**
   * 🧪 Modo Debug
   * Mostra logs extras e ferramentas de desenvolvimento
   */
  DEBUG_MODE: import.meta.env.DEV,

  /**
   * 📊 Analytics
   * Coleta métricas de uso (desativado por padrão)
   */
  ANALYTICS: false,
} as const;

/**
 * 📝 COMO REATIVAR QR CODE NO FUTURO:
 * 
 * 1. Abra este arquivo: src/config/featureFlags.ts
 * 2. Altere `WHATSAPP_QR_PROVIDER: false` para `WHATSAPP_QR_PROVIDER: true`
 * 3. Recarregue a aplicação
 * 4. O dashboard mostrará automaticamente:
 *    - Seletor entre Meta API e QR Code
 *    - Painel QR com todos os botões e funcionalidades
 *    - Toda a arquitetura permanece intacta
 * 
 * ✅ CÓDIGO PRESERVADO:
 * - WhatsAppQRProvider (src/providers/whatsapp/WhatsAppQRProvider.ts)
 * - QRCodePanel (src/components/settings/WhatsAppConnect.tsx)
 * - ProviderSelector (src/components/settings/ProviderSelector.tsx)
 * - Tabelas do Supabase (whatsapp_qr_sessions)
 * - Serviço Node.js (whatsapp-qr-service/)
 */
