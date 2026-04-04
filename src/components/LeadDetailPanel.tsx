import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, MessageSquare, Phone, User, FileText, Send, Loader2, AlertCircle,
  Paperclip, Smile, Mic
} from 'lucide-react';
import { chatService } from '@/services/chatService';
import { botService } from '@/services/botService';
import type { Message } from '@/types';
import { toast } from 'sonner';

interface Lead {
  id: number | string;
  name: string;
  phone: string;
  interest: string;
  reason: string;
  context: string;
  status?: string;
  observation?: string;
}

interface Props {
  lead: Lead;
  onBack: () => void;
}

export default function LeadDetailPanel({ lead, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [status, setStatus] = useState(lead.status || 'active');
  const [observation, setObservation] = useState(lead.observation || '');

  const getInterestColor = (interest: string) => {
    if (interest === 'Alta chance') return 'bg-red-500/10 text-red-600 border-red-500/20';
    if (interest === 'Interesse médio') return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
  };

  const getInterestEmoji = (interest: string) => {
    if (interest === 'Alta chance') return '🔥';
    if (interest === 'Interesse médio') return '⚠️';
    return '❄️';
  };

  // Carrega a conversa do WhatsApp baseado no telefone do lead
  useEffect(() => {
    const loadConversation = async () => {
      try {
        setMessagesLoading(true);
        
        // Obtém o cliente atual
        const clientId = await botService.getCurrentClientId();
        
        // Busca todas as conversas do cliente
        const conversations = await chatService.getClientConversations(clientId);
        
        // Encontra a conversa que corresponde ao telefone do lead
        const cleanPhone = lead.phone.replace(/\D/g, '');
        const conversation = conversations.find(c => 
          c.contact_phone.replace(/\D/g, '') === cleanPhone
        );

        if (conversation) {
          setConversationId(conversation.id);
          
          // Carrega as mensagens da conversa
          const msgs = await chatService.getMessages(conversation.id);
          setMessages(msgs);
        } else {
          // Se não encontrar conversa, message estará vazia
          setMessages([]);
        }
      } catch (error) {
        console.error('Erro ao carregar conversa:', error);
        toast.error('Erro ao carregar histórico de mensagens');
      } finally {
        setMessagesLoading(false);
      }
    };

    loadConversation();
  }, [lead.phone]);

  const handleSendResponse = () => {
    if (!responseMessage.trim()) return;

    // Redireciona para WhatsApp para enviar a mensagem
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(responseMessage);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
    
    // Limpa o campo após enviar
    setResponseMessage('');
    toast.success('Redirecionando para WhatsApp...');
  };

  const handleUpdateRecord = () => {
    // Aqui você pode adicionar lógica para salvar as alterações
    toast.success('Registro atualizado com sucesso!');
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = lead.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{lead.name}</h1>
              <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${getInterestColor(lead.interest)}`}>
                <span className="mr-1">{getInterestEmoji(lead.interest)}</span>
                {lead.interest}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {lead.phone}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenWhatsApp} className="gap-2">
            <MessageSquare className="h-4 w-4" /> WhatsApp
          </Button>
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-secondary/50 rounded-lg mb-6">
          <TabsTrigger value="geral" className="gap-2">
            <User className="h-4 w-4" /> Geral
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="geral" className="space-y-6 animate-in fade-in duration-300">
            {/* Informações Gerais */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
                <CardDescription>Dados do lead e seu interesse</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                    <select 
                      value={status} 
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
                    >
                      <option value="active">Ativo</option>
                      <option value="contacted">Contatado</option>
                      <option value="qualified">Qualificado</option>
                      <option value="lost">Perdido</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Contato</Label>
                    <Input value={lead.phone} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Mostrou Interesse em</Label>
                    <Input value={lead.reason} disabled className="bg-muted" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Contexto</Label>
                  <Input value={lead.context} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observation">Observação</Label>
                  <Textarea 
                    id="observation"
                    placeholder="Adicione notas sobre este lead..."
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    className="min-h-20"
                  />
                </div>

                <Button onClick={handleUpdateRecord} className="w-full rounded-full font-semibold">
                  Atualizar Registro
                </Button>
              </CardContent>
            </Card>

            {/* Conversa do WhatsApp */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Conversa do WhatsApp
                </CardTitle>
                <CardDescription>Histórico de mensagens com o cliente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mensagens */}
                <div className="border border-border rounded-lg bg-secondary/30 p-4 min-h-80 max-h-96 overflow-y-auto space-y-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma conversa encontrada para este contato
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                              msg.sender === 'user'
                                ? 'bg-card border border-border text-foreground rounded-tl-none'
                                : 'bg-primary text-primary-foreground rounded-tr-none shadow-sm'
                            }`}
                          >
                            <p>{msg.content}</p>
                            <div
                              className={`text-[10px] mt-1 opacity-50 ${
                                msg.sender === 'user'
                                  ? 'text-muted-foreground'
                                  : 'text-primary-foreground'
                              }`}
                            >
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Campo de Resposta */}
                <div className="space-y-3">
                  <Label htmlFor="response">Responder</Label>
                  <Textarea
                    id="response"
                    placeholder="Digite sua mensagem..."
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    className="min-h-20 resize-none"
                  />
                  <div className="flex gap-2 justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={!conversationId}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={!conversationId}
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      onClick={handleSendResponse}
                      disabled={!responseMessage.trim()}
                      className="gap-2 rounded-full font-semibold"
                    >
                      <Send className="h-4 w-4" />
                      Enviar no WhatsApp
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ℹ️ As mensagens são enviadas diretamente para o WhatsApp do cliente
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
