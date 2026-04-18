import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { Charge } from '@/types';
import { chargeService } from '@/services/chargeService';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  ExternalLink,
  MessageCircle,
  Calendar,
  User,
  DollarSign,
  FileText,
  Link as LinkIcon,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SimpleChargeDetailPanelProps {
  charge: Charge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChargeUpdated?: (charge: Charge) => void;
  onCreateFollowUp?: (charge: Charge) => void;
}

export default function SimpleChargeDetailPanel({
  charge,
  open,
  onOpenChange,
  onChargeUpdated,
  onCreateFollowUp,
}: SimpleChargeDetailPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);

  if (!charge) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      draft: { label: 'Criada', color: 'bg-slate-100 text-slate-700', icon: FileText },
      scheduled: { label: 'Gerada', color: 'bg-blue-100 text-blue-700', icon: Clock },
      sent: { label: 'Enviada', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
      viewed: { label: 'Visualizada', color: 'bg-purple-100 text-purple-700', icon: Clock },
      paid: { label: 'Paga', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
      overdue: { label: 'Vencida', color: 'bg-red-100 text-red-700', icon: AlertCircle },
      cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-700', icon: Trash2 },
    };
    return configs[status] || configs.draft;
  };

  const getPaymentMethodLabel = (method?: string) => {
    const labels: Record<string, string> = {
      pix: 'PIX',
      boleto: 'Boleto',
      credit_card: 'Cartão de Crédito',
      transfer: 'Transferência',
      cash: 'Dinheiro',
      external: 'Cobrança Externa',
      manual: 'Registro Manual',
      pending: 'A Definir',
    };
    return labels[method || 'pending'] || method;
  };

  const getOriginLabel = (origin?: string) => {
    const labels: Record<string, string> = {
      manual: 'Manual',
      external: 'Externa (ERP/Banco)',
      integration: 'Integração',
      lead: 'Lead',
      client: 'Cliente',
    };
    return labels[origin || 'manual'] || origin;
  };

  // Variáveis derivadas (declaradas antes das funções que as usam)
  const statusConfig = getStatusConfig(charge.status);
  const StatusIcon = statusConfig.icon;
  const isExternal = charge.paymentMethod === 'external' || charge.origin === 'external';
  const externalLinkValue = charge.paymentDetails?.externalLink || charge.paymentDetails?.paymentLink;
  const hasExternalLink = !!externalLinkValue;
  const externalCodeValue = charge.paymentDetails?.externalCode || charge.paymentDetails?.boletoLine || charge.paymentDetails?.pixCode;
  const hasExternalCode = !!externalCodeValue;

  const handleMarkAsPaid = async () => {
    setLoading('paid');
    try {
      const updated = chargeService.updateCharge(charge.id, {
        status: 'paid',
        paidAt: new Date().toISOString(),
      });
      if (updated) {
        toast.success('Cobrança marcada como paga!');
        onChargeUpdated?.(updated);
      }
    } catch (err) {
      toast.error('Erro ao marcar como paga');
    } finally {
      setLoading(null);
    }
  };

  const handleCopyLink = () => {
    const linkToCopy = externalLinkValue || externalCodeValue;
    if (linkToCopy) {
      navigator.clipboard.writeText(linkToCopy);
      toast.success('Copiado para a área de transferência!');
    } else {
      toast.error('Nenhum link/código disponível');
    }
  };

  const handleOpenExternalLink = () => {
    if (externalLinkValue) {
      window.open(externalLinkValue, '_blank');
    } else {
      toast.error('Nenhum link externo disponível');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Detalhes da Cobrança</SheetTitle>
            <Badge className={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
          <SheetDescription>
            Cliente: {charge.clientName}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] pr-4">
          <div className="space-y-4">
            {/* Informações Principais */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Informações Principais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Valor</span>
                  <span className="text-2xl font-bold">{formatCurrency(charge.value)}</span>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Vencimento</span>
                    <span className="font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(charge.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Forma</span>
                    <span className="font-medium">{getPaymentMethodLabel(charge.paymentMethod)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Origem</span>
                    <span className="font-medium">{getOriginLabel(charge.origin)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Criada em</span>
                    <span className="font-medium">
                      {format(new Date(charge.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cliente */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="font-medium block">{charge.clientName}</span>
                    {charge.clientEmail && (
                      <span className="text-sm text-muted-foreground">{charge.clientEmail}</span>
                    )}
                  </div>
                </div>
                {charge.clientPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Telefone:</span>
                    <span>{charge.clientPhone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Descrição */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{charge.description}</p>
              </CardContent>
            </Card>

            {/* Cobrança Externa - Links e Códigos */}
            {isExternal && (hasExternalLink || hasExternalCode) && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Cobrança Externa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hasExternalLink && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Link de Pagamento</span>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={handleOpenExternalLink}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Abrir Link
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={handleCopyLink}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {hasExternalCode && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Código/Linha Digitável</span>
                      <div className="flex gap-2">
                        <code className="flex-1 text-xs bg-white p-2 rounded border truncate">
                          {externalCodeValue}
                        </code>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => {
                            if (externalCodeValue) {
                              navigator.clipboard.writeText(externalCodeValue);
                              toast.success('Código copiado!');
                            }
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Observações */}
            {charge.observation && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{charge.observation}</p>
                </CardContent>
              </Card>
            )}

            {/* Histórico Resumido */}
            {charge.history && charge.history.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Histórico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {charge.history.slice(0, 5).map((event, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                        <div className="flex-1">
                          <span className="font-medium">{event.description}</span>
                          <span className="text-muted-foreground text-xs block">
                            {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vinculação com Oportunidade */}
            {charge.linkedLeadId && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Oportunidade Vinculada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ID: {charge.linkedLeadId}</span>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Ver Oportunidade
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ações */}
            <div className="space-y-2 pt-4">
              {charge.status !== 'paid' && charge.status !== 'cancelled' && (
                <Button 
                  className="w-full gap-2" 
                  onClick={handleMarkAsPaid}
                  disabled={loading === 'paid'}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {loading === 'paid' ? 'Processando...' : 'Marcar como Paga'}
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => onCreateFollowUp?.(charge)}
                >
                  <RefreshCw className="w-4 h-4" />
                  Criar Follow-up
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => {
                    // Abrir conversa se existir integração
                    toast.info('Funcionalidade de conversa será implementada');
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Abrir Conversa
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
