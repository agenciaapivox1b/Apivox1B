import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Search, Filter, Download, Settings, Plus, Download as DownloadIcon,
  Upload, Archive, ChevronDown, Briefcase, DollarSign, Users, TrendingUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import FunnelColumn from '@/components/funnel/FunnelColumn';
import LeadDetailDrawer from '@/components/funnel/LeadDetailDrawer';
import NewLeadModal from '@/components/funnel/modals/NewLeadModal';
import FilterModal from '@/components/funnel/modals/FilterModal';
import ReportModal from '@/components/funnel/modals/ReportModal';
import ConfigModal from '@/components/funnel/modals/ConfigModal';
import ImportModal from '@/components/funnel/modals/ImportModal';
import { opportunityService, PIPELINE_STAGES, type Opportunity } from '@/services/crmService';

// Mapear Opportunity para o formato Lead que os componentes esperam
interface Lead {
  id: string;
  name: string;
  phone: string;
  observation?: string;
  priority?: 'baixa' | 'media' | 'alta';
  reason?: string;
  context?: string;
  value?: number;
  stage: string;
  createdAt?: string;
  responsible?: string;
  email?: string;
  archived?: boolean;
  // Campos extras do Opportunity
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  amount?: number;
  status?: string;
  description?: string;
  conversation_id?: string | null;
  contact_id?: string | null;
  // Optional follow-up fields for card indicator
  next_follow_up_date?: string;
  next_follow_up_status?: 'pending' | 'overdue' | 'done' | 'canceled';
}

// Converter Opportunity para Lead
const opportunityToLead = (opp: Opportunity): Lead => ({
  id: opp.id,
  name: opp.name,
  phone: opp.contact_phone || '',
  observation: opp.description,
  priority: opp.priority === 'high' ? 'alta' : opp.priority === 'medium' ? 'media' : 'baixa',
  reason: opp.source,
  context: opp.description,
  value: opp.amount,
  stage: opp.status,
  createdAt: opp.created_at,
  responsible: opp.assigned_to_email,
  email: opp.contact_email,
  archived: false,
  // Campos extras
  contact_name: opp.contact_name,
  contact_phone: opp.contact_phone,
  contact_email: opp.contact_email,
  amount: opp.amount,
  status: opp.status,
  description: opp.description,
  conversation_id: opp.conversation_id,
  contact_id: opp.contact_id,
});

export default function SalesFunnelPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentView, setCurrentView] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showQuickActionModal, setShowQuickActionModal] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    priority: [] as string[],
    stage: [] as string[],
    dateRange: { start: '', end: '' },
  });

  // Carregar dados reais
  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const opportunities = await opportunityService.list();
      const leadsData = opportunities.map(opportunityToLead);
      setLeads(leadsData);
    } catch (error: any) {
      console.error('Erro ao carregar oportunidades:', error);
      toast.error('Erro ao carregar oportunidades: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Métricas reais
  const metrics = {
    total: leads.length,
    totalValue: leads.reduce((sum, lead) => sum + (lead.value || 0), 0),
    active: leads.filter(l => !['fechado', 'perdido'].includes(l.stage)).length,
    won: leads.filter(l => l.stage === 'fechado').length,
  };

  // Filtros
  const filteredLeads = leads
    .filter(lead => {
      if (!showArchived && lead.archived) return false;
      if (showArchived && !lead.archived) return false;
      
      const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery) ||
        (lead.contact_name && lead.contact_name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesPriority = filters.priority.length === 0 || 
        (lead.priority && filters.priority.includes(lead.priority));
      
      const matchesStage = filters.stage.length === 0 || 
        filters.stage.includes(lead.stage);
      
      return matchesSearch && matchesPriority && matchesStage;
    });

  // Mapear estágios do novo CRM para os nomes antigos usados na UI
  const stageMapping: Record<string, { key: string; title: string }> = {
    'descoberta': { key: 'atendendo', title: 'IA Atendendo' },
    'proposta': { key: 'qualificado', title: 'Qualificado' },
    'negociacao': { key: 'qualificado', title: 'Qualificado' },
    'fechado': { key: 'ganhou', title: 'Ganhou' },
    'perdido': { key: 'perdido', title: 'Perdido' },
    'atendendo': { key: 'atendendo', title: 'IA Atendendo' },
    'qualificado': { key: 'qualificado', title: 'Qualificado' },
    'ganhou': { key: 'ganhou', title: 'Ganhou' },
  };

  // Agrupar leads por estágio visual
  const funnelStages = [
    { key: 'atendendo', title: 'IA Atendendo' },
    { key: 'qualificado', title: 'Qualificado' },
    { key: 'ganhou', title: 'Ganhou' },
    { key: 'perdido', title: 'Perdido' },
  ];

  // Criar nova oportunidade via API
  const handleAddLead = async (newLead: Omit<Lead, 'id' | 'createdAt' | 'archived'>) => {
    try {
      await opportunityService.create({
        name: newLead.name,
        amount: newLead.value || 0,
        description: newLead.observation,
        status: 'descoberta',
        priority: newLead.priority === 'alta' ? 'high' : newLead.priority === 'media' ? 'medium' : 'low',
      });
      toast.success('Oportunidade criada com sucesso!');
      setShowNewLeadModal(false);
      // Recarregar dados
      loadOpportunities();
    } catch (error: any) {
      toast.error('Erro ao criar oportunidade: ' + error.message);
    }
  };

  const handleExport = () => {
    const dataToExport = showArchived ? leads.filter(l => l.archived) : leads.filter(l => !l.archived);
    const csv = [
      ['ID', 'Nome', 'Telefone', 'Etapa', 'Prioridade', 'Observação'].join(','),
      ...dataToExport.map(l => 
        [l.id, l.name, l.phone, l.stage, l.priority || '', l.observation || ''].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleImport = (importedLeads: Lead[]) => {
    setLeads([...leads, ...importedLeads]);
    setShowImportModal(false);
  };

  const handleArchive = (leadId: string | number) => {
    setLeads(leads.map(l => 
      l.id === leadId ? { ...l, archived: !l.archived } : l
    ));
    setSelectedLead(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Funil de Vendas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? 'Carregando...' : `${filteredLeads.length} lead${filteredLeads.length !== 1 ? 's' : ''} ${showArchived ? ' arquivado(s)' : ' ativo(s)'}`}
            </p>
          </div>

          {/* Métricas Reais */}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                  <div className="text-xl font-bold text-blue-700">{metrics.total}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">Valor Total</span>
                  </div>
                  <div className="text-xl font-bold text-green-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalValue)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs text-muted-foreground">Ativos</span>
                  </div>
                  <div className="text-xl font-bold text-yellow-700">{metrics.active}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span className="text-xs text-muted-foreground">Ganhas</span>
                  </div>
                  <div className="text-xl font-bold text-purple-700">{metrics.won}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-lg"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setShowFilterModal(true)}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setShowReportModal(true)}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Relatório</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setShowConfigModal(true)}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </Button>

              {/* Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Novo</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowNewLeadModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Lead
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowImportModal(true)} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Importar Registros
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport} className="gap-2">
                    <DownloadIcon className="h-4 w-4" />
                    Exportar Registros
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowArchived(!showArchived)}
                    className="gap-2"
                  >
                    <Archive className="h-4 w-4" />
                    {showArchived ? 'Ver Ativos' : 'Registros Arquivados'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel Columns - com mapeamento de estágios do banco para visuais */}
      <div className="p-6">
        <div className="overflow-x-auto">
          <div className="flex gap-6 min-w-max pb-6">
            {funnelStages.map((stage) => {
              // Mapear estágios visuais para estágios do banco
              const dbStages = {
                'atendendo': ['descoberta', 'atendendo'],
                'qualificado': ['proposta', 'negociacao', 'qualificado'],
                'ganhou': ['fechado', 'ganhou'],
                'perdido': ['perdido']
              }[stage.key] || [stage.key];
              
              return (
                <FunnelColumn
                  key={stage.key}
                  stage={stage.key}
                  title={stage.title}
                  leads={filteredLeads.filter(l => dbStages.includes(l.stage))}
                  onLeadClick={(lead) => setSelectedLead(lead)}
                  onAddLead={() => setShowNewLeadModal(true)}
                                  />
              );
            })}
          </div>
        </div>
      </div>

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onArchive={() => handleArchive(selectedLead.id)}
        />
      )}

      {/* Modals */}
      <NewLeadModal 
        open={showNewLeadModal} 
        onOpenChange={setShowNewLeadModal}
        onSubmit={handleAddLead}
      />

      <FilterModal 
        open={showFilterModal} 
        onOpenChange={setShowFilterModal}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <ReportModal 
        open={showReportModal} 
        onOpenChange={setShowReportModal}
        leads={filteredLeads}
      />

      <ConfigModal 
        open={showConfigModal} 
        onOpenChange={setShowConfigModal}
      />

      <ImportModal 
        open={showImportModal} 
        onOpenChange={setShowImportModal}
        onImport={handleImport}
      />
    </div>
  );
}
