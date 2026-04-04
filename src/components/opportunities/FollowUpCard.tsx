import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FollowUpRecord } from '@/services/crmService';
import {
  Phone as PhoneIcon,
  Clock,
  CheckCircle2,
  Send,
  MessageSquare,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface FollowUpCardProps {
  followUp: FollowUpRecord;
  onSendMessage?: (followUp: FollowUpRecord) => void;
  onReschedule?: (followUp: FollowUpRecord) => void;
  onMarkComplete?: (followUp: FollowUpRecord) => void;
  onViewHistory?: (followUp: FollowUpRecord) => void;
}

export default function FollowUpCard({
  followUp,
  onSendMessage,
  onReschedule,
  onMarkComplete,
  onViewHistory
}: FollowUpCardProps) {
  
  const clientName = (followUp.opportunities as any)?.name || (followUp.charges as any)?.customer_name || 'Cliente';

  const getContextStyles = (context: string) => {
    switch (context) {
      case 'commercial': return 'bg-blue-500/10 text-blue-600 border-blue-200/50';
      case 'billing': return 'bg-amber-500/10 text-amber-600 border-amber-200/50';
      case 'post_sale': return 'bg-purple-500/10 text-purple-600 border-purple-200/50';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-200/50';
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-red-500/10 text-red-600 border-red-200/50';
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-200/50';
      case 'cancelled': return 'bg-slate-500/10 text-slate-600 border-slate-200/50';
      default: return '';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <Card className="bg-card border-border/50 hover:border-primary/30 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md">
      <CardContent className="p-5 space-y-4">
        {/* HEADER: Nome + Contexto */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground truncate">{clientName}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground italic">
               ID: {followUp.id.split('-')[0]}
            </div>
          </div>
          <Badge className={`text-[10px] font-extrabold px-2 py-1 whitespace-nowrap border capitalize ${getContextStyles(followUp.context)}`}>
            {followUp.context.replace('_', ' ')}
          </Badge>
        </div>

        {/* STATUS + DATA */}
        <div className="flex items-center gap-2">
          <Badge className={`text-[10px] font-bold border uppercase tracking-wider ${getStatusStyles(followUp.status)}`}>
            {followUp.status}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(followUp.scheduled_at)}
          </div>
          {followUp.type === 'automated' && (
            <Badge variant="outline" className="ml-auto text-[9px] bg-primary/5 text-primary border-primary/20">
               Sugerido por IA
            </Badge>
          )}
        </div>

        {/* MENSAGEM / TITULO */}
        <div className="space-y-2.5 bg-secondary/20 rounded-lg p-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Ação necessária</p>
            <p className="text-sm font-bold text-foreground">{followUp.title}</p>
          </div>
          {followUp.description && (
            <div className="border-t border-border/50 pt-2.5">
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Observação</p>
              <p className="text-sm text-muted-foreground">{followUp.description}</p>
            </div>
          )}
        </div>

        {/* AÇÕES */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          {followUp.status === 'pending' ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-9 border-border/50 hover:bg-red-500/5 hover:text-red-500 transition-colors"
                onClick={() => onMarkComplete?.(followUp)}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Fechar
              </Button>
              <Button
                size="sm"
                className="text-xs h-9 font-bold bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => onSendMessage?.(followUp)}
              >
                <Send className="w-4 h-4 mr-2" />
                Interagir
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-[10px] h-8 col-span-2 text-muted-foreground hover:bg-secondary/10"
                onClick={() => onReschedule?.(followUp)}
              >
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Adiar esta ação
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="col-span-2 text-xs h-9 border-border/50 hover:bg-secondary/10"
              onClick={() => onViewHistory?.(followUp)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Ver Registro Completo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
