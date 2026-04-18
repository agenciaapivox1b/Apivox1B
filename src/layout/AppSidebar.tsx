import { useEffect, useMemo, useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Inbox,
  BarChart3,
  LogOut,
  Settings,
  User as UserIcon,
  Lightbulb,
  Zap,
  TrendingUp,
  DollarSign,
  ListTodo,
  ImageIcon,
  Clock,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import logoIcon from '@/assets/logoAPIVOX.png';
import { tenantBrandingService } from '@/services/tenantBrandingService';
import { TenantService } from '@/services/tenantService';

const navItems = [
  { title: 'Início', url: '/', icon: LayoutDashboard },
  { title: 'Conversas', url: '/inbox', icon: Inbox },
  { title: 'Resultados', url: '/analytics', icon: BarChart3 },
  { title: 'Funil de Vendas', url: '/funnel', icon: TrendingUp },
  { title: 'Cobranças', url: '/charges', icon: DollarSign },
  { title: 'Oportunidades', url: '/opportunities', icon: Lightbulb },
  { title: 'Follow-ups', url: '/follow-ups', icon: RotateCcw },
  { title: 'Agenda', url: '/agenda', icon: Calendar },
  { title: 'Ações', url: '/actions', icon: Zap },
];

type BrandingData = {
  company_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  theme_mode?: 'default' | 'custom' | null;
};

const APIVOX_PRIMARY = '#2563eb';
const APIVOX_SECONDARY = '#10b981';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [branding, setBranding] = useState<BrandingData | null>(null);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        // Usar TenantService para obter o tenant_id correto (igual SettingsPage)
        const currentTenantId = await TenantService.getCurrentTenantId();
        
        if (!currentTenantId) {
          console.log('[AppSidebar] Não foi possível obter tenant_id');
          return;
        }

        console.log('[AppSidebar] Tenant ID obtido:', currentTenantId);
        const data = await tenantBrandingService.get(currentTenantId);
        console.log('[AppSidebar] Branding carregado:', data);
        
        if (data) {
          setBranding(data);
        }
      } catch (error) {
        console.error('[AppSidebar] Erro ao carregar branding:', error);
      }
    };

    loadBranding();
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Sessão encerrada');
      navigate('/login');
    } catch (error) {
      toast.error('Erro ao sair');
    }
  };

  const handleNavigateProfile = () => {
    navigate('/perfil');
  };

  const handleNavigateSettings = () => {
    navigate('/configuracoes');
  };

  const themeMode = branding?.theme_mode || 'default';
  const companyName = branding?.company_name?.trim() || 'APIVOX';
  const logoUrl = branding?.logo_url?.trim() || '';

  console.log('[AppSidebar] Branding state:', { themeMode, companyName, logoUrl: logoUrl?.substring(0, 50), hasLogo: !!logoUrl });

  // Cores personalizadas apenas para hover/accento (não aplica globalmente)
  const accentColor =
    themeMode === 'custom'
      ? branding?.primary_color || APIVOX_PRIMARY
      : null; // null = usa cores padrão do sistema

  // Aplicar CSS variables globalmente quando branding muda
  useEffect(() => {
    const root = document.documentElement;
    
    if (themeMode === 'custom' && branding?.primary_color) {
      // Modo personalizado: aplicar cor do cliente
      root.style.setProperty('--brand-primary', branding.primary_color);
      root.style.setProperty('--brand-secondary', branding.secondary_color || APIVOX_SECONDARY);
      root.style.setProperty('--brand-accent', branding.primary_color);
    } else {
      // Modo padrão: restaurar cores APIVOX
      root.style.setProperty('--brand-primary', APIVOX_PRIMARY);
      root.style.setProperty('--brand-secondary', APIVOX_SECONDARY);
      root.style.setProperty('--brand-accent', APIVOX_PRIMARY);
    }
  }, [themeMode, branding?.primary_color, branding?.secondary_color]);

  // Ouvir atualizações de branding de outras páginas (ex: SettingsPage)
  useEffect(() => {
    const handleBrandingUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[AppSidebar] Evento branding-updated recebido:', customEvent.detail);
      console.log('[AppSidebar] Comparing tenantId:', customEvent.detail?.tenantId, 'vs user?.id:', user?.id);
      
      // Recarregar sempre que receber o evento (mais seguro)
      console.log('[AppSidebar] Recarregando branding por evento...');
      loadBranding();
    };

    window.addEventListener('branding-updated', handleBrandingUpdate);
    return () => window.removeEventListener('branding-updated', handleBrandingUpdate);
  }, [user?.id]);

  const loadBranding = async () => {
    try {
      // Usar TenantService para obter o tenant_id correto (igual SettingsPage)
      const currentTenantId = await TenantService.getCurrentTenantId();
      
      if (!currentTenantId) {
        console.log('[AppSidebar] Sem tenantId, skip loadBranding');
        return;
      }

      console.log('[AppSidebar] Carregando branding para tenant:', currentTenantId);
      const data = await tenantBrandingService.get(currentTenantId);
      console.log('[AppSidebar] Dados recebidos:', data);
      
      if (data) {
        console.log('[AppSidebar] Atualizando estado com:', { logo_url: data.logo_url?.substring(0, 50), company_name: data.company_name });
        setBranding(data);
      } else {
        console.log('[AppSidebar] Nenhum dado retornado do service');
      }
    } catch (error) {
      console.error('[AppSidebar] Erro ao carregar branding:', error);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <div
        className={
          collapsed
            ? 'flex flex-col items-center justify-center px-2 py-4 border-b border-border min-h-[110px] gap-2'
            : 'flex flex-col items-center justify-center px-4 py-6 border-b border-border min-h-[180px] gap-3'
        }
      >
        {logoUrl ? (
          <div
            className={
              collapsed
                ? 'h-14 w-14 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden'
                : 'w-full max-w-[280px] h-[160px] rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden shadow-sm px-3'
            }
          >
            <img
              src={logoUrl}
              alt={companyName}
              className={
                collapsed
                  ? 'h-10 w-10 object-contain'
                  : 'max-h-[140px] max-w-[260px] w-full object-contain'
              }
            />
          </div>
        ) : (
          <div
            className={
              collapsed
                ? 'h-14 w-14 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden'
                : 'w-full max-w-[280px] h-[160px] rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden shadow-sm px-3'
            }
          >
            <img
              src={logoIcon}
              alt="APIVOX"
              className={
                collapsed
                  ? 'h-10 w-10 object-contain'
                  : 'max-h-[140px] max-w-[260px] w-full object-contain'
              }
            />
          </div>
        )}

        {!collapsed && (
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-foreground truncate max-w-[220px]">
              {companyName}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">
              Powered by APIVOX
            </p>
          </div>
        )}

        {collapsed && (
          <div className="text-[9px] text-muted-foreground text-center leading-tight">
            APVX
          </div>
        )}
      </div>

      <SidebarContent className="px-2 pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.url ||
                  (item.url !== '/' && location.pathname.startsWith(item.url));

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={false}>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: isActive ? 'rgba(var(--brand-primary-rgb, 37, 99, 235), 0.1)' : 'transparent',
                          color: isActive ? 'var(--brand-primary, #2563eb)' : 'hsl(var(--muted-foreground))',
                        }}
                      >
                        <item.icon
                          className="h-4 w-4 shrink-0"
                          style={{
                            color: isActive ? 'var(--brand-primary, #2563eb)' : 'currentColor',
                          }}
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        {!collapsed && (
          <div className="px-2 pb-2">
            <div className="rounded-md px-3 py-2 text-[11px] bg-muted text-muted-foreground">
              Automação e gestão por <span className="font-semibold">APIVOX</span>
            </div>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-secondary transition-colors outline-none text-left">
              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 border bg-muted">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={companyName}
                    className="h-6 w-6 object-contain rounded-full"
                  />
                ) : (
                  <span className="text-xs font-semibold text-blue-600">
                    {companyName.substring(0, 2).toUpperCase() || 'AX'}
                  </span>
                )}
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.user_metadata?.full_name || 'Usuário'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 mb-2">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={handleNavigateProfile}
            >
              <UserIcon className="h-4 w-4" /> Perfil
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={handleNavigateSettings}
            >
              <Settings className="h-4 w-4" /> Configurações
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}