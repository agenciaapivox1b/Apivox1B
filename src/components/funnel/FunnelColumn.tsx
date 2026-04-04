import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import LeadCard from './LeadCard';

interface Lead {
  id: number | string;
  name: string;
  phone: string;
  observation?: string;
  priority?: 'baixa' | 'média' | 'alta';
  stage: string;
}

interface FunnelColumnProps {
  stage: string;
  title: string;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onAddLead: () => void;
}

export default function FunnelColumn({
  stage,
  title,
  leads,
  onLeadClick,
  onAddLead,
}: FunnelColumnProps) {
  return (
    <div className="flex flex-col h-full min-w-[340px] space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={onAddLead}
          title="Adicionar lead"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Cards Container */}
      <Card className="flex-1 bg-secondary/40 border-border overflow-hidden flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-3 space-y-3 hide-scrollbar">
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground opacity-50 py-8">
              <p className="text-sm">Nenhum lead nesta etapa</p>
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick(lead)}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
