// =====================================================
// FOLLOW-UPS PAGE - Página dedicada para gestão de follow-ups
// 
// Página separada para visualizar e gerenciar todos os
// follow-ups de todas as oportunidades em um só lugar
// =====================================================

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  RotateCcw,
  Calendar,
  Search,
  Filter,
  ArrowLeft,
  Briefcase,
  Phone,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  followUpService, 
  opportunityService,
  type FollowUp, 
  type Opportunity 
} from '@/services/crmService';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { TenantService } from '@/services/tenantService';

// Extended interface with opportunity data
interface FollowUpWithOpportunity extends FollowUp {
  opportunity?: Opportunity;
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUpWithOpportunity[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Create modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOpportunitySelector, setShowOpportunitySelector] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>('');
  const [action, setAction] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('12:00');
  const [submitting, setSubmitting] = useState(false);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Verificar acesso premium real via TenantService
  const checkPremiumAccess = async () => {
    try {
      const isPremium = await TenantService.isTenantPremium();
      setHasPremiumAccess(isPremium);
    } catch (error) {
      console.error('Erro ao verificar acesso premium:', error);
      setHasPremiumAccess(false);
    } finally {
      setCheckingAccess(false);
    }
  };

  // Processar query params (quando vem de Opportunities)
  useEffect(() => {
    const oppId = searchParams.get('opportunity');
    const actionParam = searchParams.get('action');
    
    if (oppId && actionParam === 'create') {
      setSelectedOpportunityId(oppId);
      setShowCreateModal(true);
    }
  }, [searchParams]);

  // Função para iniciar criação - mostra seletor se não houver contexto
  const handleStartCreate = () => {
    if (!hasPremiumAccess) {
      navigate('/planos');
      return;
    }
    
    // Se veio de uma oportunidade específica (contexto), abre direto
    const oppIdFromContext = searchParams.get('opportunity');
    if (oppIdFromContext) {
      setSelectedOpportunityId(oppIdFromContext);
      setShowCreateModal(true);
    } else {
      // Se não tem contexto, mostra seletor de oportunidades
      setShowOpportunitySelector(true);
    }
  };

  // Selecionar oportunidade e abrir modal
  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOpportunityId(oppId);
    setShowOpportunitySelector(false);
    setShowCreateModal(true);
  };

  // Load all follow-ups and opportunities
  useEffect(() => {
    checkPremiumAccess();
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Verificar se é premium
      const isPremium = await TenantService.isTenantPremium();
      setHasPremiumAccess(isPremium);
      
      // Load all opportunities first
      const opps = await opportunityService.list();
      setOpportunities(opps);
      
      // Se for FREE: carregar apenas contagem agregada (sem dados sensíveis)
      if (!isPremium) {
        // Buscar apenas contagem por status para o summary
        const { data: counts, error: countError } = await supabase
          .rpc('get_follow_up_summary', { p_tenant_id: await TenantService.getCurrentTenantId() })
          .single();
        
        if (countError) {
          console.log('[FollowUps] Erro ao buscar summary:', countError);
        }
        
        // Para usuários free: não carregamos a lista completa de follow-ups
        // Apenas deixamos o array vazio - as métricas serão calculadas do summary
        setFollowUps([]);
        setLoading(false);
        return;
      }
      
      // Se for PREMIUM: carregar dados completos
      const allFollowUps: FollowUpWithOpportunity[] = [];
      
      for (const opp of opps) {
        try {
          const followUps = await followUpService.listByOpportunity(opp.id);
          for (const fu of followUps) {
            allFollowUps.push({
              ...fu,
              opportunity: opp
            });
          }
        } catch (error) {
          console.error(`Erro ao carregar follow-ups da oportunidade ${opp.id}:`, error);
        }
      }
      
      // Sort by due_date
      allFollowUps.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      
      setFollowUps(allFollowUps);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar follow-ups: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter follow-ups
  const filteredFollowUps = followUps.filter(fu => {
    const matchesSearch = 
      fu.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fu.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fu.opportunity?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || fu.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Group by status for summary
  const summary = {
    total: followUps.length,
    pending: followUps.filter(f => f.status === 'pending').length,
    overdue: followUps.filter(f => f.status === 'overdue').length,
    done: followUps.filter(f => f.status === 'done').length,
    today: followUps.filter(f => {
      if (f.status !== 'pending' && f.status !== 'overdue') return false;
      const date = new Date(f.due_date);
      const now = new Date();
      return date.toDateString() === now.toDateString();
    }).length
  };

  const handleComplete = async (id: string) => {
    if (!hasPremiumAccess) {
      navigate('/planos');
      return;
    }
    try {
      await followUpService.updateStatus(id, 'done');
      toast.success('Follow-up concluído!');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao concluir: ' + error.message);
    }
  };

  const handleReschedule = async (id: string) => {
    if (!hasPremiumAccess) {
      navigate('/planos');
      return;
    }
    const newDate = prompt('Nova data (YYYY-MM-DD):');
    if (!newDate) return;
    
    const newTime = prompt('Nova hora (HH:MM):', '12:00');
    if (!newTime) return;

    try {
      const newDateTime = new Date(`${newDate}T${newTime}`).toISOString();
      await followUpService.reschedule(id, newDateTime);
      toast.success('Follow-up reagendado!');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao reagendar: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!hasPremiumAccess) {
      navigate('/planos');
      return;
    }
    if (!confirm('Tem certeza que deseja excluir este follow-up?')) return;
    
    try {
      await followUpService.delete(id);
      toast.success('Follow-up removido!');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao remover: ' + error.message);
    }
  };

  // Enviar mensagem - navegar para conversa do cliente
  const handleSendMessage = async (followUp: FollowUpWithOpportunity) => {
    if (!hasPremiumAccess) {
      navigate('/planos');
      return;
    }
    try {
      // Buscar conversa ativa do cliente
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', followUp.opportunity.contact_id)
        .eq('tenant_id', followUp.tenant_id)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false })
        .limit(1)
        .single();

      if (conversation?.id) {
        // Navegar para inbox com conversa selecionada
        navigate(`/inbox?conversation=${conversation.id}`);
        toast.success('Abrindo conversa...');
      } else {
        // Se não tem conversa ativa, abrir inbox para criar nova
        navigate(`/inbox?contact=${followUp.opportunity.contact_id}`);
        toast.info('Inicie uma nova conversa');
      }
    } catch (error) {
      // Fallback: abrir inbox geral
      navigate('/inbox');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPremiumAccess) {
      navigate('/planos');
      return;
    }
    if (!action.trim() || !dueDate || !selectedOpportunityId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSubmitting(true);
      const dueDateTime = new Date(`${dueDate}T${dueTime}`).toISOString();
      
      await followUpService.create({
        opportunity_id: selectedOpportunityId,
        action: action.trim(),
        description: description.trim() || undefined,
        due_date: dueDateTime,
      });
      
      toast.success('Follow-up criado!');
      setAction('');
      setDescription('');
      setDueDate('');
      setDueTime('12:00');
      setSelectedOpportunityId('');
      setShowCreateModal(false);
      loadData();
    } catch (error: any) {
      toast.error('Erro ao criar: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isPast = date < now && !isToday;
    
    if (isToday) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    if (isPast) {
      return `Atrasado (${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })})`;
    }
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string, dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isPast = date < now && !isToday;
    
    if (isPast || status === 'overdue') {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Atrasado</Badge>;
    }
    if (isToday) {
      return <Badge variant="default" className="bg-yellow-500 gap-1"><Clock className="h-3 w-3" /> Hoje</Badge>;
    }
    if (status === 'done') {
      return <Badge variant="default" className="bg-green-500 gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído</Badge>;
    }
    if (status === 'canceled') {
      return <Badge variant="outline">Cancelado</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="p-6 space-y-4">
          {/* Back Link + Title */}
          <div className="flex items-center gap-4">
            <Link to="/opportunities">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Follow-ups</h1>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px]">
                  Premium
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Acompanhamento automatizado para converter mais clientes
              </p>
            </div>
          </div>

          {/* CTA Premium - Foco em acompanhamento */}
          {!hasPremiumAccess && !checkingAccess && (
            <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/80 border border-blue-200/60 rounded-xl p-6 mb-6">
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

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
                <div className="text-xl font-bold text-blue-700">{summary.total}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs text-muted-foreground">Pendentes</span>
                </div>
                <div className="text-xl font-bold text-yellow-700">{summary.pending}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-muted-foreground">Atrasados</span>
                </div>
                <div className="text-xl font-bold text-red-700">{summary.overdue}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-xs text-muted-foreground">Para Hoje</span>
                </div>
                <div className="text-xl font-bold text-orange-700">{summary.today}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Concluídos</span>
                </div>
                <div className="text-xl font-bold text-green-700">{summary.done}</div>
              </CardContent>
            </Card>
          </div>

          {/* Automação Inteligente - APIVOX Managed */}
          <div className="mt-4 bg-gradient-to-r from-indigo-50/70 to-purple-50/70 rounded-lg p-3 border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-100 rounded-full p-1.5">
                <Zap className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <span className="text-sm text-indigo-900">
                <span className="font-medium">Automação disponível:</span> A APIVOX pode configurar follow-ups automáticos via WhatsApp + IA para seu negócio
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-700 bg-white/50">
              Gerenciado pela APIVOX
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ação ou oportunidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
              
              <Button 
                onClick={handleStartCreate}
                className="gap-2"
                variant={hasPremiumAccess ? 'default' : 'outline'}
              >
                <Plus className="h-4 w-4" />
                {hasPremiumAccess ? 'Novo Follow-up' : 'Upgrade para Criar'}
              </Button>
            </div>
          </div>

          {filteredFollowUps.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-full p-6 w-fit mx-auto mb-4">
              <Clock className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum follow-up pendente
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Acompanhe cada lead do primeiro contato até o fechamento. Ative o acompanhamento automatizado com a APIVOX.'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={handleStartCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Follow-up
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFollowUps.map((fu) => (
              <Card 
                key={fu.id} 
                className={`hover:shadow-md transition-shadow ${
                  fu.status === 'overdue' ? 'border-red-200 bg-red-50/30' : 
                  fu.status === 'done' ? 'bg-secondary/30' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Action + Opportunity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(fu.status, fu.due_date)}
                        <span className="text-sm text-muted-foreground">
                          {formatDate(fu.due_date)}
                        </span>
                      </div>
                      
                      <h4 className={`font-medium text-foreground ${
                        fu.status === 'done' ? 'line-through text-muted-foreground' : ''
                      }`}>
                        {fu.action}
                      </h4>
                      
                      {fu.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {fu.description}
                        </p>
                      )}
                      
                      {/* Opportunity Link */}
                      {fu.opportunity && (
                        <Link 
                          to={`/opportunities?id=${fu.opportunity.id}`}
                          className="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:underline"
                        >
                          <Briefcase className="h-3.5 w-3.5" />
                          {fu.opportunity.name}
                          {fu.opportunity.contact_phone && (
                            <span className="text-muted-foreground flex items-center gap-1 ml-2">
                              <Phone className="h-3 w-3" />
                              {fu.opportunity.contact_phone}
                            </span>
                          )}
                        </Link>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1">
                      {fu.status !== 'done' && fu.status !== 'canceled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600"
                          onClick={() => handleComplete(fu.id)}
                          title="Concluir"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {fu.status !== 'done' && fu.status !== 'canceled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSendMessage(fu)}
                          title="Enviar mensagem"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}

                      {fu.status !== 'done' && fu.status !== 'canceled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleReschedule(fu.id)}
                          title="Reagendar"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => handleDelete(fu.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Opportunity Selector Dialog */}
      <Dialog open={showOpportunitySelector} onOpenChange={setShowOpportunitySelector}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Oportunidade</DialogTitle>
            <DialogDescription>
              Escolha uma oportunidade para criar o follow-up
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            {opportunities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">Nenhuma oportunidade disponível</p>
                <p className="text-sm">Crie uma oportunidade primeiro</p>
              </div>
            ) : (
              <div className="space-y-2">
                {opportunities
                  .filter(opp => opp.stage !== 'fechado' && opp.stage !== 'perdido')
                  .map((opp) => (
                    <button
                      key={opp.id}
                      onClick={() => handleSelectOpportunity(opp.id)}
                      className="w-full text-left p-4 rounded-lg border border-border hover:border-blue-400 hover:bg-blue-50/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground group-hover:text-blue-700">
                            {opp.name}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {opp.contact_name || opp.contact_phone || 'Sem contato'}
                          </p>
                          {opp.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {opp.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">
                            {opp.stage === 'descoberta' ? 'Descoberta' :
                             opp.stage === 'proposta' ? 'Proposta' :
                             opp.stage === 'negociacao' ? 'Negociação' : opp.stage}
                          </Badge>
                          {opp.value && (
                            <p className="text-sm font-medium mt-1">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(opp.value)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button 
              variant="outline"
              onClick={() => setShowOpportunitySelector(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Modal - oportunidade já preenchida */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Follow-up</DialogTitle>
            <DialogDescription>
              {selectedOpportunityId && opportunities.find(o => o.id === selectedOpportunityId)?.name 
                ? `Criando follow-up para: ${opportunities.find(o => o.id === selectedOpportunityId)?.name}`
                : 'Crie uma ação para acompanhar uma oportunidade'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreate} className="space-y-4 pt-4">
            {/* Oportunidade pré-selecionada - mostra como info, não como select */}
            {selectedOpportunityId && (
              <div className="space-y-2">
                <Label>Oportunidade</Label>
                <div className="p-3 bg-muted rounded-md border">
                  <p className="font-medium">
                    {opportunities.find(o => o.id === selectedOpportunityId)?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {opportunities.find(o => o.id === selectedOpportunityId)?.contact_phone}
                  </p>
                </div>
                <input type="hidden" value={selectedOpportunityId} />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="action">Ação *</Label>
              <Input
                id="action"
                placeholder="Ex: Enviar proposta, Ligar cliente..."
                value={action}
                onChange={(e) => setAction(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Data *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueTime">Hora *</Label>
                <Input
                  id="dueTime"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedOpportunityId('');
                }}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={submitting || !action.trim() || !dueDate || !selectedOpportunityId}
              >
                {submitting ? 'Criando...' : 'Criar Follow-up'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
