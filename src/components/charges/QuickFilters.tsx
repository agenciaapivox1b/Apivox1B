import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  Send,
  AlertTriangle,
  Wifi,
} from 'lucide-react';
import type { Charge } from '@/types';
import { chargeService } from '@/services/chargeService';

interface QuickFiltersProps {
  charges: Charge[];
  selectedFilters: string[];
  onFiltersChange: (filters: string[]) => void;
}

export function QuickFilters({
  charges,
  selectedFilters,
  onFiltersChange,
}: QuickFiltersProps) {
  // Calcular contadores para cada filtro
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const counters = {
    due_today: charges.filter(c => {
      const dueDate = new Date(c.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime() && c.status !== 'paid';
    }).length,
    due_soon: charges.filter(c => {
      const dueDate = new Date(c.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate > today && dueDate <= sevenDaysFromNow && c.status !== 'paid';
    }).length,
    overdue: charges.filter(c => {
      return new Date(c.dueDate) < today && c.status !== 'paid';
    }).length,
    paid: charges.filter(c => c.status === 'paid').length,
    with_automation: charges.filter(c => c.automationEnabled).length,
    not_sent: charges.filter(c => c.status === 'draft').length,
    no_payment_method: charges.filter(c => !c.paymentDetails || c.paymentDetails.method === 'pending').length,
    no_automation: charges.filter(c => !c.automationEnabled && !c.archived).length,
  };

  const filters = [
    {
      id: 'due_today',
      label: 'Vencendo Hoje',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      count: counters.due_today,
      priority: 1,
    },
    {
      id: 'due_soon',
      label: 'Vencendo em 7 dias',
      icon: AlertTriangle,
      color: 'text-orange-600 dark:text-orange-400',
      count: counters.due_soon,
      priority: 1,
    },
    {
      id: 'overdue',
      label: 'Vencidas',
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      count: counters.overdue,
      priority: 1,
    },
    {
      id: 'paid',
      label: 'Pagas',
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      count: counters.paid,
      priority: 1,
    },
    {
      id: 'with_automation',
      label: 'Com Automação Ativa',
      icon: Zap,
      color: 'text-blue-600 dark:text-blue-400',
      count: counters.with_automation,
      priority: 2,
    },
    {
      id: 'not_sent',
      label: 'Não Enviadas',
      icon: Send,
      color: 'text-slate-600 dark:text-slate-400',
      count: counters.not_sent,
      priority: 2,
    },
    {
      id: 'no_payment_method',
      label: 'Sem Forma de Pagamento',
      icon: Wifi,
      color: 'text-purple-600 dark:text-purple-400',
      count: counters.no_payment_method,
      priority: 2,
    },
    {
      id: 'no_automation',
      label: 'Sem Automação',
      icon: AlertCircle,
      color: 'text-gray-600 dark:text-gray-400',
      count: counters.no_automation,
      priority: 3,
    },
  ];

  const toggleFilter = (filterId: string) => {
    if (selectedFilters.includes(filterId)) {
      onFiltersChange(selectedFilters.filter(f => f !== filterId));
    } else {
      onFiltersChange([...selectedFilters, filterId]);
    }
  };

  // Agrupar filtros por prioridade
  const priorityGroups = {
    1: filters.filter(f => f.priority === 1),
    2: filters.filter(f => f.priority === 2),
    3: filters.filter(f => f.priority === 3),
  };

  return (
    <div className="space-y-3">
      {/* Filtros de Prioridade Alta */}
      <div>
        <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase">Ações Imediatas</p>
        <div className="flex flex-wrap gap-2">
          {priorityGroups[1].map(filter => (
            <Button
              key={filter.id}
              variant={selectedFilters.includes(filter.id) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFilter(filter.id)}
              className="gap-1.5 text-xs"
            >
              <filter.icon className={`h-3.5 w-3.5 ${filter.color}`} />
              <span>{filter.label}</span>
              {filter.count > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {filter.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Separador Visual */}
      <div className="border-t border-border/50"></div>

      {/* Filtros de Prioridade Média */}
      <div>
        <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase">Gerenciamento</p>
        <div className="flex flex-wrap gap-2">
          {priorityGroups[2].map(filter => (
            <Button
              key={filter.id}
              variant={selectedFilters.includes(filter.id) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFilter(filter.id)}
              className="gap-1.5 text-xs"
            >
              <filter.icon className={`h-3.5 w-3.5 ${filter.color}`} />
              <span>{filter.label}</span>
              {filter.count > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {filter.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Filtros de Prioridade Baixa */}
      {priorityGroups[3].length > 0 && (
        <>
          <div className="border-t border-border/50"></div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase">Adicionais</p>
            <div className="flex flex-wrap gap-2">
              {priorityGroups[3].map(filter => (
                <Button
                  key={filter.id}
                  variant={selectedFilters.includes(filter.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter(filter.id)}
                  className="gap-1.5 text-xs"
                >
                  <filter.icon className={`h-3.5 w-3.5 ${filter.color}`} />
                  <span>{filter.label}</span>
                  {filter.count > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {filter.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Info sobre Filtros Ativos */}
      {selectedFilters.length > 0 && (
        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {selectedFilters.length} filtro{selectedFilters.length > 1 ? 's' : ''} ativo{selectedFilters.length > 1 ? 's' : ''}
            {selectedFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltersChange([])}
                className="ml-2 h-4 text-xs underline p-0"
              >
                Limpar tudo
              </Button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
