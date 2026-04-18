// =====================================================
// PLANOS PAGE - Upgrade para Premium
// 
// Foco em benefícios de negócio, não comparação de planos
// Estratégia: mostrar valor, não features técnicas
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  ArrowLeft, 
  Loader2,
  Sparkles, 
  MessageCircle,
  Target,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { TenantService } from '@/services/tenantService';

export default function PlanosPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'premium'>('free');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkCurrentPlan();
  }, []);

  const checkCurrentPlan = async () => {
    try {
      const plan = await TenantService.getTenantPlan();
      setCurrentPlan(plan);
    } catch (error) {
      console.error('Erro ao verificar plano:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = () => {
    // Abrir WhatsApp para ativação
    window.open('https://wa.me/5545991585863?text=Quero+configurar+tudo+com+vocês+o+mais+rapido+possivel+e+comecar+a+usar+hoje', '_blank');
  };
  
  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header minimalista */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="gap-2" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </div>

      {/* Content - Foco em benefícios */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Badge sutil para Premium ativo */}
        {currentPlan === 'premium' && (
          <div className="text-center mb-8">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Plano Premium Ativo
            </Badge>
          </div>
        )}

        {/* Hero Section - Foco em valor */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full mb-6">
            <Zap className="h-8 w-8 text-blue-600" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Seu bot responde.
            <br />
            <span className="text-blue-600">A APIVOX garante o acompanhamento.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Automatize seus follow-ups no momento certo e aumente 
            suas chances de fechar clientes.
          </p>
        </div>

          {/* Benefícios em cards - cores padronizadas azul/verde */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Acompanhamento no momento certo
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Seu bot captura o lead. A APIVOX garante a continuidade até o fechamento.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Mais conversões no funil
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Cada oportunidade é acompanhada até o fechamento. Nenhum cliente esquecido.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Continuidade do atendimento
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Da primeira conversa ao fechamento, tudo organizado e automatizado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    WhatsApp que converte
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Conecte seu WhatsApp e acompanhe cada lead até virar cliente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Principal */}
        <div className="text-center">
          {currentPlan === 'premium' ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Você já tem acesso completo</span>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure tudo em poucos minutos com a ajuda da APIVOX
              </p>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8"
                onClick={handleContact}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Ativar com a APIVOX
              </Button>
              <p className="text-xs text-muted-foreground">
                Ativação em até 24h · Suporte humano · Sem burocracia
              </p>
            </div>
          )}
        </div>

        {/* Footer sutil */}
        <div className="max-w-2xl mx-auto mt-16 pt-8 border-t border-border text-center">
          <div className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              <Shield className="h-4 w-4" />
              <span>Pagamento seguro</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Ativação em 24h</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              <span>Satisfação garantida</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
