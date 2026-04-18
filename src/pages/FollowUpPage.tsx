import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageCircle, Clock, CheckCircle2, Calendar, Phone, 
  Eye, RefreshCw, Plus, Search, AlertTriangle, DollarSign,
  Users, TrendingUp, User, Target, Megaphone
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { followUpService } from '@/services/crmService';
import type { FollowUpRecord } from '@/services/crmService';
import { TenantService } from '@/services/tenantService';
import { toast } from 'sonner';

type FollowUpType = 'commercial' | 'billing' | 'post_sale';
type FollowUpStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';

const FOLLOWUP_TYPES = {
  commercial: {
    label: 'Comercial',
    icon: TrendingUp,
    color: 'bg-blue-500',
    description: 'Ações de vendas e negociação'
  },
  billing: {
    label: 'Financeiro', 
    icon: DollarSign,
    color: 'bg-orange-500',
    description: 'Cobranças e pagamentos'
  },
  post_sale: {
    label: 'Pós-venda',
    icon: Users,
    color: 'bg-green-500', 
    description: 'Relacionamento e upsell'
  }
} as const;

const STRATEGIES = {
  commercial: [
    'Fazer follow-up por WhatsApp',
    'Enviar proposta comercial',
    'Agendar reunião de apresentação',
    'Ligar para qualificar necessidade',
    'Enviar estudo de caso similar',
    'Oferecer demonstração gratuita'
  ],
  billing: [
    'Enviar lembrete de pagamento',
    'Verificar status do boleto/Pix',
    'Oferecer novo plano de pagamento',
    'Confirmar recebimento',
    'Negociar parcelamento',
    'Enviar segunda via'
  ],
  post_sale: [
    'Solicitar feedback sobre serviço',
    'Oferecer upgrade ou produto adicional',
    'Agendar reunião de acompanhamento',
    'Enviar material de suporte',
    'Verificar satisfação do cliente',
    'Apresentar novos recursos'
  ]
};

export default function FollowUpPage() {
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<FollowUpType>('commercial');
  const [selectedStatus, setSelectedStatus] = useState<FollowUpStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpRecord | null>(null);
  const [rescheduleFollowUp, setRescheduleFollowUp] = useState<FollowUpRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  useEffect(() => {
    loadFollowUps();
  }, []);

  const loadFollowUps = async () => {
    try {
      setLoading(true);
      const tenantId = await TenantService.getCurrentTenantId();
      
      if (!tenantId) {
        console.error('[FollowUpPage] Tenant ID não encontrado');
        toast.error('Erro ao carregar follow-ups: tenant não encontrado');
        return;
      }
      
      const data = await followUpService.list();
      setFollowUps(data);
    } catch (error: any) {
      console.error('Erro ao carregar follow-ups:', error);
      
      // Tratamento específico para erros conhecidos
      if (error.message?.includes('tenant') || error.message?.includes('401')) {
        toast.error('Erro de autenticação. Faça login novamente.');
      } else if (error.message?.includes('42501') || error.message?.includes('permission')) {
        toast.error('Sem permissão para acessar follow-ups. Verifique as configurações.');
      } else {
        toast.error(error.message || 'Erro ao carregar follow-ups');
      }
      
      setFollowUps([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredFollowUps = followUps.filter(fu => {
    const matchesType = fu.context === selectedType;
    const matchesStatus = fu.status === selectedStatus;
    const matchesSearch = searchQuery === '' || 
      fu.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fu.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const handleComplete = async (followUp: FollowUpRecord) => {
    try {
      await followUpService.complete(followUp.id);
      toast.success('Follow-up concluído com sucesso!');
      await loadFollowUps();
    } catch (error) {
      toast.error('Erro ao concluir follow-up');
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleFollowUp) {
      toast.error('Selecione data e hora');
      return;
    }

    try {
      const newDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
      await followUpService.updateSchedule(rescheduleFollowUp.id, newDateTime);
      toast.success('Follow-up reagendado com sucesso!');
      setRescheduleFollowUp(null);
      setRescheduleDate('');
      setRescheduleTime('');
      await loadFollowUps();
    } catch (error) {
      toast.error('Erro ao reagendar follow-up');
    }
  };

  const getTypeConfig = (type: FollowUpType) => FOLLOWUP_TYPES[type];
  const getStatusColor = (status: FollowUpStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'scheduled': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStrategyForContext = (context: FollowUpType, urgency: 'high' | 'medium' | 'low') => {
    const strategies = STRATEGIES[context];
    
    // Estratégias baseadas na urgência e contexto
    if (urgency === 'high') {
      if (context === 'commercial') return 'Ligar para qualificar necessidade';
      if (context === 'billing') return 'Enviar lembrete de pagamento';
      if (context === 'post_sale') return 'Verificar satisfação do cliente';
    }
    
    if (urgency === 'medium') {
      if (context === 'commercial') return 'Fazer follow-up por WhatsApp';
      if (context === 'billing') return 'Verificar status do boleto/Pix';
      if (context === 'post_sale') return 'Solicitar feedback sobre serviço';
    }
    
    // low urgency
    if (context === 'commercial') return 'Enviar estudo de caso similar';
    if (context === 'billing') return 'Oferecer novo plano de pagamento';
    if (context === 'post_sale') return 'Oferecer upgrade ou produto adicional';
    
    return strategies[0]; // fallback
  };

  const getUrgencyLevel = (scheduledAt: string): 'high' | 'medium' | 'low' => {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diffHours = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return 'high'; // Atrasado
    if (diffHours < 24) return 'high'; // Menos de 24h
    if (diffHours < 72) return 'medium'; // Menos de 3 dias
    return 'low'; // Mais de 3 dias
  };

  const counts = {
    commercial: followUps.filter(fu => fu.context === 'commercial').length,
    billing: followUps.filter(fu => fu.context === 'billing').length,
    post_sale: followUps.filter(fu => fu.context === 'post_sale').length,
  };

  if (selectedFollowUp) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => setSelectedFollowUp(null)} className="mb-4">
            Voltar
          </Button>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{selectedFollowUp.title}</h2>
                  <Badge className={getTypeConfig(selectedFollowUp.context).color}>
                    {getTypeConfig(selectedFollowUp.context).label}
                  </Badge>
                </div>
                
                {selectedFollowUp.description && (
                  <p className="text-muted-foreground">{selectedFollowUp.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Agendado para:</span>
                    <p className="font-medium">
                      {new Date(selectedFollowUp.scheduled_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <p className="font-medium">{selectedFollowUp.status}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={() => handleComplete(selectedFollowUp)}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Concluir
                  </Button>
                  <Button variant="outline" onClick={() => setRescheduleFollowUp(selectedFollowUp)}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Reagendar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Follow-up</h1>
          <p className="text-muted-foreground mt-1">Fila de ações comerciais, financeiras e de pós-venda</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2 w-full md:w-auto">
          <Plus className="w-4 h-4" />
          Novo Follow-up
        </Button>
      </div>

      {/* Cards de contagem por tipo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(FOLLOWUP_TYPES).map(([type, config]) => {
          const IconComponent = config.icon;
          const count = counts[type as FollowUpType];
          
          return (
            <Card 
              key={type}
              className={`cursor-pointer transition-all ${
                selectedType === type ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedType(type as FollowUpType)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{config.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
                  </div>
                  <div className={`p-3 rounded-full ${config.color} bg-opacity-10`}>
                    <IconComponent className={`w-6 h-6 ${config.color.replace('bg-', 'text-')}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar follow-up..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card w-64"
          />
        </div>
        
        <div className="flex gap-2">
          {(['pending', 'scheduled', 'completed'] as FollowUpStatus[]).map(status => (
            <Button
              key={status}
              variant={selectedStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus(status)}
            >
              {status === 'pending' && 'Pendentes'}
              {status === 'scheduled' && 'Agendados'}
              {status === 'completed' && 'Concluídos'}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista de Follow-ups */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : filteredFollowUps.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Nenhum follow-up encontrado</h3>
              <p className="text-muted-foreground">
                {selectedType === 'commercial' && 'Nenhuma ação comercial pendente'}
                {selectedType === 'billing' && 'Nenhuma ação financeira pendente'}
                {selectedType === 'post_sale' && 'Nenhuma ação de pós-venda pendente'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredFollowUps.map((followUp) => {
              const typeConfig = getTypeConfig(followUp.context);
              const TypeIcon = typeConfig.icon;
              const isOverdue = new Date(followUp.scheduled_at) < new Date();
              
              return (
                <Card key={followUp.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-full ${typeConfig.color} bg-opacity-10`}>
                            <TypeIcon className={`w-4 h-4 ${typeConfig.color.replace('bg-', 'text-')}`} />
                          </div>
                          <div>
                            <h4 className="font-semibold">{followUp.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={typeConfig.color}>
                                {typeConfig.label}
                              </Badge>
                              <Badge className={getStatusColor(followUp.status)}>
                                {followUp.status}
                              </Badge>
                              {isOverdue && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Atrasado
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {followUp.description && (
                          <p className="text-muted-foreground mb-3">{followUp.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(followUp.scheduled_at).toLocaleString('pt-BR')}
                          </div>
                          
                          {followUp.opportunities && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              {followUp.opportunities.name}
                            </div>
                          )}
                          
                          {followUp.charges && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {followUp.charges.customer_name}
                            </div>
                          )}
                        </div>

                        {/* Estratégia sugerida */}
                        <div className="mt-3 p-3 bg-secondary rounded-lg">
                          <p className="text-sm font-medium text-foreground">
                            Estratégia sugerida: {getStrategyForContext(followUp.context, getUrgencyLevel(followUp.scheduled_at))}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm"
                          onClick={() => setSelectedFollowUp(followUp)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        
                        {followUp.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setRescheduleFollowUp(followUp)}
                            >
                              <Calendar className="w-4 h-4 mr-1" />
                              Agendar
                            </Button>
                            
                            <Button 
                              size="sm"
                              onClick={() => handleComplete(followUp)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Concluir
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de reagendamento */}
      <Dialog open={!!rescheduleFollowUp} onOpenChange={(open) => !open && setRescheduleFollowUp(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Reagendar Follow-up
            </DialogTitle>
            <DialogDescription>
              {rescheduleFollowUp?.title} - escolha data e hora
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Data</label>
              <input
                type="date"
                value={rescheduleDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Horário</label>
              <input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRescheduleFollowUp(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleReschedule}>
              <Calendar className="w-4 h-4 mr-2" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
