import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, HelpCircle, FileText } from 'lucide-react';

export default function SupportPage() {
  const actions = [
    { title: 'Dúvida com Financeiro', icon: <FileText className="h-8 w-8" />, desc: 'Boleto, nota fiscal ou troca de plano' },
    { title: 'Suporte Técnico', icon: <HelpCircle className="h-8 w-8" />, desc: 'Ajuda com configurações ou bugs' },
    { title: 'Falar pelo WhatsApp', icon: <MessageCircle className="h-8 w-8" />, desc: 'Atendimento humano via chat' },
    { title: 'Agendar Treinamento', icon: <Phone className="h-8 w-8" />, desc: 'Call rápida para tirar dúvidas' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Suporte / Ações</h1>
        <p className="text-muted-foreground mt-1">Como podemos te ajudar hoje?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {actions.map((action) => (
          <Card key={action.title} className="bg-card border-none shadow-sm hover:bg-secondary/20 cursor-pointer transition-colors group">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                {action.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{action.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{action.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-primary/5 rounded-3xl p-10 text-center space-y-4 border border-primary/10">
        <h2 className="text-2xl font-bold text-foreground">Central de Ajuda</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Acesse nossa documentação completa com tutoriais em vídeo para dominar a plataforma Apivox.
        </p>
        <Button className="rounded-full px-8 h-12 font-bold text-lg">Acessar Documentação</Button>
      </div>
    </div>
  );
}
