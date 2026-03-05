import { mockBots, mockConversations, mockMessages, mockIntegrations, mockKnowledgeBase, mockActivities, mockChartData } from './mockData';
import type { Bot, Conversation, Message, Integration, KnowledgeItem, ActivityItem } from '@/types';

// Simulate API delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // Bots
  async getBots(): Promise<Bot[]> {
    await delay();
    return mockBots;
  },
  async getBot(id: string): Promise<Bot | undefined> {
    await delay();
    return mockBots.find(b => b.id === id);
  },
  async toggleBot(id: string, active: boolean): Promise<Bot> {
    await delay();
    const bot = mockBots.find(b => b.id === id);
    if (!bot) throw new Error('Bot not found');
    bot.is_active = active;
    bot.status = active ? 'active' : 'paused';
    return { ...bot };
  },

  // Conversations
  async getConversations(filter?: string): Promise<Conversation[]> {
    await delay();
    if (filter && filter !== 'all') {
      return mockConversations.filter(c => c.status === filter);
    }
    return mockConversations;
  },
  async getMessages(conversationId: string): Promise<Message[]> {
    await delay();
    return mockMessages[conversationId] || [];
  },

  // Integrations
  async getIntegrations(): Promise<Integration[]> {
    await delay();
    return mockIntegrations;
  },

  // Knowledge Base
  async getKnowledgeBase(category?: string): Promise<KnowledgeItem[]> {
    await delay();
    if (category && category !== 'all') {
      return mockKnowledgeBase.filter(k => k.category === category);
    }
    return mockKnowledgeBase;
  },

  // Activity
  async getActivities(): Promise<ActivityItem[]> {
    await delay();
    return mockActivities;
  },

  // Charts
  async getChartData() {
    await delay();
    return mockChartData;
  },

  // Metrics
  async getMetrics() {
    await delay();
    return {
      activeAgents: 2,
      activeConversations: 24,
      messagesToday: 620,
      leadsCaptured: 18,
      automationRate: 87.3,
      handoffRate: 12.7,
    };
  },
};
