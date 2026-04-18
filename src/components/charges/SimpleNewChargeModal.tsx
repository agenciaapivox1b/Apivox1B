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
import { AlertCircle, Link as LinkIcon, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Charge } from '@/types';
import { chargeService } from '@/services/chargeService';
import { toast } from 'sonner';

interface SimpleNewChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChargeCreated?: (charge: Charge) => void;
}

export default function SimpleNewChargeModal({
  open,
  onOpenChange,
  onChargeCreated,
}: SimpleNewChargeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    description: '',
    value: '',
    dueDate: '',
    paymentMethod: '' as 'pix' | 'boleto' | 'credit_card' | 'external' | 'manual' | '',
    origin: 'manual' as 'manual' | 'integration' | 'external',
    externalLink: '',
    externalCode: '',
    observation: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    if (!formData.value || parseFloat(formData.value) <= 0) {
      setError('Valor deve ser maior que 0');
      return false;
    }
    if (!formData.dueDate) {
      setError('Data de vencimento é obrigatória');
      return false;
    }
    // Descrição obrigatória apenas para métodos internos
    // Para cobrança externa, link/código já identifica no ERP
    if (!formData.description.trim() && formData.paymentMethod !== 'external') {
      setError('Descrição é obrigatória');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Determinar status inicial baseado na data
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let initialStatus: Charge['status'] = 'draft';
      if (dueDate < today) {
        initialStatus = 'overdue';
      }

      // Preparar dados do método de pagamento
      const paymentDetails = formData.paymentMethod === 'external' 
        ? {
            method: 'external' as const,
            externalLink: formData.externalLink,
            externalCode: formData.externalCode,
          }
        : formData.paymentMethod
        ? { method: formData.paymentMethod as any }
        : { method: 'pending' as const };

      const newCharge = chargeService.createCharge({
        clientName: formData.clientName,
        clientEmail: formData.clientEmail || 'cliente@email.com',
        clientPhone: formData.clientPhone || '+55 11 99999-9999',
        description: formData.description,
        value: parseFloat(formData.value),
        dueDate: new Date(formData.dueDate).toISOString(),
        status: initialStatus,
        paymentMethod: formData.paymentMethod || 'pending',
        paymentDetails,
        origin: formData.origin,
        observation: formData.observation,
      });

      toast.success('Cobrança criada com sucesso!');
      onChargeCreated?.(newCharge);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        description: '',
        value: '',
        dueDate: '',
        paymentMethod: '',
        origin: 'manual',
        externalLink: '',
        externalCode: '',
        observation: '',
      });
    } catch (err) {
      console.error('Erro ao criar cobrança:', err);
      setError('Erro ao criar cobrança. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const showExternalFields = formData.paymentMethod === 'external';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Nova Cobrança
          </DialogTitle>
          <DialogDescription>
            Crie uma nova cobrança para seu cliente. Preencha os dados obrigatórios.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="clientName">Cliente *</Label>
            <Input
              id="clientName"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              placeholder="Nome do cliente"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="clientEmail">E-mail</Label>
              <Input
                id="clientEmail"
                name="clientEmail"
                type="email"
                value={formData.clientEmail}
                onChange={handleChange}
                placeholder="cliente@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Telefone</Label>
              <Input
                id="clientPhone"
                name="clientPhone"
                value={formData.clientPhone}
                onChange={handleChange}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          {/* Valor e Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="value">Valor (R$) *</Label>
              <Input
                id="value"
                name="value"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.value}
                onChange={handleChange}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Vencimento *</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Descrição {formData.paymentMethod !== 'external' && '*'}
              {formData.paymentMethod === 'external' && (
                <span className="text-muted-foreground font-normal text-sm"> (opcional - preenchido no ERP)</span>
              )}
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={formData.paymentMethod === 'external' 
                ? "Descrição opcional - os dados completos estão no sistema externo" 
                : "Descreva o serviço ou produto"}
              rows={2}
            />
          </div>

          {/* Forma de Cobrança */}
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Forma de Cobrança</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => handleSelectChange('paymentMethod', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de cobrança" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="external">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Cobrança Externa (Link/ERP)
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Registro Manual
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos dinâmicos para cobrança externa */}
            {showExternalFields && (
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="externalLink">Link de Pagamento (opcional)</Label>
                  <Input
                    id="externalLink"
                    name="externalLink"
                    value={formData.externalLink}
                    onChange={handleChange}
                    placeholder="https://pagamento.externo.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalCode">Código/Número do Boleto (opcional)</Label>
                  <Input
                    id="externalCode"
                    name="externalCode"
                    value={formData.externalCode}
                    onChange={handleChange}
                    placeholder="12345.67890 12345.678901 12345.678901 1 12345678901234"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Origem */}
          <div className="space-y-2">
            <Label>Origem</Label>
            <Select
              value={formData.origin}
              onValueChange={(value) => handleSelectChange('origin', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual (criada no sistema)</SelectItem>
                <SelectItem value="external">Externa (ERP/Banco/Planilha)</SelectItem>
                <SelectItem value="integration">Integração</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observation">Observações Internas</Label>
            <Textarea
              id="observation"
              name="observation"
              value={formData.observation}
              onChange={handleChange}
              placeholder="Notas internas sobre a cobrança..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Criando...' : 'Criar Cobrança'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
