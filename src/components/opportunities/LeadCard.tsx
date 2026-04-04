import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Opportunity } from '@/services/crmService';
import {
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  Eye,
  MessageSquare,
  History,
  Tag
} from 'lucide-react';

interface LeadCardProps {
  lead: Opportunity;
  onViewDetails: (lead: Opportunity) => void;
  onCreateFollowUp: (lead: Opportunity) => void;
  onMoveStage?: (lead: Opportunity) => void;
  onViewHistory?: (lead: Opportunity) => void;
}

export default function LeadCard({
  lead,
  onViewDetails,
  onCreateFollowUp,
  onMoveStage,
  onViewHistory
}: LeadCardProps) {
  const getPriorityStyles = (type: string) => {
    switch (type) {
      case 'post_sale': return 'bg-purple-500/10 text-purple-600 border-purple-200/50';
      case 'up_sell': return 'bg-orange-500/10 text-orange-600 border-orange-200/50';
      case 'cross_sell': return 'bg-amber-500/10 text-amber-600 border-amber-200/50';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-200/50';
    }
  };

  const getStageStyles = (status: string) => {
    const colors: Record<string, string> = {
      'descoberta': 'bg-blue-500/20 border-blue-300/30 text-blue-300',
      'proposta': 'bg-cyan-500/20 border-cyan-300/30 text-cyan-300',
      'negociacao': 'bg-yellow-500/20 border-yellow-300/30 text-yellow-300',
      'fechado': 'bg-green-500/20 border-green-300/30 text-green-300',
      'perdido': 'bg-rose-500/20 border-rose-300/30 text-rose-300'
    };
    return colors[status] || 'bg-slate-500/20 border-slate-300/30 text-slate-300';
  };

  // Helper para formatar data comparativa
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'hoje';
    if (diff === 1) return 'ontem';
    return `há ${diff} dias`;
  };

  return (
    <Card className="bg-card border-border/50 hover:border-primary/30 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md">
      <CardContent className="p-5 space-y-4">
        {/* HEADER: Nome + Responsável */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground truncate">{lead.name}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Tag className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate capitalize">{lead.origin}</span>
            </div>
          </div>
          <Badge className={`text-[10px] font-extrabold px-2 py-1 whitespace-nowrap ${getPriorityStyles(lead.type)}`}>
            {lead.type.toUpperCase().replace('_', ' ')}
          </Badge>
        </div>

        {/* ETAPA + INTERAÇÃO */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`text-[10px] font-bold border uppercase tracking-wider ${getStageStyles(lead.status)}`}>
            {lead.status}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(lead.updated_at)}
          </div>
        </div>

        {/* RESUMO + DIAGNÓSTICO (IA) */}
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground line-clamp-2">{lead.description}</p>
          {lead.metadata?.classification?.intent && (
            <p className="text-xs text-primary/80 font-medium bg-primary/5 p-2 rounded-md border border-primary/10">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              Intenção IA: {lead.metadata.classification.intent}
            </p>
          )}
        </div>

        {/* VALOR + PROBABILIDADE */}
        <div className="flex items-center gap-4 bg-secondary/30 rounded-lg p-3">
          <div className="flex-1 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500/70" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Valor Estimado</p>
              <p className="text-sm font-bold text-foreground">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact'
                }).format(Number(lead.amount))}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-medium">Confiança</p>
            <p className="text-sm font-bold text-green-500/80">{lead.probability}%</p>
          </div>
        </div>

        {/* AÇÕES */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full text-xs font-semibold h-9"
            onClick={() => onViewDetails(lead)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Detalhes
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-full text-xs h-9 bg-secondary/20 hover:bg-secondary/40"
            onClick={() => onViewHistory?.(lead)}
          >
            <History className="w-4 h-4 mr-2" />
            Histórico
          </Button>
          
          <Button
            type="button"
            size="sm"
            className="col-span-2 w-full text-sm font-bold py-5 rounded-xl shadow-lg hover:shadow-primary/20 transition-all border-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            onClick={() => onCreateFollowUp(lead)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Falar com Cliente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
