import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Search, Plus, Download, Filter, Eye, Send, Copy, Trash2,
  DollarSign, AlertCircle, CheckCircle2, Clock, Archive, Mail, MessageCircle
} from 'lucide-react';
import type { Charge } from '@/types';
import { chargeService } from '@/services/chargeService';
import { emailService } from '@/services/emailService';
import NewChargeModal from '@/components/charges/NewChargeModal';
import ChargeAutomationModal from '@/components/charges/ChargeAutomationModal';
import ChargeGenerationModal from '@/components/charges/ChargeGenerationModal';
import ChargeActionsMenu from '@/components/charges/ChargeActionsMenu';
import ChargeDetailPanel from '@/components/charges/ChargeDetailPanel';
import PaymentLinksDrawer from '@/components/charges/PaymentLinksDrawer';
import { QuickFilters } from '@/components/charges/QuickFilters';
import ChargeFollowUpTab from '@/components/charges/ChargeFollowUpTab';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, History } from 'lucide-react';

export default function ChargePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'list';

  const [charges, setCharges] = useState<Charge[]>(chargeService.getCharges());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showNewChargeModal, setShowNewChargeModal] = useState(false);
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showPaymentLinksDrawer, setShowPaymentLinksDrawer] = useState(false);
  const [selectedChargeForDetail, setSelectedChargeForDetail] = useState<Charge | null>(null);
  const [selectedChargeForAutomation, setSelectedChargeForAutomation] = useState<{ id: string; name: string } | null>(null);
  const [selectedChargeForGeneration, setSelectedChargeForGeneration] = useState<Charge | null>(null);
  const [selectedChargeForPaymentLinks, setSelectedChargeForPaymentLinks] = useState<Charge | null>(null);

  const handleTabChange = (value: string) => {
    if (value === 'settings') {
      navigate('/configuracoes?tab=gateway');
      return;
    }
    setSearchParams({ tab: value });
  };

  const metrics = useMemo(() => chargeService.getMetrics(), [charges]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const filteredCharges = useMemo(() => {
    return charges.filter(charge => {
      // Filtro de arquivo
      if (!showArchived && charge.archived) return false;

      // Filtro de busca
      const matchesSearch = charge.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        charge.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtro de status
      const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(charge.status);

      // Filtros rápidos
      if (quickFilters.length > 0) {
        const matchesQuickFilter = quickFilters.some(filter => {
          const dueDate = new Date(charge.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          switch (filter) {
            case 'due_today':
              return dueDate.getTime() === today.getTime() && charge.status !== 'paid';
            case 'due_soon':
              return dueDate > today && dueDate <= sevenDaysFromNow && charge.status !== 'paid';
            case 'overdue':
              return dueDate < today && charge.status !== 'paid';
            case 'paid':
              return charge.status === 'paid';
            case 'with_automation':
              return charge.automationEnabled;
            case 'not_sent':
              return charge.status === 'draft';
            case 'no_payment_method':
              return !charge.paymentDetails || charge.paymentDetails.method === 'pending';
            case 'no_automation':
              return !charge.automationEnabled && !charge.archived;
            default:
              return false;
          }
        });
        if (!matchesQuickFilter) return false;
      }

      return matchesSearch && matchesStatus;
    });
  }, [charges, searchQuery, selectedStatus, showArchived, quickFilters]);

  const handleSendCharge = async (id: string, channel: 'whatsapp' | 'email') => {
    if (channel === 'email') {
      const result = await emailService.sendBillingEmail(id);
      if (result.success) {
        toast.success('E-mail enviado com sucesso via Resend');
        // Opcional: Recarregar cargas para atualizar status/lastSent
        setCharges(chargeService.getCharges()); // localStorage
      } else {
        toast.error(`Falha ao enviar e-mail: ${result.error}`);
      }
      return;
    }

    // WhatsApp ainda usa o mock por enquanto ou lógica anterior
    const updated = chargeService.sendCharge(id, channel);
    if (updated) {
      setCharges(chargeService.getCharges());
      toast.success(`Mensagem enviada via WhatsApp`);
    }
  };

  const handleMarkAsPaid = (id: string) => {
    const updated = chargeService.markAsPaid(id);
    if (updated) {
      setCharges(chargeService.getCharges());
      toast.success('Cobrança marcada como paga');
    }
  };

  const handleArchive = (id: string) => {
    const updated = chargeService.toggleArchive(id);
    if (updated) {
      setCharges(chargeService.getCharges());
      toast.success(updated.archived ? 'Cobrança arquivada' : 'Cobrança restaurada');
    }
  };

  const handleDuplicate = (id: string) => {
    const duplicated = chargeService.duplicateCharge(id);
    if (duplicated) {
      setCharges(chargeService.getCharges());
      toast.success('Cobrança duplicada');
    }
  };

  const handleDelete = (id: string) => {
    chargeService.deleteCharge(id);
    setCharges(chargeService.getCharges());
    toast.success('Cobrança deletada');
  };

  const handleChargeCreated = (newCharge: Charge) => {
    setCharges(prev => [newCharge, ...prev]);
  };

  const handleOpenAutomation = (chargeId: string, chargeName: string) => {
    setSelectedChargeForAutomation({ id: chargeId, name: chargeName });
    setShowAutomationModal(true);
  };

  const handleOpenGeneration = (charge: Charge) => {
    setSelectedChargeForGeneration(charge);
    setShowGenerationModal(true);
  };

  const handleChargeGenerated = (updatedCharge: Charge) => {
    setCharges(chargeService.getCharges());
    setShowGenerationModal(false);
    setSelectedChargeForGeneration(null);
    // Atualizar também o painel de detalhes se estiver aberto
    if (selectedChargeForDetail?.id === updatedCharge.id) {
      setSelectedChargeForDetail(updatedCharge);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      draft: { variant: 'secondary', label: 'Rascunho', icon: null },
      scheduled: { variant: 'outline', label: 'Agendada', icon: Clock },
      sent: { variant: 'default', label: 'Enviada', icon: Send },
      viewed: { variant: 'default', label: 'Visualizada', icon: Eye },
      paid: { variant: 'default', label: 'Paga', icon: CheckCircle2 },
      overdue: { variant: 'destructive', label: 'Vencida', icon: AlertCircle },
      cancelled: { variant: 'outline', label: 'Cancelada', icon: null },
    };

    const config = variants[status] || variants.draft;
    return (
      <Badge variant={config.variant as any} className="gap-1">
        {config.icon && <config.icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Cobranças</h1>
          <p className="text-muted-foreground mt-1">
            Faturamento, controle de recebíveis e réguas de cobrança
          </p>
        </div>
        <Button 
          className="gap-2" 
          size="lg"
          onClick={() => setShowNewChargeModal(true)}
        >
          <Plus className="h-4 w-4" />
          Nova Cobrança
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="list" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Cobranças
          </TabsTrigger>
          <TabsTrigger value="followup" className="gap-2">
            <History className="h-4 w-4" />
            Acompanhamento (Follow-up)
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 animate-in fade-in duration-300">
          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total em Aberto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(metrics.totalOpen)}</div>
                <p className="text-xs text-muted-foreground mt-1">Aguardando recebimento</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-destructive">Vencidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{metrics.overdueCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Cobranças atrasadas</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">Vencendo Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{metrics.dueTodayCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Ação imediata necessária</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Pagas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{metrics.paidCount}</div>
                <p className="text-xs text-muted-foreground mt-1">{formatCurrency(metrics.totalPaid)}</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Taxa Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.paymentRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">Do total em aberto</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros e Busca */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente ou descrição..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>

                {/* Filtros Rápidos */}
                <div className="border-t border-border/50 pt-4">
                  <QuickFilters
                    charges={charges}
                    selectedFilters={quickFilters}
                    onFiltersChange={setQuickFilters}
                  />
                </div>

                <Separator />

                {/* Filtros de Status */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'draft', label: 'Rascunho' },
                    { value: 'scheduled', label: 'Agendada' },
                    { value: 'sent', label: 'Enviada' },
                    { value: 'viewed', label: 'Visualizada' },
                    { value: 'paid', label: 'Paga' },
                    { value: 'overdue', label: 'Vencida' },
                    { value: 'cancelled', label: 'Cancelada' },
                  ].map(status => (
                    <Button
                      key={status.value}
                      variant={selectedStatus.includes(status.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedStatus(prev =>
                          prev.includes(status.value)
                            ? prev.filter(s => s !== status.value)
                            : [...prev, status.value]
                        );
                      }}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>

                {/* Toggles Adicionais */}
                <div className="flex gap-3 items-center">
                  <Button
                    variant={showArchived ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowArchived(!showArchived)}
                    className="gap-2"
                  >
                    <Archive className="h-4 w-4" />
                    Mostrar Arquivadas
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Cobranças */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{filteredCharges.length} Cobrança{filteredCharges.length !== 1 ? 's' : ''}</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredCharges.length === 0 ? (
                <div className="py-12 text-center">
                  <DollarSign className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma cobrança encontrada</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredCharges.map(charge => (
                    <div
                      key={charge.id}
                      onClick={() => {
                        setSelectedChargeForDetail(charge);
                        setShowDetailPanel(true);
                      }}
                      className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      {/* Info Básica */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-[400px]">{charge.clientName}</h3>
                          {getStatusBadge(charge.status)}
                          {charge.paymentDetails?.provider && (
                            <Badge variant="outline" className="bg-blue/5 text-blue border-blue/20 text-xs">
                              {charge.paymentDetails.provider === 'asaas' ? 'Asaas' :
                               charge.paymentDetails.provider === 'mercadopago' ? 'Mercado Pago' :
                               charge.paymentDetails.provider === 'stripe' ? 'Stripe' :
                               charge.paymentDetails.provider === 'manual' ? '🔗 Link Manual' : 'Gateway'}
                            </Badge>
                          )}
                          {charge.automationEnabled ? (
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Automação Ativa
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-secondary/50 text-muted-foreground border-border gap-1">
                              Automação Inativa
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{charge.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Vencimento: {formatDate(charge.dueDate)}</span>
                          {charge.lastSentAt && <span>Enviada: {formatDate(charge.lastSentAt)}</span>}
                          {charge.paidAt && <span>Paga: {formatDate(charge.paidAt)}</span>}
                        </div>
                      </div>

                      {/* Valor */}
                      <div className="text-right">
                        <div className="text-lg font-bold text-foreground">{formatCurrency(charge.value)}</div>
                        {charge.responsible && (
                          <p className="text-xs text-muted-foreground">{charge.responsible}</p>
                        )}
                      </div>

                      {/* Ações */}
                      <ChargeActionsMenu
                        charge={charge}
                        onDelete={handleDelete}
                        onAutomation={handleOpenAutomation}
                        onMarkAsPaid={handleMarkAsPaid}
                        onResend={(id) => handleSendCharge(id, 'whatsapp')}
                        onGeneration={handleOpenGeneration}
                        onViewPaymentLinks={(charge) => {
                          setSelectedChargeForPaymentLinks(charge);
                          setShowPaymentLinksDrawer(true);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followup" className="animate-in fade-in slide-in-from-left-4 duration-300">
           <Card className="bg-card border-border">
             <CardContent className="pt-6">
                <ChargeFollowUpTab charges={charges} />
             </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Nova Cobrança */}
      <NewChargeModal 
        open={showNewChargeModal}
        onOpenChange={setShowNewChargeModal}
        onChargeCreated={handleChargeCreated}
      />

      {/* Modal de Geração de Cobrança */}
      {selectedChargeForGeneration && (
        <ChargeGenerationModal
          open={showGenerationModal}
          onOpenChange={setShowGenerationModal}
          charge={selectedChargeForGeneration}
          onGenerated={handleChargeGenerated}
        />
      )}

      {/* Modal de Automação */}
      {selectedChargeForAutomation && (
        <ChargeAutomationModal
          open={showAutomationModal}
          onOpenChange={setShowAutomationModal}
          chargeId={selectedChargeForAutomation.id}
          chargeName={selectedChargeForAutomation.name}
          onSave={(automation) => {
            toast.success('Automação configurada com sucesso');
          }}
        />
      )}

      {/* Painel de Detalhes */}
      <ChargeDetailPanel
        open={showDetailPanel}
        onOpenChange={setShowDetailPanel}
        charge={selectedChargeForDetail}
        onAutomation={handleOpenAutomation}
        onSendCharge={(id, channel) => handleSendCharge(id, channel)}
        onMarkAsPaid={handleMarkAsPaid}
        onResend={(id) => handleSendCharge(id, 'whatsapp')}
      />

      {/* Drawer de Links de Pagamento */}
      <PaymentLinksDrawer
        open={showPaymentLinksDrawer}
        onOpenChange={setShowPaymentLinksDrawer}
        charge={selectedChargeForPaymentLinks}
      />
    </div>
  );
}
