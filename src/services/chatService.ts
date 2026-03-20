import { supabase } from '@/lib/supabaseClient';
import type { Message } from '@/types';

export const chatService = {
    /**
     * Busca ou cria uma conversa de teste para um bot específico
     */
    async getOrCreateConversation(botId: string, contactPhone: string = 'teste-interno') {
        // Tenta encontrar uma conversa existente para este bot e telefone
        const { data: existing, error: findError } = await supabase
            .from('conversations')
            .select('id')
            .eq('bot_id', botId)
            .eq('contact_phone', contactPhone)
            .maybeSingle();

        if (findError) throw findError;
        if (existing) return existing.id;

        // Se não existir, cria uma nova
        const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({
                bot_id: botId,
                contact_phone: contactPhone,
            })
            .select('id')
            .single();

        if (createError) throw createError;
        return newConv.id;
    },

    /**
     * Busca todas as conversas de todos os bots de um cliente
     */
    async getClientConversations(clientId: string): Promise<any[]> {
        const { data: bots, error: botsError } = await supabase
            .from('bots')
            .select('id, name')
            .eq('client_id', clientId);

        if (botsError) throw botsError;
        if (!bots || bots.length === 0) return [];

        const botIds = bots.map(b => b.id);
        const botMap = Object.fromEntries(bots.map(b => [b.id, b.name]));

        const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .in('bot_id', botIds)
            .order('created_at', { ascending: false });

        if (convError) throw convError;

        return conversations.map(c => ({
            id: c.id,
            bot_id: c.bot_id,
            bot_name: botMap[c.bot_id] || 'Agente Desconhecido',
            contact_name: c.contact_phone === 'teste-interno' ? 'Teste Interno' : c.contact_phone,
            contact_phone: c.contact_phone,
            status: 'active',
            unread_count: 0,
            last_message: 'Ver histórico...',
            last_message_at: c.created_at,
            created_at: c.created_at,
            tags: []
        }));
    },

    /**
     * Busca o histórico de mensagens de uma conversa
     */
    async getMessages(conversationId: string): Promise<Message[]> {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return (data || []).map(m => ({
            id: m.id,
            conversation_id: m.conversation_id,
            sender: m.role === 'user' ? 'user' : 'bot',
            content: m.content,
            timestamp: m.created_at
        })) as Message[];
    },

    /**
     * Salva uma nova mensagem no banco
     */
    async saveMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                role: role,
                content: content
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            conversation_id: data.conversation_id,
            sender: data.role === 'user' ? 'user' : 'bot',
            content: data.content,
            timestamp: data.created_at
        } as Message;
    }
};
