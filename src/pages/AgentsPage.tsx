import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { AgentControlsCard } from '@/components/agents/AgentControlsCard';

export default function AgentsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const navigate = useNavigate();
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testBot, setTestBot] = useState<Bot | null>(null);

  useEffect(() => {
    api.getBots().then((b) => { setBots(b); setLoading(false); });
  }, []);

  const handleToggle = async (id: string, active: boolean) => {
    const updated = await api.toggleBot(id, active);
    setBots(prev => prev.map(b => b.id === id ? updated : b));
  };

  const handleUpdateWebhook = (id: string, url: string) => {
    setBots(prev => prev.map(b => b.id === id ? Object.assign({}, b, { webhook_url: url }) : b));
  };

  const handleOpenTest = (bot: Bot) => {
    setTestBot(bot);
    setTestModalOpen(true);
  };

  const handleViewConversations = (bot: Bot) => {
    navigate(`/inbox?agent=${bot.id}`);
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
            client_id: 'mock-client-id',
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

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {bots.map((bot) => (
          <AgentControlsCard
            key={bot.id}
            bot={bot}
            onToggle={handleToggle}
            onClickConfig={(b) => setSelectedBot(b)}
            onUpdateWebhook={handleUpdateWebhook}
            onClickTest={handleOpenTest}
            onClickConversations={handleViewConversations}
          />
        ))}
      </div>

      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Testar Agente - {testBot?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <Activity className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-center text-sm text-muted-foreground">
              O simulador de conversas está carregando...<br />
              Este espaço permitirá testar o bot &quot;{testBot?.name}&quot; livremente.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
