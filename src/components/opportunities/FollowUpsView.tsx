import { useState, useMemo } from 'react';
import { FollowUpRecord } from '@/services/crmService';
import FollowUpCard from './FollowUpCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Clock,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FollowUpsViewProps {
  followUps: FollowUpRecord[];
  onSendMessage?: (followUp: FollowUpRecord) => void;
  onReschedule?: (followUp: FollowUpRecord) => void;
  onMarkComplete?: (followUp: FollowUpRecord) => void;
  onViewHistory?: (followUp: FollowUpRecord) => void;
}

export default function FollowUpsView({
  followUps,
  onSendMessage,
  onReschedule,
  onMarkComplete,
  onViewHistory
}: FollowUpsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'cancelled'>('pending');

  const tabs = [
    { id: 'pending', label: 'Pendentes', icon: Clock, color: 'text-red-500' },
    { id: 'completed', label: 'Concluídos', icon: CheckCircle2, color: 'text-green-500' },
    { id: 'cancelled', label: 'Cancelados', icon: Calendar, color: 'text-slate-400' }
  ];

  const filteredFollowUps = useMemo(() => {
    return followUps
      .filter(fu => fu.status === activeTab)
      .filter(fu => {
        const clientName = (fu.opportunities as any)?.name || (fu.charges as any)?.customer_name || 'Cliente';
        return clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               fu.title.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [followUps, activeTab, searchTerm]);

  const stats = useMemo(() => {
    return {
      pending: followUps.filter(fu => fu.status === 'pending').length,
      completed: followUps.filter(fu => fu.status === 'completed').length,
      cancelled: followUps.filter(fu => fu.status === 'cancelled').length
    };
  }, [followUps]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border shadow-sm cursor-pointer hover:border-red-500/30 transition-colors" onClick={() => setActiveTab('pending')}>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pendentes</p>
              <Clock className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm cursor-pointer hover:border-green-500/30 transition-colors" onClick={() => setActiveTab('completed')}>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Concluídos</p>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm cursor-pointer hover:border-slate-500/30 transition-colors" onClick={() => setActiveTab('cancelled')}>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cancelados</p>
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.cancelled}</p>
          </CardContent>
        </Card>
      </div>

      {/* TABS */}
      <div className="flex border-b border-border">
        {tabs.map(tab => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all relative ${
                isActive
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <IconComponent className={`w-4 h-4 ${tab.color}`} />
              {tab.label}
              <span className="text-xs bg-secondary rounded-full px-2 py-0.5 ml-1">
                {followUps.filter(fu => fu.status === tab.id).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* BUSCADOR */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente ou motivo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-secondary/30 border-border/50 h-9 text-sm"
        />
      </div>

      {/* CONTEÚDO */}
      <div className="space-y-4">
        {filteredFollowUps.length > 0 ? (
          filteredFollowUps.map(followUp => (
            <FollowUpCard
              key={followUp.id}
              followUp={followUp}
              onSendMessage={onSendMessage}
              onReschedule={onReschedule}
              onMarkComplete={onMarkComplete}
              onViewHistory={onViewHistory}
            />
          ))
        ) : (
          <div className="text-center py-20 bg-secondary/10 rounded-2xl border border-dashed border-border">
            <h3 className="text-lg font-bold text-foreground">
              Nenhuma ação encontrada nesta aba
            </h3>
            <p className="text-muted-foreground max-w-xs mx-auto mt-2">
              {searchTerm ? 'Refine sua busca' : 'Nada por aqui no momento'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
