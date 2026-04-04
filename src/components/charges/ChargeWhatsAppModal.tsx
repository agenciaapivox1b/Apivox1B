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
import { MessageCircle, X, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { Charge } from '@/types';
import { whatsappService } from '@/services/whatsappService';
import { chargeService } from '@/services/chargeService';
import { supabase } from '@/lib/supabaseClient';

interface ChargeWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charge: Charge | null;
}

/**
 * Modal de WhatsApp - REFATORADO para usar whatsappService
 * 
 * Responsabilidades:
 * 1. Gerar mensagem via whatsappService.buildMessage()
 * 2. Permitir edição livre da mensagem
 * 3. Abrir wa.me com mensagem pré-preenchida
 * 4. Registrar evento em charge_events (Supabase)
 * 5. Registrar evento localmente em chargeService (localStorage)
 * 
 * Fluxo:
 * - Modal abre -> gera mensagem -> usuário edita (opcional) -> clica "Abrir WhatsApp"
 * - onClick dispara: Supabase + localStorage + abre wa.me
 */
export default function ChargeWhatsAppModal({ open, onOpenChange, charge }: ChargeWhatsAppModalProps) {
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (charge && open) {
      // Usar whatsappService para gerar mensagem padrão
      const generatedMessage = whatsappService.buildMessage(charge, {
        includePaymentLink: true,
        tone: charge.status === 'overdue' ? 'urgent' : 'casual',
      });
      setMessage(generatedMessage);
      setIsSent(false);
    }
  }, [charge, open]);

  if (!charge) return null;

  const handleSend = async () => {
    setIsLoading(true);
    try {
      // 1. Obter URL do wa.me
      const { url, hasPhone } = whatsappService.getWhatsAppWebUrl(charge, message);

      // 2. Registrar evento em Supabase (charge_events)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(charge.id)) {
        const eventLogged = await whatsappService.logEvent({
          chargeId: charge.id,
          tenantId: charge.tenantId,
          eventType: 'whatsapp_sent_manual',
          description: `Cobrança enviada manualmente via WhatsApp para ${charge.clientName}`,
          channel: 'whatsapp',
          createdBy: 'user_manual',
          phoneNumber: charge.clientPhone,
          messagePreview: message,
          metadata: {
            hasPhone,
            messageLength: message.length,
          },
        });

        // Registrar também no localStorage (histórico local)
        if (eventLogged) {
          chargeService.registerWhatsAppEvent(
            charge.id,
            'whatsapp_sent_manual',
            `WhatsApp aberto para ${charge.clientName} via wa.me`,
            {
              phone: charge.clientPhone,
              hasPhone,
              messagePreview: message.substring(0, 120),
              wamedLink: url,
            }
          );
        }
      } else {
        // Para charges de mock (sem UUID), registrar apenas localmente
        chargeService.registerWhatsAppEvent(
          charge.id,
          'whatsapp_opened',
          `WhatsApp aberto para ${charge.clientName} (modo simulação)`,
          {
            phone: charge.clientPhone,
            messagePreview: message.substring(0, 120),
          }
        );
      }

      // 3. Abrir wa.me em nova aba
      window.open(url, '_blank');
      setIsSent(true);

      // Feedback visual
      toast.success(`WhatsApp aberto para ${charge.clientName}!`, {
        description: 'Mensagem pré-preenchida. Revise e envie pelo WhatsApp.',
        duration: 4000,
      });

      // Fechar modal após delay
      setTimeout(() => onOpenChange(false), 1200);
    } catch (err) {
      console.error('[ChargeWhatsAppModal] Erro ao enviar:', err);
      toast.error('Erro ao abrir WhatsApp', {
        description: 'Tente novamente ou contate o suporte.',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const summary = whatsappService.getSummary(charge);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            Enviar Cobrança via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Mensagem pré-montada com os dados da cobrança. Edite antes de enviar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* INFO DO CLIENTE */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Para:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{charge.clientName}</span>
              {summary.hasValidPhone ? (
                <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-700 dark:text-green-300 border-0">
                  ✓ {charge.clientPhone}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                  ⚠️ Telefone inválido
                </Badge>
              )}
            </div>
          </div>

          {/* CANAL */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-2 border-[#25D366] text-[#25D366] font-bold"
              disabled
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
            <span className="text-xs text-muted-foreground">
              {summary.hasValidPhone 
                ? `Envio direto para ${charge.clientPhone}` 
                : 'Link genérico (sem número)'}
            </span>
          </div>

          {/* DADOS DA COBRANÇA (preview) */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="text-sm space-y-1">
              <p className="font-semibold text-foreground">{charge.description}</p>
              <p className="text-muted-foreground">
                Valor: <span className="font-bold text-primary">R$ {charge.value.toFixed(2)}</span>
              </p>
              <p className="text-muted-foreground">
                Vencimento: <span className="font-semibold">{new Date(charge.dueDate).toLocaleDateString('pt-BR')}</span>
              </p>
              {summary.hasPaymentLink && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  ✓ Link de pagamento incluído na mensagem
                </p>
              )}
            </div>
          </div>

          {/* MENSAGEM EDITÁVEL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Mensagem
              </label>
              <Badge variant="secondary" className="text-[10px]">
                {message.length} caracteres
              </Badge>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[200px] text-sm leading-relaxed font-mono resize-y"
              placeholder="Mensagem de cobrança..."
              disabled={isSent}
            />
            <p className="text-[11px] text-muted-foreground">
              💡 A mensagem será preenchida automaticamente no WhatsApp. Você pode editar antes de enviar.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground sm:mr-auto"
            onClick={() => onOpenChange(false)}
            disabled={isLoading || isSent}
          >
            <X className="w-4 h-4" /> Cancelar
          </Button>
          <Button
            size="sm"
            className="gap-2 font-bold bg-[#25D366] hover:bg-[#1da851] text-white shadow"
            onClick={handleSend}
            disabled={!message.trim() || isSent || isLoading || !summary.hasValidPhone}
            title={!summary.hasValidPhone ? 'Telefone inválido. Use link genérico.' : ''}
          >
            {isSent ? (
              <>
                <CheckCircle className="w-4 h-4" /> Enviado!
              </>
            ) : isLoading ? (
              <>
                <MessageCircle className="w-4 h-4 animate-spin" /> Abrindo...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" /> Abrir no WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
