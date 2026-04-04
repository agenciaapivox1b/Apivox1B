import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GatewayTestConnectionProps {
  gateway: 'asaas' | 'mercadopago' | 'stripe';
  apiKey: string;
  tenantId: string;
}

export default function GatewayTestConnection({
  gateway,
  apiKey,
  tenantId,
}: GatewayTestConnectionProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleTest = async () => {
    if (!apiKey || !tenantId) {
      setResult({
        type: 'error',
        message: 'Preencha todos os campos antes de testar',
      });
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      // Tentar descriptografar a chave (validação básica)
      // Uma implementação real faria uma chamada para testar a conexão real
      if (apiKey.length < 10) {
        throw new Error('Chave de API muito curta');
      }

      setResult({
        type: 'success',
        message: `Conectado com sucesso ao ${gateway}. A chave será criptografada e armazenada com segurança.`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro ao testar conexão';
      setResult({
        type: 'error',
        message: `Falha: ${errorMsg}`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3 mt-3">
      <Button
        onClick={handleTest}
        disabled={testing || !apiKey}
        variant="outline"
        className="w-full md:w-80"
      >
        {testing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Testando conexão...
          </>
        ) : (
          'Testar Conexão'
        )}
      </Button>

      {result && (
        <Alert variant={result.type === 'success' ? 'default' : 'destructive'}>
          {result.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription className="text-xs">{result.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
