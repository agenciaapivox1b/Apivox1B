import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Lead {
  id: string | number;
  stage: string;
  priority?: string;
  value?: number;
}

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
}

export default function ReportModal({ open, onOpenChange, leads }: ReportModalProps) {
  const totalLeads = leads.length;
  const leadsByStage = {
    atendendo: leads.filter(l => l.stage === 'atendendo').length,
    qualificado: leads.filter(l => l.stage === 'qualificado').length,
    ganhou: leads.filter(l => l.stage === 'ganhou').length,
    perdido: leads.filter(l => l.stage === 'perdido').length,
  };

  const leadsByPriority = {
    alta: leads.filter(l => l.priority === 'alta').length,
    média: leads.filter(l => l.priority === 'média').length,
    baixa: leads.filter(l => l.priority === 'baixa').length,
  };

  const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);
  const ganhoValue = leads
    .filter(l => l.stage === 'ganhou')
    .reduce((sum, l) => sum + (l.value || 0), 0);

  const taxa = totalLeads > 0 ? ((leadsByStage.ganhou / totalLeads) * 100).toFixed(1) : '0';
  const conversao = (leadsByStage.atendendo + leadsByStage.qualificado) > 0 
    ? (((leadsByStage.atendendo + leadsByStage.qualificado) / totalLeads) * 100).toFixed(1) 
    : '0';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório do Funil</DialogTitle>
          <DialogDescription>
            Análise completa do desempenho do funil de vendas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Métricas Principais */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
                <p className="text-xs text-muted-foreground mt-1">Total de Leads</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-foreground">{taxa}%</p>
                <p className="text-xs text-muted-foreground mt-1">Taxa de Ganho</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-foreground">{conversao}%</p>
                <p className="text-xs text-muted-foreground mt-1">Em Conversão</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-foreground">
                  R$ {(ganhoValue / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-muted-foreground mt-1">Valor Ganho</p>
              </CardContent>
            </Card>
          </div>

          {/* Leads por Etapa */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Distribuição por Etapa</h4>
            {[
              { key: 'atendendo', label: 'IA Atendendo', color: 'bg-blue-500' },
              { key: 'qualificado', label: 'Qualificado', color: 'bg-amber-500' },
              { key: 'ganhou', label: 'Ganhou', color: 'bg-green-500' },
              { key: 'perdido', label: 'Perdido', color: 'bg-red-500' },
            ].map(({ key, label, color }) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{label}</span>
                  <span className="text-muted-foreground">
                    {leadsByStage[key as keyof typeof leadsByStage]} leads
                  </span>
                </div>
                <Progress 
                  value={(leadsByStage[key as keyof typeof leadsByStage] / totalLeads) * 100}
                  className="h-2"
                />
              </div>
            ))}
          </div>

          {/* Leads por Prioridade */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Distribuição por Prioridade</h4>
            {[
              { key: 'alta', label: 'Alta', color: 'bg-red-500' },
              { key: 'média', label: 'Média', color: 'bg-amber-500' },
              { key: 'baixa', label: 'Baixa', color: 'bg-blue-500' },
            ].map(({ key, label, color }) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{label}</span>
                  <span className="text-muted-foreground">
                    {leadsByPriority[key as keyof typeof leadsByPriority]} leads
                  </span>
                </div>
                <Progress 
                  value={(leadsByPriority[key as keyof typeof leadsByPriority] / totalLeads) * 100}
                  className="h-2"
                />
              </div>
            ))}
          </div>

          {/* Valor Total */}
          <Card className="bg-secondary border-border">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Valor Total em Pipeline</p>
                <p className="text-3xl font-bold text-foreground">
                  R$ {(totalValue / 1000).toFixed(1)}k
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
