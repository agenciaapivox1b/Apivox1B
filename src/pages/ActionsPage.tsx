import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Headphones, Lightbulb } from 'lucide-react';

export default function ActionsPage() {
  const actions = [
    {
      title: 'Pedir alteração no bot',
      description: 'Solicite ajustes nas respostas ou no fluxo do seu atendimento',
      icon: Zap,
      action: () => window.open('https://wa.me/5545991585863?text=Quero+ajustar+meu+bot+porque+acho+que+ele+nao+esta+respondendo+como+deveria+pode+me+ajudar', '_blank'),
      buttonText: 'Solicitar alteração',
    },
    {
      title: 'Falar com suporte',
      description: 'Entre em contato com nossa equipe para tirar dúvidas',
      icon: Headphones,
      action: () => window.open('https://wa.me/5545991585863?text=Preciso+de+ajuda+com+a+plataforma+da+APIVOX+pode+me+atender+o+mais+rapido+possivel', '_blank'),
      buttonText: 'Falar com suporte',
    },
    {
      title: 'Criar nova automação',
      description: 'Solicite a criação de novos fluxos ou melhorias',
      icon: Lightbulb,
      action: () => window.open('https://wa.me/5545991585863?text=Quero+criar+uma+nova+automacao+para+meu+negocio+e+entender+como+posso+melhorar+meus+resultados', '_blank'),
      buttonText: 'Criar automação',
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Ações rápidas</h1>
        <p className="text-muted-foreground mt-1">Solicite melhorias ou ajustes no seu atendimento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Card
              key={action.title}
              className="bg-card border-none shadow-sm hover:shadow-md hover:bg-secondary/20 transition-all cursor-pointer group overflow-hidden"
            >
              <CardContent className="p-8 flex flex-col h-full">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                  <IconComponent className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-muted-foreground flex-1 mb-6">
                  {action.description}
                </p>
                <Button
                  onClick={action.action}
                  className="w-full rounded-full font-bold h-10 bg-primary hover:bg-primary/90 text-white"
                >
                  {action.buttonText}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-emerald-500/5 rounded-3xl p-10 text-center space-y-4 border border-emerald-500/10">
        <h2 className="text-2xl font-bold text-foreground">Recupere leads automaticamente</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Ative o follow-up inteligente e aumente suas chances de fechar clientes sem esforço.
        </p>
        <Button
          onClick={() => window.open('https://wa.me/5545991585863?text=Quero+ativar+o+follow+up+automatico+para+recuperar+leads+e+aumentar+meus+fechamentos', '_blank')}
          variant="outline"
          className="rounded-full px-8 h-12 font-bold text-lg border-emerald-500/20 hover:bg-emerald-500/5"
        >
          Quero recuperar leads
        </Button>
      </div>
    </div>
  );
}
