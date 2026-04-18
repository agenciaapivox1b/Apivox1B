import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ExternalLink, Link2, FileText, Loader2 } from 'lucide-react';
import { chargeService } from '@/services/chargeService';
import type { Charge } from '@/types';
import { toast } from 'sonner';

interface ExternalChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChargeCreated: (charge: Charge) => void;
}

// Mock de clientes
const mockClients = [
  { id: '1', name: 'João Silva', email: 'joao@email.com', phone: '(11) 99999-1111' },
  { id: '2', name: 'Maria Santos', email: 'maria@email.com', phone: '(11) 99999-2222' },
  { id: '3', name: 'Pedro Oliveira', email: 'pedro@email.com', phone: '(11) 99999-3333' },
];

export function ExternalChargeModal({ open, onOpenChange, onChargeCreated }: ExternalChargeModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    description: '',
    value: '',
    dueDate: '',
    externalLink: '',
    externalCode: '',
    observation: '',
  });

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

    setLoading(true);
    try {
      const newCharge = chargeService.createCharge({
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
        description: formData.description || 'Cobrança externa',
        value: parseFloat(formData.value),
        dueDate: formData.dueDate,
        paymentMethod: 'external',
        origin: 'external',
        paymentDetails: {
          method: 'external',
          externalLink: formData.externalLink || undefined,
          externalCode: formData.externalCode || undefined,
        },
        observation: formData.observation,
      });

      onChargeCreated?.(newCharge);
      onOpenChange(false);
      toast.success('Cobrança externa registrada com sucesso!');
      
      // Reset
      setFormData({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        description: '',
        value: '',
        dueDate: '',
        externalLink: '',
        externalCode: '',
        observation: '',
      });
      setSelectedClient('');
    } catch (err) {
      console.error('Erro ao registrar cobrança:', err);
      toast.error('Erro ao registrar cobrança');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Registrar cobrança externa</DialogTitle>
              <DialogDescription>
                Registre uma cobrança já existente no seu ERP, banco ou contador
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
              <Label htmlFor="description">
                Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional - preenchido automaticamente no sistema externo"
                rows={2}
              />
            </div>
          </Card>

          {/* Link ou Código do Boleto */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-orange-600" />
              <span className="font-medium">Link ou Código do Boleto</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="externalLink">Link de pagamento</Label>
              <Input
                id="externalLink"
                type="url"
                value={formData.externalLink}
                onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="externalCode">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Código / Linha Digitável</span>
                </div>
              </Label>
              <Textarea
                id="externalCode"
                value={formData.externalCode}
                onChange={(e) => setFormData({ ...formData, externalCode: e.target.value })}
                placeholder="Cole o código de barras ou linha digitável do boleto"
                rows={2}
              />
            </div>
          </Card>

          {/* Observação */}
          <Card className="p-4 space-y-2">
            <Label htmlFor="observation">Observação (opcional)</Label>
            <Textarea
              id="observation"
              value={formData.observation}
              onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
              placeholder="Ex: Boleto gerado no Banco do Brasil, enviado pelo contador em 10/04/2026"
              rows={2}
            />
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} variant="default">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Registrar Cobrança
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExternalChargeModal;
