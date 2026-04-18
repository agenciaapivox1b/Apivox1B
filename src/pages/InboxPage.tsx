import { useState } from 'react';
import { useInbox } from '@/hooks/useInbox';
import type { Conversation, Message } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, CheckCircle, Tag, Download, Loader2, AlertCircle, MessageSquare, Plus, Briefcase } from 'lucide-react';
import MessageInput from '@/components/conversations/MessageInput';
import { opportunityService } from '@/services/crmService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function InboxPage() {
  const navigate = useNavigate();
  const {
    conversations,
    messages,
    selectedId,
    setSelectedId,
    loading,
    messagesLoading,
    refreshConversations,
    tenantId
  } = useInbox();

  const [filter, setFilter] = useState<string>('all');
  
  // Estado para modal de criar oportunidade
  const [showCreateOpportunityModal, setShowCreateOpportunityModal] = useState(false);
  const [opportunityName, setOpportunityName] = useState('');
  const [opportunityAmount, setOpportunityAmount] = useState('');
  const [opportunityDescription, setOpportunityDescription] = useState('');
  const [creatingOpportunity, setCreatingOpportunity] = useState(false);

  const filteredConversations = conversations.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const selectedConv = conversations.find(c => c.id === selectedId);

  // Handler para criar oportunidade a partir da conversa
  const handleCreateOpportunity = async () => {
    if (!selectedId) return;
    
    try {
      setCreatingOpportunity(true);
      const opportunity = await opportunityService.createFromConversation(selectedId, {
        name: opportunityName || `Oportunidade - ${selectedConv?.contact_name}`,
        amount: parseFloat(opportunityAmount) || 0,
        description: opportunityDescription,
      });
      
      toast.success('Oportunidade criada com sucesso!');
      setShowCreateOpportunityModal(false);
      
      // Reset form
      setOpportunityName('');
      setOpportunityAmount('');
      setOpportunityDescription('');
      
      // Navegar para a oportunidade criada
      navigate(`/opportunities/${opportunity.id}`);
    } catch (error: any) {
      toast.error('Erro ao criar oportunidade: ' + error.message);
    } finally {
      setCreatingOpportunity(false);
    }
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
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* Left Panel - Conversation List */}
      <div className="w-80 xl:w-96 border-r border-border flex flex-col bg-card shrink-0">
        <div className="p-6 border-b border-border space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">Conversas</h2>
            <p className="text-xs text-muted-foreground">As mensagens são respondidas diretamente no seu WhatsApp</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'secondary'}
              size="sm"
              className="rounded-full px-4 text-xs font-bold"
              onClick={() => setFilter('all')}
            >
              Todos
            </Button>
            <Button
              variant={filter === 'today' ? 'default' : 'secondary'}
              size="sm"
              className="rounded-full px-4 text-xs font-bold"
              onClick={() => setFilter('today')}
            >
              Hoje
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-12 text-center opacity-40">
              <MessageSquare className="h-10 w-10 mx-auto mb-4" />
              <p className="text-sm font-medium">Quando seus clientes enviarem mensagens, elas aparecerão aqui</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left p-4 hover:bg-secondary/30 transition-all flex gap-3 ${selectedId === conv.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {conv.contact_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-bold text-foreground truncate">{conv.contact_name}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.last_message}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Messages */}
      <div className="flex-1 flex flex-col bg-secondary/5">
        {!selectedId || !selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="bg-card w-20 h-20 rounded-full flex items-center justify-center shadow-sm mb-4 border border-border">
              <MessageSquare className="h-8 w-8 text-primary opacity-20" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Acompanhe as conversas do seu WhatsApp</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Selecione uma conversa para visualizar o histórico de mensagens.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-card z-10">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {selectedConv.contact_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{selectedConv.contact_name}</h3>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Online
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 rounded-full text-xs font-bold"
                  onClick={() => setShowCreateOpportunityModal(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Criar Oportunidade
                </Button>
                <Button size="sm" className="h-8 rounded-full text-xs font-bold">
                  Assumir Atendimento
                </Button>
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-border m-4">
                  <p className="text-sm text-muted-foreground">Nenhum histórico de mensagens disponível.</p>
                </div>
              ) : (
                <div className="space-y-4 max-w-4xl mx-auto w-full">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${m.sender === 'user'
                        ? 'bg-card border border-border text-foreground rounded-tl-none'
                        : 'bg-primary text-primary-foreground rounded-tr-none shadow-sm'}`}
                      >
                        {m.content}
                        <div className={`text-[10px] mt-1 opacity-50 ${m.sender === 'user' ? 'text-muted-foreground' : 'text-primary-foreground'}`}>
                          {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input area - WhatsApp real */}
            <MessageInput
              tenantId={tenantId}
              conversationId={selectedId}
              contactPhone={selectedConv.contact_phone}
              onMessageSent={() => {
                // Recarregar mensagens após envio
                setSelectedId(selectedId);
              }}
            />
          </>
        )}
      </div>
      
      {/* Modal Criar Oportunidade */}
      <Dialog open={showCreateOpportunityModal} onOpenChange={setShowCreateOpportunityModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Oportunidade
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground">
              Criar oportunidade para: <strong>{selectedConv?.contact_name}</strong>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="opp-name">Nome da Oportunidade *</Label>
              <Input
                id="opp-name"
                placeholder="Ex: Projeto de Automação"
                value={opportunityName}
                onChange={(e) => setOpportunityName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="opp-amount">Valor Estimado (R$) *</Label>
              <Input
                id="opp-amount"
                type="number"
                placeholder="5000"
                value={opportunityAmount}
                onChange={(e) => setOpportunityAmount(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="opp-desc">Descrição</Label>
              <Input
                id="opp-desc"
                placeholder="Detalhes da oportunidade..."
                value={opportunityDescription}
                onChange={(e) => setOpportunityDescription(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateOpportunityModal(false)}
                disabled={creatingOpportunity}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateOpportunity}
                disabled={!opportunityName || creatingOpportunity}
              >
                {creatingOpportunity ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Oportunidade'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
