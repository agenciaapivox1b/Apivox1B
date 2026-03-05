import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Conversation, Message } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, UserCheck, CheckCircle, StickyNote, Tag, Download } from 'lucide-react';

const statusFilters = ['all', 'active', 'waiting_human', 'resolved', 'vip'] as const;

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getConversations(filter).then((c) => { setConversations(c); setLoading(false); });
  }, [filter]);

  useEffect(() => {
    if (selected) {
      api.getMessages(selected).then(setMessages);
    }
  }, [selected]);

  const selectedConv = conversations.find(c => c.id === selected);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-primary/10 text-primary',
      waiting_human: 'bg-amber-500/10 text-amber-600',
      resolved: 'bg-brand-green-secondary/10 text-brand-green-secondary',
      vip: 'bg-purple-500/10 text-purple-600',
    };
    return map[s] || '';
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left Panel - Conversation List */}
      <div className="w-80 xl:w-96 border-r border-border flex flex-col bg-card shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground mb-3">Caixa de Entrada</h2>
          <div className="flex gap-1 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
              >
                {f === 'all' ? 'Todos' : f === 'waiting_human' ? 'Aguardando' : f === 'active' ? 'Ativos' : f === 'resolved' ? 'Resolvidos' : 'VIP'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <p className="text-sm text-muted-foreground p-4">Carregando...</p>
          ) : conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelected(conv.id)}
              className={`w-full text-left p-4 border-b border-border hover:bg-secondary/50 transition-colors ${selected === conv.id ? 'bg-secondary' : ''
                }`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{conv.contact_name}</span>
                {conv.unread_count > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                    {conv.unread_count}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mb-1.5">{conv.last_message}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusBadge(conv.status)}`}>
                  {conv.status === 'waiting_human' ? 'aguardando' : conv.status === 'active' ? 'ativo' : conv.status === 'resolved' ? 'resolvido' : 'vip'}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{conv.bot_name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel - Messages */}
      <div className="flex-1 flex flex-col">
        {!selected || !selectedConv ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-card">
              <div>
                <h3 className="font-medium text-foreground">{selectedConv.contact_name}</h3>
                <p className="text-xs text-muted-foreground">{selectedConv.contact_phone} · {selectedConv.bot_name}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="gap-1 text-xs"><UserCheck className="h-3.5 w-3.5" /> Atribuir</Button>
                <Button variant="ghost" size="sm" className="gap-1 text-xs"><CheckCircle className="h-3.5 w-3.5" /> Resolver</Button>
                <Button variant="ghost" size="sm" className="gap-1 text-xs"><StickyNote className="h-3.5 w-3.5" /> Nota</Button>
                <Button variant="ghost" size="sm" className="gap-1 text-xs"><Tag className="h-3.5 w-3.5" /> Tag</Button>
                <Button variant="ghost" size="sm" className="gap-1 text-xs"><Download className="h-3.5 w-3.5" /> Exportar</Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm ${msg.sender === 'user'
                      ? 'bg-secondary text-foreground rounded-bl-md'
                      : msg.sender === 'bot'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-brand-green-secondary/10 text-foreground border border-brand-green-secondary/20 rounded-br-md'
                    }`}>
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-muted-foreground' : 'opacity-70'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1"
                />
                <Button size="icon"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
