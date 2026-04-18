import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Briefcase, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  Plus,
  RefreshCw,
  Filter,
  MessageSquare,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Search,
  ArrowLeft,
  Zap
} from 'lucide-react';
import { opportunityService, followUpService, type FollowUp, type Opportunity } from '@/services/crmService';
import { TenantService } from '@/services/tenantService';
import { toast } from 'sonner';

const PIPELINE_STAGES = [
  { id: 'descoberta', label: 'Descoberta', color: 'bg-blue-500' },
  { id: 'proposta', label: 'Proposta', color: 'bg-yellow-500' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-orange-500' },
  { id: 'fechado', label: 'Fechado', color: 'bg-green-500' },
  { id: 'perdido', label: 'Perdido', color: 'bg-red-500' }
] as const;

// Extended interface for follow-ups with opportunity data
interface FollowUpWithOpportunity extends FollowUp {
  opportunity?: Opportunity;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpWithOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('opportunities');
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  
  // Follow-ups tab filters
  const [fuSearchQuery, setFuSearchQuery] = useState('');
  const [fuStatusFilter, setFuStatusFilter] = useState('all');
  
  const navigate = useNavigate();

  useEffect(() => {
    checkPremiumAccess();
    loadOpportunities();
    loadFollowUps();
  }, []);

  const checkPremiumAccess = async () => {
    try {
      const isPremium = await TenantService.isTenantPremium();
      setHasPremiumAccess(isPremium);
    } catch (error) {
      console.error('Erro ao verificar acesso premium:', error);
      setHasPremiumAccess(false);
    }
  };

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const tenantId = await TenantService.getCurrentTenantId();
      
      if (!tenantId) {
        console.error('[OpportunitiesPage] Tenant ID não encontrado');
        toast.error('Erro ao carregar oportunidades: tenant não encontrado');
        return;
      }
      
      const data = await opportunityService.list();
      setOpportunities(data);
    } catch (error: any) {
      console.error('Erro ao carregar oportunidades:', error);
      
      // Tratamento específico para erros conhecidos
      if (error.message?.includes('tenant') || error.message?.includes('401')) {
        toast.error('Erro de autenticação. Faça login novamente.');
      } else if (error.message?.includes('42501') || error.message?.includes('permission')) {
        toast.error('Sem permissão para acessar oportunidades. Verifique as configurações.');
      } else {
        toast.error(error.message || 'Erro ao carregar oportunidades');
      }
      
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesFilter = filter === 'all' || opp.type === filter;
    const matchesStage = stageFilter === 'all' || opp.status === stageFilter;
    return matchesFilter && matchesStage;
  });

  const getStageColor = (status: string) => {
    const stage = PIPELINE_STAGES.find(s => s.id === status);
    return stage?.color || 'bg-gray-500';
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return 'text-green-600';
    if (probability >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const loadFollowUps = async () => {
    try {
      // Verificar se é premium
      const isPremium = await TenantService.isTenantPremium();
      setHasPremiumAccess(isPremium);
      
      // Se for FREE: não carrega follow-ups com dados sensíveis
      if (!isPremium) {
        setFollowUps([]);
        return;
      }
      
      // Se for PREMIUM: carrega dados completos
      const opps = await opportunityService.list();
      const allFollowUps: FollowUpWithOpportunity[] = [];
      
      for (const opp of opps) {
        try {
          const fus = await followUpService.listByOpportunity(opp.id);
          for (const fu of fus) {
            allFollowUps.push({ ...fu, opportunity: opp });
          }
        } catch (error) {
          console.error(`Erro ao carregar follow-ups:`, error);
        }
      }
      
      allFollowUps.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      setFollowUps(allFollowUps);
    } catch (error) {
      console.error('Erro ao carregar follow-ups:', error);
    }
  };

  const handleCreateFollowUp = async (opportunity: Opportunity) => {
    // Redirecionar para página de follow-ups
    // O paywall será tratado na página de destino baseado no plano
    navigate(`/follow-ups?opportunity=${opportunity.id}&action=create`);
  };

  const handleCompleteFU = async (id: string) => {
    if (!hasPremiumAccess) {
      navigate('/planos');
      return;
    }
    try {
      await followUpService.updateStatus(id, 'done');
      toast.success('Concluído!');
      loadFollowUps();
    } catch (error) {
      toast.error('Erro ao concluir');
    }
  };

  const handleRescheduleFU = async (id: string, currentDate: string) => {
    if (!hasPremiumAccess) {
      navigate('/planos');
      return;
    }
    const newDate = prompt('Nova data (YYYY-MM-DD):', currentDate.split('T')[0]);
    if (!newDate) return;
    
    const newTime = prompt('Nova hora (HH:MM):', '12:00');
    if (!newTime) return;
    
    try {
      await followUpService.reschedule(id, new Date(`${newDate}T${newTime}`).toISOString());
      toast.success('Reagendado!');
      loadFollowUps();
    } catch (error) {
      toast.error('Erro ao reagendar');
    }
  };

  const handleDeleteFU = async (id: string) => {
    if (!hasPremiumAccess) {
      navigate('/planos');
      return;
    }
    if (!confirm('Excluir?')) return;
    try {
      await followUpService.delete(id);
      toast.success('Excluído!');
      loadFollowUps();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const totalValue = opportunities.reduce((sum, opp) => sum + opp.amount, 0);
  const weightedValue = opportunities.reduce((sum, opp) => sum + (opp.amount * opp.probability / 100), 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Oportunidades</h1>
          <p className="text-muted-foreground mt-1">Gerencie seu pipeline comercial</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadOpportunities} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => navigate('/opportunities/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Oportunidade
          </Button>
        </div>
      </div>

      {/* Métricas do Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{opportunities.length}</p>
              </div>
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">R$ {totalValue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Ponderado</p>
                <p className="text-2xl font-bold">R$ {weightedValue.toLocaleString()}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-green-600">
                  {opportunities.length > 0 
                    ? Math.round((opportunities.filter(o => o.status === 'fechado').length / opportunities.length) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Oportunidades | Follow-ups */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="opportunities" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Oportunidades
            <Badge variant="secondary" className="ml-1">{opportunities.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-2">
            <Clock className="h-4 w-4" />
            Follow-ups
            <Badge variant="secondary" className="ml-1">{followUps.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* TAB: OPORTUNIDADES */}
        <TabsContent value="opportunities" className="space-y-6">
          {/* Subtítulo explicativo - Oportunidades organizam */}
          <div className="bg-muted/50 rounded-lg p-3 border border-border/60">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Oportunidades</span> organizam seu pipeline comercial. 
              Representam negócios em andamento com valor, estágio e prioridade.
            </p>
          </div>

          {/* Pipeline Visual */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pipeline por Estágio</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {PIPELINE_STAGES.map(stage => {
                const stageOpps = opportunities.filter(o => o.status === stage.id);
                const stageValue = stageOpps.reduce((sum, o) => sum + o.amount, 0);
                
                return (
                  <Card key={stage.id} className="text-center">
                    <CardContent className="pt-6">
                      <div className={`w-3 h-3 rounded-full ${stage.color} mx-auto mb-2`} />
                      <h4 className="font-semibold">{stage.label}</h4>
                      <p className="text-2xl font-bold mt-2">{stageOpps.length}</p>
                      <p className="text-sm text-muted-foreground">R$ {stageValue.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Filtros Oportunidades */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar:</span>
            </div>
            
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Estágio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estágios</SelectItem>
                {PIPELINE_STAGES.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="venda">Venda</SelectItem>
                <SelectItem value="servico">Serviço</SelectItem>
                <SelectItem value="projeto">Projeto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de Oportunidades */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Lista de Oportunidades</h3>
            
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : filteredOpportunities.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">Nenhuma oportunidade encontrada</h3>
                  <p className="text-muted-foreground">Crie sua primeira oportunidade para começar.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredOpportunities.map(opp => (
                  <Card key={opp.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg">{opp.name}</h4>
                            <Badge className={getStageColor(opp.status)}>
                              {PIPELINE_STAGES.find(s => s.id === opp.status)?.label}
                            </Badge>
                            <Badge variant="outline">{opp.type}</Badge>
                          </div>
                          
                          {opp.description && (
                            <p className="text-muted-foreground mb-3">{opp.description}</p>
                          )}
                          
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-medium">R$ {opp.amount.toLocaleString()}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              <span className={`font-medium ${getProbabilityColor(opp.probability)}`}>
                                {opp.probability}%
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{opp.contact_info}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCreateFollowUp(opp)}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Follow-up
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => navigate(`/opportunities/${opp.id}`)}
                          >
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB: FOLLOW-UPS */}
        <TabsContent value="followups" className="space-y-6">
          {/* Subtítulo explicativo - Follow-ups são ações */}
          <div className="bg-muted/50 rounded-lg p-3 border border-border/60">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-foreground">Follow-ups</span>
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px]">
                Premium
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Acompanhe cada lead do primeiro contato até o fechamento. 
              Ative o acompanhamento automatizado para não perder nenhuma oportunidade.
            </p>
          </div>

          {/* Resumo Follow-ups */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
                <div className="text-xl font-bold text-blue-700">{followUps.length}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs text-muted-foreground">Pendentes</span>
                </div>
                <div className="text-xl font-bold text-yellow-700">
                  {followUps.filter(f => f.status === 'pending').length}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-muted-foreground">Atrasados</span>
                </div>
                <div className="text-xl font-bold text-red-700">
                  {followUps.filter(f => f.status === 'overdue').length}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-xs text-muted-foreground">Para Hoje</span>
                </div>
                <div className="text-xl font-bold text-orange-700">
                  {followUps.filter(f => {
                    if (f.status !== 'pending' && f.status !== 'overdue') return false;
                    const date = new Date(f.due_date);
                    const now = new Date();
                    return date.toDateString() === now.toDateString();
                  }).length}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Concluídos</span>
                </div>
                <div className="text-xl font-bold text-green-700">
                  {followUps.filter(f => f.status === 'done').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA para usuários Free - foco em acompanhamento */}
          {!hasPremiumAccess && (
            <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/80 border border-blue-200/60 rounded-xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shrink-0">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Seu bot responde. A APIVOX garante o acompanhamento.
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Automatize seus follow-ups no momento certo e aumente 
                    suas chances de fechar clientes.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/planos')}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shrink-0"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Ativar com a APIVOX
                </Button>
              </div>
            </div>
          )}

          {/* Filtros Follow-ups - apenas para Premium */}
          {hasPremiumAccess && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ação ou oportunidade..."
                  value={fuSearchQuery}
                  onChange={(e) => setFuSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={fuStatusFilter} onValueChange={setFuStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="overdue">Atrasados</SelectItem>
                  <SelectItem value="done">Concluídos</SelectItem>
                  <SelectItem value="canceled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Lista de Follow-ups */}
          <div className="space-y-3">
            {(() => {
              const filtered = followUps.filter(fu => {
                const matchesSearch = 
                  fu.action.toLowerCase().includes(fuSearchQuery.toLowerCase()) ||
                  fu.description?.toLowerCase().includes(fuSearchQuery.toLowerCase()) ||
                  fu.opportunity?.name.toLowerCase().includes(fuSearchQuery.toLowerCase());
                const matchesStatus = fuStatusFilter === 'all' || fu.status === fuStatusFilter;
                return matchesSearch && matchesStatus;
              });

              if (filtered.length === 0) {
                return (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">Nenhum follow-up encontrado</h3>
                      <p className="text-muted-foreground">
                        {fuSearchQuery || fuStatusFilter !== 'all' 
                          ? 'Tente ajustar os filtros'
                          : 'Crie follow-ups na aba Oportunidades'
                        }
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              return filtered.map((fu) => {
                const date = new Date(fu.due_date);
                const now = new Date();
                const isToday = date.toDateString() === now.toDateString();
                const isPast = date < now && !isToday;
                
                const getStatusBadge = () => {
                  if (isPast || fu.status === 'overdue') {
                    return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Atrasado</Badge>;
                  }
                  if (isToday) {
                    return <Badge variant="default" className="bg-yellow-500 gap-1"><Clock className="h-3 w-3" /> Hoje</Badge>;
                  }
                  if (fu.status === 'done') {
                    return <Badge variant="default" className="bg-green-500 gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído</Badge>;
                  }
                  if (fu.status === 'canceled') {
                    return <Badge variant="outline">Cancelado</Badge>;
                  }
                  return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
                };

                const formatDate = () => {
                  if (isToday) return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                  if (isPast) return `Atrasado (${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })})`;
                  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                };

                return (
                  <Card 
                    key={fu.id} 
                    className={`hover:shadow-md transition-shadow ${
                      fu.status === 'overdue' || isPast ? 'border-red-200 bg-red-50/30' : 
                      fu.status === 'done' ? 'bg-secondary/30' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge()}
                            <span className="text-sm text-muted-foreground">{formatDate()}</span>
                          </div>
                          
                          <h4 className={`font-medium text-foreground ${
                            fu.status === 'done' ? 'line-through text-muted-foreground' : ''
                          }`}>
                            {fu.action}
                          </h4>
                          
                          {fu.description && (
                            <p className="text-sm text-muted-foreground mt-1">{fu.description}</p>
                          )}
                          
                          {fu.opportunity && (
                            <div className="inline-flex items-center gap-1.5 mt-2 text-sm text-primary">
                              <Briefcase className="h-3.5 w-3.5" />
                              {fu.opportunity.name}
                              {fu.opportunity.contact_phone && (
                                <span className="text-muted-foreground flex items-center gap-1 ml-2">
                                  <Users className="h-3 w-3" />
                                  {fu.opportunity.contact_phone}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {fu.status !== 'done' && fu.status !== 'canceled' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600"
                                onClick={() => handleCompleteFU(fu.id)}
                                title="Concluir"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleRescheduleFU(fu.id)}
                                title="Reagendar"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleDeleteFU(fu.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

