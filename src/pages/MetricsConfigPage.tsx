import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  ArrowLeft,
  TrendingUp,
  Users,
  DollarSign,
  Target
} from 'lucide-react';
import { metricsService, type TenantMetricConfig } from '@/services/metricsService';
import { TenantService } from '@/services/tenantService';
import { toast } from 'sonner';

const METRIC_TYPES = [
  { value: 'count', label: 'Contagem', description: 'Número total de registros' },
  { value: 'sum', label: 'Soma', description: 'Soma de valores numéricos' },
  { value: 'average', label: 'Média', description: 'Valor médio dos registros' },
  { value: 'percentage', label: 'Percentual', description: 'Percentual sobre o total' }
];

const DATA_SOURCES = [
  { value: 'opportunities', label: 'Oportunidades', icon: Target },
  { value: 'charges', label: 'Cobranças', icon: DollarSign },
  { value: 'follow_ups', label: 'Follow-ups', icon: Users },
  { value: 'contacts', label: 'Contatos', icon: Users }
];

export default function MetricsConfigPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<TenantMetricConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMetric, setEditingMetric] = useState<TenantMetricConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    metric_type: 'count' as const,
    data_source: 'opportunities' as const,
    is_active: true,
    display_order: 0
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const tenantId = await TenantService.getCurrentTenantId();
      const data = await metricsService.getTenantMetricsConfig(tenantId);
      setMetrics(data);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      toast.error('Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const tenantId = await TenantService.getCurrentTenantId();
      
      if (editingMetric) {
        await metricsService.updateMetricConfig(editingMetric.id, formData);
        toast.success('Métrica atualizada com sucesso!');
      } else {
        await metricsService.createMetricConfig({
          ...formData,
          tenant_id: tenantId
        });
        toast.success('Métrica criada com sucesso!');
      }

      setShowDialog(false);
      setEditingMetric(null);
      resetForm();
      loadMetrics();
    } catch (error) {
      console.error('Erro ao salvar métrica:', error);
      toast.error('Erro ao salvar métrica');
    }
  };

  const handleEdit = (metric: TenantMetricConfig) => {
    setEditingMetric(metric);
    setFormData({
      name: metric.name,
      description: metric.description,
      metric_type: metric.metric_type,
      data_source: metric.data_source,
      is_active: metric.is_active,
      display_order: metric.display_order
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta métrica?')) return;

    try {
      await metricsService.deleteMetricConfig(id);
      toast.success('Métrica excluída com sucesso!');
      loadMetrics();
    } catch (error) {
      console.error('Erro ao excluir métrica:', error);
      toast.error('Erro ao excluir métrica');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      metric_type: 'count',
      data_source: 'opportunities',
      is_active: true,
      display_order: 0
    });
  };

  const getDataSourceIcon = (source: string) => {
    const sourceConfig = DATA_SOURCES.find(s => s.value === source);
    return sourceConfig?.icon || Target;
  };

  const getMetricTypeLabel = (type: string) => {
    return METRIC_TYPES.find(t => t.value === type)?.label || type;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin mr-3" />
          <span>Carregando configurações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/analytics')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Configurar Métricas</h1>
            <p className="text-muted-foreground mt-1">Crie métricas personalizadas para seu negócio</p>
          </div>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Métrica
        </Button>
      </div>

      {/* Lista de Métricas */}
      <div className="space-y-4">
        {metrics.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma métrica personalizada</h3>
              <p className="text-muted-foreground mb-4">
                Crie suas primeiras métricas personalizadas para acompanhar o que realmente importa
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Métrica
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {metrics.map((metric) => {
              const IconComponent = getDataSourceIcon(metric.data_source);
              return (
                <Card key={metric.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <IconComponent className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{metric.name}</h3>
                            <p className="text-sm text-muted-foreground">{metric.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Tipo:</span>
                            <Badge variant="outline">
                              {getMetricTypeLabel(metric.metric_type)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Fonte:</span>
                            <Badge variant="outline">
                              {DATA_SOURCES.find(s => s.value === metric.data_source)?.label}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Status:</span>
                            <Switch
                              checked={metric.is_active}
                              onCheckedChange={async (checked) => {
                                await metricsService.updateMetricConfig(metric.id, { is_active: checked });
                                loadMetrics();
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(metric)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(metric.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Diálogo de criação/edição */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && setShowDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMetric ? 'Editar Métrica' : 'Nova Métrica Personalizada'}
            </DialogTitle>
            <DialogDescription>
              Configure uma métrica específica para acompanhar o desempenho do seu negócio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Métrica *</Label>
              <Input
                id="name"
                placeholder="Ex: Vendas Mensais"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                placeholder="Descreva o que esta métrica representa..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Métrica</Label>
                <Select
                  value={formData.metric_type}
                  onValueChange={(value: any) => setFormData({ ...formData, metric_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fonte de Dados</Label>
                <Select
                  value={formData.data_source}
                  onValueChange={(value: any) => setFormData({ ...formData, data_source: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_SOURCES.map((source) => {
                      const IconComponent = source.icon;
                      return (
                        <SelectItem key={source.value} value={source.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            {source.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Ordem de Exibição</Label>
              <Input
                id="display_order"
                type="number"
                placeholder="0"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Menor número aparece primeiro na lista
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Métrica ativa</Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingMetric ? 'Atualizar' : 'Criar'} Métrica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
