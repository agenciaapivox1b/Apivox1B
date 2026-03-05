import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockChartData } from '@/services/mockData';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const topQuestions = [
  { question: 'What are your business hours?', count: 142 },
  { question: 'How do I track my order?', count: 98 },
  { question: 'What is your refund policy?', count: 87 },
  { question: 'Do you offer free shipping?', count: 76 },
  { question: 'How to reset password?', count: 65 },
];

const failedQuestions = [
  { question: 'Can I integrate with SAP?', count: 23 },
  { question: 'Do you support crypto payments?', count: 18 },
  { question: 'What is the API rate limit?', count: 12 },
];

const responseTimeData = [
  { date: 'Feb 27', time: 1.2 }, { date: 'Feb 28', time: 1.1 },
  { date: 'Mar 1', time: 0.9 }, { date: 'Mar 2', time: 1.0 },
  { date: 'Mar 3', time: 0.8 }, { date: 'Mar 4', time: 0.7 },
  { date: 'Mar 5', time: 0.6 },
];

export default function AnalyticsPage() {
  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Insights into your AI agents performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Response Time', value: '0.6s' },
          { label: 'Automation Rate', value: '87.3%' },
          { label: 'Handoff Rate', value: '12.7%' },
          { label: 'Resolution Rate', value: '94.2%' },
        ].map((m) => (
          <Card key={m.label} className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Conversations per Day</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData.conversationsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="conversations" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Response Time (seconds)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="time" stroke="hsl(89 100% 50%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Top Questions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topQuestions.map((q, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-foreground">{q.question}</span>
                  <span className="text-sm font-medium text-muted-foreground">{q.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Failed Questions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {failedQuestions.map((q, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-foreground">{q.question}</span>
                  <span className="text-sm font-medium text-destructive">{q.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
