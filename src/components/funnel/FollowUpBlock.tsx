// =====================================================
// FOLLOW-UP BLOCK - Sistema de Ações/Tarefas
// 
// Componente separado para gerenciar follow-ups
// dentro da tela de detalhe da oportunidade
// =====================================================

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Calendar, 
  RotateCcw,
  Trash2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { followUpService, type FollowUp, type CreateFollowUpData } from '@/services/crmService';

interface FollowUpBlockProps {
  opportunityId: string;
}

export default function FollowUpBlock({ opportunityId }: FollowUpBlockProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [nextFollowUp, setNextFollowUp] = useState<FollowUp | null>(null);

  // Form states
  const [action, setAction] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('12:00');
  const [submitting, setSubmitting] = useState(false);

  // Carregar follow-ups
  useEffect(() => {
    loadFollowUps();
  }, [opportunityId]);

  const loadFollowUps = async () => {
    try {
      setLoading(true);
      const data = await followUpService.listByOpportunity(opportunityId);
      setFollowUps(data);
      
      // Encontrar próximo follow-up pendente
      const pending = data.find(f => f.status === 'pending' || f.status === 'overdue');
      setNextFollowUp(pending || null);
    } catch (error: any) {
      console.error('Erro ao carregar follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  // Criar novo follow-up
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action.trim() || !dueDate) return;

    try {
      setSubmitting(true);
      const dueDateTime = new Date(`${dueDate}T${dueTime}`).toISOString();
      
      const data: CreateFollowUpData = {
        opportunity_id: opportunityId,
        action: action.trim(),
        description: description.trim() || undefined,
        due_date: dueDateTime,
      };

      await followUpService.create(data);
      toast.success('Follow-up criado com sucesso!');
      
      // Reset form
      setAction('');
      setDescription('');
      setDueDate('');
      setDueTime('12:00');
      setShowNewForm(false);
      
      // Recarregar
      loadFollowUps();
    } catch (error: any) {
      toast.error('Erro ao criar follow-up: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Marcar como concluído
  const handleComplete = async (id: string) => {
    try {
      await followUpService.updateStatus(id, 'done');
      toast.success('Follow-up concluído!');
      loadFollowUps();
    } catch (error: any) {
      toast.error('Erro ao concluir: ' + error.message);
    }
  };

  // Reagendar
  const handleReschedule = async (id: string) => {
    const newDate = prompt('Nova data (YYYY-MM-DD):');
    if (!newDate) return;
    
    const newTime = prompt('Nova hora (HH:MM):', '12:00');
    if (!newTime) return;

    try {
      const newDateTime = new Date(`${newDate}T${newTime}`).toISOString();
      await followUpService.reschedule(id, newDateTime);
      toast.success('Follow-up reagendado!');
      loadFollowUps();
    } catch (error: any) {
      toast.error('Erro ao reagendar: ' + error.message);
    }
  };

  // Deletar
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este follow-up?')) return;
    
    try {
      await followUpService.delete(id);
      toast.success('Follow-up removido!');
      loadFollowUps();
    } catch (error: any) {
      toast.error('Erro ao remover: ' + error.message);
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isPast = date < now;
    
    if (isToday) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Atrasado</Badge>;
      case 'done':
        return <Badge variant="default" className="bg-green-500 gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído</Badge>;
      case 'canceled':
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Indicador visual para data
  const getDateIndicator = (dueDate: string, status: string) => {
    if (status === 'done' || status === 'canceled') return null;
    
    const date = new Date(dueDate);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isPast = date < now && !isToday;
    const diffHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (isPast || status === 'overdue') {
      return <span className="text-red-500 font-bold">🔴</span>;
    }
    if (isToday) {
      return <span className="text-yellow-500 font-bold">🟡</span>;
    }
    if (diffHours <= 24) {
      return <span className="text-yellow-500 font-bold">🟡</span>;
    }
    return <span className="text-green-500 font-bold">🟢</span>;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Follow-up
          </CardTitle>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowNewForm(!showNewForm)}
            className="gap-1"
          >
            {showNewForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showNewForm ? 'Cancelar' : 'Novo Follow-up'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Formulário de Novo Follow-up */}
        {showNewForm && (
          <form onSubmit={handleCreate} className="space-y-3 p-3 bg-secondary/30 rounded-lg">
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
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                placeholder="Detalhes da ação..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
            
            <div className="flex gap-2 pt-2">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowNewForm(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                size="sm" 
                disabled={submitting || !action.trim() || !dueDate}
              >
                {submitting ? 'Criando...' : 'Criar Follow-up'}
              </Button>
            </div>
          </form>
        )}

        {/* Próximo Follow-up (Destaque) */}
        {!loading && nextFollowUp && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold">
                  Próximo Follow-up
                </p>
                <p className="font-medium">{nextFollowUp.action}</p>
                {nextFollowUp.description && (
                  <p className="text-sm text-muted-foreground">{nextFollowUp.description}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {getDateIndicator(nextFollowUp.due_date, nextFollowUp.status)}
                  <span className={`text-sm ${
                    nextFollowUp.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-muted-foreground'
                  }`}>
                    {formatDate(nextFollowUp.due_date)}
                  </span>
                  {getStatusBadge(nextFollowUp.status)}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-green-600"
                  onClick={() => handleComplete(nextFollowUp.id)}
                  title="Concluir"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => handleReschedule(nextFollowUp.id)}
                  title="Reagendar"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Follow-ups (Timeline) */}
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">
            Carregando follow-ups...
          </div>
        ) : followUps.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum follow-up cadastrado</p>
            <p className="text-xs mt-1">Crie um follow-up para acompanhar a próxima ação</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase font-semibold">
              Histórico ({followUps.length})
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {followUps.map((followUp) => (
                <div 
                  key={followUp.id}
                  className={`p-3 rounded-lg border ${
                    followUp.status === 'done' 
                      ? 'bg-secondary/30 border-secondary/50' 
                      : followUp.status === 'overdue'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-card border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getDateIndicator(followUp.due_date, followUp.status)}
                        <p className={`font-medium text-sm truncate ${
                          followUp.status === 'done' ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {followUp.action}
                        </p>
                      </div>
                      {followUp.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {followUp.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(followUp.due_date)}
                        </span>
                        {getStatusBadge(followUp.status)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {followUp.status !== 'done' && followUp.status !== 'canceled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-green-600"
                          onClick={() => handleComplete(followUp.id)}
                          title="Concluir"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500"
                        onClick={() => handleDelete(followUp.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
