import { useState, useEffect, useCallback } from 'react';
import { chatService } from '@/services/chatService';
import { n8nService } from '@/services/n8nService';
import type { Message, Bot } from '@/types';
import { toast } from 'sonner';

export function useChat(bot: Bot | null) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);

    const loadHistory = useCallback(async () => {
        if (!bot) return;
        try {
            setLoading(true);
            const convId = await chatService.getOrCreateConversation(bot.id);
            setConversationId(convId);

            const history = await chatService.getMessages(convId);
            setMessages(history);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            toast.error('Erro ao carregar histórico de conversa.');
        } finally {
            setLoading(false);
        }
    }, [bot]);

    useEffect(() => {
        if (bot) {
            loadHistory();
        } else {
            setMessages([]);
            setConversationId(null);
        }
    }, [bot, loadHistory]);

    const sendMessage = async (content: string) => {
        if (!conversationId || !content.trim()) return;

        try {
            // 1. Salva mensagem do usuário no Supabase
            const userMsg = await chatService.saveMessage(conversationId, 'user', content);
            setMessages(prev => [...prev, userMsg]);

            // 2. Verifica se o bot tem webhook configurado
            if (!bot?.webhook_url) {
                toast.warning('Este agente não possui um Webhook do n8n configurado.');
                return;
            }

            // 3. Inicia estado de digitação
            setIsTyping(true);

            // 4. Chama o n8n
            try {
                const replyText = await n8nService.sendMessageToWebhook(bot.webhook_url, {
                    botId: bot.id,
                    botName: bot.name,
                    botPrompt: bot.prompt,
                    conversationId: conversationId,
                    contactPhone: 'teste-interno',
                    userMessage: content
                });

                // 5. Salva resposta do assistente no Supabase
                const botMsg = await chatService.saveMessage(conversationId, 'assistant', replyText);
                setMessages(prev => [...prev, botMsg]);
            } catch (error: any) {
                console.error('Erro na integração n8n:', error);
                toast.error(`Erro ao obter resposta: ${error.message}`);
            } finally {
                setIsTyping(false);
            }

        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            toast.error('Erro ao processar mensagem.');
        }
    };

    return {
        messages,
        loading,
        isTyping,
        sendMessage,
        refresh: loadHistory
    };
}
