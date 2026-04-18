import { Card, CardContent } from '@/components/ui/card';
import { Phone } from 'lucide-react';
import FollowUpSummary from './FollowUpSummary';
import FollowUpBadge from './FollowUpBadge';

interface Lead {
  id: string;
  name: string;
  phone: string;
  observation?: string;
  priority?: 'baixa' | 'media' | 'alta';
  stage?: string;
  contact_id: string;
}

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  onFollowUpChange?: () => void;
}

export default function LeadCard({ lead, onClick, onFollowUpChange }: LeadCardProps) {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'alta':
        return 'bg-red-500/20 border-red-500/30';
      case 'media':
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

        {/* Footer: Telefone + Follow-up Summary */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <h3 className="font-medium text-slate-900 text-sm truncate">
              {lead.name}
            </h3>
            <FollowUpBadge contactId={lead.contact_id} className="shrink-0 ml-1" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span className="truncate">{lead.phone}</span>
          </div>
        </div>

        {/* Follow-up Summary with actions */}
        <div 
          className="flex items-center justify-between pt-1"
          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking follow-up actions
        >
          <FollowUpSummary 
            opportunityId={lead.id} 
            onFollowUpChange={onFollowUpChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
