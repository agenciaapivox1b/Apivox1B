import { useState, useEffect, useCallback } from 'react';
import { chatService } from '@/services/chatService';
import { botService } from '@/services/botService';
import type { Conversation, Message } from '@/types';
import { toast } from 'sonner';

export function useInbox() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [clientId, setClientId] = useState<string | null>(null);

    const loadConversations = useCallback(async () => {
        try {
            setLoading(true);
            let cId = clientId;
            if (!cId) {
                cId = await botService.getCurrentClientId();
                setClientId(cId);
            }

            const data = await chatService.getClientConversations(cId);
            setConversations(data as Conversation[]);
        } catch (error: any) {
            console.error('Erro ao carregar conversas:', error);
            toast.error(error.message || 'Erro ao carregar conversas');
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    const loadMessages = useCallback(async (convId: string) => {
        try {
            setMessagesLoading(true);
            const data = await chatService.getMessages(convId);
            setMessages(data);
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
            toast.error('Erro ao carregar mensagens');
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
        refreshConversations: loadConversations
    };
}
