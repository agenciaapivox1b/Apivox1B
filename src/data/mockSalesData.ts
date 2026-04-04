export interface Lead {
  id: number;
  name: string;
  phone: string;
  interest: 'Alta chance' | 'Interesse médio' | 'Baixo interesse';
  reason: string;
  context: string;
  status: 'Oportunidade' | 'Follow-up' | 'Concluído';
  stage: 'Descoberta' | 'Qualificação' | 'Proposta' | 'Negociação' | 'Fechamento';
  priority: 'Crítica' | 'Alta' | 'Média' | 'Baixa';
  owner: string;
  lastInteraction: string;
  daysSinceLastInteraction: number;
  estimatedValue: number;
  probability: number; // 0-100
  
  // Strategic Advisor Fields
  diagnosis?: string;
  recommendation?: string;
  recommendationReason?: string;
  
  // Follow-up specific
  urgency?: 'Hoje' | 'Atrasado' | 'No prazo';
  nextActionDate?: string;
  suggestedApproach?: string;
  suggestedMessage?: string;
  suggestedChannel?: 'WhatsApp' | 'E-mail' | 'Ligação';
  followUpStatus?: string;
}

export interface FollowUp {
  id: string;
  leadId: number;
  clientName: string;
  phone: string;
  reason: string;
  strategy: string;
  status: 'pending' | 'scheduled' | 'done';
  scheduledAt?: string;
  lastInteractionAt: string;
  suggestedChannel: 'WhatsApp' | 'E-mail' | 'Ligação';
  priority: 'Crítica' | 'Alta' | 'Média' | 'Baixa';
}

export interface StrategicInsight {
  id: string;
  leadId: number;
  clientName: string;
  stage: string;
  priority: 'Crítica' | 'Alta' | 'Média' | 'Baixa';
  diagnosis: string;
  recommendation: string;
  recommendationReason: string;
  isStagnant: boolean;
  daysStagnant?: number;
}

export const mockLeads: Lead[] = [
  { 
    id: 1, 
    name: 'Clínica Sorriso', 
    phone: '+55 11 98888-0001', 
    interest: 'Alta chance',
    reason: 'Perguntou preço do plano Premium',
    context: 'perguntou preço do plano Premium',
    status: 'Follow-up',
    stage: 'Qualificação',
    priority: 'Alta',
    owner: 'Marcelo Ziantonio',
    lastInteraction: 'hoje',
    daysSinceLastInteraction: 0,
    estimatedValue: 12500,
    probability: 85,
    urgency: 'Hoje',
    nextActionDate: '2026-03-26',
    suggestedApproach: 'Enviar tabela de preços',
    suggestedMessage: 'Olá! Tudo bem? \n\nConforme conversamos mais cedo, estou enviando aqui os valores do plano Premium. Lembrando que fechando hoje, você ganha a ativação grátis! \n\nPosso gerar o link de pagamento?',
    suggestedChannel: 'WhatsApp',
    followUpStatus: 'Precisa de contato hoje'
  },
  { 
    id: 2, 
    name: 'João Advocacia', 
    phone: '+55 21 97777-0022', 
    interest: 'Interesse médio',
    reason: 'Demonstrou interesse na integração CRM',
    context: 'solicitou informações sobre integração CRM',
    status: 'Oportunidade',
    stage: 'Descoberta',
    priority: 'Média',
    owner: 'Marcelo Ziantonio',
    lastInteraction: 'há 4 dias',
    daysSinceLastInteraction: 4,
    estimatedValue: 8000,
    probability: 45,
    diagnosis: 'Lead interessado mas em silêncio após primeira dúvida técnica.',
    recommendation: 'Enviar material de integração',
    recommendationReason: 'Lead estacionado na descoberta há 4 dias após pergunta técnica.'
  },
  { 
    id: 3, 
    name: 'Restaurante Sabor', 
    phone: '+55 31 96666-0033', 
    interest: 'Baixo interesse',
    reason: 'Conversa ativa sem fechamento',
    context: 'iniciou agendamento mas não concluiu',
    status: 'Oportunidade',
    stage: 'Descoberta',
    priority: 'Baixa',
    owner: 'Marcelo Ziantonio',
    lastInteraction: 'há 10 dias',
    daysSinceLastInteraction: 10,
    estimatedValue: 3500,
    probability: 15,
    diagnosis: 'Lead frio. Iniciou fluxo de agendamento mas abandonou o carrinho.',
    recommendation: 'Oferecer desconto de ativação',
    recommendationReason: 'Sem interação há mais de uma semana com fluxo incompleto.'
  },
  { 
    id: 4, 
    name: 'Carlos Oliveira', 
    phone: '+55 41 95555-0044', 
    interest: 'Alta chance',
    reason: 'Cliente aguardando proposta',
    context: 'conversou sobre plano corporativo na segunda',
    status: 'Follow-up',
    stage: 'Proposta',
    priority: 'Crítica',
    owner: 'Marcelo Ziantonio',
    lastInteraction: 'há 1 dia',
    daysSinceLastInteraction: 1,
    estimatedValue: 25000,
    probability: 90,
    urgency: 'Atrasado',
    nextActionDate: '2026-03-25',
    suggestedApproach: 'Enviar proposta formal',
    suggestedMessage: 'Carlos, boa tarde! \n\nAcabei de finalizar a proposta personalizada para a sua empresa focando no fluxo corporativo que discutimos. \n\nEstou enviando o arquivo em anexo. Posso te ligar amanhã às 10h para tirarmos qualquer dúvida?',
    suggestedChannel: 'WhatsApp',
    followUpStatus: 'Pronto para follow-up'
  },
  {
    id: 5,
    name: 'Mercado Local',
    phone: '+55 11 94444-1122',
    interest: 'Interesse médio',
    reason: 'Solicitou demo da automação',
    context: 'Viu anúncio no Instagram',
    status: 'Follow-up',
    stage: 'Qualificação',
    priority: 'Média',
    owner: 'Marcelo Ziantonio',
    lastInteraction: 'há 3 dias',
    daysSinceLastInteraction: 3,
    estimatedValue: 5000,
    probability: 60,
    urgency: 'Hoje',
    nextActionDate: '2026-03-26',
    suggestedApproach: 'Agendar Demo',
    suggestedMessage: 'Olá! Vi que você se interessou pela nossa automação. Gostaria de marcar uma demonstração de 10 min hoje?',
    suggestedChannel: 'WhatsApp',
    followUpStatus: 'Aguardando agendamento'
  },
  {
    id: 6,
    name: 'Consultoria Top',
    phone: '+55 11 99999-8877',
    interest: 'Alta chance',
    reason: 'Empresa grande com 100+ funcionários',
    context: 'Indicação de parceiro',
    status: 'Oportunidade',
    stage: 'Negociação',
    priority: 'Crítica',
    owner: 'Marcelo Ziantonio',
    lastInteraction: 'há 2 dias',
    daysSinceLastInteraction: 2,
    estimatedValue: 50000,
    probability: 75,
    diagnosis: 'Potencial cliente corporativo em fase final de decisão.',
    recommendation: 'Agendar reunião com decisores',
    recommendationReason: 'Ticket médio alto exige contato próximo para fechamento.'
  }
];

export const mockFollowUps: FollowUp[] = [
  {
    id: 'fu-1',
    leadId: 1,
    clientName: 'Clínica Sorriso',
    phone: '+55 11 98888-0001',
    reason: 'Enviar tabela de preços',
    strategy: 'Abordagem comercial estimulante',
    status: 'pending',
    lastInteractionAt: 'há 2 horas',
    suggestedChannel: 'WhatsApp',
    priority: 'Alta'
  },
  {
    id: 'fu-2',
    leadId: 4,
    clientName: 'Carlos Oliveira',
    phone: '+55 41 95555-0044',
    reason: 'Seguir primeira reunião',
    strategy: 'Enviar proposta formal',
    status: 'pending',
    lastInteractionAt: 'há 1 dia',
    suggestedChannel: 'E-mail',
    priority: 'Crítica'
  },
  {
    id: 'fu-3',
    leadId: 5,
    clientName: 'Mercado Local',
    phone: '+55 11 94444-1122',
    reason: 'Agendar demonstração',
    strategy: 'Disponibilizar horários',
    status: 'scheduled',
    scheduledAt: '2026-03-27 14:00',
    lastInteractionAt: 'há 3 dias',
    suggestedChannel: 'WhatsApp',
    priority: 'Média'
  },
  {
    id: 'fu-4',
    leadId: 2,
    clientName: 'João Advocacia',
    phone: '+55 21 97777-0022',
    reason: 'Reengage após silêncio técnico',
    strategy: 'Oferecer material educativo',
    status: 'pending',
    lastInteractionAt: 'há 4 dias',
    suggestedChannel: 'E-mail',
    priority: 'Média'
  },
  {
    id: 'fu-5',
    leadId: 3,
    clientName: 'Restaurante Sabor',
    phone: '+55 31 96666-0033',
    reason: 'Recuperar cliente frio',
    strategy: 'Oferecer incentivo de ativação',
    status: 'done',
    lastInteractionAt: 'há 8 dias',
    suggestedChannel: 'WhatsApp',
    priority: 'Baixa'
  },
  {
    id: 'fu-6',
    leadId: 6,
    clientName: 'Consultoria Top',
    phone: '+55 11 99999-8877',
    reason: 'Confirmar reunião com decisores',
    strategy: 'Confi Calendário e agenda',
    status: 'scheduled',
    scheduledAt: '2026-03-28 10:00',
    lastInteractionAt: 'há 2 dias',
    suggestedChannel: 'Ligação',
    priority: 'Crítica'
  }
];

export const mockStrategicInsights: StrategicInsight[] = [
  {
    id: 'si-1',
    leadId: 1,
    clientName: 'Clínica Sorriso',
    stage: 'Qualificação',
    priority: 'Alta',
    diagnosis: 'Lead qualificado com alta probabilidade de conversão.',
    recommendation: 'Enviar tabela de preços com urgência',
    recommendationReason: 'Cliente pediu informações hoje, precisa de resposta em máximo 2 horas para não esfriar o interesse.',
    isStagnant: false
  },
  {
    id: 'si-2',
    leadId: 2,
    clientName: 'João Advocacia',
    stage: 'Descoberta',
    priority: 'Média',
    diagnosis: 'Lead em silêncio após dúvida técnica inicial. Risco de abandono.',
    recommendation: 'Enviar material educativo sobre integração',
    recommendationReason: 'Estagnado há 4 dias após pergunta técnica. Material pode resolver e reativar interesse.',
    isStagnant: true,
    daysStagnant: 4
  },
  {
    id: 'si-3',
    leadId: 3,
    clientName: 'Restaurante Sabor',
    stage: 'Descoberta',
    priority: 'Baixa',
    diagnosis: 'Lead frio com probabilidade muito baixa. Fluxo incompleto iniciado.',
    recommendation: 'Oferecer desconto de ativação para reativar interesse',
    recommendationReason: 'Abandonou fluxo há 10 dias. Incentivo financeiro pode trazer de volta ou encerrar com aprendizado.',
    isStagnant: true,
    daysStagnant: 10
  },
  {
    id: 'si-4',
    leadId: 4,
    clientName: 'Carlos Oliveira',
    stage: 'Proposta',
    priority: 'Crítica',
    diagnosis: 'Lead corporativo em etapa final. Alto valor envolvido. Decisão pendente.',
    recommendation: 'Agendar reunião com decisores para acelerar fechamento',
    recommendationReason: 'Ticket de R$ 25k precisa de presença e suporte próximas. Está há 1 dia sem contato.',
    isStagnant: false
  },
  {
    id: 'si-5',
    leadId: 5,
    clientName: 'Mercado Local',
    stage: 'Qualificação',
    priority: 'Média',
    diagnosis: 'Lead interessado em demonstração. Qualidade média, rápido para converter.',
    recommendation: 'Agendar demonstração com disponibilidade já oferecida',
    recommendationReason: 'Cliente solicitou demo. Agendamento rápido aumenta probabilidade de presença e conversão.',
    isStagnant: false
  },
  {
    id: 'si-6',
    leadId: 6,
    clientName: 'Consultoria Top',
    stage: 'Negociação',
    priority: 'Crítica',
    diagnosis: 'Potencial cliente corporativo grande em fase final de decisão.',
    recommendation: 'Agendar reunião estratégica com C-level',
    recommendationReason: 'Maior ticket do pipeline (R$ 50k). Requer abordagem consultiva com decisores.',
    isStagnant: false
  }
];
