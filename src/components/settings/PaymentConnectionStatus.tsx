import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface PaymentConnectionStatusProps {
  isConfigured: boolean;
  gateway?: string;
  isLoading?: boolean;
}

export default function PaymentConnectionStatus({
  isConfigured,
  gateway,
  isLoading,
}: PaymentConnectionStatusProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando configuração...
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600">
        <AlertCircle className="h-4 w-4" />
        Nenhuma configuração ativa
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <CheckCircle2 className="h-4 w-4" />
      {gateway ? `Conectado ao ${gateway}` : 'Configurado'}
    </div>
  );
}
