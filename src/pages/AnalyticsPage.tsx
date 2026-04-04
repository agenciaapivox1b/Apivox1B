import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockChartData, mockConversations, mockBots } from '@/services/mockData';
import { mockLeads } from '@/data/mockSalesData';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Calendar,
  Filter
} from 'lucide-react';

const topQuestions = [
  { question: 'Qual o horário de funcionamento?', count: 142 },
  { question: 'Como rastrear meu pedido?', count: 98 },
  { question: 'Qual a política de reembolso?', count: 87 },
  { question: 'Vocês oferecem frete grátis?', count: 76 },
  { question: 'Como redefinir a senha?', count: 65 },
];

const failedQuestions = [
  { question: 'Posso integrar com o SAP?', count: 23 },
  { question: 'Vocês aceitam criptomoedas?', count: 18 },
  { question: 'Qual o limite da API?', count: 12 },
];

const responseTimeData = [
  { date: 'Feb 27', time: 1.2 }, { date: 'Feb 28', time: 1.1 },
  { date: 'Mar 1', time: 0.9 }, { date: 'Mar 2', time: 1.0 },
  { date: 'Mar 3', time: 0.8 }, { date: 'Mar 4', time: 0.7 },
  { date: 'Mar 5', time: 0.6 },
];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedClient, setSelectedClient] = useState<string>('all');

  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    fontSize: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  };

  // Dados calculados dinamicamente
  const metrics = useMemo(() => {
    const totalConversations = mockConversations.length;
    const totalLeads = mockLeads.length;
    const qualifiedLeads = mockLeads.filter(l => l.status === 'Oportunidade').length;
    const closedDeals = mockLeads.filter(l => l.status === 'Concluído').length;

    // Taxas de conversão
    const conversationToLeadRate = totalConversations > 0 ? (totalLeads / totalConversations) * 100 : 0;
    const leadToCustomerRate = totalLeads > 0 ? (closedDeals / totalLeads) * 100 : 0;

    // Valores financeiros
    const totalEstimatedValue = mockLeads.reduce((sum, lead) => sum + lead.estimatedValue, 0);
    const closedValue = mockLeads
      .filter(l => l.status === 'Concluído')
      .reduce((sum, lead) => sum + lead.estimatedValue, 0);

    // Economia estimada (baseado em tempo economizado)
    const avgResponseTime = 1.0; // minutos
    const hourlyRate = 25; // R$ por hora
    const estimatedSavings = (totalConversations * avgResponseTime / 60) * hourlyRate;

    return {
      totalConversations,
      totalLeads,
      qualifiedLeads,
      closedDeals,
      conversationToLeadRate,
      leadToCustomerRate,
      totalEstimatedValue,
      closedValue,
      estimatedSavings
    };
  }, []);

  // Dados de comparação (simulados)
  const comparisonData = useMemo(() => {
    const todayConversations = 105;
    const yesterdayConversations = 88;
    const todayLeads = 18;
    const yesterdayLeads = 15;

    const conversationChange = ((todayConversations - yesterdayConversations) / yesterdayConversations) * 100;
    const leadChange = ((todayLeads - yesterdayLeads) / yesterdayLeads) * 100;

    return {
      todayConversations,
      yesterdayConversations,
      todayLeads,
      yesterdayLeads,
      conversationChange,
      leadChange
    };
  }, []);

  // Insights automáticos
  const insights = useMemo(() => {
    const insights = [];

    if (comparisonData.conversationChange < -10) {
      insights.push({
        type: 'warning',
        icon: TrendingDown,
        title: 'Queda nas Conversas',
        description: `-${Math.abs(comparisonData.conversationChange).toFixed(1)}% vs ontem`,
        action: 'Verificar campanhas ativas'
      });
    } else if (comparisonData.conversationChange > 15) {
      insights.push({
        type: 'success',
        icon: TrendingUp,
        title: 'Aumento nas Conversas',
        description: `+${comparisonData.conversationChange.toFixed(1)}% vs ontem`,
        action: 'Manter estratégia atual'
      });
    }

    if (metrics.conversationToLeadRate < 15) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Baixo Aproveitamento',
        description: `Apenas ${metrics.conversationToLeadRate.toFixed(1)}% das conversas viram leads`,
        action: 'Otimizar qualificação'
      });
    }

    if (metrics.qualifiedLeads > metrics.totalLeads * 0.7) {
      insights.push({
        type: 'success',
        icon: Target,
        title: 'Pipeline Saudável',
        description: `${((metrics.qualifiedLeads / metrics.totalLeads) * 100).toFixed(1)}% dos leads são oportunidades`,
        action: 'Focar no fechamento'
      });
    }

    return insights;
  }, [metrics, comparisonData]);

  // Dados do gráfico baseado no período selecionado
  const chartData = useMemo(() => {
    const baseData = mockChartData.conversationsPerDay;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

    return baseData.slice(-days).map(item => ({
      ...item,
      leads: Math.floor(item.conversations * 0.18), // ~18% conversão
      date: item.date
    }));
  }, [period]);

  // Dados para gráfico de canais (simulado)
  const channelData = [
    { name: 'WhatsApp', value: 65, color: '#25D366' },
    { name: 'Website', value: 25, color: '#3B82F6' },
    { name: 'Instagram', value: 10, color: '#E4405F' }
  ];

  const consolidatedMetrics = [
    {
      label: 'Total de Conversas',
      value: metrics.totalConversations.toLocaleString(),
      sub: 'Este mês',
      change: comparisonData.conversationChange,
      icon: MessageSquare
    },
    {
      label: 'Leads Capturados',
      value: metrics.totalLeads.toString(),
      sub: 'Este mês',
      change: comparisonData.leadChange,
      icon: Users
    },
    {
      label: 'Taxa de Conversão',
      value: `${metrics.conversationToLeadRate.toFixed(1)}%`,
      sub: 'Conversas → Leads',
      change: null,
      icon: Target
    },
    {
      label: 'Economia Estimada',
      value: `R$ ${metrics.estimatedSavings.toLocaleString()}`,
      sub: 'Tempo economizado em atendimento',
      change: null,
      icon: DollarSign
    },
  ];

  const monthlyData = [
    { name: 'Jan', conversas: 12000, leads: 2100 },
    { name: 'Fev', conversas: 13500, leads: 2400 },
    { name: 'Mar', conversas: 15420, leads: 2840 },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Resultados</h1>
          <p className="text-muted-foreground mt-1">Dashboard estratégico de performance</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Clientes</SelectItem>
              <SelectItem value="client1">Cliente 1</SelectItem>
              <SelectItem value="client2">Cliente 2</SelectItem>
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={(value: '7d' | '30d' | '90d') => setPeriod(value)}>
            <SelectTrigger className="w-32">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* INSIGHTS AUTOMÁTICOS */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {insights.map((insight, index) => {
            const IconComponent = insight.icon;
            return (
              <Card key={index} className={`border-l-4 ${
                insight.type === 'warning' ? 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20' :
                insight.type === 'success' ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20' :
                'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <IconComponent className={`w-5 h-5 mt-0.5 ${
                      insight.type === 'warning' ? 'text-amber-600' :
                      insight.type === 'success' ? 'text-green-600' :
                      'text-blue-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground">{insight.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                      <p className="text-xs font-medium text-primary mt-2">{insight.action}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MÉTRICAS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {consolidatedMetrics.map((m) => {
          const IconComponent = m.icon;
          return (
            <Card key={m.label} className="bg-card border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-3">
                  <IconComponent className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-2">{m.label}</p>
                <p className="text-3xl font-bold text-foreground mb-1">{m.value}</p>
                <p className="text-xs text-muted-foreground mb-2">{m.sub}</p>
                {m.change !== null && (
                  <div className={`flex items-center justify-center gap-1 text-xs font-medium ${
                    m.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {m.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {m.change > 0 ? '+' : ''}{m.change.toFixed(1)}% vs ontem
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AÇÕES RÁPIDAS */}
      <Card className="bg-card border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Target className="w-5 h-5" />
            Ações Estratégicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5"
              onClick={() => navigate('/inbox')}
            >
              <MessageSquare className="w-6 h-6" />
              <span className="font-medium">Ver Conversas</span>
              <span className="text-xs text-muted-foreground">Gerenciar mensagens ativas</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5"
              onClick={() => navigate('/opportunities')}
            >
              <Users className="w-6 h-6" />
              <span className="font-medium">Ver Leads</span>
              <span className="text-xs text-muted-foreground">Pipeline de oportunidades</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5"
              onClick={() => navigate('/follow-up')}
            >
              <CheckCircle className="w-6 h-6" />
              <span className="font-medium">Follow-ups</span>
              <span className="text-xs text-muted-foreground">Ações comerciais pendentes</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EVOLUÇÃO DIÁRIA */}
        <Card className="bg-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Evolução Diária</CardTitle>
            <p className="text-sm text-muted-foreground">Conversas e leads por dia</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="conversations"
                    name="Conversas"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="hsl(var(--brand-green-secondary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--brand-green-secondary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--brand-green-secondary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CANAIS DE ORIGEM */}
        <Card className="bg-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Canais de Origem</CardTitle>
            <p className="text-sm text-muted-foreground">Distribuição por plataforma</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value}%`, 'Conversas']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {channelData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                  <span className="text-sm font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PERFORMANCE MENSAL */}
      <Card className="bg-card border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Performance Mensal</CardTitle>
          <p className="text-sm text-muted-foreground">Comparativo conversas vs leads</p>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--secondary)/0.5)' }} />
                <Bar dataKey="conversas" name="Conversas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="leads" name="Leads" fill="hsl(var(--brand-green-secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* PIPELINE DE VENDAS */}
      <Card className="bg-card border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center justify-between">
            <span>Pipeline de Vendas</span>
            <Badge variant="secondary" className="text-xs">
              R$ {metrics.totalEstimatedValue.toLocaleString()} estimado
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">Status dos leads qualificados</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { stage: 'Descoberta', count: mockLeads.filter(l => l.stage === 'Descoberta').length, color: 'bg-blue-500' },
              { stage: 'Qualificação', count: mockLeads.filter(l => l.stage === 'Qualificação').length, color: 'bg-purple-500' },
              { stage: 'Proposta', count: mockLeads.filter(l => l.stage === 'Proposta').length, color: 'bg-cyan-500' },
              { stage: 'Negociação', count: mockLeads.filter(l => l.stage === 'Negociação').length, color: 'bg-yellow-500' },
              { stage: 'Fechamento', count: mockLeads.filter(l => l.stage === 'Fechamento').length, color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.stage} className="text-center">
                <div className={`w-full h-20 ${item.color} rounded-lg flex items-center justify-center mb-2`}>
                  <span className="text-2xl font-bold text-white">{item.count}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{item.stage}</p>
                <p className="text-xs text-muted-foreground">leads</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
