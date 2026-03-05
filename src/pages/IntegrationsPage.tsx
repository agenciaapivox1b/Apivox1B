import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Integration } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Webhook, Users, Calendar, type LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = { webhook: Webhook, users: Users, calendar: Calendar };

const logs = [
  { id: '1', integration: 'Automação (Webhook)', event: 'Novo lead sincronizado', status: 'success', timestamp: '2026-03-05T14:00:00Z' },
  { id: '2', integration: 'CRM (Clientes e Leads)', event: 'Contato atualizado', status: 'success', timestamp: '2026-03-05T13:30:00Z' },
  { id: '3', integration: 'Automação (Webhook)', event: 'Fluxo executado', status: 'success', timestamp: '2026-03-05T12:00:00Z' },
  { id: '4', integration: 'Agenda (Google Calendar)', event: 'Falha na conexão', status: 'error', timestamp: '2026-03-05T10:00:00Z' },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getIntegrations().then((i) => { setIntegrations(i); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-1">Conecte suas ferramentas e serviços</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {integrations.map((intg) => {
          const Icon = iconMap[intg.icon] || Webhook;
          return (
            <Card key={intg.id} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground text-sm">{intg.name}</h3>
                      <p className="text-xs text-muted-foreground">{intg.description}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${intg.status === 'connected' ? 'bg-brand-green-secondary/10 text-brand-green-secondary border-brand-green-secondary/20' : intg.status === 'error' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-muted text-muted-foreground border-border'}`}>
                    {intg.status === 'connected' ? 'CONECTADO' : intg.status === 'error' ? 'ERRO' : 'DESCONECTADO'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-xs">Testar</Button>
                    <Switch checked={intg.enabled} />
                  </div>
                </div>
                {intg.last_sync && (
                  <p className="text-[10px] text-muted-foreground mt-3">
                    Última sinc: {new Date(intg.last_sync).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Logs */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <h3 className="font-medium text-foreground text-sm mb-4">Atividades Recentes</h3>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`h-1.5 w-1.5 rounded-full ${log.status === 'success' ? 'bg-brand-green-secondary' : 'bg-destructive'}`} />
                  <div>
                    <p className="text-sm text-foreground">{log.event}</p>
                    <p className="text-xs text-muted-foreground">{log.integration}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
