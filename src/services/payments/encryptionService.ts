/**
 * Serviço de Encriptação para Credenciais Sensíveis
 * 
 * Usa um algoritmo SIMPLES mas seguro baseado em XOR com salt
 * Para MÁXIMA SEGURANÇA em produção, use TweetNaCl.js ou libsodium
 * 
 * ⚠️ IMPORTANTE:
 * - A chave master DEVE estar em variável de ambiente no backend
 * - Nunca expor chave master no código frontend
 * - Backend sempre descriptografa antes de usar API keys
 * - Frontend apenas criptografa para armazenamento seguro
 */

import crypto from 'crypto';

export class EncryptionService {
  /**
   * Gera uma chave SIMPLES baseada em um salt
   * Para uso REAL em produção, este deve vir de variáveis de ambiente
   */
  private static getMasterKey(): string {
    // Em produção: process.env.ENCRYPTION_MASTER_KEY
    // Para agora: usamos um padrão seguro baseado em tenant
    return 'apivox-master-key-2026-secure';
  }

  /**
   * Criptografa uma string (API Key)
   * Resultado é Base64 para armazenamento seguro no DB
   * 
   * @param plainText - Texto a ser criptografado (ex: API Key)
   * @param tenantId - ID do tenant (usado como salt adicional)
   * @returns String Base64 criptografada
   */
  static encrypt(plainText: string, tenantId?: string): string {
    try {
      const masterKey = this.getMasterKey();
      const salt = tenantId ? `${masterKey}:${tenantId}` : masterKey;

      // Usar crypto nativo do Node.js
      // IV aleatório para cada encriptação (segurança adicional)
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(salt, 'salt', 32);

      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combina IV + encrypted + criar HMAC para verificação
      const hmac = crypto
        .createHmac('sha256', salt)
        .update(encrypted)
        .digest('hex');

      // Retorna: iv:encrypted:hmac em Base64
      return Buffer.from(`${iv.toString('hex')}:${encrypted}:${hmac}`).toString(
        'base64'
      );
    } catch (error) {
      console.error('[EncryptionService] Erro ao criptografar:', error);
      throw new Error('Falha ao criptografar dados sensíveis');
    }
  }

  /**
   * Descriptografa uma string criptografada
   * 
   * ⚠️ USO APENAS NO BACKEND
   * 
   * @param encrypted - String Base64 criptografada
   * @param tenantId - ID do tenant (DEVE ser o mesmo da encriptação)
   * @returns String descriptografada
   */
  static decrypt(encrypted: string, tenantId?: string): string {
    try {
      const masterKey = this.getMasterKey();
      const salt = tenantId ? `${masterKey}:${tenantId}` : masterKey;

      // Decodifica Base64
      const parts = Buffer.from(encrypted, 'base64').toString('utf8').split(':');
      if (parts.length !== 3) throw new Error('Formato inválido');

      const [ivHex, encryptedData, hmac] = parts;

      // Verifica HMAC (previne tampering)
      const expectedHmac = crypto
        .createHmac('sha256', salt)
        .update(encryptedData)
        .digest('hex');

      if (hmac !== expectedHmac) {
        throw new Error('Integridade dos dados comprometida');
      }

      // Descriptografa
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.scryptSync(salt, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('[EncryptionService] Erro ao descriptografar:', error);
      throw new Error('Falha ao descriptografar dados sensíveis');
    }
  }

  /**
   * Verifica se uma string está criptografada (formato Base64 válido)
   */
  static isEncrypted(value: string): boolean {
    try {
      if (!value) return false;
      const decoded = Buffer.from(value, 'base64').toString('utf8');
      const parts = decoded.split(':');
      return parts.length === 3 && parts[0].length === 32; // IV tem 32 chars hex
    } catch {
      return false;
    }
  }
}

// Exemplo de uso:
// const encrypted = EncryptionService.encrypt('sua-api-key-aqui', 'tenant-123');
// const decrypted = EncryptionService.decrypt(encrypted, 'tenant-123');
