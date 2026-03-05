import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronLeft, ChevronRight, Bot, MessageSquare, BookOpen, Shield, MessageCircle, FileCheck2 } from 'lucide-react';
import type { Bot as BotType } from '@/types';

interface AgentWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (agent: Partial<BotType>) => void;
}

const steps = [
    { id: 1, title: 'Básico', icon: Bot, description: 'Nome e objetivo' },
    { id: 2, title: 'IA e Tom', icon: MessageSquare, description: 'Comportamento' },
    { id: 3, title: 'Conhecimento', icon: BookOpen, description: 'O que o agente sabe' },
    { id: 4, title: 'Regras', icon: Shield, description: 'Transbordo e limites' },
    { id: 5, title: 'Canais', icon: MessageCircle, description: 'Onde vai atuar' },
    { id: 6, title: 'Revisão', icon: FileCheck2, description: 'Confirme e salve' },
];

export function AgentWizard({ open, onOpenChange, onSave }: AgentWizardProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<Partial<BotType>>({
        name: '',
        prompt: '',
        status: 'draft',
        is_active: false
    });

    const nextStep = () => setStep(s => Math.min(6, s + 1));
    const prevStep = () => setStep(s => Math.max(1, s - 1));

    const handleSave = (publish: boolean) => {
        onSave({
            ...formData,
            status: publish ? 'active' : 'draft',
            is_active: publish
        });
        onOpenChange(false);
        setTimeout(() => setStep(1), 300);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            onOpenChange(val);
            if (!val) setTimeout(() => setStep(1), 300);
        }}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border-border">
                <div className="flex h-[600px]">
                    {/* Sidebar Planner */}
                    <div className="w-64 bg-secondary/50 p-6 border-r border-border hidden md:block">
                        <h3 className="font-semibold text-lg text-foreground mb-6">Criar Agente</h3>
                        <div className="space-y-6">
                            {steps.map((s) => (
                                <div key={s.id} className="flex items-start gap-3 relative">
                                    <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 z-10 bg-card
                    ${step > s.id ? 'border-primary text-primary' :
                                            step === s.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}
                  `}>
                                        {step > s.id ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                                    </div>
                                    {s.id !== 6 && (
                                        <div className={`absolute top-8 left-4 w-0.5 h-[calc(100%+12px)] -translate-x-1/2 ${step > s.id ? 'bg-primary' : 'bg-border'
                                            }`} />
                                    )}
                                    <div className="pt-1.5 pb-2">
                                        <p className={`text-sm font-medium ${step >= s.id ? 'text-foreground' : 'text-muted-foreground'}`}>{s.title}</p>
                                        <p className="text-xs text-muted-foreground">{s.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Form */}
                    <div className="flex-1 flex flex-col">
                        <DialogHeader className="p-6 border-b border-border">
                            <DialogTitle className="text-xl">{steps[step - 1].title}</DialogTitle>
                            <p className="text-sm text-muted-foreground mt-1">{steps[step - 1].description}</p>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                            {/* Step 1: Basic */}
                            {step === 1 && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-2">
                                        <Label htmlFor="agent-name">Nome do Agente</Label>
                                        <Input
                                            id="agent-name"
                                            placeholder="Ex: Assistente de Vendas SaaS"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="agent-desc">Descrição curta</Label>
                                        <Input id="agent-desc" placeholder="Ex: Qualifica leads e agenda demos..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="agent-goal">Objetivo Principal</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['Vendas', 'Suporte', 'Agendamento', 'Pesquisa'].map(goal => (
                                                <div key={goal} className="border border-border rounded-lg p-3 hover:border-primary cursor-pointer transition-colors bg-card hover:bg-secondary/50">
                                                    <p className="text-sm font-medium text-center text-foreground">{goal}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Prompt and Tone */}
                            {step === 2 && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-2">
                                        <Label>Instruções do Sistema (Prompt)</Label>
                                        <Textarea
                                            rows={6}
                                            placeholder="Você é um assistente virtual gentil. Seu objetivo é ajudar o usuário a..."
                                            value={formData.prompt}
                                            onChange={e => setFormData({ ...formData, prompt: e.target.value })}
                                            className="resize-none"
                                        />
                                        <p className="text-xs text-muted-foreground">O comportamento central da IA. Seja claro sobre o papel do agente.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tom de Voz</Label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {['Profissional', 'Amigável', 'Direto', 'Bem-humorado', 'Autoridade'].map(tone => (
                                                <Badge key={tone} variant="outline" className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors py-1.5 px-3">
                                                    {tone}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Idioma Principal</Label>
                                        <Input placeholder="Português (Brasil)" defaultValue="Português (Brasil)" />
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Knowledge Base */}
                            {step === 3 && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <p className="text-sm text-foreground mb-2">Conecte fontes de dados para que o agente tenha contexto do seu negócio.</p>

                                    <div className="border hover:border-primary border-border rounded-lg p-4 cursor-pointer transition-colors flex items-center gap-4">
                                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                            <BookOpen className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-sm text-foreground">FAQs e Políticas</h4>
                                            <p className="text-xs text-muted-foreground">3 documentos disponíveis</p>
                                        </div>
                                        <Check className="h-4 w-4 ml-auto text-primary" />
                                    </div>

                                    <div className="border hover:border-primary border-border rounded-lg p-4 cursor-pointer transition-colors flex items-center gap-4">
                                        <div className="h-10 w-10 bg-brand-green-secondary/10 rounded-lg flex items-center justify-center shrink-0">
                                            <FileCheck2 className="h-5 w-5 text-brand-green-secondary" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-sm text-foreground">Catálogo de Produtos</h4>
                                            <p className="text-xs text-muted-foreground">Planilha sincronizada (CSV)</p>
                                        </div>
                                    </div>

                                    <Button variant="outline" className="w-full border-dashed" size="sm">+ Adicionar nova fonte</Button>
                                </div>
                            )}

                            {/* Step 4: Rules */}
                            {step === 4 && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-2">
                                        <Label>Transbordo para Humano (Handoff)</Label>
                                        <div className="p-3 border border-border rounded-lg bg-secondary/30">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 rounded border-border text-primary" defaultChecked />
                                                <span className="text-sm font-medium text-foreground">Transferir automaticamente ao não saber responder</span>
                                            </label>
                                            <Input className="mt-3 h-8 text-sm placeholder:text-muted-foreground" placeholder="Mensagem: 'Vou transferir para um atendente...'" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Captura de Lead</Label>
                                        <div className="p-3 border border-border rounded-lg bg-secondary/30 space-y-3">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 rounded border-border text-primary" defaultChecked />
                                                <span className="text-sm font-medium text-foreground">Pedir contato antes de detalhes técnicos</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <Badge variant="secondary">Nome</Badge>
                                                <Badge variant="secondary">E-mail</Badge>
                                                <Badge variant="secondary">Telefone</Badge>
                                                <Button variant="ghost" size="sm" className="h-5 px-2 text-xs">+ Campo</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Channels */}
                            {step === 5 && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="border-2 border-primary rounded-lg p-5 text-center bg-primary/5 cursor-pointer">
                                            <MessageCircle className="h-8 w-8 mx-auto text-primary mb-2" />
                                            <h4 className="font-medium text-foreground">WhatsApp</h4>
                                            <p className="text-xs text-muted-foreground mt-1">Conectado (+55 11 9999-9999)</p>
                                        </div>
                                        <div className="border border-border rounded-lg p-5 text-center bg-secondary/50 cursor-pointer hover:border-primary/50 transition-colors">
                                            <MessageSquare className="h-8 w-8 mx-auto text-foreground mb-2" />
                                            <h4 className="font-medium text-foreground">Webchat</h4>
                                            <p className="text-xs text-muted-foreground mt-1">Incorporar no site</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 6: Review */}
                            {step === 6 && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="bg-secondary/30 rounded-lg p-4 space-y-4">
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</p>
                                            <p className="text-sm font-medium text-foreground">{formData.name || 'Sem nome'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prompt</p>
                                            <p className="text-sm text-foreground line-clamp-2">{formData.prompt || 'Vazio'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Canais mapeados</p>
                                            <div className="flex gap-2 mt-1">
                                                <Badge>WhatsApp</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-4 border-t border-border bg-secondary/20 flex flex-row items-center justify-between">
                            <Button
                                variant="outline"
                                onClick={prevStep}
                                disabled={step === 1}
                                className="gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" /> Voltar
                            </Button>

                            {step < 6 ? (
                                <Button onClick={nextStep} className="gap-2">
                                    Próximo <ChevronRight className="w-4 h-4" />
                                </Button>
                            ) : (
                                <div className="flex gap-3">
                                    <Button variant="secondary" onClick={() => handleSave(false)}>Salvar como Rascunho</Button>
                                    <Button onClick={() => handleSave(true)}>Publicar Agente</Button>
                                </div>
                            )}
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
