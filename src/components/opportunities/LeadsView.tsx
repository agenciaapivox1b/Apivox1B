import { useState, useMemo } from 'react';
import { Opportunity } from '@/services/crmService';
import LeadCard from './LeadCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LayoutGrid,
  LayoutList,
  Search,
  Target,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LeadsViewProps {
  leads: Opportunity[];
  onViewDetails: (lead: Opportunity) => void;
  onCreateFollowUp: (lead: Opportunity) => void;
  onViewHistory?: (lead: Opportunity) => void;
}

export default function LeadsView({
  leads,
  onViewDetails,
  onCreateFollowUp,
  onViewHistory
}: LeadsViewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = selectedStage ? lead.status === selectedStage : true;
      return matchesSearch && matchesStage;
    });
  }, [leads, searchTerm, selectedStage]);

  const stageMap: Record<string, string> = {
    'descoberta': 'Descoberta',
    'proposta': 'Proposta',
    'negociacao': 'Negociação',
    'fechado': 'Fechado',
    'perdido': 'Perdido'
  };

  const stages = Object.keys(stageMap);

  const leadsByStage = useMemo(() => {
    return stages.reduce((acc, stage) => {
      acc[stage] = filteredLeads.filter(l => l.status === stage);
      return acc;
    }, {} as Record<string, Opportunity[]>);
  }, [filteredLeads]);

  const stats = useMemo(() => {
    const totalValue = filteredLeads.reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const avgProbability = filteredLeads.length > 0
      ? Math.round(filteredLeads.reduce((sum, l) => sum + (l.probability || 0), 0) / filteredLeads.length)
      : 0;
    return {
      total: filteredLeads.length,
      totalValue,
      avgProbability
    };
  }, [filteredLeads]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Oportunidades</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 space-y-1 flex items-center gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor Total</p>
              <p className="text-2xl font-bold text-green-500">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact'
                }).format(stats.totalValue)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prob. Média</p>
            <p className="text-2xl font-bold text-blue-500">{stats.avgProbability}%</p>
          </CardContent>
        </Card>
      </div>

      {/* CONTROLES */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="w-full sm:flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-secondary/30 border-border/50 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            className="h-9 text-xs"
          >
            <LayoutList className="w-4 h-4" />
            Lista
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            onClick={() => setViewMode('kanban')}
            className="h-9 text-xs"
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </Button>
          {selectedStage && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedStage(null)}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Limpar filtro
            </Button>
          )}
        </div>
      </div>

      {/* MODO LISTA */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredLeads.length > 0 ? (
            filteredLeads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onViewDetails={onViewDetails}
                onCreateFollowUp={onCreateFollowUp}
                onViewHistory={onViewHistory}
              />
            ))
          ) : (
            <div className="text-center py-20 bg-secondary/10 rounded-2xl border border-dashed border-border">
              <Target className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground">Nenhuma oportunidade encontrada</h3>
              <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                {searchTerm ? 'Refine sua busca' : 'Crie uma nova oportunidade'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODO KANBAN */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {stages.map(stage => (
            <div
              key={stage}
              className="space-y-3 bg-secondary/5 rounded-lg p-4 border border-border/30 min-h-[500px]"
            >
              <div
                className="sticky top-0 z-10 bg-secondary/5 pb-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedStage(selectedStage === stage ? null : stage)}
              >
                <h3 className="font-bold text-foreground text-sm">{stageMap[stage]}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {leadsByStage[stage].length} {leadsByStage[stage].length === 1 ? 'oportunidade' : 'oportunidades'}
                </p>
              </div>

              <div className="space-y-2">
                {leadsByStage[stage].length > 0 ? (
                  leadsByStage[stage].map(lead => (
                    <Card
                      key={lead.id}
                      className="bg-card border-border/50 hover:border-primary/50 cursor-pointer transition-all hover:shadow-md p-3 space-y-2"
                      onClick={() => onViewDetails(lead)}
                    >
                      <h4 className="font-semibold text-sm text-foreground truncate">{lead.name}</h4>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded capitalize">
                          {lead.type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{lead.probability}%</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          notation: 'compact'
                        }).format(Number(lead.amount))}
                      </p>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    —
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
