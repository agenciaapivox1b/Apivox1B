import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, Clock, CheckCircle2, Calendar, Phone, 
  Eye, RefreshCw, Plus, Search, Lightbulb, AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import LeadDetailPanel from '@/components/LeadDetailPanel';
import FollowUpActionModal from '@/components/opportunities/FollowUpActionModal';
import { mockLeads, Lead } from '@/data/mockSalesData';
import { toast } from 'sonner';

export type FollowUpStatus = 'pending' | 'scheduled' | 'done';

/**
 * Tipo estendido para Follow-up com status e data agendada
 */
interface FollowUpLead extends Lead {
  followUpStatus?: FollowUpStatus;
  scheduledAt?: string;
}

export default function FollowUpPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadForAction, setSelectedLeadForAction] = useState<FollowUpLead | null>(null);
  const [rescheduleLead, setRescheduleLead] = useState<FollowUpLead | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<FollowUpStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Estender leads com status de follow-up simulado
  const followUpLeadsExtended: FollowUpLead[] = useMemo(() => {
    return mockLeads
      .filter(l => l.status === 'Follow-up' && !completedIds.includes(l.id))
      .map((lead, idx) => ({
        ...lead,
        followUpStatus: (idx % 3 === 0 ? 'pending' : idx % 3 === 1 ? 'scheduled' : 'done') as FollowUpStatus,
        scheduledAt: idx % 3 === 1 
          ? new Date(Date.now() + (idx * 86400000 + 43200000)).toISOString()
          : undefined
      }));
  }, [completedIds]);

  // Filtrar por tab e busca
  const filteredLeads = useMemo(() => {
    return followUpLeadsExtended
      .filter(l => l.followUpStatus === activeTab)
      .filter(l => 
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.reason.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [followUpLeadsExtended, activeTab, searchQuery]);

  // Contar por status
  const counts = useMemo(() => ({
    pending: followUpLeadsExtended.filter(l => l.followUpStatus === 'pending').length,
    scheduled: followUpLeadsExtended.filter(l => l.followUpStatus === 'scheduled').length,
    done: followUpLeadsExtended.filter(l => l.followUpStatus === 'done').length,
  }), [followUpLeadsExtended]);

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'Atrasado': return 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900';
      case 'Hoje': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-900';
    }
  };

  const handleComplete = (lead: FollowUpLead) => {
    setCompletedIds(prev => [...prev, lead.id]);
    toast.success(`Follow-up de ${lead.name} marcado como concluído!`, {
      description: 'Registrado no histórico de atividades.',
      duration: 3500
    });
  };

  const handleRescheduleConfirm = () => {
    if (!rescheduleDate) {
      toast.error('Selecione uma data para reagendar.');
      return;
    }
    const dateLabel = new Date(`${rescheduleDate}T${rescheduleTime || '09:00'}`)
      .toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    
    toast.success(`Follow-up de ${rescheduleLead?.name} reagendado!`, {
      description: `Próxima ação: ${dateLabel}`,
      duration: 4000
    });
    setRescheduleLead(null);
    setRescheduleDate('');
    setRescheduleTime('');
  };

  if (selectedLead) {
    return <LeadDetailPanel lead={selectedLead as any} onBack={() => setSelectedLead(null)} />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Follow-up</h1>
          <p className="text-muted-foreground mt-1">Execute suas ações comerciais pendentes com sugestões de mensagem.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2 w-full md:w-auto">
          <Plus className="w-4 h-4" />
          Novo Follow-up
        </Button>
      </div>

      {/* BUSCA */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente ou motivo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {/* TABS */}
      <div className="border-b border-border">
        <div className="flex gap-1 -mb-[1px]">
          {(['pending', 'scheduled', 'done'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchQuery('');
              }}
              className={`
                px-4 py-3 text-sm font-semibold tracking-wider uppercase
                transition-all duration-300 ease-out
                border-b-2 -mb-[2px]
                
                ${
                  activeTab === tab
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }
              `}
            >
              <div className="flex items-center gap-2">
                {tab === 'pending' && <Clock className="w-4 h-4" />}
                {tab === 'scheduled' && <Calendar className="w-4 h-4" />}
                {tab === 'done' && <CheckCircle2 className="w-4 h-4" />}
                <span>
                  {tab === 'pending' && 'Pendentes'}
                  {tab === 'scheduled' && 'Agendados'}
                  {tab === 'done' && 'Concluídos'}
                </span>
                <Badge
                  variant="secondary"
                  className={`ml-2 ${
                    activeTab === tab
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted/50'
                  }`}
                >
                  {tab === 'pending' && counts.pending}
                  {tab === 'scheduled' && counts.scheduled}
                  {tab === 'done' && counts.done}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CONTEÚDO DAS TABS */}
      <div className="animate-in fade-in duration-300">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-2xl">
            <div className="space-y-3">
              {activeTab === 'pending' && (
                <>
                  <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                  <h3 className="text-lg font-semibold text-foreground">Nenhum follow-up pendente</h3>
                  <p className="text-sm text-muted-foreground">Parabéns! Todas as suas ações estão em dia.</p>
                </>
              )}
              {activeTab === 'scheduled' && (
                <>
                  <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                  <h3 className="text-lg font-semibold text-foreground">Nenhum follow-up agendado</h3>
                  <p className="text-sm text-muted-foreground">Agende novos follow-ups para organizar seu pipeline.</p>
                </>
              )}
              {activeTab === 'done' && (
                <>
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                  <h3 className="text-lg font-semibold text-foreground">Nenhum follow-up concluído</h3>
                  <p className="text-sm text-muted-foreground">Seus seguimentos completados aparecerão aqui.</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredLeads.map((lead) => (
              <Card key={lead.id} className="bg-card border-border hover:border-primary/50 hover:shadow-lg transition-all overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
                    
                    {/* COLUNA 1: STATUS E PERFIL */}
                    <div className="p-5 md:w-1/4 space-y-3 shrink-0">
                      <div className="flex items-center gap-2">
                        {activeTab === 'pending' && (
                          <Badge variant="outline" className={getUrgencyColor(lead.urgency)}>
                            {lead.urgency || 'No prazo'}
                          </Badge>
                        )}
                        {activeTab === 'scheduled' && (
                          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-0">
                            <Calendar className="w-3 h-3 mr-1" />
                            Agendado
                          </Badge>
                        )}
                        {activeTab === 'done' && (
                          <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-0">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Concluído
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-foreground">{lead.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {lead.phone}
                      </div>
                      {activeTab !== 'done' && lead.lastInteraction && (
                        <div className="pt-1">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">Última Interação</span>
                          <span className="text-sm font-medium text-foreground">{lead.lastInteraction}</span>
                        </div>
                      )}
                    </div>

                    {/* COLUNA 2: MOTIVO E ESTRATÉGIA */}
                    <div className="p-5 flex-1 bg-secondary/[0.03]">
                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">Motivo do Follow-up</span>
                          <p className="text-sm font-semibold text-foreground leading-snug">{lead.reason}</p>
                        </div>
                        
                        {activeTab !== 'done' ? (
                          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-primary flex items-center gap-1.5 mb-1">
                              <Lightbulb className="w-3 h-3" />
                              Estratégia Sugerida
                            </span>
                            <p className="text-sm text-foreground leading-snug">
                              {lead.suggestedApproach || 'Retomar contato via WhatsApp'}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-green-500/10 border border-green-200/20 dark:border-green-900/30 rounded-lg p-3">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-green-700 dark:text-green-300 flex items-center gap-1.5 mb-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Resultado
                            </span>
                            <p className="text-sm text-foreground leading-snug">
                              {lead.suggestedApproach || 'Follow-up concluído com sucesso'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* COLUNA 3: AÇÕES */}
                    <div className="p-5 md:w-1/4 flex flex-col justify-center gap-2">
                      {activeTab === 'pending' && (
                        <>
                          <Button 
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold gap-2 shadow"
                            onClick={() => setSelectedLeadForAction(lead)}
                          >
                            <MessageCircle className="w-4 h-4" />
                            Enviar Msg
                          </Button>
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs h-9 gap-1.5"
                              onClick={() => setRescheduleLead(lead)}
                            >
                              <RefreshCw className="w-3 h-3" /> Reagendar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs h-9 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-950/20 border-emerald-200/30 dark:border-emerald-900"
                              onClick={() => handleComplete(lead)}
                            >
                              <CheckCircle2 className="w-3 h-3" /> Concluir
                            </Button>
                          </div>
                        </>
                      )}

                      {activeTab === 'scheduled' && (
                        <>
                          <Button 
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold gap-2 shadow"
                            onClick={() => setSelectedLeadForAction(lead)}
                          >
                            <MessageCircle className="w-4 h-4" />
                            Enviar Agora
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1.5"
                            onClick={() => setRescheduleLead(lead)}
                          >
                            <Calendar className="w-3 h-3" /> Editar
                          </Button>
                        </>
                      )}

                      {activeTab === 'done' && (
                        <Button 
                          variant="outline" 
                          className="gap-1.5"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver Histórico
                        </Button>
                      )}
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* RESUMO EM CARDS */}
      {filteredLeads.length > 0 && activeTab === 'pending' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-border">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm font-medium">Pendentes</p>
              <p className="text-3xl font-bold text-foreground mt-2">{counts.pending}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm font-medium">Taxa de conclusão</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {counts.done + counts.pending + counts.scheduled > 0 
                  ? Math.round((counts.done / (counts.done + counts.pending + counts.scheduled)) * 100)
                  : 0}%
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm font-medium">Próxima ação</p>
              <p className="text-foreground font-semibold mt-2 text-sm truncate">{filteredLeads[0]?.name}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL DE ENVIO */}
      <FollowUpActionModal
        open={!!selectedLeadForAction}
        onOpenChange={(open) => !open && setSelectedLeadForAction(null)}
        lead={selectedLeadForAction as any}
      />

      {/* MODAL DE REAGENDAMENTO */}
      <Dialog open={!!rescheduleLead} onOpenChange={(open) => !open && setRescheduleLead(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Reagendar Follow-up
            </DialogTitle>
            <DialogDescription>
              {rescheduleLead?.name} — escolha data e hora para o próximo contato.
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
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Horário</label>
              <input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRescheduleLead(null)}>
              Cancelar
            </Button>
            <Button size="sm" className="font-bold gap-2" onClick={handleRescheduleConfirm}>
              <Calendar className="w-4 h-4" /> Confirmar Reagendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
