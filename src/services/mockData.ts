import type { Bot, Conversation, Message, Integration, KnowledgeItem, ActivityItem } from '@/types';

export const mockBots: Bot[] = [
  {
    id: '1', client_id: '1', name: 'Sales Assistant', status: 'active', is_active: true,
    prompt: 'You are a helpful sales assistant for our e-commerce store. Help customers find products and answer questions.',
    fallback_message: 'Let me connect you with a human agent.',
    business_hours: '9:00 - 18:00', created_at: '2026-01-15T10:00:00Z', updated_at: '2026-03-01T14:00:00Z',
    messages_count: 12450, conversations_count: 890,
  },
  {
    id: '2', client_id: '1', name: 'Support Bot', status: 'active', is_active: true,
    prompt: 'You are a customer support agent. Help resolve issues and answer FAQs.',
    fallback_message: 'A human agent will be with you shortly.',
    business_hours: '24/7', created_at: '2026-02-01T08:00:00Z', updated_at: '2026-03-02T09:00:00Z',
    messages_count: 8320, conversations_count: 540,
  },
  {
    id: '3', client_id: '1', name: 'Lead Qualifier', status: 'paused', is_active: false,
    prompt: 'Qualify incoming leads by asking about budget, timeline, and requirements.',
    fallback_message: 'Thank you for your interest. Our team will contact you soon.',
    business_hours: '9:00 - 17:00', created_at: '2026-02-20T12:00:00Z', updated_at: '2026-02-28T16:00:00Z',
    messages_count: 3200, conversations_count: 210,
  },
  {
    id: '4', client_id: '1', name: 'Appointment Scheduler', status: 'draft', is_active: false,
    prompt: 'Help users schedule appointments and manage bookings.',
    fallback_message: 'Please call us to schedule your appointment.',
    business_hours: '8:00 - 20:00', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-01T10:00:00Z',
    messages_count: 0, conversations_count: 0,
  },
];

export const mockConversations: Conversation[] = [
  { id: '1', bot_id: '1', bot_name: 'Sales Assistant', contact_name: 'Maria Silva', contact_phone: '+55 11 99999-0001', status: 'active', tags: ['new-lead'], last_message: 'I\'d like to know more about your premium plan.', last_message_at: '2026-03-05T14:32:00Z', created_at: '2026-03-05T14:00:00Z', unread_count: 2 },
  { id: '2', bot_id: '1', bot_name: 'Sales Assistant', contact_name: 'João Santos', contact_phone: '+55 21 98888-0002', status: 'waiting_human', tags: ['escalated'], last_message: 'I need to speak with someone about my order.', last_message_at: '2026-03-05T13:45:00Z', created_at: '2026-03-05T12:00:00Z', unread_count: 5 },
  { id: '3', bot_id: '2', bot_name: 'Support Bot', contact_name: 'Ana Costa', contact_phone: '+55 31 97777-0003', status: 'resolved', tags: ['billing'], last_message: 'Thank you, that resolved my issue!', last_message_at: '2026-03-05T11:20:00Z', created_at: '2026-03-05T10:00:00Z', unread_count: 0 },
  { id: '4', bot_id: '2', bot_name: 'Support Bot', contact_name: 'Carlos Oliveira', contact_phone: '+55 41 96666-0004', status: 'vip', tags: ['vip', 'enterprise'], last_message: 'Can you check the API integration status?', last_message_at: '2026-03-05T14:10:00Z', created_at: '2026-03-04T09:00:00Z', unread_count: 1 },
  { id: '5', bot_id: '1', bot_name: 'Sales Assistant', contact_name: 'Fernanda Lima', contact_phone: '+55 51 95555-0005', status: 'active', tags: [], last_message: 'What are your business hours?', last_message_at: '2026-03-05T14:28:00Z', created_at: '2026-03-05T14:25:00Z', unread_count: 1 },
];

export const mockMessages: Record<string, Message[]> = {
  '1': [
    { id: 'm1', conversation_id: '1', sender: 'user', content: 'Hi, I\'m interested in your services.', timestamp: '2026-03-05T14:00:00Z' },
    { id: 'm2', conversation_id: '1', sender: 'bot', content: 'Hello Maria! Welcome. I\'d be happy to help you learn about our plans. We have Free, Pro, and Enterprise options. Which one interests you?', timestamp: '2026-03-05T14:00:30Z' },
    { id: 'm3', conversation_id: '1', sender: 'user', content: 'I\'d like to know more about your premium plan.', timestamp: '2026-03-05T14:32:00Z' },
  ],
  '2': [
    { id: 'm4', conversation_id: '2', sender: 'user', content: 'My order #4521 hasn\'t arrived yet.', timestamp: '2026-03-05T12:00:00Z' },
    { id: 'm5', conversation_id: '2', sender: 'bot', content: 'I\'m sorry to hear that, João. Let me check your order status.', timestamp: '2026-03-05T12:00:20Z' },
    { id: 'm6', conversation_id: '2', sender: 'bot', content: 'Your order is currently in transit. It should arrive within 2 business days.', timestamp: '2026-03-05T12:01:00Z' },
    { id: 'm7', conversation_id: '2', sender: 'user', content: 'That\'s too long. I need to speak with someone about my order.', timestamp: '2026-03-05T13:45:00Z' },
  ],
};

export const mockIntegrations: Integration[] = [
  { id: '1', name: 'n8n Webhook', description: 'Automate workflows with n8n', icon: 'webhook', status: 'connected', enabled: true, last_sync: '2026-03-05T14:00:00Z' },
  { id: '2', name: 'CRM', description: 'Sync contacts and leads', icon: 'users', status: 'connected', enabled: true, last_sync: '2026-03-05T13:30:00Z' },
  { id: '3', name: 'Google Calendar', description: 'Schedule appointments', icon: 'calendar', status: 'disconnected', enabled: false },
];

export const mockKnowledgeBase: KnowledgeItem[] = [
  { id: '1', category: 'faq', title: 'What are your business hours?', content: 'We operate Monday through Friday, 9 AM to 6 PM.', updated_at: '2026-03-01T10:00:00Z' },
  { id: '2', category: 'faq', title: 'How do I reset my password?', content: 'Click on "Forgot Password" on the login page and follow the instructions.', updated_at: '2026-02-28T15:00:00Z' },
  { id: '3', category: 'rules', title: 'Escalation Policy', content: 'If the bot cannot resolve within 3 messages, escalate to a human agent.', updated_at: '2026-03-02T09:00:00Z' },
  { id: '4', category: 'products', title: 'Pro Plan', content: 'Includes unlimited agents, priority support, and advanced analytics. $99/month.', updated_at: '2026-03-01T12:00:00Z' },
  { id: '5', category: 'policies', title: 'Refund Policy', content: 'Full refund within 30 days of purchase. No questions asked.', updated_at: '2026-02-25T10:00:00Z' },
  { id: '6', category: 'products', title: 'Enterprise Plan', content: 'Custom pricing, dedicated support, SLA guarantees, and white-label options.', updated_at: '2026-03-03T08:00:00Z' },
];

export const mockActivities: ActivityItem[] = [
  { id: '1', type: 'conversation', description: 'New conversation started with Maria Silva', timestamp: '2026-03-05T14:00:00Z' },
  { id: '2', type: 'agent', description: 'Sales Assistant resolved 3 conversations', timestamp: '2026-03-05T13:45:00Z' },
  { id: '3', type: 'automation', description: 'Lead qualified and synced to CRM', timestamp: '2026-03-05T13:30:00Z' },
  { id: '4', type: 'conversation', description: 'João Santos escalated to human agent', timestamp: '2026-03-05T13:45:00Z' },
  { id: '5', type: 'agent', description: 'Support Bot handled billing inquiry from Ana Costa', timestamp: '2026-03-05T11:20:00Z' },
  { id: '6', type: 'automation', description: 'Appointment reminder sent to 12 contacts', timestamp: '2026-03-05T10:00:00Z' },
];

export const mockChartData = {
  messagesPerDay: [
    { date: 'Feb 27', messages: 420 }, { date: 'Feb 28', messages: 380 },
    { date: 'Mar 1', messages: 510 }, { date: 'Mar 2', messages: 470 },
    { date: 'Mar 3', messages: 590 }, { date: 'Mar 4', messages: 430 },
    { date: 'Mar 5', messages: 620 },
  ],
  conversationsPerDay: [
    { date: 'Feb 27', conversations: 85 }, { date: 'Feb 28', conversations: 72 },
    { date: 'Mar 1', conversations: 98 }, { date: 'Mar 2', conversations: 91 },
    { date: 'Mar 3', conversations: 110 }, { date: 'Mar 4', conversations: 88 },
    { date: 'Mar 5', conversations: 105 },
  ],
  peakHours: [
    { hour: '8AM', count: 45 }, { hour: '9AM', count: 120 }, { hour: '10AM', count: 180 },
    { hour: '11AM', count: 210 }, { hour: '12PM', count: 150 }, { hour: '1PM', count: 130 },
    { hour: '2PM', count: 195 }, { hour: '3PM', count: 220 }, { hour: '4PM', count: 175 },
    { hour: '5PM', count: 90 }, { hour: '6PM', count: 45 },
  ],
};
