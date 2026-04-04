import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Calendar, X, CheckCircle, Lightbulb } from 'lucide-react';
import { Lead } from '@/data/mockSalesData';
import { toast } from 'sonner';

interface FollowUpActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onConfirm?: (lead: Lead) => void;
}

function generateMessage(lead: Lead): string {
  if (lead.suggestedMessage) return lead.suggestedMessage;
  const base = `Olá, ${lead.name.split(' ')[0]}! Tudo bem?\n\n`;
  if (lead.recommendation) {
    return `${base}Estou entrando em contato para dar sequência ao nosso papo. Com base no que conversamos, gostaria de ${lead.recommendation.toLowerCase()}.\n\nPodemos conversar?`;
  }
  return `${base}Passei para retomar nossa conversa e entender como posso te ajudar. Tem um minutinho?`;
}

export default function FollowUpActionModal({ open, onOpenChange, lead, onConfirm }: FollowUpActionModalProps) {
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    if (lead) {
      setMessage(generateMessage(lead));
      setIsSent(false);
    }
  }, [lead]);

  if (!lead) return null;

  const handleSendWhatsApp = () => {
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(message.trim());
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    setIsSent(true);

    toast.success(`Follow-up enviado para ${lead.name}!`, {
      description: `Canal: WhatsApp · ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      duration: 4000
    });

    onConfirm?.(lead);
    setTimeout(() => onOpenChange(false), 800);
  };

  const handleSchedule = () => {
    toast.success(`Follow-up agendado para ${lead.name}!`, {
      description: 'Você poderá acessar o status na aba de Follow-up.',
      duration: 4000
    });
    onConfirm?.(lead);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Criar Follow-up — {lead.name}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Revise a mensagem abaixo antes de enviar. Baseada na recomendação estratégica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* RECOMMENDATION REMINDER */}
          {lead.recommendation && (
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                <strong>Recomendação:</strong> {lead.recommendation} — {lead.recommendationReason}
              </p>
            </div>
          )}

          {/* CHANNEL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Canal</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-2 border-primary text-primary font-bold"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
            </div>
          </div>

          {/* MESSAGE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mensagem</label>
              <Badge variant="secondary" className="text-[10px]">Editável</Badge>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[140px] text-sm leading-relaxed resize-y"
              placeholder="Digite a mensagem..."
            />
            <p className="text-[11px] text-muted-foreground">Você pode editar a mensagem antes de enviar.</p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground sm:mr-auto"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4" /> Cancelar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleSchedule}
          >
            <Calendar className="w-4 h-4" /> Agendar
          </Button>
          <Button
            size="sm"
            className="gap-2 font-bold bg-[#25D366] hover:bg-[#20bd59] text-white shadow"
            onClick={handleSendWhatsApp}
            disabled={!message.trim() || isSent}
          >
            {isSent ? <CheckCircle className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
            {isSent ? 'Enviado!' : 'Enviar via WhatsApp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
