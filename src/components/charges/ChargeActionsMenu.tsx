import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreVertical,
  Trash2,
  Settings,
  Repeat2,
  CheckCircle2,
  Copy,
  Zap,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Charge } from '@/types';

interface ChargeActionsMenuProps {
  charge: Charge;
  onDelete?: (chargeId: string) => void;
  onAutomation?: (chargeId: string, chargeName: string) => void;
  onMarkAsPaid?: (chargeId: string) => void;
  onResend?: (chargeId: string) => void;
  onGeneration?: (charge: Charge) => void;
  onViewPaymentLinks?: (charge: Charge) => void;
}

export default function ChargeActionsMenu({
  charge,
  onDelete,
  onAutomation,
  onMarkAsPaid,
  onResend,
  onGeneration,
  onViewPaymentLinks,
}: ChargeActionsMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      onDelete?.(charge.id);
      toast.success('Cobrança excluída com sucesso');
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error('[ChargeActionsMenu] Erro ao excluir:', error);
      toast.error('Erro ao excluir cobrança');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      onResend?.(charge.id);
      toast.success(`Cobrança reenviada via ${charge.lastSentChannel || 'WhatsApp'}`);
    } catch (error) {
      toast.error('Erro ao reenviar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      onMarkAsPaid?.(charge.id);
      toast.success('Cobrança marcada como paga');
    } catch (error) {
      toast.error('Erro ao atualizar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={isLoading}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {(charge.status === 'draft' || charge.status === 'scheduled') && (
            <>
              <DropdownMenuItem
                onClick={() => onGeneration?.(charge)}
                className="gap-2 cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                <span>Gerar Cobrança</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
            </>
          )}

          {charge.status !== 'paid' && (
            <>
              <DropdownMenuItem
                onClick={() => onAutomation?.(charge.id, charge.clientName)}
                className="gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                <span>Configurar Automação</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleResend}
                disabled={isLoading || charge.status === 'draft'}
                className="gap-2 cursor-pointer"
              >
                <Repeat2 className="h-4 w-4" />
                <span>Reenviar</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleMarkAsPaid}
                disabled={isLoading}
                className="gap-2 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Marcar como Paga</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
            </>
          )}

          {charge.paymentDetails && (
            <>
              <DropdownMenuItem
                onClick={() => onViewPaymentLinks?.(charge)}
                className="gap-2 cursor-pointer"
              >
                <Wallet className="h-4 w-4" />
                <span>Ver Links de Pagamento</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(charge.id);
              toast.success('ID copiado');
            }}
            className="gap-2 cursor-pointer text-muted-foreground"
          >
            <Copy className="h-4 w-4" />
            <span>Copiar ID</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            disabled={isLoading}
            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span>Excluir</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cobrança?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a cobrança para{' '}
              <strong>{charge.clientName}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
