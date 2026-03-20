import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBots } from '@/hooks/useBots';
import { useChat } from '@/hooks/useChat';
import type { Bot } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Activity, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import AgentDetailPanel from '@/components/AgentDetailPanel';
import { AgentWizard } from '@/components/agents/AgentWizard';
import { AgentControlsCard } from '@/components/agents/AgentControlsCard';
import { AgentTestChat } from '@/components/agents/AgentTestChat';

export default function AgentsPage() {
  const { bots, loading, error, addBot, toggleBot, removeBot } = useBots();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const navigate = useNavigate();
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testBot, setTestBot] = useState<Bot | null>(null);

  const handleToggle = async (id: string, active: boolean) => {
    await toggleBot(id, active);
  };

  const handleArchive = async (id: string) => {
    await removeBot(id);
  };

  const handleUpdateWebhook = (id: string, url: string) => {
    toast.info('Para editar o Webhook, use as configurações do agente.');
  };

  const handleOpenTest = (bot: Bot) => {
    setTestBot(bot);
    setTestModalOpen(true);
  };

  const handleViewConversations = (bot: Bot) => {
    toast.info('A Inbox real será conectada na próxima etapa 🚀');
    // navigate(`/inbox?agent=${bot.id}`); 
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando agentes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar dados</h2>
        <p className="text-muted-foreground max-w-md mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
      </div>
    );
  }

  if (selectedBot) {
    return <AgentDetailPanel bot={selectedBot} onBack={() => setSelectedBot(null)} />;
  }

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
        onSave={async (newBot) => {
          await addBot({
            name: newBot.name,
            prompt: newBot.prompt,
            status: 'active',
            is_active: true
          });
          setCreateOpen(false);
        }}
      />

      {bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-border rounded-xl p-8 text-center bg-card/50">
          <Activity className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Nenhum agente encontrado</h3>
          <p className="text-muted-foreground mb-6">Crie seu primeiro assistente de IA para começar.</p>
          <Button onClick={() => setCreateOpen(true)}>Criar primeiro agente</Button>
        </div>
      ) : (
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
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Testar Agente - {testBot?.name}</DialogTitle>
          </DialogHeader>
          {testBot && <AgentTestChat bot={testBot} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
