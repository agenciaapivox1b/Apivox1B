import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { opportunityService, followUpService, Opportunity, FollowUpRecord } from '@/services/crmService';
import LeadsView from '@/components/opportunities/LeadsView';
import FollowUpsView from '@/components/opportunities/FollowUpsView';
import StrategicAssistantView from '@/components/opportunities/StrategicAssistantView';
import AnalysisLogsView from '@/components/opportunities/AnalysisLogsView';
import { 
  Briefcase,
  CheckSquare,
  Lightbulb,
  RefreshCw,
  Search,
  Bot
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type TabType = 'leads' | 'followups' | 'strategic' | 'audit';

export default function OpportunitiesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('leads');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [ops, fus] = await Promise.all([
        opportunityService.list(),
        followUpService.listPending()
      ]);
      setOpportunities(ops);
      setFollowUps(fus);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const tabs = [
    { id: 'leads', label: 'Pipeline', icon: Briefcase },
    { id: 'followups', label: 'Checklist', icon: CheckSquare },
    { id: 'strategic', label: 'IA Insights', icon: Lightbulb },
    { id: 'audit', label: 'IA Audit', icon: Bot }
  ];

  const handleViewDetails = (item: Opportunity | FollowUpRecord) => {
    const id = (item as any).opportunity_id || item.id;
    navigate(`/opportunities/${id}`);
  };

  return (
    <div className="w-full min-h-screen bg-background p-6 space-y-6">
      <div className="flex justify-between items-center bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Fluxo Universal Inteligente</h1>
          <p className="text-muted-foreground mt-1 font-medium italic opacity-70">Monitoramento em tempo real de oportunidades e decisões automatizadas</p>
        </div>
        <button 
           onClick={() => fetchAll()}
           disabled={loading}
           className="flex items-center gap-3 px-6 py-3 text-sm font-black bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          SINCRONIZAR DASHBOARD
        </button>
      </div>

      <div className="flex flex-wrap gap-2 bg-secondary/10 p-1.5 rounded-2xl w-fit border border-border/40 backdrop-blur-sm">
        {tabs.map(tab => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-black transition-all text-sm tracking-wide ${
                isActive
                  ? 'bg-background text-foreground shadow-lg shadow-black/5 ring-1 ring-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'
              }`}
            >
              <IconComponent className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
              {tab.label.toUpperCase()}
            </button>
          );
        })}
      </div>

      <div className="bg-background min-h-[600px]">
        {loading && opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[500px] bg-card rounded-2xl border border-dashed border-border/60">
             <div className="p-4 bg-primary/5 rounded-full mb-4">
                <RefreshCw className="w-10 h-10 text-primary/40 animate-spin" />
             </div>
             <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Orquestrando Decisões IA...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {activeTab === 'leads' && (
              <LeadsView 
                leads={opportunities} 
                onViewDetails={handleViewDetails} 
                onCreateFollowUp={() => setActiveTab('followups')} 
                onViewHistory={handleViewDetails} 
              />
            )}
            {activeTab === 'followups' && (
              <FollowUpsView 
                followUps={followUps} 
                onSendMessage={(fu) => toast({ title: 'Simulando envio...', description: `Enviando ação: ${fu.title}` })}
                onMarkComplete={(fu) => toast({ title: 'Ação concluída', description: 'O registro foi atualizado.' })}
                onViewHistory={handleViewDetails}
              />
            )}
            {activeTab === 'strategic' && (
              <StrategicAssistantView 
                insights={opportunities.filter(o => o.metadata?.classification)} 
                onCreateFollowUp={() => setActiveTab('followups')} 
                onViewDetails={handleViewDetails} 
              />
            )}
            {activeTab === 'audit' && (
              <AnalysisLogsView />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

