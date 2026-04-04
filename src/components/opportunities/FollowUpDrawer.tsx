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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Clock, AlertCircle, Lightbulb } from 'lucide-react';

import { Lead } from '@/data/mockSalesData';

interface FollowUpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

const getFollowUpColor = (status: string) => {
  switch (status) {
    case 'Precisa de contato hoje': return 'text-rose-600 bg-rose-50 border-rose-200';
    case 'Pronto para follow-up': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'Aguardando resposta': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'Em negociação': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
};

export default function FollowUpDrawer({ open, onOpenChange, lead }: FollowUpDrawerProps) {
  const [message, setMessage] = useState('');

  // Update text when a new lead is selected
  useEffect(() => {
    if (lead?.suggestedMessage) {
      setMessage(lead.suggestedMessage);
    } else {
      setMessage('Olá, estou entrando em contato sobre o nosso último papo...');
    }
  }, [lead]);

  if (!lead) return null;

  const handleSendWhatsApp = () => {
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const text = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl">{lead.name}</SheetTitle>
          <SheetDescription className="text-base text-foreground mt-1">
            <span className="font-semibold text-muted-foreground">Motivo:</span> {lead.reason}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* CONTEXT CARDS */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Situação</span>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold self-start border ${getFollowUpColor(lead.followUpStatus || '')}`}>
                  {lead.followUpStatus || 'Pendente'}
                </span>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Última Interação</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {lead.lastInteraction || 'Desconhecida'}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* SUGESTÃO DE ABORDAGEM */}
          {lead.suggestedApproach && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-bold mb-2">
                <Lightbulb className="w-4 h-4" />
                <span>Estratégia sugerida</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {lead.suggestedApproach}
              </p>
            </div>
          )}

          {/* MENSAGEM PRONTA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-brand-green-secondary" />
                Mensagem pronta para envio
              </label>
            </div>
            <Textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              className="min-h-[160px] text-sm leading-relaxed resize-y"
              placeholder="Digite sua mensagem aqui..."
            />
            <p className="text-xs text-muted-foreground">Você pode editar a mensagem acima antes de enviar.</p>
          </div>
        </div>

        <SheetFooter className="mt-8 flex flex-col gap-3 sm:flex-col">
          <Button 
            className="w-full font-bold h-12 text-base gap-2 bg-brand-green-primary hover:bg-brand-green-primary/90 text-white" 
            onClick={handleSendWhatsApp}
          >
            <MessageCircle className="w-5 h-5" />
            Enviar via WhatsApp
          </Button>
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
