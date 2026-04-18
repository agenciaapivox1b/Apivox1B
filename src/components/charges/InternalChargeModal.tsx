import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { chargeService } from '@/services/chargeService';
import { chargeCreationService } from '@/services/chargeCreationService';
import { supabase } from '@/lib/supabaseClient';
import type { Charge } from '@/types';
import { toast } from 'sonner';

interface InternalChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChargeCreated: (charge: Charge) => void;
}

// Mock de clientes - futuramente virá do banco
const mockClients = [
  { id: '1', name: 'João Silva', email: 'joao@email.com', phone: '(11) 99999-1111' },
  { id: '2', name: 'Maria Santos', email: 'maria@email.com', phone: '(11) 99999-2222' },
  { id: '3', name: 'Pedro Oliveira', email: 'pedro@email.com', phone: '(11) 99999-3333' },
];

export function InternalChargeModal({ open, onOpenChange, onChargeCreated }: InternalChargeModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientCpf: '',
    description: '',
    value: '',
    dueDate: '',
    paymentMethod: 'pix' as 'pix' | 'boleto' | 'credit_card',
  });

  // CPF mask function
  const formatCpf = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return cleaned.slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // Auto-preenchimento quando seleciona cliente
  useEffect(() => {
    if (selectedClient) {
      const client = mockClients.find(c => c.id === selectedClient);
      if (client) {
        setFormData(prev => ({
          ...prev,
          clientName: client.name,
          clientEmail: client.email,
          clientPhone: client.phone,
          // Mock CPF for demo - in real scenario would come from client data
          clientCpf: '000.000.000-00',
        }));
      }
    }
  }, [selectedClient]);

  const handleSubmit = async () => {
    if (!formData.clientName.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }
    if (!formData.value || parseFloat(formData.value) <= 0) {
      toast.error('Valor deve ser maior que 0');
      return;
    }
    if (!formData.dueDate) {
      toast.error('Data de vencimento é obrigatória');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    if (!formData.clientCpf.trim() || formData.clientCpf.replace(/\D/g, '').length !== 11) {
      toast.error('CPF válido é obrigatório (11 dígitos)');
      return;
    }
    if (!formData.clientEmail.trim() || !formData.clientEmail.includes('@')) {
      toast.error('E-mail válido é obrigatório para envio de cobrança');
      return;
    }

    setLoading(true);
    console.log('[InternalChargeModal] Iniciando criação de cobrança com envio de e-mail...');
    
    try {
      // 1. Obter tenant_id
      console.log('[InternalChargeModal] Buscando tenant_id...');
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      if (clientErr || !clientData) {
        console.error('[InternalChargeModal] Erro ao buscar tenant:', clientErr);
        throw new Error('Não foi possível localizar o tenant. Verifique se você está logado.');
      }

      const tenant_id = clientData.id;
      console.log('[InternalChargeModal] Tenant ID:', tenant_id);

      // 2. Chamar serviço de criação com envio de e-mail
      console.log('[InternalChargeModal] Chamando chargeCreationService com shouldSendEmail=true...');
      const requestPayload = {
        tenantId: tenant_id,
        customerName: formData.clientName,
        customerEmail: formData.clientEmail,
        customerPhone: formData.clientPhone,
        amount: parseFloat(formData.value),
        dueDate: new Date(formData.dueDate).toISOString(),
        description: formData.description,
        paymentMethod: formData.paymentMethod,
        cpfCnpj: formData.clientCpf.replace(/\D/g, ''),
        shouldSendEmail: true,
        createdBy: user?.email || 'user'
      };
      console.log('[InternalChargeModal] Request:', JSON.stringify(requestPayload, null, 2));

      const response = await chargeCreationService.createChargeWithFlexibleFlow(requestPayload);
      console.log('[InternalChargeModal] Response:', JSON.stringify(response, null, 2));

      if (!response.success || !response.charge) {
        console.error('[InternalChargeModal] Backend error:', response.error);
        throw new Error(response.error || 'Falha ao criar cobrança no servidor');
      }

      // 3. Log email status
      console.log('[InternalChargeModal] Email status:', response.emailStatus);
      if (response.emailError) {
        console.error('[InternalChargeModal] Email error:', response.emailError);
      }

      // 4. Montar objeto Charge para o callback
      const dbCharge = response.charge;
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
        paymentMethod: dbCharge.payment_method,
        paymentDetails: {
          method: dbCharge.payment_method,
          paymentLink: dbCharge.payment_link,
          pixCode: dbCharge.pix_code,
          pixQrCode: dbCharge.pix_qr_code,
        },
        createdAt: dbCharge.created_at || new Date().toISOString(),
      };

      onChargeCreated?.(newCharge);
      
      // 5. Mostrar resultado
      if (response.emailStatus === 'sent') {
        toast.success('Cobrança criada e e-mail enviado com sucesso!', {
          description: `Enviado para ${formData.clientEmail}`
        });
      } else if (response.emailStatus === 'failed') {
        toast.warning('Cobrança criada, mas e-mail não foi enviado', {
          description: response.emailError || 'Erro desconhecido no envio'
        });
      } else {
        toast.success('Cobrança criada com sucesso!');
      }
      
      onOpenChange(false);
      
      // Reset
      setFormData({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        clientCpf: '',
        description: '',
        value: '',
        dueDate: '',
        paymentMethod: 'pix',
      });
      setSelectedClient('');
    } catch (err: any) {
      console.error('[InternalChargeModal] Fatal Error:', err);
      toast.error(err.message || 'Erro ao criar cobrança');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Gerar cobrança no APIVOX</DialogTitle>
              <DialogDescription>
                Crie uma cobrança completa para gerar via gateway
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Seleção de Cliente */}
          <Card className="p-4 space-y-3">
            <Label>Cliente *</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione ou digite um cliente" />
              </SelectTrigger>
              <SelectContent>
                {mockClients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} - {client.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  placeholder="cliente@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.clientCpf}
                onChange={(e) => setFormData({ ...formData, clientCpf: formatCpf(e.target.value) })}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
          </Card>

          {/* Dados da Cobrança */}
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="value">Valor (R$) *</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Vencimento *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o serviço ou produto"
                rows={2}
              />
            </div>
          </Card>

          {/* Forma de Pagamento */}
          <Card className="p-4 space-y-3">
            <Label>Forma de Cobrança</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'pix', label: 'PIX', color: 'bg-green-100 text-green-700' },
                { value: 'boleto', label: 'Boleto', color: 'bg-blue-100 text-blue-700' },
                { value: 'credit_card', label: 'Cartão', color: 'bg-purple-100 text-purple-700' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMethod: option.value as any })}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.paymentMethod === option.value
                      ? 'border-primary ' + option.color
                      : 'border-muted hover:border-accent'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              * Cobrança será gerada automaticamente quando o gateway de pagamento for integrado
            </p>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Criar Cobrança
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InternalChargeModal;
