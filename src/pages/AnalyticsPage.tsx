import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp,
  Users,
  MessageSquare,
  DollarSign,
  Target,
  Plus,
  RefreshCw,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Briefcase,
  Phone
} from 'lucide-react';
import { metricsService, type StandardMetrics, type TenantMetricConfig } from '@/services/metricsService';
import { TenantService } from '@/services/tenantService';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [standardMetrics, setStandardMetrics] = useState<StandardMetrics | null>(null);
  const [customMetrics, setCustomMetrics] = useState<TenantMetricConfig[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, number>>({});

  useEffect(() => {
    loadMetrics();
  }, [period]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obter tenant_id real
      const tenantId = await TenantService.getCurrentTenantId();
      
      if (!tenantId) {
        console.error('[AnalyticsPage] Tenant ID não encontrado');
        setError('Tenant não encontrado. Verifique se você está logado.');
        toast.error('Erro ao carregar métricas: tenant não encontrado');
        return;
      }
      
      console.log('[AnalyticsPage] Carregando métricas para tenant:', tenantId);
      
      // Carregar métricas padrão
      const standard = await metricsService.getStandardMetrics(tenantId);
      console.log('[AnalyticsPage] Métricas padrão carregadas:', standard);
      setStandardMetrics(standard);

      // Carregar configurações de métricas personalizadas
      let configs: TenantMetricConfig[] = [];
      try {
        configs = await metricsService.getTenantMetricsConfig(tenantId);
        console.log('[AnalyticsPage] Métricas personalizadas carregadas:', configs.length);
      } catch (e: any) {
        console.warn('[AnalyticsPage] Erro ao carregar métricas personalizadas (tabela pode não existir):', e.message);
        configs = [];
      }
      setCustomMetrics(configs);

      // Calcular valores das métricas personalizadas
      const values: Record<string, number> = {};
      for (const config of configs) {
        try {
          values[config.id] = await metricsService.calculateCustomMetric(config, tenantId);
        } catch (e) {
          console.warn(`[AnalyticsPage] Erro ao calcular métrica ${config.id}:`, e);
          values[config.id] = 0;
        }
      }
      setCustomValues(values);

    } catch (error: any) {
      console.error('Erro ao carregar métricas:', error);
      setError(error.message || 'Erro ao carregar métricas');
      toast.error('Erro ao carregar métricas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value || 0);
  };

  // Seções estratégicas baseadas nas métricas
  const getStrategicAlerts = () => {
    if (!standardMetrics) return [];
    
    const alerts = [];
    
    // Ações Imediatas (vermelho/laranja)
    if (standardMetrics.overdueFollowUps > 0) {
      alerts.push({
        type: 'urgent',
        icon: AlertCircle,
        title: `${standardMetrics.overdueFollowUps} Follow-ups Atrasados`,
        description: 'Ações que passaram do prazo e precisam ser resolvidas',
        color: 'text-red-600 bg-red-50 border-red-200'
      });
    }
    
    if (standardMetrics.atRiskCharges > 0) {
      alerts.push({
        type: 'warning',
        icon: AlertTriangle,
        title: `${standardMetrics.atRiskCharges} Cobranças em Risco`,
        description: 'Cobranças vencidas ou próximas do vencimento',
        color: 'text-orange-600 bg-orange-50 border-orange-200'
      });
    }
    
    if (standardMetrics.conversationsWithoutReply > 0) {
      alerts.push({
        type: 'action',
        icon: MessageSquare,
        title: `${standardMetrics.conversationsWithoutReply} Conversas sem Resposta`,
        description: 'Mensagens aguardando retorno há mais de 2 horas',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
      });
    }
    
    // Positivos (verde)
    if (standardMetrics.conversionRate > 30) {
      alerts.push({
        type: 'success',
        icon: TrendingUp,
        title: `Taxa de Conversão em ${standardMetrics.conversionRate}%`,
        description: 'Bom desempenho de conversão de oportunidades',
        color: 'text-green-600 bg-green-50 border-green-200'
      });
    }
    
    if (standardMetrics.paidCharges > 0) {
      alerts.push({
        type: 'success',
        icon: CheckCircle2,
        title: `${standardMetrics.paidCharges} Cobranças Pagas`,
        description: 'Recebimentos em dia este mês',
        color: 'text-blue-600 bg-blue-50 border-blue-200'
      });
    }
    
    return alerts;
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin mr-3 text-primary" />
          <span className="text-muted-foreground">Carregando resultados...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">Erro ao carregar resultados</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadMetrics} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  const strategicAlerts = getStrategicAlerts();

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Resultados</h1>
          <p className="text-muted-foreground mt-1">Acompanhe o desempenho do seu negócio</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={loadMetrics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          
          <Button onClick={() => navigate('/analytics/config')}>
            <Plus className="w-4 h-4 mr-2" />
            Personalizar
          </Button>
        </div>
      </div>

      {/* SEÇÃO 1: LEITURA ESTRATÉGICA - Resumo Operacional */}
      {strategicAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Leitura Estratégica
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {strategicAlerts.map((alert, index) => {
              const IconComponent = alert.icon;
              return (
                <Card key={index} className={`border ${alert.color}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${alert.color.split(' ')[1]}`}>
                        <IconComponent className={`h-5 w-5 ${alert.color.split(' ')[0]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${alert.color.split(' ')[0]}`}>
                          {alert.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* SEÇÃO 2: MÉTRICAS PADRÃO DO SISTEMA */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Métricas Principais</h2>
          <Badge variant="outline" className="text-xs">Atualizado agora</Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Novos Leads */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Novos Leads</p>
                  <p className="text-2xl font-bold">{formatNumber(standardMetrics?.totalLeads || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Sem resposta</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Oportunidades Abertas */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Oportunidades</p>
                  <p className="text-2xl font-bold">{formatNumber(standardMetrics?.opportunitiesOpen || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Em andamento</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Briefcase className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Taxa de Conversão */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conversão</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatNumber(standardMetrics?.conversionRate || 0)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Oportunidades fechadas</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pipeline</p>
                  <p className="text-2xl font-bold">{formatCurrency(standardMetrics?.pipelineValue || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Valor em aberto</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Follow-ups Pendentes */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Follow-ups</p>
                  <p className="text-2xl font-bold text-orange-600">{formatNumber(standardMetrics?.followUpsPending || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pendentes / Atrasados</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Phone className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cobranças Pagas */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recebimentos</p>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(standardMetrics?.paidCharges || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Cobranças pagas</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cobranças Pendentes */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">A Receber</p>
                  <p className="text-2xl font-bold text-red-600">{formatNumber(standardMetrics?.pendingCharges || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Cobranças pendentes</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tempo de Resposta */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resposta</p>
                  <p className="text-2xl font-bold">{Math.round(standardMetrics?.avgResponseTime || 0)}min</p>
                  <p className="text-xs text-muted-foreground mt-1">Tempo médio</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SEÇÃO 3: MÉTRICAS PERSONALIZADAS */}
      {customMetrics.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Métricas Personalizadas</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics/config')}>
              Gerenciar
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customMetrics.map((metric) => (
              <Card key={metric.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{metric.name}</p>
                      <p className="text-2xl font-bold mt-1">
                        {metric.metric_type === 'sum' || metric.metric_type === 'average' 
                          ? formatCurrency(customValues[metric.id] || 0)
                          : metric.metric_type === 'percentage'
                            ? `${(customValues[metric.id] || 0).toFixed(1)}%`
                            : formatNumber(customValues[metric.id] || 0)
                        }
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">{metric.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {metric.data_source}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Estado Vazio - Métricas Personalizadas */
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="text-center py-8">
            <Target className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-base font-medium text-muted-foreground">Sem métricas personalizadas</h3>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
              Crie métricas específicas para o seu negócio
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/analytics/config')}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Métrica Personalizada
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
