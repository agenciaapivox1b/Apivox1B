import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  History,
  Bot
} from 'lucide-react';

interface AnalysisLog {
  id: string;
  payload: any;
  classification: any;
  decision: string;
  confidence: number;
  created_at: string;
}

export default function AnalysisLogsView() {
  const [logs, setLogs] = useState<AnalysisLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('message_analysis_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'create_opportunity': return 'bg-green-500/10 text-green-600 border-green-200/50';
      case 'create_follow_up': return 'bg-blue-500/10 text-blue-600 border-blue-200/50';
      case 'human_review': return 'bg-rose-500/10 text-rose-600 border-rose-200/50';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-200/50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Bot className="w-5 h-5" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-foreground">Audit de Inteligência</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Histórico de Decisões do Universal Engine</p>
            </div>
        </div>
        <Button size="sm" variant="outline" onClick={fetchLogs} disabled={loading}>
            <History className="w-4 h-4 mr-2" />
            Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 text-center animate-pulse">
            <p className="text-muted-foreground">Carregando logs de auditoria...</p>
          </div>
        ) : logs.length > 0 ? (
          logs.map(log => (
            <Card key={log.id} className="bg-card border-border/50 hover:border-primary/30 transition-all overflow-hidden shadow-sm">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x border-border/50">
                  {/* COLUNA 1: Entrada */}
                  <div className="p-5 flex-1 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Entrada de Dados</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div className="bg-secondary/20 p-3 rounded-lg border border-border/40">
                        <p className="text-sm font-bold text-foreground line-clamp-1">
                            {log.payload?.message || log.payload?.content || 'Payload sem mensagem'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">Ref: {log.id.split('-')[0]}</p>
                    </div>
                  </div>

                  {/* COLUNA 2: Decisão IA */}
                  <div className="p-5 flex-1 bg-primary/[0.02] space-y-4">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">Processamento IA</span>
                         </div>
                         <Badge className={`text-[10px] font-extrabold uppercase px-2 py-0.5 border ${getDecisionBadge(log.decision)}`}>
                            {log.decision.replace('_', ' ')}
                         </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Confiança</p>
                            <p className={`text-sm font-black ${log.confidence > 0.8 ? 'text-green-500' : 'text-amber-500'}`}>
                                {(log.confidence * 100).toFixed(1)}%
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Urgência</p>
                            <p className="text-sm font-black text-foreground capitalize">
                                {log.classification?.urgency || 'Normal'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                         <p className="text-xs font-bold text-primary/80 mb-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Intenção Detectada:
                         </p>
                         <p className="text-xs text-foreground font-medium">{log.classification?.intent || 'Desconhecida'}</p>
                    </div>
                  </div>

                  {/* COLUNA 3: Ações */}
                  <div className="p-5 w-full md:w-48 flex flex-col justify-center gap-2">
                    <Button size="sm" variant="outline" className="w-full text-xs font-bold h-9">
                        <Eye className="w-3.5 h-3.5 mr-2" />
                        Ver JSON
                    </Button>
                    {log.decision === 'human_review' && (
                        <Button size="sm" className="w-full text-xs font-bold h-9 bg-rose-600 hover:bg-rose-700">
                            Validar Agora
                        </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-20 text-center bg-secondary/10 rounded-2xl border border-dashed border-border/60">
            <h3 className="text-lg font-bold text-foreground">Nenhum log de análise encontrado</h3>
            <p className="text-muted-foreground">O sistema ainda não processou interações universais.</p>
          </div>
        )}
      </div>
    </div>
  );
}
