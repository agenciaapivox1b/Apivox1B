import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import type { Bot } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Bot as BotIcon, User } from 'lucide-react';

interface AgentTestChatProps {
    bot: Bot;
}

export function AgentTestChat({ bot }: AgentTestChatProps) {
    const { messages, loading, isTyping, sendMessage } = useChat(bot);
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isTyping) return;

        const text = inputValue;
        setInputValue('');
        await sendMessage(text);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    if (loading && messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando conversa...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[500px] border rounded-lg bg-card overflow-hidden">
            {/* Mensagens */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.length === 0 && !loading && (
                        <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">
                                Inicie uma conversa para testar o agente <strong>{bot.name}</strong>.
                            </p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''
                                }`}
                        >
                            <div className={`p-2 rounded-full border ${msg.sender === 'user' ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border'
                                }`}>
                                {msg.sender === 'user' ? (
                                    <User className="h-4 w-4 text-primary" />
                                ) : (
                                    <BotIcon className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'user'
                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                : 'bg-muted text-foreground rounded-tl-none'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="p-2 rounded-full border bg-muted border-border">
                                <BotIcon className="h-4 w-4 text-muted-foreground animate-pulse" />
                            </div>
                            <div className="bg-muted text-muted-foreground p-3 rounded-2xl rounded-tl-none text-sm italic flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Agente respondendo...
                            </div>
                        </div>
                    )}

                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t bg-background flex gap-2">
                <Input
                    placeholder={isTyping ? "Aguarde a resposta..." : "Digite sua mensagem de teste..."}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="flex-1"
                    disabled={isTyping}
                />
                <Button type="submit" size="icon" disabled={!inputValue.trim() || isTyping}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}
