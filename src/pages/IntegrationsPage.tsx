import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageSquare, Database, Activity, Webhook, Calendar, Users, Power } from 'lucide-react';

const logs = [
  { id: '1', integration: 'Automação (Webhook)', event: 'Novo lead sincronizado', status: 'success', timestamp: '2026-03-05T14:00:00Z' },
  { id: '2', integration: 'CRM (Clientes e Leads)', event: 'Contato atualizado', status: 'success', timestamp: '2026-03-05T13:30:00Z' },
  { id: '3', integration: 'Automação (Webhook)', event: 'Fluxo executado', status: 'success', timestamp: '2026-03-05T12:00:00Z' },
  { id: '4', integration: 'Agenda (Google Calendar)', event: 'Falha na conexão', status: 'error', timestamp: '2026-03-05T10:00:00Z' },
];

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Conexões</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie suas integrações e o setup inicial da sua conta</p>
      </div>

      {/* Assistente de Configuração Inicial */}
      <section>
        <h2 className="text-lg font-medium text-foreground mb-4">Assistente de Configuração Inicial</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button variant="outline" className="justify-start h-auto py-3 px-4 gap-3 bg-card" onClick={() => navigate('/agents')}>
            <Bot className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-foreground">1. Criar agente</div>
              <div className="text-xs text-muted-foreground">Configure seu primeiro assistente</div>
            </div>
          </Button>

          <Button variant="outline" className="justify-start h-auto py-3 px-4 gap-3 bg-card" onClick={() => {
            document.getElementById('whatsapp-section')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <MessageSquare className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-foreground">2. Conectar WhatsApp</div>
              <div className="text-xs text-muted-foreground">Vincule seu número</div>
            </div>
          </Button>

          <Button variant="outline" className="justify-start h-auto py-3 px-4 gap-3 bg-card" onClick={() => navigate('/agents')}>
            <Webhook className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-foreground">3. Colar webhook n8n</div>
              <div className="text-xs text-muted-foreground">Adicione a URL no agente</div>
            </div>
          </Button>

          <Button variant="outline" className="justify-start h-auto py-3 px-4 gap-3 bg-card" onClick={() => navigate('/knowledge-base')}>
            <Database className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-foreground">4. Subir base de conhecimento</div>
              <div className="text-xs text-muted-foreground">Treine com seus dados</div>
            </div>
          </Button>

          <Button variant="outline" className="justify-start h-auto py-3 px-4 gap-3 bg-card" onClick={() => navigate('/agents')}>
            <Activity className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-foreground">5. Fazer teste</div>
              <div className="text-xs text-muted-foreground">Simule uma conversa</div>
            </div>
          </Button>

          <Button variant="outline" className="justify-start h-auto py-3 px-4 gap-3 bg-card" onClick={() => navigate('/agents')}>
            <Power className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-foreground">6. Ativar agente</div>
              <div className="text-xs text-muted-foreground">Ligue para produção</div>
            </div>
          </Button>
        </div>
      </section>

      {/* Conexões da Empresa */}
      <section>
        <h2 className="text-lg font-medium text-foreground mb-4">Conexões da Empresa</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-4">

          {/* WhatsApp */}
          <Card id="whatsapp-section" className="bg-card border-border">
            <CardContent className="p-5 flex flex-col items-start justify-between h-full">
              <div className="w-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-[#25D366]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground text-sm">WhatsApp</h3>
                      <p className="text-xs text-muted-foreground">Api Oficial Cloud</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${whatsappConnected ? 'bg-brand-green-secondary/10 text-brand-green-secondary border-brand-green-secondary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                    {whatsappConnected ? 'Conectado' : 'Desconectado'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Conecte seu número de WhatsApp comercial para que seus agentes possam responder e interagir automaticamente com seus clientes.
                </p>
              </div>
              <Button
                variant={whatsappConnected ? "outline" : "default"}
                className="w-full text-xs"
                onClick={() => setWhatsappConnected(!whatsappConnected)}
              >
                {whatsappConnected ? 'Reconectar' : 'Conectar WhatsApp'}
              </Button>
            </CardContent>
          </Card>

          {/* Automação (Webhook) */}
          <Card className="bg-card border-border">
            <CardContent className="p-5 flex flex-col items-start justify-between h-full">
              <div className="w-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Webhook className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground text-sm">Automação (Webhook)</h3>
                      <p className="text-xs text-muted-foreground">n8n, Make, Zapier</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Integre com fluxos de automação externos para processar leads e dados.
                  <br /><br />
                  <span className="font-medium text-foreground">Dica:</span> Configure por agente na página Agentes.
                </p>
              </div>
              <Button variant="secondary" className="w-full text-xs" onClick={() => navigate('/agents')}>
                Ir para Agentes
              </Button>
            </CardContent>
          </Card>

          {/* CRM e Agenda */}
          <div className="col-span-1 md:col-span-2 grid md:grid-cols-2 gap-4">
            <Card className="bg-card border-border opacity-70">
              <CardContent className="p-5 flex flex-col items-start justify-between h-full">
                <div className="w-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground text-sm">CRM</h3>
                        <p className="text-xs text-muted-foreground">Clientes e Leads</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-muted text-muted-foreground border-border">
                      Em breve
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sincronização nativa com CRMs para gestão de contatos e negócios.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border opacity-70">
              <CardContent className="p-5 flex flex-col items-start justify-between h-full">
                <div className="w-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground text-sm">Agenda</h3>
                        <p className="text-xs text-muted-foreground">Google Calendar, Cal.com</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-muted text-muted-foreground border-border">
                      Em breve
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Permita que seus agentes agendem reuniões diretamente no calendário.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </section>

      {/* Logs */}
      <section>
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
      </section>
    </div>
  );
}
