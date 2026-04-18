// Componente simplificado - não mostra nada por enquanto
// Será ativado após verificar que não há erros

interface FollowUpBadgeProps {
  contactId?: string;
  className?: string;
}

export function FollowUpBadge({ contactId, className = '' }: FollowUpBadgeProps) {
  // Retorna null enquanto testamos
  return null;
}

export default FollowUpBadge;
