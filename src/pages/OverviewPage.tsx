import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { mockChartData } from '@/services/mockData';
import type { ActivityItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, MessageSquare, Mail, Target, Zap, Users } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMetrics(), api.getActivities()]).then(([m, a]) => {
      setMetrics(m);
      setActivities(a);
      setLoading(false);
    });
  }, []);

  if (loading || !metrics) {
    return <div className="p-8 flex items-center justify-center h-full"><div className="text-muted-foreground">Loading...</div></div>;
  }

  const metricCards = [
    { label: 'Active Agents', value: metrics.activeAgents, icon: Bot, change: 0 },
    { label: 'Active Conversations', value: metrics.activeConversations, icon: MessageSquare, change: 12 },
    { label: 'Messages Today', value: metrics.messagesToday, icon: Mail, change: 8.5 },
    { label: 'Leads Captured', value: metrics.leadsCaptured, icon: Target, change: 22 },
    { label: 'Automation Rate', value: `${metrics.automationRate}%`, icon: Zap, change: 3.2 },
    { label: 'Handoff Rate', value: `${metrics.handoffRate}%`, icon: Users, change: -5.1 },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor your AI agents performance</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((m) => (
          <Card key={m.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <m.icon className="h-4 w-4 text-muted-foreground" />
                {m.change !== 0 && (
                  <span className={`text-xs font-medium ${m.change > 0 ? 'text-brand-green-secondary' : 'text-destructive'}`}>
                    {m.change > 0 ? '+' : ''}{m.change}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-semibold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Messages per Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData.messagesPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="messages" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockChartData.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                  a.type === 'conversation' ? 'bg-primary' : a.type === 'agent' ? 'bg-brand-green-secondary' : 'bg-accent'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{a.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
