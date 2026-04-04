import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { tenantBrandingService } from '@/services/tenantBrandingService';
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

type SettingsSection =
  | 'appearance'
  | 'notifications'
  | 'preferences'
  | 'funnel'
  | 'region'
  | 'branding'
  | 'billing';

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

  useEffect(() => {
    const loadTenant = async () => {
      setLoadingTenant(true);

      try {
        let authTenantId = '';
        
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          console.error('Erro ao buscar usuário autenticado:', error.message);
        } else if (data?.user?.id) {
          authTenantId = data.user.id;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (authTenantId && uuidRegex.test(authTenantId)) {
          console.log('[SettingsPage] Setting valid tenantId:', authTenantId);
          setTenantId(authTenantId);
        } else if (authTenantId) {
          console.warn('[SettingsPage] TenantId encontrado, mas não é um UUID válido:', authTenantId);
        } else {
          console.warn('[SettingsPage] Nenhum tenantId real encontrado via Supabase Auth.');
        }
      } catch (err) {
        console.error('Erro geral ao carregar tenant:', err);
      } finally {
        setLoadingTenant(false);
      }
    };

    loadTenant();
  }, []);

  useEffect(() => {
    if (!tenantId) return;

    const loadBranding = async () => {
      try {
        const savedBranding = await tenantBrandingService.get(tenantId);

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
        }
      } catch (error) {
        console.error('Erro ao carregar branding:', error);
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
    setBranding(prev => ({
      ...prev,
      themeMode: mode,
      primaryColor: mode === 'default' ? APIVOX_PRIMARY : prev.primaryColor,
      secondaryColor: mode === 'default' ? APIVOX_SECONDARY : prev.secondaryColor,
    }));
  };

  const handleRestoreDefaults = () => {
    setBranding(prev => ({
      ...prev,
      themeMode: 'default',
      primaryColor: APIVOX_PRIMARY,
      secondaryColor: APIVOX_SECONDARY,
    }));
    toast.success('Tema padrão da APIVOX aplicado');
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
      if (!tenantId) {
        throw new Error('tenant_id não encontrado');
      }

      const result = await tenantBrandingService.save({
        tenant_id: tenantId,
        company_name: branding.companyName || null,
        logo_url: branding.uploadedLogoPreview || branding.logoUrl || null,
        primary_color: branding.themeMode === 'default' ? APIVOX_PRIMARY : branding.primaryColor,
        secondary_color: branding.themeMode === 'default' ? APIVOX_SECONDARY : branding.secondaryColor,
        theme_mode: branding.themeMode,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar branding');
      }

      setMessage({
        type: 'success',
        text: 'Configurações salvas com sucesso!',
      });

      toast.success('Alterações salvas');
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

  const previewLogo = useMemo(() => {
    if (branding.uploadedLogoPreview) return branding.uploadedLogoPreview;
    if (branding.logoUrl.trim()) return branding.logoUrl.trim();
    return '';
  }, [branding.uploadedLogoPreview, branding.logoUrl]);

  const previewPrimary = branding.themeMode === 'default' ? APIVOX_PRIMARY : branding.primaryColor;
  const previewSecondary = branding.themeMode === 'default' ? APIVOX_SECONDARY : branding.secondaryColor;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h1>
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
          <CardTitle>Seções de Configuração</CardTitle>
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
              Cobranças / API
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeSection === 'appearance' && (
        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
            <CardDescription>Escolha o tema para a interface</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Tema</Label>
              <ThemeToggle />
              <p className="text-xs text-muted-foreground">
                Escolha entre claro, escuro ou seguir a preferência do seu sistema operacional.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>Controle como você recebe notificações do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-foreground">Notificações por E-mail</Label>
                <p className="text-xs text-muted-foreground">Receba atualizações importantes por e-mail</p>
              </div>
              <Switch checked={settings.emailNotifications} onCheckedChange={() => handleToggle('emailNotifications')} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-foreground">Notificações via WhatsApp</Label>
                <p className="text-xs text-muted-foreground">Alertas e lembretes no seu WhatsApp</p>
              </div>
              <Switch checked={settings.whatsappNotifications} onCheckedChange={() => handleToggle('whatsappNotifications')} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-foreground">Som para novos leads</Label>
                <p className="text-xs text-muted-foreground">Emita som quando um novo lead chegar</p>
              </div>
              <Switch checked={settings.leadSoundNotification} onCheckedChange={() => handleToggle('leadSoundNotification')} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-foreground">Som para pagamentos</Label>
                <p className="text-xs text-muted-foreground">Emita som quando um pagamento for recebido</p>
              </div>
              <Switch checked={settings.paymentSoundNotification} onCheckedChange={() => handleToggle('paymentSoundNotification')} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-foreground">Resumo diário</Label>
                <p className="text-xs text-muted-foreground">Receba um resumo do dia cada noite</p>
              </div>
              <Switch checked={settings.dailySummary} onCheckedChange={() => handleToggle('dailySummary')} />
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle>Preferências do Sistema</CardTitle>
            <CardDescription>Configure padrões de trabalho e exibição</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Página ao iniciar</Label>
              <Select value={settings.defaultPage} onValueChange={(value) => handleSelectChange('defaultPage', value)}>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Início / Overview</SelectItem>
                  <SelectItem value="inbox">Conversas</SelectItem>
                  <SelectItem value="funnel">Funil de Vendas</SelectItem>
                  <SelectItem value="charges">Cobranças</SelectItem>
                </SelectContent>
              </Select>
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

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-foreground">Atualização Automática</Label>
                <p className="text-xs text-muted-foreground">Atualizar dados automaticamente</p>
              </div>
              <Switch checked={settings.autoRefresh} onCheckedChange={() => handleToggle('autoRefresh')} />
            </div>

            {settings.autoRefresh && (
              <div className="space-y-3 pl-4 border-l-2 border-border">
                <Label className="text-sm font-semibold">Intervalo (minutos)</Label>
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
          </CardContent>
        </Card>
      )}

      {activeSection === 'funnel' && (
        <Card>
          <CardHeader>
            <CardTitle>Funil de Vendas</CardTitle>
            <CardDescription>Preferências específicas do módulo de funil de vendas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-foreground">Auto-arquivar leads perdidos</Label>
                <p className="text-xs text-muted-foreground">Arquivar automaticamente após inatividade</p>
              </div>
              <Switch checked={settings.funnelAutoArchive} onCheckedChange={() => handleToggle('funnelAutoArchive')} />
            </div>

            {settings.funnelAutoArchive && (
              <div className="space-y-3 pl-4 border-l-2 border-border">
                <Label className="text-sm font-semibold">Após (dias)</Label>
                <Select value={settings.funnelAutoArchiveAfter} onValueChange={(value) => handleSelectChange('funnelAutoArchiveAfter', value)}>
                  <SelectTrigger className="w-full md:w-80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="14">14 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-foreground">Mostrar valores nas cards</Label>
                <p className="text-xs text-muted-foreground">Exibir valor do negócio nos cards</p>
              </div>
              <Switch checked={settings.funnelShowValue} onCheckedChange={() => handleToggle('funnelShowValue')} />
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === 'region' && (
        <Card>
          <CardHeader>
            <CardTitle>Região e Idioma</CardTitle>
            <CardDescription>Defina seu idioma, fuso horário e formato de datas</CardDescription>
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