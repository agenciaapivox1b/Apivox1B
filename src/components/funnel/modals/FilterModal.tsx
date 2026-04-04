import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Filters {
  priority: string[];
  stage: string[];
  dateRange: { start: string; end: string };
}

interface FilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export default function FilterModal({ 
  open, 
  onOpenChange, 
  filters, 
  onFiltersChange 
}: FilterModalProps) {
  const handlePriorityChange = (priority: string) => {
    const updated = filters.priority.includes(priority)
      ? filters.priority.filter(p => p !== priority)
      : [...filters.priority, priority];
    onFiltersChange({ ...filters, priority: updated });
  };

  const handleStageChange = (stage: string) => {
    const updated = filters.stage.includes(stage)
      ? filters.stage.filter(s => s !== stage)
      : [...filters.stage, stage];
    onFiltersChange({ ...filters, stage: updated });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      priority: [],
      stage: [],
      dateRange: { start: '', end: '' },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Filtros</DialogTitle>
          <DialogDescription>
            Filtre os leads por prioridade e etapa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Prioridade */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Prioridade</h4>
            <div className="space-y-2">
              {['baixa', 'média', 'alta'].map((priority) => (
                <div key={priority} className="flex items-center gap-2">
                  <Checkbox
                    id={`priority-${priority}`}
                    checked={filters.priority.includes(priority)}
                    onCheckedChange={() => handlePriorityChange(priority)}
                  />
                  <Label 
                    htmlFor={`priority-${priority}`}
                    className="text-sm font-normal capitalize cursor-pointer"
                  >
                    {priority}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Etapa */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Etapa</h4>
            <div className="space-y-2">
              {[
                { key: 'atendendo', label: 'IA Atendendo' },
                { key: 'qualificado', label: 'Qualificado' },
                { key: 'ganhou', label: 'Ganhou' },
                { key: 'perdido', label: 'Perdido' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`stage-${key}`}
                    checked={filters.stage.includes(key)}
                    onCheckedChange={() => handleStageChange(key)}
                  />
                  <Label 
                    htmlFor={`stage-${key}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClearFilters}
          >
            Limpar Filtros
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
