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
  Bot,
  Inbox,
  BarChart3,
  BookOpen,
  LogOut,
  Settings,
  User as UserIcon,
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

const navItems = [
  { title: 'Visão Geral', url: '/', icon: LayoutDashboard },
  { title: 'Agentes', url: '/agents', icon: Bot },
  { title: 'Caixa de Entrada', url: '/inbox', icon: Inbox },
  { title: 'Métricas', url: '/analytics', icon: BarChart3 },
  { title: 'Base de Conhecimento', url: '/knowledge', icon: BookOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Sessão encerrada');
      navigate('/login');
    } catch (error) {
      toast.error('Erro ao sair');
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <div
        className={
          collapsed
            ? 'flex items-center justify-center px-2 py-6 border-b border-border min-h-[96px]'
            : 'flex items-center justify-center px-3 py-8 border-b border-border min-h-[180px]'
        }
      >
        <img
          src={logoIcon}
          alt="Apivox"
          className={
            collapsed
              ? 'h-12 w-12 object-contain'
              : 'w-full max-w-[220px] h-auto object-contain'
          }
        />
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
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
                        activeClassName="bg-primary/10 text-primary font-semibold"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-secondary transition-colors outline-none text-left">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                <span className="text-xs font-semibold text-primary">
                  {user?.email?.substring(0, 2).toUpperCase() || 'AX'}
                </span>
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.user_metadata?.full_name || 'Usuário Apivox'}
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

            <DropdownMenuItem className="cursor-pointer gap-2">
              <UserIcon className="h-4 w-4" /> Perfil
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer gap-2">
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