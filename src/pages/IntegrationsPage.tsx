import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Phone, Bot } from 'lucide-react';

export default function IntegrationsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Integrações</h1>
        <p className="text-muted-foreground mt-1">Gerencie a conexão do seu WhatsApp e do seu Bot</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* WhatsApp Connection */}
        <Card className="bg-card border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-emerald-500/5 pb-8">
            <div className="flex justify-between items-start">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Phone className="h-6 w-6" />
              </div>
              <Badge className="bg-emerald-500 text-white border-none px-3">Conectado</Badge>
            </div>
            <CardTitle className="text-xl font-bold mt-4">WhatsApp Business</CardTitle>
            <p className="text-sm text-muted-foreground">Número: +55 11 98888-0001</p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3 text-sm text-emerald-600 font-medium bg-emerald-500/5 p-4 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
              Sincronização em tempo real ativa
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-full font-bold">Desconectar</Button>
              <Button className="flex-1 rounded-full font-bold">Trocar Número</Button>
            </div>
          </CardContent>
        </Card>

        {/* Bot Status */}
        <Card className="bg-card border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-primary/5 pb-8">
            <div className="flex justify-between items-start">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Bot className="h-6 w-6" />
              </div>
              <Badge className="bg-primary text-white border-none px-3">Operando</Badge>
            </div>
            <CardTitle className="text-xl font-bold mt-4">Atendimento automático</CardTitle>
            <p className="text-sm text-muted-foreground">Seu chat automático inteligente</p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3 text-sm text-primary font-medium bg-primary/5 p-4 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
              Funcionando normalmente
            </div>
            <p className="text-sm text-muted-foreground">Seu bot está respondendo seus clientes automaticamente</p>
          </CardContent>
        </Card>
      </div>

      {/* CRM Integration Placeholder */}
      <Card className="bg-card border-none shadow-sm border-dashed border-2 border-border/50">
        <CardContent className="p-10 text-center">
          <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Conectar CRM</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
            Sincronize seus leads automaticamente com RD Station, Hubspot ou Pipedrive.
          </p>
          <Button variant="link" className="mt-4 font-bold">Descobrir como integrar</Button>
        </CardContent>
      </Card>
    </div>
  );
}
