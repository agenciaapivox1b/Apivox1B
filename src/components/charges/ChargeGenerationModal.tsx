import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  AlertCircle,
  TrendingUp,
  Clock,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Charge } from '@/types';
import { chargeService } from '@/services/chargeService';

interface ChargeGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charge: Charge;
  onGenerated?: (updatedCharge: Charge) => void;
}

export default function ChargeGenerationModal({
  open,
  onOpenChange,
  charge,
  onGenerated,
}: ChargeGenerationModalProps) {
  const [step, setStep] = useState<'model-selection' | 'model-a' | 'model-b'>('model-selection');
  const [selectedModel, setSelectedModel] = useState<'predefined' | 'client_choice'>('predefined');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'pix' | 'boleto' | 'credit_card' | 'transfer' | 'cash' | ''
  >('pix');
  const [loading, setLoading] = useState(false);

  const paymentMethods = [
    {
      id: 'pix',
      label: 'PIX',
      description: 'Transferência instantânea - Cliente vê QR Code + Chave',
      icon: '🔄',
    },
    {
      id: 'boleto',
      label: 'Boleto',
      description: 'Cód. Barras + Linha Digitável - Melhor para bancos',
      icon: '📋',
    },
    {
      id: 'credit_card',
      label: 'Cartão de Crédito',
      description: 'Link de pagamento - Cliente escolhe o cartão',
      icon: '💳',
    },
    {
      id: 'transfer',
      label: 'Transferência Bancária',
      description: 'Dados bancários + comprovante - Para contas PJ',
      icon: '🏦',
    },
    {
      id: 'cash',
      label: 'Dinheiro/Manual',
      description: 'Sem dados | Envio manual - Apenas para controle',
      icon: '💰',
    },
  ];

  const handleModelSelection = () => {
    if (selectedModel === 'predefined') {
      setStep('model-a');
    } else {
      setStep('model-b');
    }
  };

  const handleGenerateModelA = async () => {
    if (!selectedPaymentMethod) {
      toast.error('Escolha uma forma de pagamento');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const updated = chargeService.generateChargeModelA(
        charge.id,
        selectedPaymentMethod as 'pix' | 'boleto' | 'credit_card' | 'transfer' | 'cash'
      );

      if (updated) {
        toast.success(`✅ Cobrança gerada com ${paymentMethods.find(m => m.id === selectedPaymentMethod)?.label}`);
        onGenerated?.(updated);
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateModelB = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));

      const updated = chargeService.generateChargeModelB(charge.id);

      if (updated) {
        toast.success(
          '✅ Cobrança pronta! Cliente escolherá a forma de pagamento quando receber a mensagem'
        );
        onGenerated?.(updated);
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Cobrança</DialogTitle>
          <DialogDescription>
            {charge.clientName} - R$ {charge.value.toFixed(2).replace('.', ',')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* PASSO 1: Escolher Modelo */}
          {step === 'model-selection' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-4">
                  Como deseja gerar esta cobrança?
                </h3>
              </div>

              <div className="grid gap-4">
                {/* Modelo A */}
                <Card
                  className={`cursor-pointer border-2 transition-all ${
                    selectedModel === 'predefined'
                      ? 'border-green-500 bg-green-500/5'
                      : 'border-border hover:border-foreground/50'
                  }`}
                  onClick={() => setSelectedModel('predefined')}
                >
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <RadioGroupItem
                          value="predefined"
                          id="model-a"
                          checked={selectedModel === 'predefined'}
                        />
                      </div>
                      <div className="flex-1">
                        <Label
                          htmlFor="model-a"
                          className="text-base font-semibold cursor-pointer flex items-center gap-2 mb-2"
                        >
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          Modelo A: Você Define o Método
                        </Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          Você escolhe <strong>agora</strong> a forma de pagamento (PIX, Boleto, Cartão, etc).
                          O sistema gera a cobrança completa e envia ao cliente.
                        </p>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span>Você controla o método</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span>Dados reais gerados automaticamente</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span>Mensagem pronta para enviar</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Modelo B */}
                <Card
                  className={`cursor-pointer border-2 transition-all ${
                    selectedModel === 'client_choice'
                      ? 'border-blue-500 bg-blue-500/5'
                      : 'border-border hover:border-foreground/50'
                  }`}
                  onClick={() => setSelectedModel('client_choice')}
                >
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <RadioGroupItem
                          value="client_choice"
                          id="model-b"
                          checked={selectedModel === 'client_choice'}
                        />
                      </div>
                      <div className="flex-1">
                        <Label
                          htmlFor="model-b"
                          className="text-base font-semibold cursor-pointer flex items-center gap-2 mb-2"
                        >
                          <Zap className="h-5 w-5 text-blue-600" />
                          Modelo B: Cliente Escolhe
                        </Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          Você envia a cobrança <strong>sem método definido</strong>. Cliente recebe uma
                          mensagem e escolhe a forma que quer pagar.
                        </p>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-blue-600" />
                            <span>Flexibilidade ao cliente</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-blue-600" />
                            <span>Menos rejeições de pagamento</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-blue-600" />
                            <span>Sistema registra escolha automática</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Dica */}
              <Alert className="bg-amber-500/10 border-amber-500/50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                  <strong>Dica:</strong> Use Modelo A para clientes já conhecidos. Use Modelo B para novos
                  clientes ou quando não souber a preferência.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* PASSO 2: Modelo A - Escolher Forma de Pagamento */}
          {step === 'model-a' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('model-selection')}
                  className="gap-2"
                >
                  ← Voltar
                </Button>
                <h3 className="font-semibold text-foreground">Escolha a Forma de Pagamento</h3>
              </div>

              <div className="grid gap-3">
                {paymentMethods.map(method => (
                  <Card
                    key={method.id}
                    className={`cursor-pointer border-2 transition-all ${
                      selectedPaymentMethod === method.id
                        ? 'border-green-500 bg-green-500/5'
                        : 'border-border hover:border-foreground/50'
                    }`}
                    onClick={() => setSelectedPaymentMethod(method.id as any)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <RadioGroupItem
                            value={method.id}
                            id={`method-${method.id}`}
                            checked={selectedPaymentMethod === method.id}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={`method-${method.id}`}
                            className="text-base font-semibold cursor-pointer"
                          >
                            {method.icon} {method.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedPaymentMethod && (
                <Card className="bg-blue-500/5 border-blue-500/50">
                  <CardContent className="pt-6">
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-foreground">O que vai acontecer:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>
                          ✓ Sistema gerará dados reais ({paymentMethods.find(m => m.id === selectedPaymentMethod)?.label})
                        </li>
                        <li>✓ Cobrança será marcada como "Agendada"</li>
                        <li>✓ Você poderá revisar antes de enviar</li>
                        <li>✓ Cliente receberá com informações de pagamento</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* PASSO 3: Modelo B - Confirmação */}
          {step === 'model-b' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('model-selection')}
                  className="gap-2"
                >
                  ← Voltar
                </Button>
                <h3 className="font-semibold text-foreground">
                  Cliente Escolherá a Forma de Pagamento
                </h3>
              </div>

              <Card className="bg-blue-500/5 border-blue-500/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    Fluxo do Modelo B
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {[
                      {
                        num: '1',
                        title: 'Cobrança será criada',
                        desc: 'Status: "Agendada" | Forma de pagamento: "A Definir"',
                      },
                      {
                        num: '2',
                        title: 'Você envia ao cliente',
                        desc: 'Mensagem conterá opções: PIX, Boleto, Cartão, Transferência',
                      },
                      {
                        num: '3',
                        title: 'Cliente escolhe',
                        desc: 'Sistema registra a escolha automaticamente',
                      },
                      {
                        num: '4',
                        title: 'Dados reais são gerados',
                        desc: 'Sistema cria PIX Code, Linha Boleto, ou Link de Cartão',
                      },
                      {
                        num: '5',
                        title: 'Cliente recebe tudo pronto',
                        desc: 'Pode pagar de imediato pelo método escolhido',
                      },
                    ].map(step => (
                      <div key={step.num} className="flex gap-3">
                        <Badge className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full">
                          {step.num}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{step.title}</p>
                          <p className="text-sm text-muted-foreground">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <Alert className="bg-green-500/10 border-green-500/50">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700 dark:text-green-400">
                      <strong>Vantagem:</strong> Cliente escolhe o método que ele já usa. Menos
                      fricção = mais pagamentos recebidos.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>

          {step === 'model-selection' && (
            <Button onClick={handleModelSelection} disabled={loading}>
              Próximo <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {step === 'model-a' && (
            <Button
              onClick={handleGenerateModelA}
              disabled={!selectedPaymentMethod || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Gerando...' : 'Gerar Cobrança'} <Check className="h-4 w-4 ml-2" />
            </Button>
          )}

          {step === 'model-b' && (
            <Button
              onClick={handleGenerateModelB}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Gerando...' : 'Gerar Cobrança'} <Zap className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
