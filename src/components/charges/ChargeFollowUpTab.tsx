import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, Clock, CheckCircle2, Calendar, Phone, 
  Eye, RefreshCw, Search, Lightbulb
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import FollowUpActionModal from '@/components/opportunities/FollowUpActionModal';
import { toast } from 'sonner';
import type { Charge } from '@/types';

export type FollowUpStatus = 'pending' | 'scheduled' | 'done';

interface ChargeFollowUpTabProps {
  charges: Charge[];
}

export default function ChargeFollowUpTab({ charges }: ChargeFollowUpTabProps) {
  const [selectedChargeForAction, setSelectedChargeForAction] = useState<Charge | null>(null);
  const [rescheduleCharge, setRescheduleCharge] = useState<Charge | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [activeTab, setActiveTab] = useState<FollowUpStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // No mundo real, aqui filtraríamos cargas 'overdue' ou 'sent' que precisam de atenção
  const followUpCharges = useMemo(() => {
    return charges.filter(c => {
       // Filtro por tab (simulado para o dashboard)
       if (activeTab === 'pending') return c.status === 'overdue' || c.status === 'sent';
       if (activeTab === 'done') return c.status === 'paid';
       return true;
    }).filter(c => 
      c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [charges, activeTab, searchQuery]);

  const counts = useMemo(() => ({
    pending: charges.filter(c => c.status === 'overdue' || c.status === 'sent').length,
    scheduled: 0, // Placeholder para lógica de agendamento futuro
    done: charges.filter(c => c.status === 'paid').length,
  }), [charges]);

  const handleRescheduleConfirm = () => {
    if (!rescheduleDate) {
      toast.error('Selecione uma data para reagendar.');
      return;
    }
    toast.success(`Lembrete de ${rescheduleCharge?.clientName} reagendado!`);
    setRescheduleCharge(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Follow-up de Cobranças</h2>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe cobranças pendentes e tome ações para garantir o recebimento.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['pending', 'scheduled', 'done'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{tab === 'pending' ? 'Pendentes' : tab === 'scheduled' ? 'Agendados' : 'Concluídos'}</span>
              <Badge variant="secondary" className="ml-1">{tab === 'pending' ? counts.pending : tab === 'scheduled' ? counts.scheduled : counts.done}</Badge>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {followUpCharges.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <p className="text-muted-foreground">Nenhuma ação necessária nesta categoria.</p>
          </div>
        ) : (
          followUpCharges.map((charge) => (
            <Card key={charge.id} className="hover:border-primary/50 transition-all overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
                  <div className="p-5 md:w-1/4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={charge.status === 'overdue' ? 'destructive' : 'default'}>
                        {charge.status === 'overdue' ? 'Atrasado' : 'Enviado'}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-lg">{charge.clientName}</h3>
                    <p className="text-xs text-muted-foreground">{charge.clientPhone}</p>
                  </div>

                  <div className="p-5 flex-1 bg-secondary/10">
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Status da Cobrança</span>
                        <p className="text-sm font-semibold">Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.value)} | Vencimento: {new Date(charge.dueDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                         <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1 mb-1">
                           <Lightbulb className="w-3 h-3" /> Sugestão APIVOX
                         </span>
                         <p className="text-sm text-foreground">
                           {charge.status === 'overdue' 
                             ? "Cobrança vencida. Sugerimos enviar lembrete educado oferecendo nova data ou PIX." 
                             : "Cobrança enviada recentemente. Aguarde 24h ou envie confirmação de recebimento."}
                         </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 md:w-1/4 flex flex-col justify-center gap-2">
                    <Button 
                      className="bg-green-600 hover:bg-green-700 gap-2"
                      onClick={() => setSelectedChargeForAction(charge)}
                    >
                      <MessageCircle className="w-4 h-4" /> Cobrar via Whats
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                       <Button variant="outline" size="sm" className="text-xs h-9 gap-1" onClick={() => setRescheduleCharge(charge)}>
                         <RefreshCw className="w-3 h-3" /> Reagendar
                       </Button>
                       <Button variant="outline" size="sm" className="text-xs h-9 gap-1 text-emerald-600 border-emerald-200">
                         <CheckCircle2 className="w-3 h-3" /> Baixar
                       </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Reagendamento */}
      <Dialog open={!!rescheduleCharge} onOpenChange={(open) => !open && setRescheduleCharge(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Reagendar Lembrete</DialogTitle>
            <DialogDescription>Escolha quando quer ser lembrado de cobrar {rescheduleCharge?.clientName}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
            <Input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRescheduleCharge(null)}>Cancelar</Button>
            <Button onClick={handleRescheduleConfirm}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
