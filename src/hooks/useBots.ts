import { useState, useEffect, useCallback } from 'react';
import { botService } from '@/services/botService';
import type { Bot } from '@/types';
import { toast } from 'sonner';

export function useBots() {
    const [bots, setBots] = useState<Bot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [clientId, setClientId] = useState<string | null>(null);

    const loadBots = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let currentId = clientId;
            if (!currentId) {
                currentId = await botService.getCurrentClientId();
                setClientId(currentId);
            }

            const data = await botService.getBotsByClient(currentId);
            setBots(data);
        } catch (err: any) {
            const msg = err.message || 'Erro ao carregar agentes';
            setError(msg);
            toast.error(msg === 'Perfil de cliente não encontrado para este usuário'
                ? 'Erro: Sua conta não possui um perfil de cliente vinculado.'
                : 'Erro ao carregar agentes. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        loadBots();
    }, [loadBots]);

    const addBot = async (botData: Partial<Bot>) => {
        if (!clientId) return;
        try {
            const newBot = await botService.createBot(clientId, botData);
            setBots(prev => [newBot, ...prev]);
            toast.success('Agente criado com sucesso!');
            return newBot;
        } catch (err) {
            toast.error('Erro ao criar agente.');
            throw err;
        }
    };

    const toggleBot = async (id: string, active: boolean) => {
        try {
            await botService.toggleBotStatus(id, active);
            setBots(prev => prev.map(b =>
                b.id === id ? { ...b, is_active: active, status: active ? 'active' : 'paused' } : b
            ));
        } catch (err) {
            toast.error('Erro ao alternar status do agente.');
        }
    };

    const removeBot = async (id: string) => {
        if (!clientId) return;
        try {
            await botService.deleteBot(id);
            setBots(prev => prev.filter(b => b.id !== id));
            toast.success('Agente arquivado com sucesso!');
        } catch (err) {
            toast.error('Erro ao arquivar agente.');
            throw err;
        }
    };

    return {
        bots,
        loading,
        error,
        addBot,
        toggleBot,
        removeBot,
        refresh: loadBots
    };
}
