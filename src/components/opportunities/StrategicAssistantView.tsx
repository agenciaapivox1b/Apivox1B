import { useState, useMemo } from 'react';
import { Opportunity } from '@/services/crmService';
import StrategicCard from './StrategicCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  AlertTriangle,
  TrendingUp,
  Target
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StrategicAssistantViewProps {
  insights: Opportunity[];
  onCreateFollowUp?: (insight: Opportunity) => void;
  onViewDetails?: (insight: Opportunity) => void;
}

export default function StrategicAssistantView({
  insights,
  onCreateFollowUp,
  onViewDetails
}: StrategicAssistantViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUrgent, setShowOnlyUrgent] = useState(false);
  const [sortBy, setSortBy] = useState<'priority' | 'value'>('priority');

  const filteredInsights = useMemo(() => {
    let filtered = insights.filter(insight => {
        const name = insight.name.toLowerCase();
        const bestAction = insight.metadata?.classification?.best_action?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return name.includes(search) || bestAction.includes(search);
    });

    if (showOnlyUrgent) {
      filtered = filtered.filter(i => i.type === 'post_sale' || Number(i.probability) > 70);
    }

    // Ordenar
    filtered.sort((a, b) => {
      if (sortBy === 'priority') {
        const typeOrder = { 'post_sale': 0, 'up_sell': 1, 'cross_sell': 2, 'commercial': 3 };
        return (typeOrder[a.type] || 999) - (typeOrder[b.type] || 999);
      } else {
        return Number(b.amount) - Number(a.amount);
      }
    });

    return filtered;
  }, [insights, searchTerm, showOnlyUrgent, sortBy]);

  const stats = useMemo(() => {
    const totalRevenue = insights.reduce((sum, i) => sum + Number(i.amount), 0);
    const highProbCount = insights.filter(i => Number(i.probability) > 80).length;
    
    return {
      total: insights.length,
      highProb: highProbCount,
      totalRevenue
    };
  }, [insights]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Oportunidades IA</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm border-blue-300/30">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alta Confiança</p>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-500">{stats.highProb}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm border-green-300/30">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Volume Potencial</p>
            <p className="text-2xl font-bold text-green-500">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact'
              }).format(stats.totalRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CONTROLES */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="w-full sm:flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou insight..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-secondary/30 border-border/50 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={showOnlyUrgent ? 'default' : 'outline'}
            onClick={() => setShowOnlyUrgent(!showOnlyUrgent)}
            className="h-9 text-xs"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {showOnlyUrgent ? 'Urgentes' : 'Todos'}
          </Button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 px-3 text-xs rounded-md bg-secondary/30 border border-border/50 text-foreground"
          >
            <option value="priority">Ordenar: Relevância</option>
            <option value="value">Ordenar: Valor</option>
          </select>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="grid grid-cols-1 gap-4">
        {filteredInsights.length > 0 ? (
          filteredInsights.map(insight => (
            <StrategicCard
              key={insight.id}
              insight={insight}
              onCreateFollowUp={onCreateFollowUp}
              onViewDetails={onViewDetails}
            />
          ))
        ) : (
          <div className="text-center py-20 bg-secondary/10 rounded-2xl border border-dashed border-border">
            <Target className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground">Aguardando novos insights</h3>
            <p className="text-muted-foreground max-w-xs mx-auto mt-2">
              A IA classifica leads conforme mensagens chegam.
            </p>
          </div>
        )}
      </div>

      {/* METODOLOGIA */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border border-primary/20 rounded-lg p-5 space-y-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          🤖 Assistente de Decisão Universal
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          O sistema utiliza LLMs (GPT-4) para:
          <br />
          • <strong>Intenção Comercial:</strong> Detectar urgência e prontidão de compra
          <br />
          • <strong>Pós-Venda Automático:</strong> Gerar follow-ups após pagamentos confirmados
          <br />
          • <strong>Escala Humana:</strong> Alertar quando o bot não consegue resolver sozinho
        </p>
      </div>
    </div>
  );
}
