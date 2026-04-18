import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, XCircle, Copy, MessageSquare, Settings, TestTube, ExternalLink, AlertCircle, Shield, Clock, Plug, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { whatsappService, type WhatsAppSettings } from '@/services/whatsappService';
import { TenantService } from '@/services/tenantService';

// Tipos para Embedded Signup da Meta
interface MetaEmbeddedSignupData {
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  display_phone_number?: string;
}

interface WhatsAppConfigProps {
  tenantId?: string;
}

export default function WhatsAppConfig({ tenantId }: WhatsAppConfigProps) {
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showManualConfig, setShowManualConfig] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState<string>('');
  const [formData, setFormData] = useState({
    phone_number_id: '',
    business_account_id: '',
    access_token: '',
    verify_token: '',
  });
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);

  // === PROTEÇÃO POR SENHA ===
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Senha mestre (em produção, use variável de ambiente ou hash)
  const MASTER_PASSWORD = 'Adm@APIVOX0102';

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPassword(true);
    setAuthError('');

    // Simular delay para não revelar se está checando
    setTimeout(() => {
      if (password === MASTER_PASSWORD) {
        setIsAuthenticated(true);
        toast.success('Acesso autorizado às configurações do WhatsApp');
      } else {
        setAuthError('Senha incorreta. Tente novamente.');
        toast.error('Senha incorreta');
      }
      setIsSubmittingPassword(false);
    }, 500);
  };

  // Log quando componente monta
  useEffect(() => {
    console.log('[WhatsAppConfig] 🚀 COMPONENTE MONTADO - tenantId prop:', tenantId);
  }, []);

  useEffect(() => {
    console.log('[WhatsAppConfig] 📥 tenantId mudou:', tenantId);
    if (!tenantId) {
      loadTenantAndSettings();
    } else {
      setCurrentTenantId(tenantId);
      loadSettings();
    }
  }, [tenantId]);

  // Listener para receber dados do Embedded Signup via postMessage
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validar origem (apenas permitir mensagens do Meta/WhatsApp)
      const allowedOrigins = ['https://business.facebook.com', 'https://www.facebook.com'];
      if (!allowedOrigins.includes(event.origin)) {
        return;
      }

      // Verificar se é dados do Embedded Signup
      if (event.data && event.data.type === 'WHATSAPP_EMBEDDED_SIGNUP') {
        console.log('[WhatsAppConfig] Dados recebidos do Embedded Signup:', event.data);
        
        const signupData: MetaEmbeddedSignupData = event.data.data;
        
        if (!signupData.phone_number_id || !signupData.access_token) {
          toast.error('Dados incompletos do Embedded Signup');
          setConnecting(false);
          return;
        }

        // Fechar popup se estiver aberto
        if (popupWindow && !popupWindow.closed) {
          popupWindow.close();
        }

        // Salvar automaticamente as configurações
        await handleEmbeddedSignupData(signupData);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [popupWindow, currentTenantId, tenantId]);

  // Função para processar dados do Embedded Signup
  const handleEmbeddedSignupData = async (data: MetaEmbeddedSignupData) => {
    try {
      setConnecting(true);
      const id = currentTenantId || tenantId;
      
      if (!id) {
        toast.error('Tenant não disponível');
        return;
      }

      // Gerar verify_token automático se não existir
      const verifyToken = formData.verify_token || `apivox-webhook-${Date.now()}`;

      console.log('[WhatsAppConfig] Salvando dados do Embedded Signup...');

      const result = await whatsappService.saveSettings(id, {
        phone_number_id: data.phone_number_id,
        business_account_id: data.business_account_id || undefined,
        access_token: data.access_token,
        verify_token: verifyToken,
        webhook_status: 'inactive',
      });

      if (result.success) {
        toast.success('WhatsApp conectado com sucesso via Embedded Signup!');
        
        // Atualizar formulário com os dados recebidos
        setFormData(prev => ({
          ...prev,
          phone_number_id: data.phone_number_id,
          business_account_id: data.business_account_id || '',
          verify_token: verifyToken,
        }));

        // Recarregar configurações
        await loadSettings(id);

        // Testar conexão automaticamente
        const testResult = await whatsappService.testConnection(id);
        if (testResult.success) {
          toast.success(`Conexão validada! Número: ${data.display_phone_number || data.phone_number_id}`);
        } else {
          toast.warning('Configuração salva, mas teste de conexão falhou. Verifique o webhook.');
        }
      } else {
        toast.error(result.error || 'Erro ao salvar configurações do Embedded Signup');
      }
    } catch (error: any) {
      console.error('[WhatsAppConfig] Erro no Embedded Signup:', error);
      toast.error(error.message || 'Erro ao processar dados do Embedded Signup');
    } finally {
      setConnecting(false);
    }
  };

  // Função para abrir popup do Embedded Signup
  const handleConnectWhatsApp = () => {
    console.log('[WhatsAppConfig] 🔘 BOTÃO CLICADO - Abrindo popup Embedded Signup');
    // URL do Embedded Signup (será atualizada quando fornecida)
    // Formato esperado: https://business.facebook.com/whatsapp/businesses/embedded-signup/
    const embeddedSignupUrl = 'https://business.facebook.com/whatsapp/businesses/embedded-signup/';
    
    // Abrir popup centralizado
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open(
      embeddedSignupUrl,
      'WhatsAppEmbeddedSignup',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (popup) {
      setPopupWindow(popup);
      setConnecting(true);
      toast.info('Complete o processo no popup do WhatsApp');

      // Monitorar fechamento do popup
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setPopupWindow(null);
          setConnecting(false);
        }
      }, 1000);
    } else {
      toast.error('Não foi possível abrir o popup. Verifique se popups estão bloqueados.');
      // Fallback: abrir em nova aba
      window.open(embeddedSignupUrl, '_blank');
    }
  };

  const loadTenantAndSettings = async () => {
    try {
      setLoading(true);
      const tenantId = await TenantService.getCurrentTenantId();
      setCurrentTenantId(tenantId);
      await loadSettings(tenantId);
    } catch (error: any) {
      console.error('Erro ao carregar tenant:', error);
      toast.error(error.message || 'Erro ao carregar configurações do tenant');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async (tenantIdToUse?: string) => {
    try {
      setLoading(true);
      const id = tenantIdToUse || currentTenantId;
      const data = await whatsappService.getSettings(id);
      setSettings(data);
      
      if (data) {
        setFormData({
          phone_number_id: data.phone_number_id || '',
          business_account_id: data.business_account_id || '',
          access_token: '', // Nunca exibir token existente
          verify_token: data.verify_token || '',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.phone_number_id || !formData.access_token || !formData.verify_token) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSaving(true);
      const id = currentTenantId || tenantId;
      if (!id) {
        toast.error('Tenant não disponível');
        return;
      }

      const result = await whatsappService.saveSettings(id, {
        phone_number_id: formData.phone_number_id,
        business_account_id: formData.business_account_id || undefined,
        access_token: formData.access_token, // Será criptografado pelo serviço
        verify_token: formData.verify_token,
        webhook_status: 'inactive',
      });

      if (result.success) {
        toast.success('Configurações salvas com sucesso!');
        await loadSettings(id);
      } else {
        toast.error(result.error || 'Erro ao salvar configurações');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const id = currentTenantId || tenantId;
      if (!id) {
        toast.error('Tenant não disponível');
        return;
      }

      const result = await whatsappService.testConnection(id);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      
      await loadSettings(id); // Atualizar status do teste
    } catch (error: any) {
      toast.error(error.message || 'Erro ao testar conexão');
    } finally {
      setTesting(false);
    }
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

  // Renderização principal - BOTÃO SEMPRE VISÍVEL
  console.log('[WhatsAppConfig] 🎨 INICIANDO RENDER - loading:', loading, 'settings:', settings, 'isAuthenticated:', isAuthenticated);

  // === TELA DE LOGIN (PROTEÇÃO POR SENHA) ===
  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Lock className="h-6 w-6 text-primary" />
                  Acesso Restrito
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  Digite a senha de administrador para configurar o WhatsApp
                </CardDescription>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Protegido
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-password">Senha de Acesso</Label>
                <div className="relative">
                  <Input
                    id="whatsapp-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite a senha..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {authError && (
                  <p className="text-sm text-red-500">{authError}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={!password || isSubmittingPassword}
              >
                {isSubmittingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Acessar Configurações
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                <Shield className="h-3 w-3 inline mr-1" />
                Esta área contém credenciais sensíveis do WhatsApp Business.
                <br />
                Apenas administradores autorizados devem ter acesso.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CARD PRINCIPAL DE CONEXÃO WHATSAPP */}
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
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setIsAuthenticated(false);
                  setPassword('');
                  toast.info('Você saiu da área de configurações do WhatsApp');
                }}
              >
                <Lock className="h-4 w-4 mr-1" />
                Sair
              </Button>
              {getStatusBadge()}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* BOTÃO PRINCIPAL - SEMPRE VISÍVEL */}
          <div className="space-y-4">
            {/* Loading state visual durante carregamento */}
            {loading && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Carregando configurações...</span>
              </div>
            )}

            {/* Status atual (se conectado) */}
            {settings?.webhook_status === 'active' && (
              <div className="text-center py-2 mb-4">
                <div className="mb-2">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                </div>
                <h3 className="text-md font-semibold text-green-600">WhatsApp Conectado!</h3>
                {settings?.phone_number_id && (
                  <p className="text-xs text-muted-foreground">
                    Número: <code className="bg-muted px-1 py-0.5 rounded">{settings.phone_number_id}</code>
                  </p>
                )}
              </div>
            )}

            {/* Botão principal: Embedded Signup - SEMPRE APARECE */}
            <div className="text-center py-4">
              <Button 
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold shadow-lg"
                onClick={handleConnectWhatsApp}
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Plug className="h-5 w-5 mr-2" />
                    {settings?.webhook_status === 'active' ? 'Reconectar WhatsApp' : 'Conectar WhatsApp'}
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                {settings?.webhook_status === 'active' 
                  ? 'Clique para reconectar ou alterar sua conta WhatsApp'
                  : 'Conecte seu WhatsApp em poucos cliques usando sua conta Meta'}
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou configure manualmente
                </span>
              </div>
            </div>

            {/* Botão fallback: Configuração manual - SEMPRE VISÍVEL */}
            <div className="text-center">
              <Button 
                variant="outline"
                onClick={() => setShowManualConfig(!showManualConfig)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showManualConfig ? 'Ocultar configuração manual' : 'Configuração manual'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instruções rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📋 O que você precisa:</CardTitle>
          <CardDescription>
            Obtenha estas credenciais no WhatsApp Business Manager
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 border rounded-lg">
              <p className="font-medium">📱 Phone Number ID</p>
              <p className="text-muted-foreground">ID numérico do seu número</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">🔑 Access Token</p>
              <p className="text-muted-foreground">Token permanente (EAA...)</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">🔐 Verify Token</p>
              <p className="text-muted-foreground">Token único para webhook</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">🌐 Webhook URL</p>
              <p className="text-muted-foreground">URL para receber mensagens</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            💡 <strong>Dica:</strong> Acesse{' '}
            <a 
              href="https://business.facebook.com/whatsapp" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              business.facebook.com/whatsapp
            </a>
            {' '}para obter suas credenciais
          </div>
        </CardContent>
      </Card>

      {/* Formulário de configuração manual - aparece quando solicitado */}
      {showManualConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Configuração Manual</CardTitle>
            <CardDescription>
              Preencha manualmente suas credenciais do WhatsApp Cloud API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number_id">
                  Phone Number ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone_number_id"
                  placeholder="1234567890123456"
                  value={formData.phone_number_id}
                  onChange={(e) => setFormData({ ...formData, phone_number_id: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  ID numérico do seu número no WhatsApp Business
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_account_id">Business Account ID</Label>
                <Input
                  id="business_account_id"
                  placeholder="987654321098765"
                  value={formData.business_account_id}
                  onChange={(e) => setFormData({ ...formData, business_account_id: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  ID da conta de negócio (opcional, para múltiplos números)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_token">
                Access Token <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="access_token"
                placeholder="EAA..."
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                rows={3}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Token permanente de acesso. Começa com "EAA" e tem aproximadamente 200 caracteres.
                <br />
                <strong>Nunca compartilhe este token com terceiros.</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify_token">
                Verify Token <span className="text-red-500">*</span>
              </Label>
              <Input
                id="verify_token"
                placeholder="seu-token-unico-verificacao-123"
                value={formData.verify_token}
                onChange={(e) => setFormData({ ...formData, verify_token: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Token único para verificação do webhook. Use algo como "apivox-webhook-123"
              </p>
            </div>

            <Separator />

            {/* Webhook URL */}
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <div className="flex gap-2">
                <Input
                  value={whatsappService.getWebhookUrl()}
                  readOnly
                  className="font-mono text-sm bg-muted"
                />
                <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure esta URL no WhatsApp Business Manager &gt; Webhooks
              </p>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Configurações
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleTestConnection}
                disabled={testing || !settings}
                className="flex items-center gap-2"
              >
                {testing && <Loader2 className="h-4 w-4 animate-spin" />}
                <TestTube className="h-4 w-4" />
                Testar Conexão
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status e informações - só aparece se tiver configurações */}
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
