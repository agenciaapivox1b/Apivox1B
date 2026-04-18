import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  X, MessageSquare, Phone, User, FileText, Send, Loader2, AlertCircle,
  Paperclip, Smile, Clock, CheckCircle2, XCircle, Download, Edit2, Archive
} from 'lucide-react';
import { whatsappService, type WhatsAppMessage } from '@/services/whatsappService';
import { TenantService } from '@/services/tenantService';
import { toast } from 'sonner';
import FollowUpBlock from './FollowUpBlock';

interface Lead {
  id: string;
  name: string;
  phone: string;
  interest?: string;
  reason?: string;
  context?: string;
  observation?: string;
  value?: number;
  stage?: string;
  createdAt?: string;
  responsible?: string;
  email?: string;
  // Campos extras para integração com Opportunity
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_id?: string | null;
  conversation_id?: string | null;
  amount?: number;
  description?: string;
  status?: string;
}

interface Props {
  lead: Lead;
  onClose: () => void;
  onArchive?: (leadId: string | number) => void;
}

export default function LeadDetailDrawer({ lead, onClose, onArchive }: Props) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [stage, setStage] = useState(lead.stage || 'atendendo');
  const [observation, setObservation] = useState(lead.observation || '');
  const [products, setProducts] = useState<string[]>([]);

  const getStageColor = (s: string) => {
    switch (s) {
      case 'atendendo':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'qualificado':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'ganhou':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'perdido':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getStageLabel = (s: string) => {
    switch (s) {
      case 'atendendo':
        return 'IA Atendendo';
      case 'qualificado':
        return 'Qualificado';
      case 'ganhou':
        return 'Ganhou';
      case 'perdido':
        return 'Perdido';
      default:
        return 'Desconhecido';
    }
  };

  // Carrega a conversa do WhatsApp
  useEffect(() => {
    const loadConversation = async () => {
      try {
        setMessagesLoading(true);
        
        // Se já temos conversation_id da oportunidade, usamos diretamente
        if (lead.conversation_id) {
          setConversationId(lead.conversation_id);
          const msgs = await whatsappService.getMessages(lead.conversation_id);
          setMessages(msgs);
          return;
        }
        
        // Caso contrário, buscamos por telefone
        const tenantId = await TenantService.getCurrentTenantId();
        if (!tenantId) return;
        
        const conversations = await whatsappService.getConversations(tenantId);
        const cleanPhone = (lead.contact_phone || lead.phone).replace(/\D/g, '');
        const conversation = conversations.find(c => 
          c.contact?.phone?.replace(/\D/g, '') === cleanPhone
        );

        if (conversation) {
          setConversationId(conversation.id);
          const msgs = await whatsappService.getMessages(conversation.id);
          setMessages(msgs);
        }
      } catch (error) {
        console.error('Erro ao carregar conversa:', error);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadConversation();
  }, [lead.conversation_id, lead.contact_phone, lead.phone]);

  const handleSendResponse = () => {
    if (!responseMessage.trim()) return;
    
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(responseMessage);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
    
    setResponseMessage('');
    toast.success('Redirecionando para WhatsApp...');
  };

  const handleUpdateRecord = () => {
    toast.success('Registro atualizado com sucesso!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      {/* Drawer */}
      <div className="w-full max-w-4xl bg-background h-full overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-card p-6 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-semibold text-foreground">{lead.name}</h2>
              <Badge className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border ${getStageColor(stage)}`}>
                {getStageLabel(stage)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {lead.phone}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="geral" className="w-full h-full">
            <div className="sticky top-0 px-6 bg-background border-b border-border">
              <TabsList className="w-full justify-start h-auto p-1 bg-secondary/50 rounded-lg">
                <TabsTrigger value="geral" className="gap-2">
                  <User className="h-4 w-4" /> Geral
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2">
                  <Clock className="h-4 w-4" /> Linha do Tempo
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Aba Geral */}
            <TabsContent value="geral" className="p-6 space-y-6">
              {/* Informações Gerais */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Informações Gerais</CardTitle>
                  <CardDescription>Dados do lead e seu progresso</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Etapa</Label>
                      <select 
                        value={stage} 
                        onChange={(e) => setStage(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
                      >
                        <option value="atendendo">IA Atendendo</option>
                        <option value="qualificado">Qualificado</option>
                        <option value="ganhou">Ganhou</option>
                        <option value="perdido">Perdido</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Contato</Label>
                      <Input value={lead.phone} disabled className="bg-muted text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Valor</Label>
                      <Input 
                        value={lead.value ? `R$ ${lead.value.toLocaleString('pt-BR')}` : ''} 
                        disabled 
                        className="bg-muted text-sm" 
                      />
                    </div>
                  </div>

                  {lead.reason && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Mostrou Interesse em</Label>
                      <Input value={lead.reason} disabled className="bg-muted text-sm" />
                    </div>
                  )}

                  {lead.context && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Contexto</Label>
                      <Input value={lead.context} disabled className="bg-muted text-sm" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="observation" className="text-sm font-semibold">Observação</Label>
                    <Textarea 
                      id="observation"
                      placeholder="Adicione notas sobre este lead..."
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      className="min-h-20 resize-none text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Conversa do WhatsApp */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-4 w-4" />
                    Conversa do WhatsApp
                  </CardTitle>
                  <CardDescription>Histórico de mensagens com o cliente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mensagens */}
                  <div className="border border-border rounded-lg bg-secondary/30 p-4 min-h-64 max-h-80 overflow-y-auto space-y-4">
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
                            className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                                msg.direction === 'inbound'
                                  ? 'bg-card border border-border text-foreground rounded-tl-none'
                                  : 'bg-primary text-primary-foreground rounded-tr-none shadow-sm'
                              }`}
                            >
                              <p>{msg.content}</p>
                              <div
                                className={`text-[10px] mt-1 opacity-50 ${
                                  msg.direction === 'inbound'
                                    ? 'text-muted-foreground'
                                    : 'text-primary-foreground'
                                }`}
                              >
                                {new Date(msg.sent_at).toLocaleTimeString([], {
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
                    <Label htmlFor="response" className="text-sm font-semibold">Responder</Label>
                    <Textarea
                      id="response"
                      placeholder="Digite sua mensagem..."
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      className="min-h-20 resize-none text-sm"
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
                        size="sm"
                      >
                        <Send className="h-4 w-4" />
                        Enviar no WhatsApp
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ℹ️ As mensagens são enviadas diretamente para o WhatsApp do cliente
                    </p>
                  </div>

                  {/* Atualizar Registro */}
                  <Button onClick={handleUpdateRecord} className="w-full rounded-full font-semibold mt-4">
                    Atualizar Registro
                  </Button>
                </CardContent>
              </Card>

              {/* Ações */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Ações</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      setStage('ganhou');
                      toast.success('Lead marcado como ganho!');
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Marcar como Ganho
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      setStage('perdido');
                      toast.success('Lead marcado como perdido!');
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                    Marcar como Perdido
                  </Button>
                  {onArchive && (
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => {
                        onArchive(lead.id);
                        onClose();
                        toast.success('Lead arquivado!');
                      }}
                    >
                      <Archive className="h-4 w-4" />
                      Arquivar
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Follow-up Block - Sistema de Ações/Tarefas */}
              <FollowUpBlock opportunityId={lead.id} />
            </TabsContent>

            {/* Aba Linha do Tempo */}
            <TabsContent value="timeline" className="p-6 space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Atividades</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {/* Timeline items */}
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <div className="w-0.5 h-12 bg-border/50" />
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-semibold text-foreground">Lead criado</p>
                        <p className="text-xs text-muted-foreground">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Data não disponível'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border-2 border-blue-500">
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="w-0.5 h-12 bg-border/50" />
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-semibold text-foreground">Primeira mensagem recebida</p>
                        <p className="text-xs text-muted-foreground">Há 2 horas</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center border-2 border-amber-500">
                          <Edit2 className="h-4 w-4 text-amber-500" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Status alterado para Qualificado</p>
                        <p className="text-xs text-muted-foreground">Há 1 hora</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-secondary/30 rounded-lg p-4 mt-6">
                    <p className="text-xs text-muted-foreground text-center">
                      Mais atividades aparecerão aqui conforme você interage com o lead
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
