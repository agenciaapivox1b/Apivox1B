// =====================================================
// FOLLOW-UP SUMMARY - Resumo de follow-up na tela principal
// 
// Componente para mostrar o próximo follow-up e ações rápidas
// diretamente na listagem de oportunidades (cards do funil)
// =====================================================

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  RotateCcw,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { followUpService, type FollowUp } from '@/services/crmService';

interface FollowUpSummaryProps {
  opportunityId: string;
  onFollowUpChange?: () => void;
}

export default function FollowUpSummary({ opportunityId, onFollowUpChange }: FollowUpSummaryProps) {
  const [nextFollowUp, setNextFollowUp] = useState<FollowUp | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form states
  const [action, setAction] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('12:00');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadNextFollowUp();
  }, [opportunityId]);

  const loadNextFollowUp = async () => {
    try {
      setLoading(true);
      const followUp = await followUpService.getNextPending(opportunityId);
      setNextFollowUp(followUp);
    } catch (error) {
      console.error('Erro ao carregar follow-up:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!nextFollowUp) return;
    
    try {
      await followUpService.updateStatus(nextFollowUp.id, 'done');
      toast.success('Follow-up concluído!');
      loadNextFollowUp();
      onFollowUpChange?.();
    } catch (error: any) {
      toast.error('Erro ao concluir: ' + error.message);
    }
  };

  const handleReschedule = async () => {
    if (!nextFollowUp) return;
    
    const newDate = prompt('Nova data (YYYY-MM-DD):');
    if (!newDate) return;
    
    const newTime = prompt('Nova hora (HH:MM):', '12:00');
    if (!newTime) return;

    try {
      const newDateTime = new Date(`${newDate}T${newTime}`).toISOString();
      await followUpService.reschedule(nextFollowUp.id, newDateTime);
      toast.success('Follow-up reagendado!');
      loadNextFollowUp();
      onFollowUpChange?.();
    } catch (error: any) {
      toast.error('Erro ao reagendar: ' + error.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action.trim() || !dueDate) return;

    try {
      setSubmitting(true);
      const dueDateTime = new Date(`${dueDate}T${dueTime}`).toISOString();
      
      await followUpService.create({
        opportunity_id: opportunityId,
        action: action.trim(),
        due_date: dueDateTime,
      });
      
      toast.success('Follow-up criado!');
      setAction('');
      setDueDate('');
      setDueTime('12:00');
      setShowCreateModal(false);
      loadNextFollowUp();
      onFollowUpChange?.();
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
      return `Atrasado (${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })})`;
    }
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string, dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isPast = date < now && !isToday;
    
    if (isPast || status === 'overdue') {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    if (isToday) {
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusIcon = (status: string, dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isPast = date < now && !isToday;
    
    if (isPast || status === 'overdue') {
      return <AlertCircle className="h-3 w-3" />;
    }
    if (isToday) {
      return <Clock className="h-3 w-3" />;
    }
    return <Calendar className="h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground animate-pulse">
        Carregando...
      </div>
    );
  }

  // Sem follow-up - mostrar botão para criar
  if (!nextFollowUp) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add follow-up
        </Button>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Novo Follow-up</DialogTitle>
              <DialogDescription>
                Crie uma ação para acompanhar esta oportunidade
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="action">Ação *</Label>
                <Input
                  id="action"
                  placeholder="Ex: Enviar proposta, Ligar..."
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
              
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={submitting || !action.trim() || !dueDate}
                >
                  {submitting ? 'Criando...' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Com follow-up - mostrar resumo e ações rápidas
  return (
    <>
      <div className={`flex items-center gap-2 px-2 py-1 rounded-md border text-xs ${getStatusColor(nextFollowUp.status, nextFollowUp.due_date)}`}>
        {getStatusIcon(nextFollowUp.status, nextFollowUp.due_date)}
        <span className="truncate max-w-[120px]">{nextFollowUp.action}</span>
        <span className="opacity-75">•</span>
        <span className="opacity-75">{formatDate(nextFollowUp.due_date)}</span>
      </div>
      
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-green-600"
          onClick={handleComplete}
          title="Concluir"
        >
          <CheckCircle2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleReschedule}
          title="Reagendar"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowCreateModal(true)}
          title="Novo follow-up"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Modal para criar novo quando já existe um */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Novo Follow-up</DialogTitle>
            <DialogDescription>
              Crie outra ação para esta oportunidade
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="action2">Ação *</Label>
              <Input
                id="action2"
                placeholder="Ex: Enviar proposta, Ligar..."
                value={action}
                onChange={(e) => setAction(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dueDate2">Data *</Label>
                <Input
                  id="dueDate2"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueTime2">Hora *</Label>
                <Input
                  id="dueTime2"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={submitting || !action.trim() || !dueDate}
              >
                {submitting ? 'Criando...' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
