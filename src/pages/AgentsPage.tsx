import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Bot } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, MoreHorizontal, Copy, Trash2, Pause, Pencil, MessageSquare, Users, Settings, Activity } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AgentDetailPanel from '@/components/AgentDetailPanel';
import { AgentWizard } from '@/components/agents/AgentWizard';

export default function AgentsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);

  useEffect(() => {
    api.getBots().then((b) => { setBots(b); setLoading(false); });
  }, []);

  const handleToggle = async (id: string, active: boolean) => {
    const updated = await api.toggleBot(id, active);
    setBots(prev => prev.map(b => b.id === id ? updated : b));
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  if (selectedBot) {
    return <AgentDetailPanel bot={selectedBot} onBack={() => setSelectedBot(null)} />;
  }

  const statusColor = (s: string) => {
    if (s === 'active') return 'bg-brand-green-secondary/10 text-brand-green-secondary border-brand-green-secondary/20';
    if (s === 'paused') return 'bg-muted text-muted-foreground border-border';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Agentes</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seus agentes de IA</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Criar Agente
        </Button>
      </div>

      <AgentWizard
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={(newBot) => {
          // Mock save
          const bot: Bot = {
            id: Date.now().toString(),
            name: newBot.name || 'Novo Agente',
            prompt: newBot.prompt || '',
            status: newBot.status || 'draft',
            is_active: newBot.is_active || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            messages_count: 0,
            conversations_count: 0,
            business_hours: '',
            fallback_message: ''
          };
          setBots([bot, ...bots]);
        }}
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {bots.map((bot) => (
          <Card key={bot.id} className="bg-card border-border hover:border-primary/20 transition-colors cursor-pointer" onClick={() => setSelectedBot(bot)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-foreground">{bot.name}</h3>
                  <Badge variant="outline" className={`mt-1.5 text-xs ${statusColor(bot.status)}`}>
                    {bot.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Switch checked={bot.is_active} onCheckedChange={(v) => handleToggle(bot.id, v)} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedBot(bot)}><Settings className="h-3.5 w-3.5 mr-2" /> Configurar</DropdownMenuItem>
                      <DropdownMenuItem><Activity className="h-3.5 w-3.5 mr-2" /> Testar</DropdownMenuItem>
                      <DropdownMenuItem><MessageSquare className="h-3.5 w-3.5 mr-2" /> Ver conversas</DropdownMenuItem>
                      <DropdownMenuItem><Copy className="h-3.5 w-3.5 mr-2" /> Duplicar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" /> Arquivar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{bot.prompt}</p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {bot.messages_count.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {bot.conversations_count.toLocaleString()}</span>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Criado em {new Date(bot.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
