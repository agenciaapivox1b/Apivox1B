import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { whatsappService } from '@/services/whatsappService';
import { TenantService } from '@/services/tenantService';
import type { WhatsAppConversation, WhatsAppMessage } from '@/services/whatsappService';
import { toast } from 'sonner';

// Adaptar para compatibilidade com tipos existentes
interface AdaptedConversation extends Omit<WhatsAppConversation, 'contact'> {
  contact_name: string;
  contact_phone: string;
}

interface AdaptedMessage extends Omit<WhatsAppMessage, 'direction'> {
  sender: 'user' | 'bot';
}

export function useInbox() {
    const [conversations, setConversations] = useState<AdaptedConversation[]>([]);
    const [messages, setMessages] = useState<AdaptedMessage[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [tenantId, setTenantId] = useState<string | null>(null);

    const loadConversations = useCallback(async () => {
        try {
            setLoading(true);
            
            // Obter tenant_id real usando TenantService
            const currentTenantId = await TenantService.getCurrentTenantId();
            
            if (!currentTenantId) {
                console.error('[useInbox] Tenant ID não encontrado');
                toast.error('Erro ao carregar conversas: tenant não encontrado');
                return;
            }
            
            setTenantId(currentTenantId);

            // Buscar conversas reais do WhatsApp
            const data = await whatsappService.getConversations(currentTenantId);
            
            // Adaptar para o formato esperado pelo frontend
            const adaptedConversations: AdaptedConversation[] = data.map(conv => ({
                id: conv.id,
                tenant_id: conv.tenant_id,
                contact_id: conv.contact_id,
                channel: conv.channel,
                status: conv.status,
                last_message_at: conv.last_message_at,
                created_at: conv.created_at,
                updated_at: conv.updated_at,
                contact_name: conv.contact?.name || 'Contato',
                contact_phone: conv.contact?.phone || '',
                last_message: conv.last_message || '',
            }));

            setConversations(adaptedConversations);
        } catch (error: any) {
            console.error('Erro ao carregar conversas:', error);
            
            // Tratamento específico para erros conhecidos
            if (error.message?.includes('tenant') || error.message?.includes('401')) {
                toast.error('Erro de autenticação. Faça login novamente.');
            } else if (error.message?.includes('42501') || error.message?.includes('permission')) {
                toast.error('Sem permissão para acessar conversas. Verifique as configurações.');
            } else {
                toast.error(error.message || 'Erro ao carregar conversas');
            }
            
            // Fallback para dados vazios se ainda não configurado ou erro
            setConversations([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMessages = useCallback(async (convId: string) => {
        try {
            setMessagesLoading(true);
            const data = await whatsappService.getMessages(convId);
            
            // Adaptar para o formato esperado pelo frontend
            const adaptedMessages: AdaptedMessage[] = data.map(msg => ({
                id: msg.id,
                tenant_id: msg.tenant_id,
                conversation_id: msg.conversation_id,
                contact_id: msg.contact_id,
                content: msg.content,
                provider_message_id: msg.provider_message_id,
                message_type: msg.message_type,
                status: msg.status,
                sent_at: msg.sent_at,
                created_at: msg.created_at,
                timestamp: msg.sent_at,
                sender: msg.direction === 'inbound' ? 'user' : 'bot',
            }));

            setMessages(adaptedMessages);
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
            toast.error('Erro ao carregar mensagens');
            setMessages([]);
        } finally {
            setMessagesLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    useEffect(() => {
        if (selectedId) {
            loadMessages(selectedId);
        } else {
            setMessages([]);
        }
    }, [selectedId, loadMessages]);

    return {
        conversations,
        messages,
        selectedId,
        setSelectedId,
        loading,
        messagesLoading,
        refreshConversations: loadConversations,
        tenantId
    };
}
