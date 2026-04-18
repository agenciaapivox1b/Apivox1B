import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search, Plus, Eye, MoreHorizontal, CheckCircle2, AlertCircle, 
  Clock, DollarSign, Calendar, Link as LinkIcon, FileText, RefreshCw,
  Trash2, Archive, ExternalLink, MessageCircle
} from 'lucide-react';
import type { Charge } from '@/types';
import { chargeService } from '@/services/chargeService';
import SimpleChargeDetailPanel from '@/components/charges/SimpleChargeDetailPanel';
import { ChargeFlowSelector } from '@/components/charges/ChargeFlowSelector';
import { InternalChargeModal } from '@/components/charges/InternalChargeModal';
import { ExternalChargeModal } from '@/components/charges/ExternalChargeModal';
import { SendChargeModal } from '@/components/charges/SendChargeModal';
import { toast } from 'sonner';

// ==================== COMPONENTE PRINCIPAL ====================

export default function ChargePage() {
  // Estados principais
  const [charges, setCharges] = useState<Charge[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  
  // Estados dos modais de fluxo de cobrança
  const [showFlowSelector, setShowFlowSelector] = useState(false);
  const [showInternalModal, setShowInternalModal] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
  const [metrics, setMetrics] = useState({
    totalReceivable: 0,
    dueToday: 0,
    overdue: 0,
    paidThisMonth: 0,
    countDueToday: 0,
    countOverdue: 0,
    countPaidThisMonth: 0,
  });

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = chargeService.getCharges();
    setCharges(data);
    setMetrics(chargeService.getOperationalMetrics());
  };

  // Filtros
  const filteredCharges = useMemo(() => {
    return charges.filter(charge => {
      // Ignorar arquivadas e canceladas na listagem principal
      if (charge.archived || charge.status === 'cancelled') return false;

      // Busca
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        charge.clientName.toLowerCase().includes(query) ||
        charge.description.toLowerCase().includes(query) ||
        (charge.clientEmail && charge.clientEmail.toLowerCase().includes(query));

      // Filtro de status
      const matchesStatus = statusFilter === 'all' || charge.status === statusFilter;

      // Filtro de forma de pagamento
      const matchesPayment = paymentMethodFilter === 'all' || charge.paymentMethod === paymentMethodFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [charges, searchQuery, statusFilter, paymentMethodFilter]);

  // Formatação
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Configurações de status
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      draft: { label: 'Criada', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText },
      scheduled: { label: 'Gerada', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
      sent: { label: 'Enviada', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertCircle },
      viewed: { label: 'Visualizada', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Eye },
      paid: { label: 'Paga', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
      overdue: { label: 'Vencida', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
    };
    return configs[status] || configs.draft;
  };

  // Configurações de forma de pagamento
  const getPaymentMethodConfig = (method?: string) => {
    const configs: Record<string, { label: string; icon: any; color: string }> = {
      pix: { label: 'PIX', icon: DollarSign, color: 'text-green-600' },
      boleto: { label: 'Boleto', icon: FileText, color: 'text-blue-600' },
      credit_card: { label: 'Cartão', icon: DollarSign, color: 'text-purple-600' },
      external: { label: 'Externa', icon: ExternalLink, color: 'text-orange-600' },
      manual: { label: 'Manual', icon: FileText, color: 'text-slate-600' },
      pending: { label: 'A Definir', icon: Clock, color: 'text-gray-400' },
    };
    return configs[method || 'pending'] || configs.pending;
  };

  // Handlers
  const handleChargeCreated = (newCharge: Charge) => {
    setCharges(prev => [newCharge, ...prev]);
    loadData(); // Recarregar métricas
    toast.success('Cobrança criada com sucesso!');
  };

  // Handler para seleção de fluxo de cobrança (2 opções: interna ou externa)
  const handleSelectFlow = (flow: 'internal' | 'external') => {
    setShowFlowSelector(false);

    // Pequeno delay para evitar glitch visual
    setTimeout(() => {
      if (flow === 'internal') {
        setShowInternalModal(true);
      } else if (flow === 'external') {
        setShowExternalModal(true);
      }
    }, 100);
  };

  const handleOpenDetail = (charge: Charge) => {
    setSelectedCharge(charge);
    setShowDetailPanel(true);
  };

  const handleChargeUpdated = (updated: Charge) => {
    setCharges(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedCharge(updated);
    loadData(); // Recarregar métricas
  };

  const handleMarkAsPaid = (e: React.MouseEvent, charge: Charge) => {
    e.stopPropagation();
    const updated = chargeService.updateCharge(charge.id, {
      status: 'paid',
      paidAt: new Date().toISOString(),
    });
    if (updated) {
      setCharges(prev => prev.map(c => c.id === charge.id ? updated : c));
      loadData();
      toast.success(`Cobrança de ${charge.clientName} marcada como paga!`);
    }
  };

  const handleDelete = (e: React.MouseEvent, charge: Charge) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir a cobrança de ${charge.clientName}?`)) {
      chargeService.deleteCharge(charge.id);
      setCharges(prev => prev.filter(c => c.id !== charge.id));
      loadData();
      toast.success('Cobrança excluída');
    }
  };

  const handleCreateFollowUp = (charge: Charge) => {
    // Preparar integração com follow-up
    toast.info('Funcionalidade de follow-up será implementada em breve');
    // Futuro: criar follow-up financeiro vinculado à cobrança
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Cobranças</h1>
          <p className="text-muted-foreground mt-1">
            Controle de recebíveis e gestão de pagamentos
          </p>
        </div>
        <Button 
          className="gap-2" 
          size="lg"
          onClick={() => setShowFlowSelector(true)}
        >
          <Plus className="h-4 w-4" />
          Nova Cobrança
        </Button>
      </div>

      {/* Métricas Simplificadas - 4 cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total a Receber */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{formatCurrency(metrics.totalReceivable)}</div>
            <p className="text-xs text-blue-600 mt-1">Em cobranças pendentes</p>
          </CardContent>
        </Card>

        {/* Vencendo Hoje */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Vencendo Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-800">{metrics.countDueToday}</div>
            <p className="text-xs text-amber-600 mt-1">{formatCurrency(metrics.dueToday)}</p>
          </CardContent>
        </Card>

        {/* Vencidas */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">{metrics.countOverdue}</div>
            <p className="text-xs text-red-600 mt-1">{formatCurrency(metrics.overdue)}</p>
          </CardContent>
        </Card>

        {/* Pagas no Mês */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Pagas no Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{metrics.countPaidThisMonth}</div>
            <p className="text-xs text-green-600 mt-1">{formatCurrency(metrics.paidThisMonth)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, descrição ou e-mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro de Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="draft">Criada</SelectItem>
                <SelectItem value="scheduled">Gerada</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="viewed">Visualizada</SelectItem>
                <SelectItem value="overdue">Vencida</SelectItem>
                <SelectItem value="paid">Paga</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de Forma de Pagamento */}
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Forma de Cobrança" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as formas</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="credit_card">Cartão</SelectItem>
                <SelectItem value="external">Externa (Link/ERP)</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Cobranças */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredCharges.length} Cobrança{filteredCharges.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCharges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-muted-foreground/50" />
                      <p>Nenhuma cobrança encontrada</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowFlowSelector(true)}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Criar primeira cobrança
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCharges.map((charge) => {
                  const statusConfig = getStatusConfig(charge.status);
                  const paymentConfig = getPaymentMethodConfig(charge.paymentMethod);
                  const StatusIcon = statusConfig.icon;
                  const PaymentIcon = paymentConfig.icon;

                  return (
                    <TableRow
                      key={charge.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDetail(charge)}
                    >
                      <TableCell>
                        <div className="font-medium">{charge.clientName}</div>
                        {charge.clientEmail && (
                          <div className="text-sm text-muted-foreground">{charge.clientEmail}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={charge.description}>
                          {charge.description}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(charge.value)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(charge.dueDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusConfig.color} gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PaymentIcon className={`h-4 w-4 ${paymentConfig.color}`} />
                          <span className="text-sm">{paymentConfig.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(charge);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            
                            {charge.status !== 'paid' && charge.status !== 'cancelled' && (
                              <DropdownMenuItem onClick={(e) => handleMarkAsPaid(e, charge)}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Marcar como paga
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleCreateFollowUp(charge);
                            }}>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Criar follow-up
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              toast.info('Funcionalidade de conversa em desenvolvimento');
                            }}>
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Abrir conversa
                            </DropdownMenuItem>

                            <Separator className="my-1" />

                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => handleDelete(e, charge)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modais de Fluxo de Cobrança */}
      <ChargeFlowSelector
        open={showFlowSelector}
        onOpenChange={setShowFlowSelector}
        onSelectFlow={handleSelectFlow}
      />

      <InternalChargeModal
        open={showInternalModal}
        onOpenChange={setShowInternalModal}
        onChargeCreated={handleChargeCreated}
      />

      <ExternalChargeModal
        open={showExternalModal}
        onOpenChange={setShowExternalModal}
        onChargeCreated={handleChargeCreated}
      />

      <SendChargeModal
        open={showSendModal}
        onOpenChange={setShowSendModal}
        onChargeCreated={handleChargeCreated}
      />

      <SimpleChargeDetailPanel
        charge={selectedCharge}
        open={showDetailPanel}
        onOpenChange={setShowDetailPanel}
        onChargeUpdated={handleChargeUpdated}
        onCreateFollowUp={handleCreateFollowUp}
      />
    </div>
  );
}
