import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { tenantBrandingService } from '@/services/tenantBrandingService';
import { TenantService } from '@/services/tenantService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, AlertCircle, Palette, Upload, ImageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import ThemeToggle from '@/components/ThemeToggle';
import { toast } from 'sonner';
import PaymentSettingsSection from '@/components/settings/PaymentSettingsSection';
import WhatsAppConfig from '@/components/settings/WhatsAppConfig';

type SettingsSection =
  | 'appearance'
  | 'notifications'
  | 'preferences'
  | 'funnel'
  | 'region'
  | 'branding'
  | 'billing'
  | 'whatsapp';

type SettingsState = {
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  leadSoundNotification: boolean;
  paymentSoundNotification: boolean;
  dailySummary: boolean;
  defaultPage: string;
  itemsPerPage: string;
  autoRefresh: boolean;
  autoRefreshInterval: string;
  funnelAutoArchive: boolean;
  funnelAutoArchiveAfter: string;
  funnelShowValue: boolean;
  language: string;
  dateFormat: string;
  timeZone: string;
};

type BrandingState = {
  companyName: string;
  logoUrl: string;
  uploadedLogoPreview: string;
  primaryColor: string;
  secondaryColor: string;
  themeMode: 'default' | 'custom';
};

type ToggleKey =
  | 'emailNotifications'
  | 'whatsappNotifications'
  | 'leadSoundNotification'
  | 'paymentSoundNotification'
  | 'dailySummary'
  | 'autoRefresh'
  | 'funnelAutoArchive'
  | 'funnelShowValue';

type SelectKey =
  | 'defaultPage'
  | 'itemsPerPage'
  | 'autoRefreshInterval'
  | 'funnelAutoArchiveAfter'
  | 'language'
  | 'dateFormat'
  | 'timeZone';

const APIVOX_PRIMARY = '#2563eb';
const APIVOX_SECONDARY = '#10b981';

export default function SettingsPage() {
  const [tenantId, setTenantId] = useState<string>('');
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [loadingTenant, setLoadingTenant] = useState(true);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [settings, setSettings] = useState<SettingsState>({
    emailNotifications: true,
    whatsappNotifications: true,
    leadSoundNotification: true,
    paymentSoundNotification: true,
    dailySummary: true,
    defaultPage: 'overview',
    itemsPerPage: '20',
    autoRefresh: true,
    autoRefreshInterval: '5',
    funnelAutoArchive: false,
    funnelAutoArchiveAfter: '30',
    funnelShowValue: true,
    language: 'pt-BR',
    dateFormat: 'DD/MM/YYYY',
    timeZone: 'America/Sao_Paulo',
  });

  const [branding, setBranding] = useState<BrandingState>({
    companyName: '',
    logoUrl: '',
    uploadedLogoPreview: '',
    primaryColor: APIVOX_PRIMARY,
    secondaryColor: APIVOX_SECONDARY,
    themeMode: 'custom',
  });

  const previewPrimary = useMemo(() => {
    return branding.themeMode === 'default' ? APIVOX_PRIMARY : branding.primaryColor;
  }, [branding.themeMode, branding.primaryColor]);

  const previewSecondary = useMemo(() => {
    return branding.themeMode === 'default' ? APIVOX_SECONDARY : branding.secondaryColor;
  }, [branding.themeMode, branding.secondaryColor]);

  const previewLogo = useMemo(() => {
    return branding.uploadedLogoPreview || branding.logoUrl || '';
  }, [branding.uploadedLogoPreview, branding.logoUrl]);

  useEffect(() => {
    const loadTenant = async () => {
      setLoadingTenant(true);

      try {
        // Usar TenantService para obter tenant_id real
        const realTenantId = await TenantService.getCurrentTenantId();
        
        if (realTenantId) {
          console.log('[SettingsPage] Tenant ID carregado:', realTenantId);
          setTenantId(realTenantId);
        } else {
          console.error('[SettingsPage] Não foi possível obter tenant_id');
          toast.error('Erro ao carregar tenant');
        }
      } catch (err: any) {
        console.error('[SettingsPage] Erro ao carregar tenant:', err);
        toast.error(err.message || 'Erro ao carregar tenant');
      } finally {
        setLoadingTenant(false);
      }
    };

    loadTenant();
  }, []);

  useEffect(() => {
    if (!tenantId) {
      console.log('[SettingsPage] tenantId ainda não carregado, skip loadBranding');
      return;
    }

    const loadBranding = async () => {
      try {
        console.log('[SettingsPage] Carregando branding para tenant:', tenantId);
        const savedBranding = await tenantBrandingService.get(tenantId);
        console.log('[SettingsPage] Branding carregado:', savedBranding);

        if (savedBranding) {
          setBranding(prev => ({
            ...prev,
            companyName: savedBranding.company_name || '',
            logoUrl: savedBranding.logo_url || '',
            primaryColor: savedBranding.primary_color || APIVOX_PRIMARY,
            secondaryColor: savedBranding.secondary_color || APIVOX_SECONDARY,
            themeMode: savedBranding.theme_mode || 'custom',
            uploadedLogoPreview: '',
          }));
          console.log('[SettingsPage] Branding aplicado ao estado');
        } else {
          console.log('[SettingsPage] Nenhum branding encontrado, usando padrão');
        }
      } catch (error) {
        console.error('[SettingsPage] Erro ao carregar branding:', error);
        toast.error('Erro ao carregar branding');
      }
    };

    loadBranding();
  }, [tenantId]);

  const handleToggle = (key: ToggleKey) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectChange = (key: SelectKey, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleBrandingChange = (key: keyof BrandingState, value: string) => {
    setBranding(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleThemeModeChange = (mode: 'default' | 'custom') => {
    if (mode === 'default') {
      // Modo Padrão APIVOX: aplica logo, cores e tema padrão
      setBranding(prev => ({
        ...prev,
        themeMode: 'default',
        primaryColor: APIVOX_PRIMARY,
        secondaryColor: APIVOX_SECONDARY,
        logoUrl: '', // Remove logo personalizado para usar padrão
        uploadedLogoPreview: '', // Remove preview de upload
      }));
      toast.success('Tema padrão da APIVOX aplicado - Logo e cores restaurados');
    } else {
      // Modo Personalizado: mantém configurações atuais do cliente
      setBranding(prev => ({
        ...prev,
        themeMode: 'custom',
      }));
    }
  };

  const handleRestoreDefaults = () => {
    setBranding(prev => ({
      ...prev,
      themeMode: 'default',
      primaryColor: APIVOX_PRIMARY,
      secondaryColor: APIVOX_SECONDARY,
      logoUrl: '',
      uploadedLogoPreview: '',
    }));
    toast.success('Tema padrão da APIVOX aplicado - Logo e cores restaurados');
  };

  const handleLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setBranding(prev => ({
        ...prev,
        uploadedLogoPreview: result,
      }));
      toast.success('Logo carregada para pré-visualização');
    };
    reader.onerror = () => {
      toast.error('Erro ao carregar imagem');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      console.log('[SettingsPage] Iniciando salvamento...');
      console.log('[SettingsPage] tenantId:', tenantId);
      console.log('[SettingsPage] branding state:', branding);

      if (!tenantId) {
        throw new Error('tenant_id não encontrado');
      }

      const payload = {
        tenant_id: tenantId,
        company_name: branding.companyName || null,
        logo_url: branding.uploadedLogoPreview || branding.logoUrl || null,
        primary_color: branding.themeMode === 'default' ? APIVOX_PRIMARY : branding.primaryColor,
        secondary_color: branding.themeMode === 'default' ? APIVOX_SECONDARY : branding.secondaryColor,
        theme_mode: branding.themeMode,
      };
      console.log('[SettingsPage] Payload para salvar:', payload);

      const result = await tenantBrandingService.save(payload);
      console.log('[SettingsPage] Resultado do save:', result);

      if (!result.success) {
        console.error('[SettingsPage] Erro ao salvar:', result.error);
        throw new Error(result.error || 'Erro ao salvar branding');
      }
      console.log('[SettingsPage] Salvamento bem-sucedido');

      setMessage({
        type: 'success',
        text: 'Configurações salvas com sucesso!',
      });

      toast.success('Alterações salvas');

      // Recarregar branding para confirmar persistência
      const refreshed = await tenantBrandingService.get(tenantId);
      if (refreshed) {
        setBranding(prev => ({
          ...prev,
          companyName: refreshed.company_name || '',
          logoUrl: refreshed.logo_url || '',
          primaryColor: refreshed.primary_color || APIVOX_PRIMARY,
          secondaryColor: refreshed.secondary_color || APIVOX_SECONDARY,
          themeMode: refreshed.theme_mode || 'custom',
          uploadedLogoPreview: '',
        }));

        // Aplicar CSS variables imediatamente para atualização em tempo real
        const root = document.documentElement;
        if (refreshed.theme_mode === 'custom' && refreshed.primary_color) {
          root.style.setProperty('--brand-primary', refreshed.primary_color);
          root.style.setProperty('--brand-secondary', refreshed.secondary_color || APIVOX_SECONDARY);
          root.style.setProperty('--brand-accent', refreshed.primary_color);
        } else {
          root.style.setProperty('--brand-primary', APIVOX_PRIMARY);
          root.style.setProperty('--brand-secondary', APIVOX_SECONDARY);
          root.style.setProperty('--brand-accent', APIVOX_PRIMARY);
        }

        // Notificar outros componentes sobre a atualização
        console.log('[SettingsPage] Disparando evento branding-updated com tenantId:', tenantId);
        console.log('[SettingsPage] Dados do evento:', { tenantId, logo_url: refreshed.logo_url?.substring(0, 50), company_name: refreshed.company_name });
        
        window.dispatchEvent(new CustomEvent('branding-updated', {
          detail: { tenantId, data: refreshed }
        }));
        console.log('[SettingsPage] Evento disparado com sucesso');
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'Erro ao salvar configurações.',
      });

      toast.error(error?.message || 'Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const sectionButtonClass = (section: SettingsSection) =>
    activeSection === section ? 'default' : 'outline';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Personalize o sistema de acordo com suas preferências
        </p>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Seções</CardTitle>
          <CardDescription>
            Escolha qual grupo de configurações você deseja visualizar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant={sectionButtonClass('appearance')} onClick={() => setActiveSection('appearance')}>
              Aparência
            </Button>
            <Button variant={sectionButtonClass('notifications')} onClick={() => setActiveSection('notifications')}>
              Notificações
            </Button>
            <Button variant={sectionButtonClass('preferences')} onClick={() => setActiveSection('preferences')}>
              Preferências
            </Button>
            <Button variant={sectionButtonClass('funnel')} onClick={() => setActiveSection('funnel')}>
              Funil
            </Button>
            <Button variant={sectionButtonClass('region')} onClick={() => setActiveSection('region')}>
              Região e Idioma
            </Button>
            <Button variant={sectionButtonClass('branding')} onClick={() => setActiveSection('branding')}>
              Marca / Customização
            </Button>
            <Button variant={sectionButtonClass('billing')} onClick={() => setActiveSection('billing')}>
              Cobrança / API
            </Button>
            <Button variant={sectionButtonClass('whatsapp')} onClick={() => setActiveSection('whatsapp')}>
              WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeSection === 'region' && (
        <Card>
          <CardHeader>
            <CardTitle>Região e Idioma</CardTitle>
            <CardDescription>
              Defina seu idioma, fuso horário e formato de datas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Idioma</Label>
              <Select value={settings.language} onValueChange={(value) => handleSelectChange('language', value)}>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="pt-PT">Português (Portugal)</SelectItem>
                  <SelectItem value="en-US">Inglês (EUA)</SelectItem>
                  <SelectItem value="es-ES">Espanhol</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Fuso Horário</Label>
              <Select value={settings.timeZone} onValueChange={(value) => handleSelectChange('timeZone', value)}>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">Brasília (UTC-3)</SelectItem>
                  <SelectItem value="America/Manaus">Manaus (UTC-4)</SelectItem>
                  <SelectItem value="Europe/Lisbon">Lisboa (UTC+0)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Formato de Data</Label>
              <Select value={settings.dateFormat} onValueChange={(value) => handleSelectChange('dateFormat', value)}>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === 'appearance' && (
        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
            <CardDescription>
              Personalize o tema visual do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-sm font-semibold">Tema</Label>
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
                <div className="space-y-0.5">
                  <p className="font-medium">Modo Claro/Escuro</p>
                  <p className="text-sm text-muted-foreground">
                    Alterne entre tema claro e escuro
                  </p>
                </div>
                <ThemeToggle />
              </div>
            </div>

            <Separator />

            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                As cores principais do sistema podem ser personalizadas na seção "Marca / Customização".
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {activeSection === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>
              Configure como deseja receber alertas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Notificações por e-mail</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba atualizações importantes no seu e-mail
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={() => handleToggle('emailNotifications')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Notificações por WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba alertas rápidos via WhatsApp
                  </p>
                </div>
                <Switch
                  checked={settings.whatsappNotifications}
                  onCheckedChange={() => handleToggle('whatsappNotifications')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Som ao receber lead</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerta sonoro quando um novo lead chegar
                  </p>
                </div>
                <Switch
                  checked={settings.leadSoundNotification}
                  onCheckedChange={() => handleToggle('leadSoundNotification')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Som ao receber pagamento</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerta sonoro quando uma cobrança for paga
                  </p>
                </div>
                <Switch
                  checked={settings.paymentSoundNotification}
                  onCheckedChange={() => handleToggle('paymentSoundNotification')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Resumo diário</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba um resumo diário das atividades
                  </p>
                </div>
                <Switch
                  checked={settings.dailySummary}
                  onCheckedChange={() => handleToggle('dailySummary')}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle>Preferências</CardTitle>
            <CardDescription>
              Ajuste o comportamento padrão do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Página inicial</Label>
              <Select value={settings.defaultPage} onValueChange={(value) => handleSelectChange('defaultPage', value)}>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Visão Geral</SelectItem>
                  <SelectItem value="opportunities">Oportunidades</SelectItem>
                  <SelectItem value="follow-ups">Follow-ups</SelectItem>
                  <SelectItem value="leads">Leads</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Página que será exibida ao fazer login
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Itens por página</Label>
              <Select value={settings.itemsPerPage} onValueChange={(value) => handleSelectChange('itemsPerPage', value)}>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 itens</SelectItem>
                  <SelectItem value="20">20 itens</SelectItem>
                  <SelectItem value="50">50 itens</SelectItem>
                  <SelectItem value="100">100 itens</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Atualização automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Atualizar dados automaticamente em intervalos regulares
                  </p>
                </div>
                <Switch
                  checked={settings.autoRefresh}
                  onCheckedChange={() => handleToggle('autoRefresh')}
                />
              </div>

              {settings.autoRefresh && (
                <div className="space-y-2 pl-4 border-l-2 border-border">
                  <Label className="text-sm">Intervalo de atualização</Label>
                  <Select value={settings.autoRefreshInterval} onValueChange={(value) => handleSelectChange('autoRefreshInterval', value)}>
                    <SelectTrigger className="w-full md:w-80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 minuto</SelectItem>
                      <SelectItem value="5">5 minutos</SelectItem>
                      <SelectItem value="10">10 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === 'funnel' && (
        <Card>
          <CardHeader>
            <CardTitle>Funil de Vendas</CardTitle>
            <CardDescription>
              Configure o comportamento do funil de oportunidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Auto-arquivar oportunidades</Label>
                  <p className="text-sm text-muted-foreground">
                    Arquivar automaticamente oportunidades inativas
                  </p>
                </div>
                <Switch
                  checked={settings.funnelAutoArchive}
                  onCheckedChange={() => handleToggle('funnelAutoArchive')}
                />
              </div>

              {settings.funnelAutoArchive && (
                <div className="space-y-2 pl-4 border-l-2 border-border">
                  <Label className="text-sm">Arquivar após</Label>
                  <Select value={settings.funnelAutoArchiveAfter} onValueChange={(value) => handleSelectChange('funnelAutoArchiveAfter', value)}>
                    <SelectTrigger className="w-full md:w-80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias de inatividade</SelectItem>
                      <SelectItem value="15">15 dias de inatividade</SelectItem>
                      <SelectItem value="30">30 dias de inatividade</SelectItem>
                      <SelectItem value="60">60 dias de inatividade</SelectItem>
                      <SelectItem value="90">90 dias de inatividade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Exibir valores no funil</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostrar valor estimado das oportunidades nas colunas
                  </p>
                </div>
                <Switch
                  checked={settings.funnelShowValue}
                  onCheckedChange={() => handleToggle('funnelShowValue')}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === 'branding' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Marca / Customização
            </CardTitle>
            <CardDescription>
              Personalize o dashboard do cliente mantendo a presença estratégica da APIVOX
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200 text-blue-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                A marca do cliente será a principal no dashboard, mas a APIVOX continuará visível em pontos
                estratégicos como assinatura visual e presença institucional discreta.
              </AlertDescription>
            </Alert>

            {loadingTenant && (
              <Alert>
                <AlertDescription>Carregando tenant e branding...</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Nome da empresa</Label>
              <Input
                placeholder="Ex: Clínica Sorriso, Agência XPTO, Loja Premium"
                value={branding.companyName}
                onChange={(e) => handleBrandingChange('companyName', e.target.value)}
                className="w-full md:w-[420px]"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-sm font-semibold">Tema visual</Label>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant={branding.themeMode === 'default' ? 'default' : 'outline'}
                  onClick={() => handleThemeModeChange('default')}
                >
                  Padrão APIVOX
                </Button>

                <Button
                  type="button"
                  variant={branding.themeMode === 'custom' ? 'default' : 'outline'}
                  onClick={() => handleThemeModeChange('custom')}
                >
                  Personalizado
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                O modo padrão usa as cores originais da APIVOX. O modo personalizado usa as cores do cliente.
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-sm font-semibold">Logo da empresa</Label>

              <div className="flex flex-col gap-3">
                <Label
                  htmlFor="logo-upload"
                  className="w-fit inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  <Upload className="h-4 w-4" />
                  Upload da logo
                </Label>

                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />

                <p className="text-xs text-muted-foreground">
                  Você pode subir uma imagem do computador ou usar uma URL abaixo.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Ou use a URL da logo</Label>
                <Input
                  placeholder="https://seudominio.com/logo.png"
                  value={branding.logoUrl}
                  onChange={(e) => handleBrandingChange('logoUrl', e.target.value)}
                  className="w-full md:w-[420px]"
                />
                <p className="text-xs text-muted-foreground">
                  Se houver upload e URL ao mesmo tempo, o upload terá prioridade no preview.
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Cor principal</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={previewPrimary}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    disabled={branding.themeMode === 'default'}
                    className="w-20 h-11 p-1"
                  />
                  <Input
                    value={previewPrimary}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    disabled={branding.themeMode === 'default'}
                    className="w-full md:w-[220px]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Cor secundária</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={previewSecondary}
                    onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                    disabled={branding.themeMode === 'default'}
                    className="w-20 h-11 p-1"
                  />
                  <Input
                    value={previewSecondary}
                    onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                    disabled={branding.themeMode === 'default'}
                    className="w-full md:w-[220px]"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-sm font-semibold">Pré-visualização</Label>

              <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-md border flex items-center justify-center overflow-hidden bg-white"
                      style={{ borderColor: previewPrimary }}
                    >
                      {previewLogo ? (
                        <img
                          src={previewLogo}
                          alt="Logo da empresa"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div
                          className="flex flex-col items-center justify-center text-[10px] font-semibold"
                          style={{ color: previewPrimary }}
                        >
                          <ImageIcon className="h-4 w-4 mb-1" />
                          LOGO
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-foreground">
                        {branding.companyName || 'Nome da Empresa'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dashboard personalizado por tenant
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    style={{
                      backgroundColor: previewPrimary,
                      borderColor: previewPrimary,
                      color: '#ffffff',
                    }}
                  >
                    Botão principal
                  </Button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: previewSecondary }}
                  >
                    Cor secundária
                  </span>

                  <span className="text-xs text-muted-foreground">
                    Powered by APIVOX
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === 'billing' && (
        <div className="space-y-4">
          {tenantId ? (
            <PaymentSettingsSection tenantId={tenantId} />
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Identificador de usuário inválido ou não carregado. Não é possível configurar pagamentos.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {activeSection === 'whatsapp' && (
        <WhatsAppConfig tenantId={tenantId} />
      )}

      <div className="flex gap-3 pt-4">
        <Button onClick={handleSave} disabled={loading} className="min-w-32">
          {loading ? 'Salvando...' : 'Salvar Tudo'}
        </Button>
        <Button variant="outline" onClick={handleRestoreDefaults}>
          Restaurar Padrões
        </Button>
      </div>
    </div>
  );
}