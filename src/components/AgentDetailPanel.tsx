import { useState } from 'react';
import type { Bot } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, Trash2, Pause, Send } from 'lucide-react';

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
    setTestMessages(prev => [...prev, { sender: 'user', text: testMessage }, { sender: 'bot', text: 'This is a simulated response from the agent. In production, this would use the AI model.' }]);
    setTestMessage('');
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{bot.name}</h1>
          <Badge variant="outline" className="mt-1 text-xs">{bot.status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Active</span>
          <Switch checked={bot.is_active} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Prompt Editor */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Prompt Editor</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={10} className="font-mono text-sm" />
            <Button className="mt-3 w-full" size="sm">Save Prompt</Button>
          </CardContent>
        </Card>

        {/* Test Sandbox */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Test Sandbox</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64 bg-secondary rounded-lg p-3 overflow-y-auto space-y-2 mb-3 scrollbar-thin">
              {testMessages.length === 0 && <p className="text-xs text-muted-foreground text-center mt-20">Send a message to test</p>}
              {testMessages.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${m.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground border border-border'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={testMessage} onChange={(e) => setTestMessage(e.target.value)} placeholder="Type a test message..." onKeyDown={(e) => e.key === 'Enter' && handleTestSend()} />
              <Button size="icon" onClick={handleTestSend}><Send className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Quick Actions</CardTitle></CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-1.5"><Pause className="h-3.5 w-3.5" /> Pause Agent</Button>
          <Button variant="outline" size="sm" className="gap-1.5"><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
        </CardContent>
      </Card>
    </div>
  );
}
