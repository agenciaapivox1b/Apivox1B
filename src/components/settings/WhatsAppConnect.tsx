import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Copy, MessageSquare, ExternalLink, AlertCircle, Settings, TestTube, Shield, Clock, ArrowRight, Key, Webhook, Zap, QrCode, Cloud, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { whatsappService, type WhatsAppSettings } from '@/services/whatsappService';
import { TenantService } from '@/services/tenantService';
import { FEATURE_FLAGS } from '@/config/featureFlags';

// QR Code imports - mantidos para uso futuro quando reativado
import { WhatsAppQRProvider, type QRSessionStatus } from '@/providers/whatsapp';
import { ProviderSelector } from './ProviderSelector';

type WhatsAppProviderType = 'whatsapp_meta' | 'whatsapp_qr';

interface WhatsAppConnectProps {
  tenantId?: string;
}

export default function WhatsAppConnect({ tenantId }: WhatsAppConnectProps) {
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState<string>('');
  const [tenantError, setTenantError] = useState<string | null>(null);
  
  // Provider state - apenas Meta API ativo em produção
  // QR mantido no código para uso futuro (ver FEATURE_FLAGS.ts)
  const [selectedProvider, setSelectedProvider] = useState<WhatsAppProviderType>('whatsapp_meta');
  const [qrProvider] = useState(() => new WhatsAppQRProvider(currentTenantId || 'temp'));
  const [qrStatus, setQrStatus] = useState<QRSessionStatus | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    phone_number_id: '',
    access_token: '',
    verify_token: '',
  });

  useEffect(() => {
    loadTenantAndSettings();
  }, [tenantId]);

  const loadTenantAndSettings = async () => {
    try {
      setLoading(true);
      setTenantError(null);
      
      try {
        const tenantId = await TenantService.getCurrentTenantId();
        setCurrentTenantId(tenantId);
        await loadSettings(tenantId);
      } catch (tenantErr: any) {
        console.warn('Tenant ainda não configurado:', tenantErr.message);
        setTenantError(tenantErr.message || 'Espaço de trabalho precisa ser validado');
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
      toast.error(error.message || 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async (tenantIdToUse?: string) => {
    try {
      const id = tenantIdToUse || currentTenantId;
      if (!id) return;
      
      const data = await whatsappService.getSettings(id);
      setSettings(data);
      
      if (data) {
        setFormData({
          phone_number_id: data.phone_number_id || '',
          access_token: '',
          verify_token: data.verify_token || '',
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações do WhatsApp:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const id = tenantId || currentTenantId;
      if (!id) {
        toast.error('❌ Espaço de trabalho não disponível');
        return;
      }

      const result = await whatsappService.saveSettings(id, {
        phone_number_id: formData.phone_number_id,
        encrypted_access_token: formData.access_token,
        verify_token: formData.verify_token,
        webhook_status: 'inactive',
      });

      if (result.success) {
        toast.success('✅ Configurações do WhatsApp salvas com sucesso!');
        await loadSettings(id);
      } else {
        toast.error('❌ Erro ao salvar: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (error: any) {
      toast.error('❌ Erro ao salvar configurações: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.phone_number_id || !formData.access_token || !formData.verify_token) {
      toast.error('Preencha todos os campos obrigatórios antes de testar');
      return;
    }

    try {
      setTesting(true);
      const id = tenantId || currentTenantId;
      if (!id) {
        toast.error('❌ Espaço de trabalho não disponível');
        return;
      }

      const result = await whatsappService.testConnection(id);
      
      if (result.success) {
        toast.success('✅ ' + result.message);
      } else {
        toast.error('❌ ' + result.message);
      }
      
      await loadSettings(id);
    } catch (error: any) {
      toast.error('❌ Erro ao testar conexão: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setTesting(false);
    }
  };

  const canTestConnection = () => {
    return formData.phone_number_id && formData.access_token && formData.verify_token && !tenantError;
  };

  const copyWebhookUrl = () => {
    const webhookUrl = whatsappService.getWebhookUrl();
    navigator.clipboard.writeText(webhookUrl);
    toast.success('URL do webhook copiada!');
  };

  const getStatusBadge = () => {
    if (!settings) return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Não configurado</Badge>;
    
    if (settings.last_test_status === 'success') {
      return <Badge variant="default" className="bg-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Conectado</Badge>;
    } else if (settings.last_test_status === 'failed') {
      return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Erro</Badge>;
    } else {
      return <Badge variant="secondary" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />Não testado</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conectar WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {tenantError && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> {tenantError}. 
            Alguns recursos podem não funcionar até que isso seja resolvido.
          </AlertDescription>
        </Alert>
      )}

      {/* 
        📝 NOTA SOBRE QR CODE:
        
        O código do QR Code provider está 100% funcional e mantido no projeto.
        Para reativar a interface de QR Code no futuro:
        
        1. Abra: src/config/featureFlags.ts
        2. Altere: WHATSAPP_QR_PROVIDER: false → true
        3. Esta seção do ProviderSelector será exibida automaticamente
        
        ✅ Preservado:
        - WhatsAppQRProvider (providers/whatsapp/)
        - QRCodePanel (componente abaixo)
        - Serviço Node.js (whatsapp-qr-service/)
        - Tabelas do Supabase
      */}
      {FEATURE_FLAGS.WHATSAPP_QR_PROVIDER && (
        <ProviderSelector selectedProvider={selectedProvider} onSelect={setSelectedProvider} />
      )}

      {selectedProvider === 'whatsapp_meta' || !FEATURE_FLAGS.WHATSAPP_QR_PROVIDER ? (
        <MetaAPIPanel 
          settings={settings}
          formData={formData}
          setFormData={setFormData}
          saving={saving}
          testing={testing}
          tenantError={tenantError}
          onSave={handleSave}
          onTest={handleTestConnection}
          onCopyWebhook={copyWebhookUrl}
          canTest={canTestConnection()}
          getStatusBadge={getStatusBadge}
        />
      ) : (
        <QRCodePanel
          qrStatus={qrStatus}
          qrLoading={qrLoading}
          tenantId={currentTenantId}
          qrProvider={qrProvider}
          onStatusChange={setQrStatus}
          onLoadingChange={setQrLoading}
        />
      )}
    </div>
  );
}

// Componente para painel Meta API
interface MetaAPIPanelProps {
  settings: WhatsAppSettings | null;
  formData: { phone_number_id: string; access_token: string; verify_token: string; };
  setFormData: (data: any) => void;
  saving: boolean;
  testing: boolean;
  tenantError: string | null;
  onSave: () => void;
  onTest: () => void;
  onCopyWebhook: () => void;
  canTest: boolean;
  getStatusBadge: () => React.ReactNode;
}

function MetaAPIPanel({ settings, formData, setFormData, saving, testing, tenantError, onSave, onTest, onCopyWebhook, canTest, getStatusBadge }: MetaAPIPanelProps) {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <MessageSquare className="h-6 w-6 text-primary" />
                Conectar WhatsApp
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Conecte seu WhatsApp Business para enviar e receber mensagens automaticamente
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          {settings?.webhook_status === 'active' ? (
            <div className="text-center py-6">
              <div className="mb-4">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-green-600 mb-2">WhatsApp Conectado!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Seu WhatsApp está conectado e funcionando perfeitamente
              </p>
              <Button 
                variant="outline"
                onClick={() => window.open('https://business.facebook.com/whatsapp', '_blank')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Gerenciar no WhatsApp Business
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="mb-4">
                <Zap className="h-12 w-12 text-primary mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">Conecte seu WhatsApp</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Siga os passos abaixo para configurar a integração
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Passo a Passo - Configuração Rápida
          </CardTitle>
          <CardDescription>
            Siga estas etapas para conectar seu WhatsApp em 5 minutos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 border rounded-lg bg-blue-50">
              <div className="text-2xl mb-2">1️⃣</div>
              <Key className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <h4 className="font-semibold text-sm mb-1">Pegar dados na Meta</h4>
              <p className="text-xs text-muted-foreground">
                Acesse WhatsApp Business Manager e obtenha Phone ID, Token e Verify Token
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg bg-green-50">
              <div className="text-2xl mb-2">2️⃣</div>
              <MessageSquare className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <h4 className="font-semibold text-sm mb-1">Colar no APIVOX</h4>
              <p className="text-xs text-muted-foreground">
                Preencha os campos abaixo com suas credenciais
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg bg-yellow-50">
              <div className="text-2xl mb-2">3️⃣</div>
              <Copy className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <h4 className="font-semibold text-sm mb-1">Copiar webhook</h4>
              <p className="text-xs text-muted-foreground">
                Copie a URL do webhook fornecida abaixo
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg bg-orange-50">
              <div className="text-2xl mb-2">4️⃣</div>
              <Webhook className="h-6 w-6 mx-auto mb-2 text-orange-600" />
              <h4 className="font-semibold text-sm mb-1">Cadastrar webhook</h4>
              <p className="text-xs text-muted-foreground">
                Cole a URL no WhatsApp Business Manager
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg bg-purple-50">
              <div className="text-2xl mb-2">5️⃣</div>
              <TestTube className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <h4 className="font-semibold text-sm mb-1">Testar conexão</h4>
              <p className="text-xs text-muted-foreground">
                Use o botão de teste para validar tudo
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações da API</CardTitle>
          <CardDescription>
            Preencha com suas credenciais do WhatsApp Cloud API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone_number_id">
                Phone Number ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone_number_id"
                placeholder="1234567890123456"
                value={formData.phone_number_id}
                onChange={(e) => setFormData({ ...formData, phone_number_id: e.target.value })}
                disabled={!!tenantError}
              />
              <p className="text-xs text-muted-foreground">
                ID numérico do seu número no WhatsApp Business
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_token">
                Access Token <span className="text-red-500">*</span>
              </Label>
              <Input
                id="access_token"
                type="password"
                placeholder="EAAxxxx..."
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                disabled={!!tenantError}
              />
              <p className="text-xs text-muted-foreground">
                Token de acesso permanente do WhatsApp Business
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify_token">
                Verify Token <span className="text-red-500">*</span>
              </Label>
              <Input
                id="verify_token"
                placeholder="seu-token-seguro"
                value={formData.verify_token}
                onChange={(e) => setFormData({ ...formData, verify_token: e.target.value })}
                disabled={!!tenantError}
              />
              <p className="text-xs text-muted-foreground">
                Token de verificação para webhook (qualquer string segura)
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <Label className="text-sm font-medium mb-2 block">URL do Webhook</Label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={whatsappService.getWebhookUrl()}
                readOnly
                className="flex-1 px-3 py-2 bg-background border rounded-md text-sm font-mono"
              />
              <Button variant="outline" onClick={onCopyWebhook}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Copie esta URL e configure no WhatsApp Business Manager
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={onSave} 
              disabled={saving || !!tenantError}
              className="flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Cloud className="h-4 w-4" />
              Salvar Configurações
            </Button>

            <Button 
              variant="outline" 
              onClick={onTest}
              disabled={!canTest || testing}
              className="flex items-center gap-2"
            >
              {testing && <Loader2 className="h-4 w-4 animate-spin" />}
              <TestTube className="h-4 w-4" />
              Testar Conexão
            </Button>

            <Button 
              variant="secondary" 
              onClick={() => window.open('https://business.facebook.com/whatsapp', '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              WhatsApp Business
            </Button>
          </div>

          {tenantError && (
            <Alert className="mt-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> {tenantError}. 
                Para salvar as configurações do WhatsApp, primeiro resolva o problema do espaço de trabalho.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Status da Conexão</CardTitle>
          </CardHeader>
          <CardContent>
            {settings?.last_test_message && (
              <Alert>
                <AlertDescription>
                  <strong>Último teste:</strong> {settings.last_test_message}
                  {settings.last_test_at && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({new Date(settings.last_test_at).toLocaleString()})
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente para painel QR Code
interface QRCodePanelProps {
  qrStatus: QRSessionStatus | null;
  qrLoading: boolean;
  tenantId: string;
  qrProvider: WhatsAppQRProvider;
  onStatusChange: (status: QRSessionStatus | null) => void;
  onLoadingChange: (loading: boolean) => void;
}

function QRCodePanel({ qrStatus, qrLoading, tenantId, qrProvider, onStatusChange, onLoadingChange }: QRCodePanelProps) {
  return (
    <Card className="border-2 border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <QrCode className="h-6 w-6 text-purple-600" />
              Conectar via QR Code
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Escaneie o QR Code com seu WhatsApp para conectar
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            Em preparação
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-full">
              <Smartphone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-purple-900">Status da Conexão QR</h4>
              <p className="text-sm text-purple-700">
                {qrStatus?.status === 'connected' 
                  ? `Conectado: ${qrStatus.connectedPhone}` 
                  : qrStatus?.status === 'connecting'
                  ? 'Aguardando leitura do QR Code'
                  : 'Desconectado'}
              </p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          {qrStatus?.qrCode ? (
            <div className="space-y-2">
              <div className="inline-block p-4 bg-white rounded-lg border-2 border-purple-300 shadow-lg">
                <img 
                  src={qrStatus.qrCode} 
                  alt="QR Code WhatsApp" 
                  className="w-48 h-48"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Escaneie com seu WhatsApp → Configurações → WhatsApp Web
              </p>
              {qrStatus.qrExpiresAt && (
                <p className="text-xs text-amber-600">
                  Expira em: {Math.max(0, Math.floor((qrStatus.qrExpiresAt.getTime() - Date.now()) / 1000))} segundos
                </p>
              )}
            </div>
          ) : (
            <div className="p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <QrCode className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground">
                Clique em "Iniciar Conexão" para gerar o QR Code
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={async () => {
              onLoadingChange(true);
              const result = await qrProvider.startSession();
              if (result.success) {
                await qrProvider.generateQRCode();
                const status = await qrProvider.getQRSessionStatus();
                onStatusChange(status);
                toast.success('Sessão QR iniciada!');
              } else {
                toast.error('Erro ao iniciar sessão: ' + result.error);
              }
              onLoadingChange(false);
            }}
            disabled={qrLoading || !tenantId}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {qrLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <QrCode className="h-4 w-4 mr-2" />
            Iniciar Conexão
          </Button>

          <Button 
            variant="outline"
            onClick={async () => {
              const result = await qrProvider.generateQRCode();
              if (result.success) {
                const status = await qrProvider.getQRSessionStatus();
                onStatusChange(status);
                toast.success('QR Code atualizado!');
              }
            }}
            disabled={!qrStatus?.sessionId}
          >
            <Loader2 className="h-4 w-4 mr-2" />
            Atualizar QR
          </Button>

          <Button 
            variant="destructive"
            onClick={async () => {
              await qrProvider.disconnect();
              onStatusChange(null);
              toast.success('Desconectado');
            }}
            disabled={!qrStatus?.sessionId}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Desconectar
          </Button>
        </div>

        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Em preparação:</strong> A conexão QR Code está em fase de estrutura. 
            A conexão real com Baileys será implementada na Fase B. 
            Por enquanto, use a conexão Meta API (Cloud API) para funcionalidade completa.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

