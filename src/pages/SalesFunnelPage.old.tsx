import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, Filter, Download, Settings, Plus, Download as DownloadIcon,
  Upload, Archive, ChevronDown
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

interface Lead {
  id: string | number;
  name: string;
  phone: string;
  observation?: string;
  priority?: 'baixa' | 'média' | 'alta';
  reason?: string;
  context?: string;
  value?: number;
  stage: string;
  createdAt?: string;
  responsible?: string;
  email?: string;
  archived?: boolean;
}

const mockLeads: Lead[] = [
  {
    id: 1,
    name: 'Clínica Sorriso',
    phone: '+55 11 98888-0001',
    priority: 'alta',
    reason: 'Pacote Premium',
    context: 'Perguntou sobre automação',
    observation: 'Gerente avalia soluções',
    value: 5000,
    stage: 'atendendo',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    archived: false,
  },
  {
    id: 2,
    name: 'João Advocacia',
    phone: '+55 21 97777-0022',
    priority: 'média',
    reason: 'Integração CRM',
    observation: 'Solicitou proposta',
    value: 3500,
    stage: 'qualificado',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    archived: false,
  },
  {
    id: 3,
    name: 'Restaurante Sabor',
    phone: '+55 31 96666-0033',
    priority: 'baixa',
    reason: 'Agendamento',
    observation: 'Demonstrou interesse inicial',
    value: 1500,
    stage: 'atendendo',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    archived: false,
  },
  {
    id: 4,
    name: 'Tech Solutions',
    phone: '+55 11 95555-0004',
    priority: 'alta',
    reason: 'Pacote Enterprise',
    observation: 'Fechamento em progresso',
    value: 12000,
    stage: 'qualificado',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    archived: false,
  },
  {
    id: 5,
    name: 'Loja Maria',
    phone: '+55 85 94444-0005',
    priority: 'média',
    reason: 'Atendimento ao cliente',
    observation: 'Cliente satisfeito',
    value: 8000,
    stage: 'ganhou',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    archived: false,
  },
  {
    id: 6,
    name: 'Serviços JP',
    phone: '+55 48 93333-0006',
    priority: 'baixa',
    reason: 'Testes iniciais',
    observation: 'Não viu valor',
    value: 1000,
    stage: 'perdido',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    archived: false,
  },
  {
    id: 7,
    name: 'Clínica Vida',
    phone: '+55 12 98765-0007',
    priority: 'média',
    reason: 'Consultoria inicial',
    observation: 'Lead arquivado',
    value: 2000,
    stage: 'atendendo',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    archived: true,
  },
];

export default function SalesFunnelPage() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Modals
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    priority: [] as string[],
    stage: [] as string[],
    dateRange: { start: '', end: '' },
  });

  // Filtros
  const filteredLeads = leads
    .filter(lead => {
      if (!showArchived && lead.archived) return false;
      if (showArchived && !lead.archived) return false;
      
      const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery);
      
      const matchesPriority = filters.priority.length === 0 || 
        (lead.priority && filters.priority.includes(lead.priority));
      
      const matchesStage = filters.stage.length === 0 || 
        filters.stage.includes(lead.stage);
      
      return matchesSearch && matchesPriority && matchesStage;
    });

  const funnelStages = [
    { key: 'atendendo', title: 'IA Atendendo' },
    { key: 'qualificado', title: 'Qualificado' },
    { key: 'ganhou', title: 'Ganhou' },
    { key: 'perdido', title: 'Perdido' },
  ];

  const handleAddLead = (newLead: Omit<Lead, 'id' | 'createdAt' | 'archived'>) => {
    const lead: Lead = {
      ...newLead,
      id: Math.max(...leads.map(l => typeof l.id === 'number' ? l.id : 0)) + 1,
      createdAt: new Date().toISOString(),
      archived: false,
    };
    setLeads([...leads, lead]);
    setShowNewLeadModal(false);
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
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} 
              {showArchived ? ' arquivado(s)' : ' ativo(s)'}
            </p>
          </div>

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

      {/* Funnel Columns */}
      <div className="p-6">
        <div className="overflow-x-auto">
          <div className="flex gap-6 min-w-max pb-6">
            {funnelStages.map((stage) => (
              <FunnelColumn
                key={stage.key}
                stage={stage.key}
                title={stage.title}
                leads={filteredLeads.filter(l => l.stage === stage.key)}
                onLeadClick={(lead) => setSelectedLead(lead)}
                onAddLead={() => setShowNewLeadModal(true)}
              />
            ))}
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
