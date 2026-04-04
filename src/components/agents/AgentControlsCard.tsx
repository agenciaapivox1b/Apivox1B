import { useState } from 'react';
import type { Bot } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Copy, Trash2, Settings, MessageSquare, Activity } from 'lucide-react';
import { EditWebhookModal } from './EditWebhookModal';

interface AgentControlsCardProps {
    bot: Bot;
    onToggle: (id: string, active: boolean) => void;
    onClickConfig: (bot: Bot) => void;
    onUpdateWebhook: (id: string, url: string) => void;
    onClickTest: (bot: Bot) => void;
    onClickConversations: (bot: Bot) => void;
    onArchive: (id: string) => void;
}

export function AgentControlsCard({ bot, onToggle, onClickConfig, onUpdateWebhook, onClickTest, onClickConversations, onArchive }: AgentControlsCardProps) {
    const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
    const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
    const [webhookModalOpen, setWebhookModalOpen] = useState(false);
    const isCurrentlyActive = bot.is_active;

    const handleConfirmToggle = () => {
        onToggle(bot.id, !isCurrentlyActive);
        setConfirmToggleOpen(false);
    };

    const handleConfirmArchive = () => {
        onArchive(bot.id);
        setConfirmArchiveOpen(false);
    };

    return (
        <>
            <Card className="bg-card border-border hover:border-primary/20 transition-colors flex flex-col justify-between">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-lg font-bold text-foreground">
                        {bot.name}
                    </CardTitle>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onClickConfig(bot)}>
                                <Settings className="h-3.5 w-3.5 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setConfirmArchiveOpen(true)}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Arquivar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>

                <CardContent className="space-y-6 pt-4">
                    {/* CONTROLES */}
                    <div>
                        <div className="flex items-center justify-between bg-secondary/50 p-4 rounded-xl border border-border/50">
                            <div className="flex items-center gap-3">
                                <div className={`h-3 w-3 rounded-full ${isCurrentlyActive ? 'bg-brand-green-secondary animate-pulse' : 'bg-muted'}`} />
                                <div>
                                    <p className="font-semibold text-sm text-foreground">
                                        {isCurrentlyActive ? 'Agente Ativo' : 'Agente Pausado'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {isCurrentlyActive ? 'Respondendo clientes' : 'Desativado temporariamente'}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={isCurrentlyActive}
                                onCheckedChange={() => setConfirmToggleOpen(true)}
                                className="data-[state=checked]:bg-brand-green-secondary"
                            />
                        </div>
                    </div>

                    {/* WEBHOOK URL - HIDDEN BY DEFAULT, ACCESSIBLE VIA EDIT IF NEEDED (BUT USER ASKED TO HIDE) */}
                    {/* We keep the logic but remove it from the main UI to reduce cognitive load */}
                </CardContent>

                <CardFooter className="pt-2 pb-5 gap-3 border-t border-border mt-4">
                    <Button variant="outline" className="w-full text-xs font-medium" size="sm" onClick={() => onClickTest(bot)}>
                        <Activity className="h-3.5 w-3.5 mr-2" /> Testar
                    </Button>
                    <Button variant="outline" className="w-full text-xs font-medium" size="sm" onClick={() => onClickConversations(bot)}>
                        <MessageSquare className="h-3.5 w-3.5 mr-2" /> Ver conversas
                    </Button>
                </CardFooter>
            </Card>

            {/* Confirm Toggle Dialog */}
            <Dialog open={confirmToggleOpen} onOpenChange={setConfirmToggleOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Confirmar Ação</DialogTitle>
                        <DialogDescription>
                            {isCurrentlyActive
                                ? "Tem certeza que deseja pausar este agente?"
                                : "Tem certeza que deseja ativar este agente?"}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setConfirmToggleOpen(false)}>Cancelar</Button>
                        <Button variant={isCurrentlyActive ? "destructive" : "default"} onClick={handleConfirmToggle}>
                            {isCurrentlyActive ? "Pausar" : "Ativar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Archive Dialog */}
            <Dialog open={confirmArchiveOpen} onOpenChange={setConfirmArchiveOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Arquivar Agente</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja arquivar o agente '{bot.name}'?
                            Ele não poderá mais responder mensagens até ser reativado.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setConfirmArchiveOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleConfirmArchive}>
                            Arquivar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Webhook Modal */}
            <EditWebhookModal
                open={webhookModalOpen}
                onOpenChange={setWebhookModalOpen}
                initialUrl={(bot as Bot & { webhook_url?: string }).webhook_url || ''}
                onSave={(url) => onUpdateWebhook(bot.id, url)}
            />
        </>
    );
}
