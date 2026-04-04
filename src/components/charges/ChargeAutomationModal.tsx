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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, AlertCircle, Bell } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ChargeAutomation } from '@/types';
import { toast } from 'sonner';

interface ChargeAutomationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chargeId: string;
  chargeName: string;
  onSave?: (automation: ChargeAutomation) => void;
}

export default function ChargeAutomationModal({
  open,
  onOpenChange,
  chargeId,
  chargeName,
  onSave,
}: ChargeAutomationModalProps) {
  const [loading, setLoading] = useState(false);
  const [automation, setAutomation] = useState<ChargeAutomation>({
    id: chargeId,
    chargeId,
    enabled: false,
    sendBeforeDueDate: true,
    daysBefore: 3,
    sendOnDueDate: true,
    sendAfterDueDate: true,
    daysAfter: 1,
    notifyResponsible: true,
    notifyOnOverdue: true,
    preferredChannel: 'whatsapp',
    createdAt: new Date().toISOString(),
  });

  const handleToggle = (key: keyof ChargeAutomation) => {
    setAutomation(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleNumberChange = (key: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setAutomation(prev => ({
      ...prev,
      [key]: Math.max(0, numValue),
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      onSave?.(automation);
      toast.success('Automação configurada com sucesso');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar automação');
    } finally {
      setLoading(false);
    }
  };

  const isAutomationActive = automation.enabled && (
    automation.sendBeforeDueDate ||
    automation.sendOnDueDate ||
    automation.sendAfterDueDate
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Automação</DialogTitle>
          <DialogDescription>
            Cobrança: <strong>{chargeName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Info */}
          {isAutomationActive && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Automação ativa. Cobranças serão enviadas conforme a programação.
              </AlertDescription>
            </Alert>
          )}

          {!automation.enabled && (
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                Automação desativada. Nenhum envio automático será feito.
              </AlertDescription>
            </Alert>
          )}

          {/* Seção: Ativar/Desativar Automação */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Ativar Automação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Enviar automaticamente</p>
                  <p className="text-sm text-muted-foreground">
                    Ativar para enviar lembretes automaticamente
                  </p>
                </div>
                <Switch
                  checked={automation.enabled}
                  onCheckedChange={() => handleToggle('enabled')}
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          {automation.enabled && (
            <>
              {/* Seção: Lembretes */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Lembretes de Cobrança</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Lembrete Antes do Vencimento */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <Label className="text-sm font-semibold text-foreground">
                          Lembrar antes do vencimento
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Envie um lembrete alguns dias antes da cobrança vencer
                        </p>
                      </div>
                      <Switch
                        checked={automation.sendBeforeDueDate}
                        onCheckedChange={() => handleToggle('sendBeforeDueDate')}
                        disabled={loading || !automation.enabled}
                      />
                    </div>

                    {automation.sendBeforeDueDate && (
                      <div className="space-y-2 pl-4 border-l-2 border-border">
                        <Label htmlFor="daysBefore" className="text-sm">
                          Dias antes do vencimento
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="daysBefore"
                            type="number"
                            min="0"
                            max="30"
                            value={automation.daysBefore}
                            onChange={(e) => handleNumberChange('daysBefore', e.target.value)}
                            disabled={loading || !automation.enabled}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">dias</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Envio no Dia do Vencimento */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <Label className="text-sm font-semibold text-foreground">
                          Envio no Dia do Vencimento
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Reforce o aviso no dia exato do vencimento
                        </p>
                      </div>
                      <Switch
                        checked={automation.sendOnDueDate}
                        onCheckedChange={() => handleToggle('sendOnDueDate')}
                        disabled={loading || !automation.enabled}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Cobrança após Atraso */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <Label className="text-sm font-semibold text-foreground">
                          Cobrar após atraso
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Reenvie automaticamente se a cobrança não for paga
                        </p>
                      </div>
                      <Switch
                        checked={automation.sendAfterDueDate}
                        onCheckedChange={() => handleToggle('sendAfterDueDate')}
                        disabled={loading || !automation.enabled}
                      />
                    </div>

                    {automation.sendAfterDueDate && (
                      <div className="space-y-2 pl-4 border-l-2 border-border">
                        <Label htmlFor="daysAfter" className="text-sm">
                          Dias após vencimento
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="daysAfter"
                            type="number"
                            min="0"
                            max="30"
                            value={automation.daysAfter}
                            onChange={(e) => handleNumberChange('daysAfter', e.target.value)}
                            disabled={loading || !automation.enabled}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">dias</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Seção: Notificações Internas */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Notificações Internas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <Label className="text-sm font-semibold text-foreground">
                        Avisar Responsável
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Notifique o responsável quando a cobrança atrasar
                      </p>
                    </div>
                    <Switch
                      checked={automation.notifyResponsible}
                      onCheckedChange={() => handleToggle('notifyResponsible')}
                      disabled={loading || !automation.enabled}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Seção: Canal Preferido */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Canal de Envio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Escolha o canal preferido para enviar automaticamente
                  </p>
                  <div className="flex gap-3">
                    {[
                      { value: 'whatsapp', label: 'WhatsApp' },
                      { value: 'email', label: 'E-mail' },
                      { value: 'both', label: 'Ambos' },
                    ].map(channel => (
                      <Button
                        key={channel.value}
                        variant={
                          automation.preferredChannel === channel.value
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() =>
                          setAutomation(prev => ({
                            ...prev,
                            preferredChannel: channel.value as any,
                          }))
                        }
                        disabled={loading || !automation.enabled}
                      >
                        {channel.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Resumo de Configuração */}
              <Card className="bg-secondary/50 border-border">
                <CardHeader>
                  <CardTitle className="text-sm">Resumo da Configuração</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lembrete antes:</span>
                    <span className="font-medium">
                      {automation.sendBeforeDueDate
                        ? `${automation.daysBefore} dia(s) antes`
                        : 'Desativado'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">No vencimento:</span>
                    <span className="font-medium">
                      {automation.sendOnDueDate ? 'Ativo' : 'Desativado'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Após atraso:</span>
                    <span className="font-medium">
                      {automation.sendAfterDueDate
                        ? `${automation.daysAfter} dia(s) depois`
                        : 'Desativado'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Canal:</span>
                    <span className="font-medium capitalize">
                      {automation.preferredChannel === 'whatsapp'
                        ? 'WhatsApp'
                        : automation.preferredChannel === 'email'
                          ? 'E-mail'
                          : 'Ambos'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
