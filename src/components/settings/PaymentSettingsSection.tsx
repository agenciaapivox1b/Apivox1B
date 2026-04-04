import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { tenantPaymentSettingsService } from '@/services/payments/tenantPaymentSettingsService';
import PaymentConnectionStatus from './PaymentConnectionStatus';
import GatewayTestConnection from './GatewayTestConnection';

interface PaymentSettingsProps {
  tenantId: string;
}

type GatewayName = 'asaas' | 'mercadopago' | 'stripe';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export default function PaymentSettingsSection({ tenantId }: PaymentSettingsProps) {
  const [gatewayName, setGatewayName] = useState<GatewayName>('asaas');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [hasSavedEncryptedKey, setHasSavedEncryptedKey] = useState(false);
  const [hasTypedNewApiKey, setHasTypedNewApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [tenantId]);

  const loadSettings = async () => {
    setLoadingData(true);

    try {
      console.log('[PaymentSettingsSection] tenantId recebido:', tenantId);

      if (!tenantId || !isUuid(tenantId)) {
        console.warn('[PaymentSettingsSection] tenantId inválido para cobrança:', tenantId);
        setHasSavedConfig(false);
        setHasSavedEncryptedKey(false);
        setHasTypedNewApiKey(false);
        setApiKey('');
        return;
      }

      const settings = await tenantPaymentSettingsService.getByTenantId(tenantId);

      if (settings) {
        setGatewayName((settings.gateway_name as GatewayName) || 'asaas');
        setApiKey('');
        setHasSavedConfig(true);
        setHasSavedEncryptedKey(!!settings.encrypted_api_key);
        setHasTypedNewApiKey(false);
      } else {
        setHasSavedConfig(false);
        setHasSavedEncryptedKey(false);
        setHasTypedNewApiKey(false);
        setApiKey('');
      }
    } catch (error) {
      console.error('[PaymentSettingsSection] Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações de cobrança');
      setHasSavedConfig(false);
      setHasSavedEncryptedKey(false);
      setHasTypedNewApiKey(false);
    } finally {
      setLoadingData(false);
    }
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setHasTypedNewApiKey(value.trim().length > 0);
  };

  const handleSave = async () => {
    console.log('=== HANDLE SAVE ===');
    console.log('tenantId:', tenantId);
    console.log('gatewayName:', gatewayName);
    console.log('apiKey preenchida:', !!apiKey.trim());

    setLoading(true);

    try {
      if (!tenantId) {
        toast.error('tenantId não encontrado');
        setLoading(false);
        return;
      }

      if (!isUuid(tenantId)) {
        toast.error('tenantId inválido. Você ainda está em modo mock/teste.');
        setLoading(false);
        return;
      }

      const alreadyConfigured = hasSavedEncryptedKey && !hasTypedNewApiKey;

      if (!alreadyConfigured && !apiKey.trim()) {
        toast.error('Chave de API é obrigatória para gateway');
        setLoading(false);
        return;
      }

      const result = await tenantPaymentSettingsService.save({
        tenantId,
        chargeMode: 'gateway',
        gatewayName,
        apiKey: hasTypedNewApiKey ? apiKey : undefined,
      });

      console.log('resultado save:', result);

      if (result.success) {
        toast.success('Configurações de cobrança salvas com sucesso!');
        setHasSavedConfig(true);
        setHasSavedEncryptedKey(true);
        setHasTypedNewApiKey(false);
        setApiKey('');

        await loadSettings();
      } else {
        toast.error(result.error || 'Erro ao salvar configurações');
      }
    } catch (error: any) {
      console.error('[PaymentSettingsSection] Erro no handleSave:', error);
      toast.error(error?.message || 'Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isTenantValid = !!tenantId && isUuid(tenantId);
  const isConfigured = hasSavedEncryptedKey || !!apiKey.trim();
  const shouldShowGatewayTest = isTenantValid && hasTypedNewApiKey && !!apiKey.trim();

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Cobranças
            </CardTitle>
            <CardDescription>
              Configure como deseja processar os pagamentos. O dinheiro cai direto na sua conta.
            </CardDescription>
          </div>

          <PaymentConnectionStatus
            isConfigured={!!isConfigured}
            gateway={gatewayName}
            isLoading={loadingData}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isTenantValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Este tenant está em modo mock/teste ou sem UUID válido. A configuração não será salva
              no banco até usar um tenant real.
            </AlertDescription>
          </Alert>
        )}

        <Alert className="bg-blue-50 border-blue-200 text-blue-900">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            A APIVOX é a camada de automação. O dinheiro vai direto para sua conta, não para a APIVOX.
            Configure sua própria credencial de gateway.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Tipo de Cobrança</Label>

          <div className="flex items-center space-x-3 rounded-md border p-3 bg-muted/30">
            <div className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>

            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Gateway de Pagamento</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Integração automática com seu próprio gateway (Asaas, Mercado Pago, Stripe)
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="gatewayName" className="text-sm font-semibold">
              Selecione o Gateway
            </Label>

            <Select value={gatewayName} onValueChange={(value: GatewayName) => setGatewayName(value)}>
              <SelectTrigger id="gatewayName" className="w-full md:w-80">
                <SelectValue placeholder="Selecione um gateway" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asaas">Asaas</SelectItem>
                <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
              </SelectContent>
            </Select>

            <p className="text-xs text-muted-foreground">
              Cada gateway permite diferentes métodos de pagamento.
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="apiKey" className="text-sm font-semibold">
              API Key / Token de Acesso
            </Label>

            <Input
              id="apiKey"
              type="password"
              placeholder={
                hasSavedEncryptedKey
                  ? `Já existe uma chave salva para ${gatewayName}. Digite uma nova somente se quiser substituir.`
                  : `Cole sua chave do ${gatewayName}`
              }
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              className="w-full md:w-80"
            />

            {hasSavedEncryptedKey && !hasTypedNewApiKey && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>Já existe uma chave configurada para este tenant.</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Sua chave é criptografada e armazenada com segurança no backend.
              Apenas você e o sistema de automação têm acesso.
            </p>
          </div>

          {shouldShowGatewayTest && (
            <GatewayTestConnection gateway={gatewayName} apiKey={apiKey} tenantId={tenantId} />
          )}
        </div>

        <Separator />

        <Alert className="bg-amber-50 border-amber-200 text-amber-900">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Próximas fases:</strong> rastreamento automático de webhooks, histórico detalhado
            e configurações por tipo de cobrança.
          </AlertDescription>
        </Alert>

        <Button onClick={handleSave} disabled={loading || !isTenantValid} className="min-w-32">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}