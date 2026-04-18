import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  MessageSquare, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  Target,
  Users,
  Briefcase
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { opportunityService } from '@/services/crmService';
import { whatsappService } from '@/services/whatsappService';
import { TenantService } from '@/services/tenantService';
import type { Opportunity } from '@/services/crmService';
import type { WhatsAppConversation, WhatsAppMessage } from '@/services/whatsappService';
import { toast } from 'sonner';

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadOpportunity(id);
    }
  }, [id]);

  useEffect(() => {
    if (opportunity && selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [opportunity, selectedConversation]);

  const loadOpportunity = async (opportunityId: string) => {
    try {
      setLoading(true);
      const tenantId = await TenantService.getCurrentTenantId();
      
      // Buscar oportunidade
      const { data: oppData } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', opportunityId)
        .eq('tenant_id', tenantId)
        .single();

      if (oppData) {
        setOpportunity(oppData);
        
        // Buscar conversas relacionadas ao contato
        if (oppData.contact_info) {
          const convData = await whatsappService.getConversations(tenantId);
          const contactConversations = convData.filter(conv => 
            conv.contact?.phone === oppData.contact_info ||
            conv.contact?.name === oppData.name
          );
          setConversations(contactConversations);
          
          if (contactConversations.length > 0) {
            setSelectedConversation(contactConversations[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar oportunidade:', error);
      toast.error('Erro ao carregar oportunidade');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const tenantId = await TenantService.getCurrentTenantId();
      const messageData = await whatsappService.getMessages(conversationId);
      setMessages(messageData);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Oportunidade não encontrada</h2>
          <p className="text-muted-foreground mt-2">Verifique se a oportunidade existe e tente novamente.</p>
          <Button onClick={() => navigate('/opportunities')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Oportunidades
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/opportunities')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{opportunity.name}</h1>
          <p className="text-muted-foreground">Detalhes da oportunidade</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações da Oportunidade */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Oportunidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge className="mt-1">
                    {opportunity.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Probabilidade</label>
                  <p className="text-lg font-semibold">{opportunity.probability}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor</label>
                  <p className="text-lg font-semibold">R$ {opportunity.amount.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                  <p className="text-lg">{opportunity.type}</p>
                </div>
              </div>
              
              {opportunity.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                  <p className="mt-1">{opportunity.description}</p>
                </div>
              )}
              
              {opportunity.contact_info && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contato</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4" />
                    <span>{opportunity.contact_info}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Conversas */}
          {conversations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Histórico de Conversas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          message.direction === 'outbound'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Enviar Mensagem
              </Button>
              <Button className="w-full" variant="outline">
                <Phone className="w-4 h-4 mr-2" />
                Fazer Ligação
              </Button>
              <Button className="w-full" variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Enviar Email
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Oportunidade criada</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(opportunity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Última atualização</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(opportunity.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
