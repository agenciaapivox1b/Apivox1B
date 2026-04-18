import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  CreditCard, 
  ExternalLink,
  ArrowRight
} from 'lucide-react';

interface ChargeFlowSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFlow: (flow: 'internal' | 'external') => void;
}

export function ChargeFlowSelector({ open, onOpenChange, onSelectFlow }: ChargeFlowSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Nova Cobrança</DialogTitle>
          <DialogDescription>
            Escolha como deseja criar a cobrança
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Opção A - Gerar no APIVOX */}
          <Card 
            className="p-4 cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary"
            onClick={() => onSelectFlow('internal')}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Gerar cobrança na APIVOX</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Crie uma cobrança com PIX, boleto ou link de pagamento pela APIVOX.
                </p>
                <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
                  <span>Gateway integrado</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Card>

          {/* Opção B - Registrar Externa */}
          <Card 
            className="p-4 cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary"
            onClick={() => onSelectFlow('external')}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
                <ExternalLink className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Registrar cobrança externa</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Registre uma cobrança criada fora do sistema, como banco, ERP ou contador.
                </p>
                <div className="flex items-center gap-2 mt-3 text-sm text-orange-600">
                  <span>Acompanhamento apenas</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ChargeFlowSelector;
