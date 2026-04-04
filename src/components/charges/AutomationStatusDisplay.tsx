import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  Settings,
  CheckCircle2,
  AlertCircle,
  Zap,
  MessageCircle,
  Mail,
  User,
} from 'lucide-react';
import type { Charge, ChargeAutomation, ScheduledAction } from '@/types';
import { chargeService } from '@/services/chargeService';

interface AutomationStatusDisplayProps {
  charge: Charge;
  onEdit?: () => void;
  onToggle?: (enabled: boolean) => void;
}

export function AutomationStatusDisplay({
  charge,
  onEdit,
  onToggle,
}: AutomationStatusDisplayProps) {
  const [countdown, setCountdown] = useState<string>('');
  const automation = charge.automationConfig;

  // Calcular countdown para próxima ação
  useEffect(() => {
    const updateCountdown = () => {
      if (automation?.enabled && charge.scheduledActions && charge.scheduledActions.length > 0) {
        // Obter a próxima ação pendente
        const nextAction = charge.scheduledActions.find(a => a.status === 'pending');
        if (nextAction) {
          const now = new Date();
          const actionTime = new Date(nextAction.scheduledFor);
          const diff = actionTime.getTime() - now.getTime();

          if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) {
              setCountdown(`${days}d ${hours}h`);
            } else if (hours > 0) {
              setCountdown(`${hours}h ${minutes}min`);
            } else if (minutes > 0) {
              setCountdown(`${minutes} min`);
            } else {
              setCountdown('Executando...');
            }
          } else {
            setCountdown('Vencido');
          }
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Atualizar a cada minuto
    return () => clearInterval(interval);
  }, [automation, charge.scheduledActions]);

  const nextPendingAction = useMemo(() => {
    return charge.scheduledActions?.find(a => a.status === 'pending');
  }, [charge.scheduledActions]);

  const lastExecutedAction = useMemo(() => {
    return charge.scheduledActions
      ?.filter(a => a.status === 'executed')
      .sort((a, b) => new Date(b.executedAt || '').getTime() - new Date(a.executedAt || '').getTime())[0];
  }, [charge.scheduledActions]);

  // Se não há automação configurada
  if (!automation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Automação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-100 dark:bg-slate-800 rounded p-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">Nenhuma automação configurada</p>
            <Button onClick={onEdit} className="gap-2 w-full">
              <Settings className="h-4 w-4" />
              Configurar Automação
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status da Automação */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Status da Automação
            </CardTitle>
            <Badge
              className={
                automation.enabled
                  ? 'bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-500/20'
                  : 'bg-gray-500/20 text-gray-700 dark:text-gray-300 hover:bg-gray-500/20'
              }
            >
              {automation.enabled ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-secondary rounded">
            <span className="text-sm font-medium text-foreground">Automação</span>
            <Button
              size="sm"
              variant={automation.enabled ? 'default' : 'outline'}
              onClick={() => onToggle?.(!automation.enabled)}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {automation.enabled ? 'Desativar' : 'Ativar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {automation.enabled && (
        <>
          {/* Próxima Ação */}
          {nextPendingAction && (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Próxima Ação Agendada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Descrição da ação */}
                <div>
                  <p className="text-sm font-medium text-foreground">{nextPendingAction.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(nextPendingAction.scheduledFor).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Countdown */}
                {countdown && (
                  <div className="bg-white dark:bg-slate-900 rounded p-3 border border-border">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-foreground">{countdown}</span>
                    </div>
                  </div>
                )}

                {/* Canal */}
                {nextPendingAction.channel && (
                  <div className="flex items-center gap-2 text-xs">
                    {nextPendingAction.channel === 'whatsapp' ? (
                      <>
                        <MessageCircle className="h-3 w-3 text-green-600" />
                        <span className="text-muted-foreground">via WhatsApp</span>
                      </>
                    ) : nextPendingAction.channel === 'email' ? (
                      <>
                        <Mail className="h-3 w-3 text-blue-600" />
                        <span className="text-muted-foreground">via E-mail</span>
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" />
                        <span className="text-muted-foreground">Notificação interna</span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Última Ação Executada */}
          {lastExecutedAction && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Última Ação Executada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-medium text-foreground">{lastExecutedAction.description}</p>
                <p className="text-xs text-muted-foreground">
                  {lastExecutedAction.executedAt &&
                    new Date(lastExecutedAction.executedAt).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Regras de Automação */}
          {(automation.sendBeforeDueDate ||
            automation.sendOnDueDate ||
            automation.sendAfterDueDate ||
            automation.notifyResponsible) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Regras Configuradas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {automation.sendBeforeDueDate && (
                  <div className="flex items-start gap-3 p-3 bg-secondary rounded">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Enviar {automation.daysBefore} dia{automation.daysBefore > 1 ? 's' : ''} antes do vencimento
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Canal: {automation.preferredChannel === 'both' ? 'WhatsApp + E-mail' : automation.preferredChannel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                      </p>
                    </div>
                  </div>
                )}

                {automation.sendOnDueDate && (
                  <div className="flex items-start gap-3 p-3 bg-secondary rounded">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Enviar no dia do vencimento</p>
                      <p className="text-xs text-muted-foreground">
                        Canal: {automation.preferredChannel === 'both' ? 'WhatsApp + E-mail' : automation.preferredChannel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                      </p>
                    </div>
                  </div>
                )}

                {automation.sendAfterDueDate && (
                  <div className="flex items-start gap-3 p-3 bg-secondary rounded">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Reenviar {automation.daysAfter} dia{automation.daysAfter > 1 ? 's' : ''} após atraso
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Canal: {automation.preferredChannel === 'both' ? 'WhatsApp + E-mail' : automation.preferredChannel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                      </p>
                    </div>
                  </div>
                )}

                {automation.notifyResponsible && (
                  <div className="flex items-start gap-3 p-3 bg-secondary rounded">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Notificar responsável</p>
                      <p className="text-xs text-muted-foreground">O responsável receberá alertas de cobrança</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Botão para Editar */}
          <Button
            onClick={onEdit}
            variant="outline"
            className="w-full gap-2"
          >
            <Settings className="h-4 w-4" />
            Editar Regras de Automação
          </Button>

          {/* Info */}
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-xs">
              Todas as ações automáticas são registradas no histórico e podem ser consultadas a qualquer momento.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
