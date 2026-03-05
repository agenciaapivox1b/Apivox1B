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
import { Plus, MoreHorizontal, Copy, Trash2, Pause, Pencil, MessageSquare, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AgentDetailPanel from '@/components/AgentDetailPanel';

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

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;

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
          <h1 className="text-2xl font-semibold text-foreground">Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your AI WhatsApp agents</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>Agent Name</Label><Input placeholder="e.g. Sales Assistant" className="mt-1.5" /></div>
              <div><Label>AI Personality / Prompt</Label><Textarea placeholder="Describe how this agent should behave..." rows={4} className="mt-1.5" /></div>
              <div><Label>Business Hours</Label><Input placeholder="e.g. 9:00 - 18:00" className="mt-1.5" /></div>
              <div><Label>Fallback Message</Label><Input placeholder="Message when bot can't help" className="mt-1.5" /></div>
              <Button className="w-full" onClick={() => setCreateOpen(false)}>Save Agent</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                      <DropdownMenuItem><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem><Pause className="h-3.5 w-3.5 mr-2" /> Pause</DropdownMenuItem>
                      <DropdownMenuItem><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
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
                Created {new Date(bot.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
