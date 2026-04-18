import { useEffect } from 'react';

export function useAutoFollowUp() {
  useEffect(() => {
    console.log('[AutoFollowUp] Hook mounted - simplified version');
    
    // Versão simplificada - apenas log por enquanto
    // A versão completa será ativada após verificar que não há erros
    
    return () => {
      console.log('[AutoFollowUp] Hook unmounted');
    };
  }, []);
}

export default useAutoFollowUp;
