import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Copy,
  Mail,
  MessageCircle,
  History,
  Settings,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  Phone,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Charge } from '@/types';
import { PaymentMethodDisplay } from './PaymentMethodDisplay';
import { AutomationStatusDisplay } from './AutomationStatusDisplay';
import { chargeService } from '@/services/chargeService';
import ChargeWhatsAppModal from './ChargeWhatsAppModal';

import { supabase } from '@/lib/supabaseClient';

interface ChargeDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charge: Charge | null;
  onAutomation?: (chargeId: string, chargeName: string) => void;
  onSendCharge?: (chargeId: string, channel: 'whatsapp' | 'email') => void;
  onMarkAsPaid?: (chargeId: string) => void;
  onResend?: (chargeId: string) => void;
}

export default function ChargeDetailPanel({
  open,
  onOpenChange,
  charge,
  onAutomation,
  onSendCharge,
  onMarkAsPaid,
  onResend,
}: ChargeDetailPanelProps) {
  const [realHistory, setRealHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  useEffect(() => {
    if (open && charge?.id) {
      fetchHistory();
    }
  }, [open, charge?.id]);

  const fetchHistory = async () => {
    if (!charge?.id) return;
    
    // Validar se o ID é um UUID válido antes de consultar o banco
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(charge.id)) {
      console.log('[ChargeDetailPanel] ID não é UUID (mock), ignorando busca no banco.');
      setRealHistory([]);
      return;
    }

    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('charge_events')
        .select('*')
        .eq('charge_id', charge.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedHistory = data.map(event => ({
        description: event.event_description,
        timestamp: event.created_at,
        channel: event.channel,
        performedBy: event.created_by || 'Sistema',
        type: event.event_type
      }));

      setRealHistory(mappedHistory);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!charge) return null;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-500/20 text-slate-700 dark:text-slate-300',
      scheduled: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
      sent: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
      viewed: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
      paid: 'bg-green-500/20 text-green-700 dark:text-green-300',
      overdue: 'bg-red-500/20 text-red-700 dark:text-red-300',
      cancelled: 'bg-gray-500/20 text-gray-700 dark:text-gray-300',
    };
    return colors[status] || colors.draft;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Criada',
      scheduled: 'Gerada (Asaas)',
      sent: 'Enviada',
      viewed: 'Visualizada',
      paid: 'Paga',
      overdue: 'Vencida',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-2 flex-1">
              <SheetTitle className="text-2xl">{charge.clientName}</SheetTitle>
              <SheetDescription className="text-base">{charge.description}</SheetDescription>
            </div>
            <Badge className={`${getStatusColor(charge.status)} border-0 text-base px-3 py-1`}>
              {getStatusLabel(charge.status)}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Resumo Rápido */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="text-2xl font-bold text-foreground">{formatCurrency(charge.value)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vencimento:</span>
                  <span className="font-semibold text-foreground">{new Date(charge.dueDate).toLocaleDateString('pt-BR')}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Envio:</span>
                  <span className="font-medium text-foreground">
                    {charge.lastSentAt ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        {charge.lastSentChannel === 'whatsapp' ? 'WhatsApp' : 'E-mail'} em {formatDate(charge.lastSentAt)}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Não enviado ainda</span>
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Automação:</span>
                  <span className="font-medium text-foreground">
                    {charge.automationConfig?.enabled ? (
                      <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-500/30 border-0">Ativa</Badge>
                    ) : (
                      <Badge className="bg-slate-500/20 text-slate-700 dark:text-slate-300 hover:bg-slate-500/30 border-0">Inativa</Badge>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="detalhes" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            {/* Aba: Detalhes */}
            <TabsContent value="detalhes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Dados do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium text-foreground">{charge.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">{charge.clientEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium text-foreground">{charge.clientPhone}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Dados da Cobrança
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Descrição</p>
                    <p className="font-medium text-foreground">{charge.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor</p>
                      <p className="font-bold text-lg text-foreground">{formatCurrency(charge.value)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vencimento</p>
                      <p className="font-medium text-foreground">
                        {new Date(charge.dueDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Método de Pagamento</p>
                    <p className="font-medium text-foreground capitalize">{charge.paymentMethod || 'Não especificado'}</p>
                  </div>
                  {charge.recurrence && charge.recurrence !== 'none' && (
                    <div>
                      <p className="text-sm text-muted-foreground">Recorrência</p>
                      <p className="font-medium text-foreground capitalize">{charge.recurrence}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dados de Pagamento Gerados */}
              <PaymentMethodDisplay
                paymentDetails={charge.paymentDetails}
                paymentMethod={charge.paymentMethod}
              />

              {charge.responsible && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Responsável</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium text-foreground">{charge.responsible}</p>
                  </CardContent>
                </Card>
              )}

              {charge.observation && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Observações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{charge.observation}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Datas Importantes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p className="text-sm font-medium text-foreground">{formatDate(charge.createdAt)}</p>
                  </div>
                  {charge.paidAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Pago em</p>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        {formatDate(charge.paidAt)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bloco de Automação movido para Detalhes */}
              <div className="pt-2">
                <Separator className="mb-6" />
                <h3 className="text-lg font-semibold mb-4">Gerenciamento de Automação</h3>
                <AutomationStatusDisplay
                  charge={charge}
                  onEdit={() => onAutomation?.(charge.id, charge.clientName)}
                  onToggle={(enabled) => {
                    const automation = charge.automationConfig;
                    if (automation) {
                      if (enabled) {
                        chargeService.enableAutomation(charge.id);
                      } else {
                        chargeService.disableAutomation(charge.id);
                      }
                      toast.success(
                        enabled ? 'Automação ativada' : 'Automação desativada'
                      );
                    }
                  }}
                />
              </div>
            </TabsContent>

            {/* Aba: Histórico */}
            <TabsContent value="historico" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Timeline de Eventos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="py-8 text-center animate-pulse">
                      <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">Carregando histórico...</p>
                    </div>
                  ) : realHistory.length === 0 ? (
                    <div className="py-8 text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">Nenhum evento registrado no banco</p>
                    </div>
                  ) : (
                    <div className="space-y-4 border-l-2 border-border ml-2 pl-4">
                      {realHistory.map((event, idx) => (
                        <div key={idx} className="relative">
                          <div className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full ${
                            event.type === 'email_send_failed' ? 'bg-destructive' : 
                            event.type === 'email_sent' ? 'bg-green-500' : 'bg-primary'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">
                              {event.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {formatDate(event.timestamp)}
                              </p>
                              {event.performedBy && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  {event.performedBy}
                                </Badge>
                              )}
                            </div>
                            {event.channel && (
                              <p className="text-xs text-muted-foreground mt-1 capitalize flex items-center gap-1">
                                {event.channel === 'email' ? <Mail className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
                                Canal: {event.channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Histórico fechamento original estava na linha 312, então pulamos a tab Automação inteira */}
          </Tabs>
        </div>

        {/* Ações Rápidas */}
        <SheetFooter className="flex-col gap-3 sm:flex-col">
          {charge.status !== 'paid' && (
            <>
              <Button
                onClick={() => setShowWhatsApp(true)}
                className="gap-2 bg-[#25D366] hover:bg-[#1da851] text-white"
                variant="default"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar WhatsApp
              </Button>
              <Button
                onClick={() => onSendCharge?.(charge.id, 'email')}
                className="gap-2"
                variant="outline"
              >
                <Mail className="h-4 w-4" />
                Enviar E-mail
              </Button>
              {charge.status !== 'draft' && (
                <Button
                  onClick={() => onResend?.(charge.id)}
                  className="gap-2"
                  variant="outline"
                >
                  Reenviar
                </Button>
              )}
              <Button
                onClick={() => onMarkAsPaid?.(charge.id)}
                className="gap-2"
                variant="outline"
              >
                <CheckCircle2 className="h-4 w-4" />
                Marcar como Paga
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>

    <ChargeWhatsAppModal
      open={showWhatsApp}
      onOpenChange={setShowWhatsApp}
      charge={charge}
    />
    </>
  );
}
