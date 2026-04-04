import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Opportunity } from '@/services/crmService';
import {
  Lightbulb,
  AlertTriangle,
  Clock,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  Brain
} from 'lucide-react';

interface StrategicCardProps {
  insight: Opportunity;
  onCreateFollowUp?: (insight: Opportunity) => void;
  onViewDetails?: (insight: Opportunity) => void;
}

export default function StrategicCard({
  insight,
  onCreateFollowUp,
  onViewDetails
}: StrategicCardProps) {
  
  const getContextStyles = (type: string) => {
    switch (type) {
      case 'post_sale': return 'bg-purple-500/10 text-purple-600 border-purple-200/50';
      case 'up_sell': return 'bg-orange-500/10 text-orange-600 border-orange-200/50';
      case 'cross_sell': return 'bg-amber-500/10 text-amber-600 border-amber-200/50';
      default: return 'bg-blue-500/10 text-blue-600 border-blue-200/50';
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

  const isStagnant = useMemo(() => {
    const lastUpdate = new Date(insight.updated_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  }, [insight.updated_at]);

  const recommendation = insight.metadata?.classification?.best_action || 'Aguardando próxima interação para análise.';
  const intent = insight.metadata?.classification?.intent || 'Comercial padrão';

  return (
    <Card className={`group bg-card border-border/50 hover:border-primary/40 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md ${
      isStagnant ? 'border-l-4 border-l-rose-500' : ''
    }`}>
      <CardContent className="p-0">
        <div className="p-5 space-y-4">
            {/* HEADER: Nome + Stagnação */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-foreground truncate">{insight.name}</h3>
                {isStagnant && (
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Lead Estagnado
                  </div>
                )}
              </div>
              <Badge className={`text-[10px] font-extrabold px-2 py-1 whitespace-nowrap border capitalize ${getContextStyles(insight.type)}`}>
                {insight.type.replace('_', ' ')}
              </Badge>
            </div>

            {/* STATUS E PREVISÃO */}
            <div className="flex items-center gap-2">
              <Badge className={`text-[10px] font-bold border uppercase tracking-wider ${getStageStyles(insight.status)}`}>
                {insight.status}
              </Badge>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium bg-secondary/20 px-2 py-0.5 rounded">
                <TrendingUp className="w-3.5 h-3.5 text-green-500/70" />
                {insight.probability}% conversão
              </div>
            </div>

            {/* INSIGHT IA PRINCIPAL */}
            <div className="relative rounded-xl p-4 border bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 border-primary/10 group-hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Brain className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest mb-1">Recomendação Estratégica</p>
                        <p className="text-sm font-extrabold text-foreground leading-tight">
                            {recommendation}
                        </p>
                    </div>
                </div>
            </div>

            {/* DETALHES COMPLEMENTARES */}
            <div className="grid grid-cols-1 gap-3">
                <div className="bg-secondary/10 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Diagnóstico do Contexto</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {insight.description || 'Nenhuma análise detalhada disponível.'}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-1">
                    <Badge variant="outline" className="text-[9px] border-primary/20 text-primary/70">
                        Intenção: {intent}
                    </Badge>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                        <Clock className="w-3 h-3" />
                        Atualizado há {Math.max(1, Math.floor((new Date().getTime() - new Date(insight.updated_at).getTime()) / (1000 * 60 * 60 * 24)))} dias
                    </div>
                </div>
            </div>
        </div>

        {/* AÇÕES NO FOOTER DO CARD */}
        <div className="grid grid-cols-2 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            className="rounded-none h-12 text-xs font-bold hover:bg-secondary/30 border-r border-border/50"
            onClick={() => onViewDetails?.(insight)}
          >
            Ver Detalhes
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-none h-12 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10"
            onClick={() => onCreateFollowUp?.(insight)}
          >
            Executar Ação
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useMemo } from 'react';
