import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { mockChartData } from '@/services/mockData';
import type { ActivityItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMetrics(), api.getActivities()]).then(([m, a]) => {
      setMetrics(m);
      setActivities(a);
      setLoading(false);
    });
  }, []);

  if (loading || !metrics) {
    return <div className="p-8 flex items-center justify-center h-full"><div className="text-muted-foreground">Carregando...</div></div>;
  }

  const metricCards = [
    { label: 'Conversas Hoje', value: '1.240' },
    { label: 'Leads Gerados', value: '450' },
    { label: 'Atendimentos Automáticos', value: '1.100' },
    { label: 'Conversas Pendentes', value: '12' },
  ];

  const overdueCharges = Math.max(1, Math.round((100 - (metrics.automationRate ?? 85)) / 10));
  const pendingHumanCount = activities.filter((a) => a.type === 'conversation' && a.description.toLowerCase().includes('escalated')).length || 2;
  const opportunitiesClose = Math.ceil((metrics.leadsCaptured ?? 10) * 0.2);

  const priorityActions = [
    { id: 'P1', title: `${overdueCharges} cobranças precisam de envio ou reenvio`, context: 'Atenção ao fluxo de caixa', actionLabel: 'Cobrar', onAction: () => console.log('Cobrar agora') },
    { id: 'P2', title: `${pendingHumanCount} conversas precisam de atenção humana`, context: 'Atendimento escalado', actionLabel: 'Ver conversas', onAction: () => console.log('Abrir conversa') },
    { id: 'P3', title: `${opportunitiesClose} oportunidades precisam de follow-up`, context: 'Próximas de fechamento', actionLabel: 'Fazer follow-up', onAction: () => console.log('Follow-up lead') },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">Acompanhe o que está acontecendo agora</p>
        </div>
      </div>

      {/* QUICK INSIGHTS */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3 w-full">
        <Zap className="h-5 w-5 text-primary" />
        <p className="text-sm font-medium text-foreground">
          <span className="font-bold">Insight rápido:</span> Seu bot respondeu a maior parte das mensagens hoje, além de existirem oportunidades próximas de fechamento.
        </p>
      </div>

      {/* PAINEL DE EXECUÇÃO COMERCIAL - RESUMO DO DIA */}
      <section className="space-y-6">
        <Card className="bg-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Resumo do dia</CardTitle>
            <p className="text-sm text-muted-foreground">O que precisa da sua atenção hoje para impulsionar resultados.</p>
          </CardHeader>
          <CardContent className="grid gap-3">
            {priorityActions.map((action) => (
              <div key={action.id} className="rounded-lg border border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 text-primary w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold">!</div>
                  <div>
                    <p className="font-semibold text-foreground">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.context}</p>
                  </div>
                </div>
                <Button size="sm" onClick={action.onAction} className="shrink-0">{action.actionLabel}</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((m) => (
          <Card key={m.label} className="bg-card border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <p className="text-3xl font-bold text-foreground mb-1">{m.value}</p>
              <p className="text-sm font-medium text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="lg:col-span-3 bg-card border-none shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Conversas por dia</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData.messagesPerDay}>
                  <defs>
                    <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'hsl(var(--card))' }} />
                  <Area type="monotone" dataKey="messages" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorMsgs)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
