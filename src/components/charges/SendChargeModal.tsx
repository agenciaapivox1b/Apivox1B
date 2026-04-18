import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, MessageCircle, Mail, Link2, FileText, Loader2, User, Phone, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { chargeService } from '@/services/chargeService';
import { emailService } from '@/services/emailService';
import type { Charge } from '@/types';
import { toast } from 'sonner';

interface SendChargeModalProps {
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

export function SendChargeModal({ open, onOpenChange, onChargeCreated }: SendChargeModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    chargeLink: '',
    chargeCode: '',
    value: '',
    dueDate: '',
    description: '',
    customMessage: '',
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
        // Switch to email channel if client has email, or show warning
        if (!client.email) {
          toast.warning('Cliente não possui e-mail cadastrado. Adicione um e-mail para enviar por este canal.');
        }
      }
    }
  }, [selectedClient]);

  // Gera mensagem padrão
  const generateMessage = () => {
    const name = formData.clientName || '{nome}';
    const desc = formData.description || 'serviço/produto';
    const date = formData.dueDate ? new Date(formData.dueDate).toLocaleDateString('pt-BR') : '{data}';
    const link = formData.chargeLink || '{link}';
    const value = formData.value ? `R$ ${parseFloat(formData.value).toFixed(2)}` : '';
    
    if (channel === 'whatsapp') {
      return `Olá ${name}, tudo bem?\n\nSegue sua cobrança referente a *${desc}*.\n\n${value ? `💰 Valor: ${value}\n` : ''}📅 Vencimento: ${date}\n\n🔗 Link para pagamento:\n${link}\n\nQualquer dúvida, estou à disposição!`;
    } else {
      return `Olá ${name},\n\nSegue sua cobrança referente a ${desc}.\n\n${value ? `Valor: ${value}\n` : ''}Vencimento: ${date}\n\nLink para pagamento:\n${link}\n\nQualquer dúvida, estou à disposição!\n\nAtenciosamente,`;
    }
  };

  // Atualiza mensagem quando dados mudam
  useEffect(() => {
    if (!formData.customMessage || formData.customMessage === generateMessage()) {
      setFormData(prev => ({ ...prev, customMessage: generateMessage() }));
    }
  }, [formData.clientName, formData.description, formData.dueDate, formData.chargeLink, formData.value, channel]);

  const handleSend = async () => {
    if (!formData.clientName.trim()) {
      toast.error('Selecione um cliente');
      return;
    }
    if (!formData.chargeLink && !formData.chargeCode) {
      toast.error('Informe o link ou código da cobrança');
      return;
    }

    // Validate based on channel
    if (channel === 'whatsapp' && !formData.clientPhone.trim()) {
      toast.error('Telefone é obrigatório para envio por WhatsApp');
      return;
    }
    if (channel === 'email' && !formData.clientEmail.trim()) {
      toast.error('E-mail é obrigatório para envio por e-mail');
      return;
    }
    if (channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
      toast.error('E-mail inválido');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create the charge in the system
      const newCharge = chargeService.createCharge({
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
        description: formData.description || 'Cobrança enviada',
        value: formData.value ? parseFloat(formData.value) : 0,
        dueDate: formData.dueDate || new Date().toISOString().split('T')[0],
        paymentMethod: 'external',
        origin: 'external',
        paymentDetails: {
          method: 'external',
          externalLink: formData.chargeLink || undefined,
          externalCode: formData.chargeCode || undefined,
        },
        status: 'draft', // Will be updated to 'sent' after successful send
      });

      // Step 2: Send via the selected channel
      if (channel === 'email') {
        // Send real email via Resend
        const emailResult = await emailService.sendChargeEmail({
          to: formData.clientEmail,
          clientName: formData.clientName,
          description: formData.description || 'Cobrança',
          value: formData.value,
          dueDate: formData.dueDate,
          chargeLink: formData.chargeLink,
          chargeCode: formData.chargeCode,
          chargeId: newCharge.id,
        });

        if (!emailResult.success) {
          toast.error(`Falha ao enviar e-mail: ${emailResult.error}`);
          setLoading(false);
          return;
        }

        // Send via chargeService which handles history automatically
        const sentCharge = chargeService.sendCharge?.(newCharge.id, 'email');
        if (!sentCharge) {
          console.warn('[SendChargeModal] sendCharge returned null, charge may not be eligible for sending');
        }

        toast.success('E-mail enviado com sucesso!', {
          description: `Enviado para ${formData.clientEmail}`,
        });
      } else {
        // WhatsApp - still simulated (needs WhatsApp integration)
        const sentCharge = chargeService.sendCharge?.(newCharge.id, 'whatsapp');
        if (!sentCharge) {
          console.warn('[SendChargeModal] sendCharge returned null, charge may not be eligible for sending');
        }

        toast.success('Cobrança enviada via WhatsApp!');
      }
      
      onChargeCreated?.(newCharge);
      onOpenChange(false);
      
      // Reset
      setFormData({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        chargeLink: '',
        chargeCode: '',
        value: '',
        dueDate: '',
        description: '',
        customMessage: '',
      });
      setSelectedClient('');
    } catch (err) {
      console.error('Erro ao enviar cobrança:', err);
      toast.error('Erro ao enviar cobrança');
    } finally {
      setLoading(false);
    }
  };

  const selectedClientData = mockClients.find(c => c.id === selectedClient);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Enviar cobrança já pronta</DialogTitle>
              <DialogDescription>
                Envie rapidamente um boleto ou link existente para o cliente
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Passo 1: Selecionar Cliente */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <User className="w-4 h-4" />
              <span>Passo 1: Selecione o cliente</span>
            </div>
            
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Buscar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {mockClients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{client.name}</span>
                      <span className="text-xs text-muted-foreground">{client.phone} • {client.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedClientData && (
              <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{formData.clientPhone}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{formData.clientEmail}</span>
                </div>
              </div>
            )}
          </Card>

          {/* Passo 2: Inserir Cobrança */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Link2 className="w-4 h-4" />
              <span>Passo 2: Insira a cobrança</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chargeLink">Link de pagamento</Label>
              <Input
                id="chargeLink"
                type="url"
                value={formData.chargeLink}
                onChange={(e) => setFormData({ ...formData, chargeLink: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chargeCode">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>ou Código / Linha Digitável</span>
                </div>
              </Label>
              <Textarea
                id="chargeCode"
                value={formData.chargeCode}
                onChange={(e) => setFormData({ ...formData, chargeCode: e.target.value })}
                placeholder="Cole o código de barras ou linha digitável"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="value">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <span className="text-xs">Valor (opcional)</span>
                  </div>
                </Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="R$"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="dueDate">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span className="text-xs">Vencimento (opcional)</span>
                  </div>
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs">Descrição (opcional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Serviço de consultoria - Abril/2026"
              />
            </div>
          </Card>

          {/* Passo 3: Canal de Envio */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Send className="w-4 h-4" />
              <span>Passo 3: Escolha o canal de envio</span>
            </div>

            <Tabs value={channel} onValueChange={(v) => setChannel(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="whatsapp" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="w-4 h-4" />
                  E-mail
                </TabsTrigger>
              </TabsList>

              <TabsContent value="whatsapp" className="mt-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="whatsappMessage">Mensagem</Label>
                    <span className="text-xs text-muted-foreground">Editável</span>
                  </div>
                  <Textarea
                    id="whatsappMessage"
                    value={formData.customMessage}
                    onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    * será enviado para: {formData.clientPhone || '(selecione um cliente)'}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="email" className="mt-3">
                {/* Warning if no email */}
                {(!formData.clientEmail || formData.clientEmail.trim() === '') && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">E-mail não cadastrado</p>
                      <p className="text-amber-700 text-xs">Adicione um e-mail para o cliente ou informe manualmente para enviar.</p>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailMessage">Mensagem</Label>
                    <span className="text-xs text-muted-foreground">Editável</span>
                  </div>
                  <Textarea
                    id="emailMessage"
                    value={formData.customMessage}
                    onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    * será enviado para: {formData.clientEmail || '(selecione um cliente)'}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={loading || !formData.clientName || (!formData.chargeLink && !formData.chargeCode) || (channel === 'email' && !formData.clientEmail.trim())}
            className="gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Send className="w-4 h-4" />
            Enviar {channel === 'whatsapp' ? 'no WhatsApp' : 'por E-mail'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SendChargeModal;
