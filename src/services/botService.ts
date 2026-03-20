import { supabase } from '@/lib/supabaseClient';
import type { Bot } from '@/types';

export const botService = {
    /**
     * Obtém o client_id associado ao usuário logado
     */
    async getCurrentClientId(): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { data: client, error } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (error || !client) {
            throw new Error('Perfil de cliente não encontrado para este usuário');
        }

        return client.id;
    },

    /**
     * Busca todos os bots de um cliente
     */
    async getBotsByClient(clientId: string): Promise<Bot[]> {
        const { data: bots, error } = await supabase
            .from('bots')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (bots || []).map(b => ({
            ...b,
            status: b.status || 'active',
            is_active: b.is_active ?? true,
            webhook_url: b.webhook_url || '',
            messages_count: b.messages_count || 0,
            conversations_count: b.conversations_count || 0,
            business_hours: b.business_hours || '',
            fallback_message: b.fallback_message || '',
            updated_at: b.updated_at || b.created_at
        })) as Bot[];
    },

    /**
     * Cria um novo bot
     */
    async createBot(clientId: string, botData: Partial<Bot>): Promise<Bot> {
        const { data: newBot, error } = await supabase
            .from('bots')
            .insert({
                client_id: clientId,
                name: botData.name,
                prompt: botData.prompt,
                webhook_url: botData.webhook_url || '',
                status: botData.status || 'active',
                is_active: botData.is_active ?? true
            })
            .select()
            .single();

        if (error) throw error;

        return {
            ...newBot,
            webhook_url: newBot.webhook_url || '',
            status: newBot.status || 'active',
            is_active: newBot.is_active ?? true,
            messages_count: 0,
            conversations_count: 0,
            business_hours: '',
            fallback_message: '',
            updated_at: newBot.created_at
        } as Bot;
    },

    /**
     * Alterna o status de um bot (Mock por enquanto se a coluna não existir)
     */
    async toggleBotStatus(botId: string, active: boolean): Promise<void> {
        // Tenta atualizar se a coluna existir, senão apenas simula sucesso
        const { error } = await supabase
            .from('bots')
            .update({ is_active: active })
            .eq('id', botId);

        if (error && error.code !== '42703') { // 42703 = column does not exist
            throw error;
        }
    },

    /**
     * Exclui (arquiva) um bot pelo ID
     */
    async deleteBot(botId: string): Promise<void> {
        const { error } = await supabase
            .from('bots')
            .delete()
            .eq('id', botId);

        if (error) throw error;
    }
};
