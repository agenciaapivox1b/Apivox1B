import { useState } from 'react';
import type { Bot } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Copy, Trash2, Pause, Send, Play, Settings, Bot as BotIcon,
  MessageSquare, BookOpen, Shield, MessageCircle, Activity, ExternalLink
} from 'lucide-react';

interface Props {
  bot: Bot;
  onBack: () => void;
}

export default function AgentDetailPanel({ bot, onBack }: Props) {
  const [prompt, setPrompt] = useState(bot.prompt);
  const [testMessage, setTestMessage] = useState('');
  const [testMessages, setTestMessages] = useState<{ sender: string; text: string }[]>([]);

  const handleTestSend = () => {
    if (!testMessage.trim()) return;
    setTestMessages(prev => [...prev, { sender: 'user', text: testMessage }, { sender: 'bot', text: 'Esta é uma resposta simulada do agente em modo de teste.' }]);
    setTestMessage('');
  };

  const statusMap: Record<string, { label: string, color: string }> = {
    active: { label: 'Ativo', color: 'bg-brand-green-secondary/10 text-brand-green-secondary border-brand-green-secondary/20' },
    paused: { label: 'Pausado', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground border-border' }
  };

  const currentStatus = statusMap[bot.status] || statusMap['draft'];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{bot.name}</h1>
              <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${currentStatus.color}`}>
                {currentStatus.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Criado em {new Date(bot.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex justify-end items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 mr-4 border-r border-border pr-5">
            <span className="text-sm font-medium text-muted-foreground">Status do Robô</span>
            <Switch checked={bot.is_active} id="status-toggle" />
            <Label htmlFor="status-toggle" className="sr-only">Alternar status</Label>
          </div>
          <Button variant="outline" size="sm" className="gap-2"><Copy className="h-4 w-4" /> Duplicar</Button>
          <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" /> Arquivar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-secondary/50 rounded-lg overflow-x-auto flex-nowrap hide-scrollbar mb-6">
          <TabsTrigger value="geral" className="gap-2"><Settings className="h-4 w-4" /> Geral</TabsTrigger>
          <TabsTrigger value="prompt" className="gap-2"><BotIcon className="h-4 w-4" /> Prompt (IA)</TabsTrigger>
          <TabsTrigger value="conhecimento" className="gap-2"><BookOpen className="h-4 w-4" /> Conhecimento</TabsTrigger>
          <TabsTrigger value="regras" className="gap-2"><Shield className="h-4 w-4" /> Regras</TabsTrigger>
          <TabsTrigger value="canais" className="gap-2"><MessageCircle className="h-4 w-4" /> Canais</TabsTrigger>
          <TabsTrigger value="testar" className="gap-2"><MessageSquare className="h-4 w-4" /> Testar</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><Activity className="h-4 w-4" /> Logs</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="geral" className="space-y-6 animate-in fade-in duration-300">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>Configure os dados principais de identificação do agente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Agente</Label>
                    <Input defaultValue={bot.name} />
                  </div>
                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Input defaultValue="Português (Brasil)" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea defaultValue="Assistente de vendas focado em qualificação de leads." rows={3} />
                </div>
                <Button>Salvar Alterações</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prompt" className="space-y-6 animate-in fade-in duration-300">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Comportamento e Instruções (Prompt)</CardTitle>
                <CardDescription>Defina como a IA deve agir e falar com seus clientes.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={12}
                  className="font-mono text-sm leading-relaxed"
                  placeholder="Você é um assistente..."
                />
                <div className="mt-4 flex gap-3">
                  <Button>Atualizar Prompt</Button>
                  <Button variant="secondary">Analisar com IA Mestra</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conhecimento" className="space-y-6 animate-in fade-in duration-300">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle>Base de Conhecimento</CardTitle>
                  <CardDescription>Documentos que este agente pode consultar.</CardDescription>
                </div>
                <Button variant="outline" size="sm">+ Vincular Origem</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mt-4">
                  <div className="p-4 border border-border rounded-lg flex items-center justify-between bg-secondary/20">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">FAQ Oficial da Empresa</p>
                        <p className="text-xs text-muted-foreground">Atualizado há 2 dias</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive">Remover</Button>
                  </div>
                  <div className="p-4 rounded-lg flex items-center justify-center border border-dashed border-border bg-card/50">
                    <p className="text-sm text-muted-foreground text-center">Nenhum catálogo de produtos vinculado.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regras" className="space-y-6 animate-in fade-in duration-300">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Regras do Agente</CardTitle>
                <CardDescription>Configure transbordo e captura de leads.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Transbordo (Handoff)</h3>
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/20">
                    <div>
                      <p className="text-sm font-medium">Pausar bot e transferir para humano</p>
                      <p className="text-xs text-muted-foreground">Quando a IA não souber a resposta ou o cliente pedir por "atendente".</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4" /> Captura de Lead Obrigatória</h3>
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/20">
                    <div>
                      <p className="text-sm font-medium">Exigir Nome e E-mail</p>
                      <p className="text-xs text-muted-foreground">O agente pedirá esses dados antes de dar respostas muito técnicas.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="canais" className="space-y-6 animate-in fade-in duration-300">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Canais de Atendimento</CardTitle>
                <CardDescription>Onde este agente está operando no momento.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-border rounded-lg p-5 bg-secondary/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-brand-green-secondary" />
                    <MessageCircle className="h-6 w-6 text-brand-green-secondary mb-3" />
                    <h3 className="font-semibold text-foreground">WhatsApp API</h3>
                    <p className="text-sm text-muted-foreground mb-3">+55 11 99999-9999</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-brand-green-secondary/10 text-brand-green-secondary border-brand-green-secondary/20">Conectado</Badge>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">Desconectar</Button>
                    </div>
                  </div>

                  <div className="border border-border border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center bg-card hover:bg-secondary/50 transition-colors cursor-pointer">
                    <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center mb-2">
                      <ExternalLink className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-sm">Adicionar Webchat</h3>
                    <p className="text-xs text-muted-foreground mt-1">Integre no seu site</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="testar" className="h-[600px] flex flex-col animate-in fade-in duration-300">
            <Card className="bg-card border-border flex-1 flex flex-col shadow-sm">
              <CardHeader className="py-3 px-4 border-b border-border bg-secondary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BotIcon className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-sm">Simulador de Chat</CardTitle>
                      <CardDescription className="text-xs">As conversas aqui não afetam métricas</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setTestMessages([])} className="h-8 text-xs">Limpar Teste</Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-card">
                {testMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                    <Play className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-foreground">Inicie uma conversa</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">Envie uma mensagem abaixo para ver como o agente reage usando seu prompt atual e base de conhecimento.</p>
                  </div>
                )}
                {testMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${m.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md shadow-sm'
                        : 'bg-secondary text-foreground rounded-bl-md shadow-sm border border-border/50'
                      }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="p-3 border-t border-border bg-card">
                <div className="flex gap-2">
                  <Input
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Escreva sua mensagem de teste..."
                    onKeyDown={(e) => e.key === 'Enter' && handleTestSend()}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={handleTestSend} className="shrink-0"><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6 animate-in fade-in duration-300">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Histórico de Eventos (Logs)</CardTitle>
                <CardDescription>Últimas ações e erros deste agente.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-muted-foreground text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium border-b border-border w-[180px]">Data / Hora</th>
                        <th className="px-4 py-3 font-medium border-b border-border w-[120px]">Evento</th>
                        <th className="px-4 py-3 font-medium border-b border-border">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      <tr className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{new Date().toLocaleString()}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">AGENT_UPDATED</Badge></td>
                        <td className="px-4 py-3 truncate">Configurações do agente atualizadas pelo usuário.</td>
                      </tr>
                      <tr className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{new Date(Date.now() - 86400000).toLocaleString()}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] bg-brand-green-secondary/10 text-brand-green-secondary border-brand-green-secondary/20">AGENT_ACTIVE</Badge></td>
                        <td className="px-4 py-3 truncate">Agente foi ligado.</td>
                      </tr>
                      <tr className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{new Date(Date.now() - 172800000).toLocaleString()}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">ERROR_LLM</Badge></td>
                        <td className="px-4 py-3 truncate">Falha na chamada da API de IA (Timeout).</td>
                      </tr>
                      <tr className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{new Date(Date.now() - 259200000).toLocaleString()}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">AGENT_CREATED</Badge></td>
                        <td className="px-4 py-3 truncate">Agente criado sob o nome '{bot.name}'.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
