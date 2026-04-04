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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Charge } from '@/types';
import { chargeCreationService } from '@/services/chargeCreationService';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { messageService } from '@/services/messageService';
import { templateService } from '@/services/templateService';
import { useAuth } from '@/contexts/AuthContext';

interface NewChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChargeCreated?: (charge: Charge) => void;
}

export default function NewChargeModal({
  open,
  onOpenChange,
  onChargeCreated,
}: NewChargeModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientCpfCnpj: '',
    description: '',
    value: '',
    dueDate: '',
    paymentMethod: '' as 'pix' | 'boleto' | 'credit_card' | 'transfer' | 'cash' | '',
    recurrence: 'none' as 'none' | 'monthly' | 'quarterly' | 'yearly',
    responsible: '',
    observation: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.clientName.trim()) {
      setError('Nome do cliente é obrigatório');
      return false;
    }
    if (!formData.clientEmail.trim() || !formData.clientEmail.includes('@')) {
      setError('E-mail válido é obrigatório');
      return false;
    }
    if (!formData.clientPhone.trim()) {
      setError('Telefone é obrigatório');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Descrição é obrigatória');
      return false;
    }
    if (!formData.value || parseFloat(formData.value) <= 0) {
      setError('Valor deve ser maior que 0');
      return false;
    }
    if (!formData.dueDate) {
      setError('Data de vencimento é obrigatória');
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 1. Obter o tenant_id do cliente logado
      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      if (clientErr || !clientData) {
        throw new Error('Não foi possível localizar o seu identificador de cliente (tenant).');
      }

      const tenant_id = clientData.id;

      // 2. Chamada Única para o Backend (Edge Function) ou Novo Fluxo
      // Sistema decide automaticamente qual usar baseado na config do tenant
      const response = await chargeCreationService.createChargeWithFlexibleFlow({
        tenantId: tenant_id,
        customerName: formData.clientName,
        customerEmail: formData.clientEmail,
        customerPhone: formData.clientPhone,
        amount: parseFloat(formData.value),
        dueDate: new Date(formData.dueDate).toISOString(),
        description: formData.description,
        paymentMethod: formData.paymentMethod as any || 'pix',
        cpfCnpj: formData.clientCpfCnpj,
        shouldSendEmail: false,
        createdBy: user?.email || 'user'
      });

      if (!response.success || !response.charge) {
        throw new Error(response.error || 'Erro ao processar cobrança no backend');
      }

      const dbCharge = response.charge;

      // 3. Montar entidade de compatibilidade para a UI local
      const newCharge: Charge = {
        id: dbCharge.id,
        clientName: dbCharge.customer_name,
        clientEmail: dbCharge.customer_email || '',
        clientPhone: dbCharge.customer_phone || '',
        description: dbCharge.description || '',
        value: dbCharge.amount,
        dueDate: dbCharge.due_date,
        status: dbCharge.status || 'draft',
        paymentMethod: dbCharge.payment_method as any,
        paymentDetails: {
          method: dbCharge.payment_method as any,
          paymentLink: dbCharge.payment_link,
          pixCode: dbCharge.pix_code,
          pixQrCode: dbCharge.pix_qr_code,
          boletoLine: dbCharge.digitable_line
        },
        createdAt: dbCharge.created_at || new Date().toISOString(),
      };

      onChargeCreated?.(newCharge);
      toast.success('Cobrança salva com sucesso (Rascunho)');
      handleClose();
    } catch (err: any) {
      console.error('[NewChargeModal] Error:', err);
      // Se for um erro da Edge Function que retornou um objeto com .details ou .message, mostrar
      const errorMessage = err.message || 'Erro ao salvar rascunho na base remota';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndSend = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 1. Obter o tenant_id do cliente logado
      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      if (clientErr || !clientData) {
        throw new Error('Não foi possível localizar o seu identificador de cliente (tenant).');
      }

      const tenant_id = clientData.id;

      // 2. Chamada REAL para o Backend (Edge Function ou Novo Fluxo)
      // Sistema decide automaticamente qual usar baseado na config do tenant
      const response = await chargeCreationService.createChargeWithFlexibleFlow({
        tenantId: tenant_id,
        customerName: formData.clientName,
        customerEmail: formData.clientEmail,
        customerPhone: formData.clientPhone,
        amount: parseFloat(formData.value),
        dueDate: new Date(formData.dueDate).toISOString(),
        description: formData.description,
        paymentMethod: formData.paymentMethod as any || 'pix',
        cpfCnpj: formData.clientCpfCnpj,
        shouldSendEmail: true,
        createdBy: user?.email || 'user'
      });

      if (!response.success || !response.charge) {
        throw new Error(response.error || 'Falha ao processar operação no servidor');
      }

      // 3. Exibir resultado consolidado do Backend
      if (response.emailStatus === 'failed') {
        toast.warning(`Cobrança criada, mas o e-mail falhou: ${response.emailError}`);
      } else {
        toast.success(response.message || 'Cobrança criada e enviada com sucesso!');
      }

      const dbCharge = response.charge;
      
      // 4. Entidade de compatibilidade para atualizar o Dashboard sem reload
      const newCharge: Charge = {
        id: dbCharge.id,
        clientName: dbCharge.customer_name,
        clientEmail: dbCharge.customer_email || '',
        clientPhone: dbCharge.customer_phone || '',
        description: dbCharge.description || '',
        value: dbCharge.amount,
        dueDate: dbCharge.due_date,
        status: dbCharge.status || 'sent', 
        lastSentAt: response.emailStatus === 'sent' ? new Date().toISOString() : undefined,
        lastSentChannel: response.emailStatus === 'sent' ? 'email' : undefined,
        paymentMethod: dbCharge.payment_method as any,
        paymentDetails: {
          method: dbCharge.payment_method as any,
          paymentLink: dbCharge.payment_link,
          pixCode: dbCharge.pix_code,
          pixQrCode: dbCharge.pix_qr_code,
          boletoLine: dbCharge.digitable_line
        },
        createdAt: dbCharge.created_at || new Date().toISOString(),
      };

      onChargeCreated?.(newCharge);
      handleClose();
    } catch (err: any) {
      console.error('[NewChargeModal] Fatal Error:', err);
      const errorMessage = err.message || 'Erro crítico ao processar cobrança no backend';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientCpfCnpj: '',
      description: '',
      value: '',
      dueDate: '',
      paymentMethod: '',
      recurrence: 'none',
      responsible: '',
      observation: '',
    });
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Cobrança</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar uma nova cobrança
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Seção: Dados do Cliente */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Dados do Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-sm">
                  Nome do Cliente *
                </Label>
                <Input
                  id="clientName"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  placeholder="ex: Clínica Sorriso Ltda"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail" className="text-sm">
                  E-mail *
                </Label>
                <Input
                  id="clientEmail"
                  name="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={handleChange}
                  placeholder="cliente@empresa.com.br"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientPhone" className="text-sm">
                  Telefone para WhatsApp *
                </Label>
                <Input
                  id="clientPhone"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleChange}
                  placeholder="+55 11 99999-9999"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientCpfCnpj" className="text-sm">
                  CPF ou CNPJ (Obrigatório para Boleto)
                </Label>
                <Input
                  id="clientCpfCnpj"
                  name="clientCpfCnpj"
                  value={formData.clientCpfCnpj}
                  onChange={handleChange}
                  placeholder="000.000.000-00"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Seção: Dados da Cobrança */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Dados da Cobrança</h3>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm">
                Descrição *
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="ex: Serviço de Automação - Fevereiro 2026"
                disabled={loading}
                className="min-h-20 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value" className="text-sm">
                  Valor (R$) *
                </Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  value={formData.value}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={loading}
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-sm">
                  Data de Vencimento *
                </Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod" className="text-sm">
                  Como o cliente vai pagar
                </Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => handleSelectChange('paymentMethod', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="transfer">Transferência Bancária</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrence" className="text-sm">
                  Essa cobrança se repete?
                </Label>
                <Select
                  value={formData.recurrence}
                  onValueChange={(value) =>
                    handleSelectChange('recurrence', value as 'none' | 'monthly' | 'quarterly' | 'yearly')
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção: Informações Adicionais */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Informações Adicionais</h3>

            <div className="space-y-2">
              <Label htmlFor="responsible" className="text-sm">
                Quem acompanha essa cobrança
              </Label>
              <Input
                id="responsible"
                name="responsible"
                value={formData.responsible}
                onChange={handleChange}
                placeholder="nome do responsável"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observation" className="text-sm">
                Observação
              </Label>
              <Textarea
                id="observation"
                name="observation"
                value={formData.observation}
                onChange={handleChange}
                placeholder="Adicione notas ou observações sobre esta cobrança"
                disabled={loading}
                className="min-h-16 resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar Rascunho'}
          </Button>
          <Button
            type="button"
            onClick={handleCreateAndSend}
            disabled={loading}
            className="gap-2"
          >
            {loading ? 'Criando...' : 'Criar cobrança e enviar ao cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
