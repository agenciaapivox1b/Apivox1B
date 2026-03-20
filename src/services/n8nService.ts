interface N8nPayload {
    botId: string;
    botName: string;
    botPrompt: string;
    conversationId: string;
    contactPhone: string;
    userMessage: string;
}

export const n8nService = {
    /**
     * Envia uma mensagem para o webhook do n8n e aguarda a resposta
     */
    async sendMessageToWebhook(webhookUrl: string, payload: N8nPayload): Promise<string> {
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Erro no Webhook: ${response.statusText}`);
            }

            const data = await response.json();

            // O n8n deve retornar um JSON com a chave "reply"
            if (data && typeof data.reply === 'string') {
                return data.reply;
            }

            // Fallback amigável se o n8n retornar um formato inesperado
            if (data && typeof data.output === 'string') return data.output;
            if (data && typeof data.message === 'string') return data.message;
            if (data && typeof data.text === 'string') return data.text;

            console.warn('Resposta do n8n em formato inesperado:', data);
            return 'Recebi sua mensagem, mas não consegui formatar a resposta corretamente.';
        } catch (error: any) {
            console.error('Erro ao chamar n8n:', error);
            throw new Error(error.message || 'Falha na comunicação com o n8n.');
        }
    }
};
