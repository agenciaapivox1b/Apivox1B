// ============================================
// PHONE NUMBER FORMATTER
// ============================================

/**
 * Formata número de telefone para formato internacional
 * Remove @s.whatsapp.net ou @c.us se presente
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remover sufixos do WhatsApp
  let cleaned = phone
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace(/\D/g, ''); // Remover tudo que não é dígito

  // Se começa com 55 (Brasil) e tem 13 dígitos, está no formato correto
  if (cleaned.startsWith('55') && cleaned.length === 13) {
    return cleaned;
  }

  // Se começa com 55 mas tem 12 dígitos, pode estar faltando o 9
  if (cleaned.startsWith('55') && cleaned.length === 12) {
    // Adicionar 9 após o DDD se for celular
    const ddd = cleaned.slice(2, 4);
    const number = cleaned.slice(4);
    
    // Celulares no Brasil começam com 9
    if (!number.startsWith('9') && number.length === 8) {
      cleaned = `55${ddd}9${number}`;
    }
    return cleaned;
  }

  // Se não começa com 55, adicionar
  if (!cleaned.startsWith('55')) {
    // Assumir que é número brasileiro
    cleaned = '55' + cleaned;
  }

  return cleaned;
}

/**
 * Formata número para exibição (com + e espaços)
 * +55 11 99999-9999
 */
export function formatPhoneForDisplay(phone: string): string {
  const cleaned = formatPhoneNumber(phone);
  
  if (cleaned.length === 13) {
    // +55 11 99999-9999
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  
  if (cleaned.length === 12) {
    // +55 11 9999-9999
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }

  return cleaned;
}

/**
 * Verifica se é um número válido
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = formatPhoneNumber(phone);
  
  // Brasil: deve ter 13 dígitos (55 + DDD + 9 + número)
  // ou 12 dígitos (55 + DDD + número sem 9)
  return cleaned.length >= 12 && cleaned.length <= 13;
}

/**
 * Extrai DDD do número
 */
export function extractDDD(phone: string): string {
  const cleaned = formatPhoneNumber(phone);
  
  if (cleaned.startsWith('55') && cleaned.length >= 4) {
    return cleaned.slice(2, 4);
  }
  
  return '';
}
