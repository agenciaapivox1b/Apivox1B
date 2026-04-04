import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare } from 'lucide-react';

interface Lead {
  id: number | string;
  name: string;
  phone: string;
  observation?: string;
  priority?: 'baixa' | 'média' | 'alta';
  stage?: string;
}

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
}

export default function LeadCard({ lead, onClick }: LeadCardProps) {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'alta':
        return 'bg-red-500/20 border-red-500/30';
      case 'média':
        return 'bg-amber-500/20 border-amber-500/30';
      case 'baixa':
        return 'bg-blue-500/20 border-blue-500/30';
      default:
        return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  return (
    <Card
      onClick={onClick}
      className={`bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group border ${getPriorityColor(lead.priority)}`}
    >
      <CardContent className="p-4 space-y-2">
        {/* Nome */}
        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
          {lead.name}
        </h4>

        {/* Observação */}
        {lead.observation && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {lead.observation}
          </p>
        )}

        {/* Telefone */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span className="truncate">{lead.phone}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
