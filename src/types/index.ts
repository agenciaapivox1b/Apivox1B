export interface Client {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

export interface Bot {
  id: string;
  client_id: string;
  name: string;
  status: 'active' | 'paused' | 'draft';
  is_active: boolean;
  prompt: string;
  webhook_url?: string;
  fallback_message: string;
  business_hours: string;
  created_at: string;
  updated_at: string;
  messages_count: number;
  conversations_count: number;
}

export interface Conversation {
  id: string;
  bot_id: string;
  bot_name: string;
  contact_name: string;
  contact_phone: string;
  status: 'active' | 'waiting_human' | 'resolved' | 'vip';
  tags: string[];
  last_message: string;
  last_message_at: string;
  created_at: string;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'bot' | 'user' | 'agent';
  content: string;
  timestamp: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
  enabled: boolean;
  last_sync?: string;
}

export interface KnowledgeItem {
  id: string;
  category: 'faq' | 'rules' | 'products' | 'policies';
  title: string;
  content: string;
  updated_at: string;
}

export interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
}

export interface ActivityItem {
  id: string;
  type: 'conversation' | 'agent' | 'automation';
  description: string;
  timestamp: string;
}
