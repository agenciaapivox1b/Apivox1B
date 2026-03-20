import { useState } from 'react';
import { useInbox } from '@/hooks/useInbox';
import type { Conversation, Message } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, UserCheck, CheckCircle, StickyNote, Tag, Download, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const statusFilters = ['all', 'active', 'waiting_human', 'resolved', 'vip'] as const;

export default function InboxPage() {
  const {
    conversations,
    messages,
    selectedId,
    setSelectedId,
    loading,
    messagesLoading
  } = useInbox();

  const [filter, setFilter] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');

  const filteredConversations = conversations.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const selectedConv = conversations.find(c => c.id === selectedId);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-primary/10 text-primary',
      waiting_human: 'bg-amber-500/10 text-amber-600',
      resolved: 'bg-brand-green-secondary/10 text-brand-green-secondary',
      vip: 'bg-purple-500/10 text-purple-600',
    };
    return map[s] || '';
  };

  const handleSend = () => {
    if (!newMessage.trim()) return;
    toast.info('O envio manual de mensagens será conectado na próxima etapa 🚀');
    setNewMessage('');
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando conversas reais...</p>
        </div>
      </div>
    );
  }

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
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
            </div>
          ) : filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`w-full text-left p-4 border-b border-border hover:bg-secondary/50 transition-colors ${selectedId === conv.id ? 'bg-secondary' : ''
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
      <div className="flex-1 flex flex-col bg-background/50">
        {!selectedId || !selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-muted/50 p-4 rounded-full mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg font-medium">Suas conversas aparecem aqui</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Selecione um contato na lista ao lado para ver o histórico de mensagens real do Supabase.
            </p>
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
                <Button variant="ghost" size="sm" className="gap-1 text-xs invisible md:visible"><StickyNote className="h-3.5 w-3.5" /> Nota</Button>
                <Button variant="ghost" size="sm" className="gap-1 text-xs invisible md:visible"><Tag className="h-3.5 w-3.5" /> Tag</Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">Nenhuma mensagem nesta conversa.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm ${msg.sender === 'user'
                      ? 'bg-secondary text-foreground rounded-bl-md'
                      : 'bg-primary text-primary-foreground rounded-br-md'
                      }`}>
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-muted-foreground' : 'opacity-70'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1"
                />
                <Button type="submit" size="icon"><Send className="h-4 w-4" /></Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
