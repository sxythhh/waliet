import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Eye, Users, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface AnalyticsDashboardProps {
  campaigns: any[];
}

// Mock data for the chart - in a real app this would come from the database
const generateMockData = () => {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  for (let i = 0; i <= 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      realViews: Math.floor(Math.random() * 300000) + 500000,
      bottedViews: Math.floor(Math.random() * 100000) + 100000,
      likes: Math.floor(Math.random() * 50000) + 100000,
      comments: Math.floor(Math.random() * 30000) + 50000,
      shares: Math.floor(Math.random() * 20000) + 30000,
    });
  }
  return data;
};

const chartData = generateMockData();

const chartConfig = {
  realViews: {
    label: "Real Views",
    color: "hsl(var(--primary))",
  },
  bottedViews: {
    label: "Botted Views",
    color: "hsl(var(--destructive))",
  },
  likes: {
    label: "Likes",
    color: "hsl(280, 60%, 60%)",
  },
  comments: {
    label: "Comments",
    color: "hsl(180, 60%, 50%)",
  },
  shares: {
    label: "Shares",
    color: "hsl(30, 70%, 60%)",
  },
};

export function AnalyticsDashboard({ campaigns }: AnalyticsDashboardProps) {
  const totalBudget = campaigns.reduce((sum, c) => sum + Number(c.budget || 0), 0);
  const totalBudgetUsed = campaigns.reduce((sum, c) => sum + Number(c.budget_used || 0), 0);
  const totalViews = Math.floor(Math.random() * 100000000) + 75000000; // Mock data
  const avgRPM = campaigns.length > 0 
    ? campaigns.reduce((sum, c) => sum + Number(c.rpm_rate || 0), 0) / campaigns.length 
    : 0;

  const stats = [
    {
      title: "Total Views Generated",
      value: totalViews.toLocaleString(),
      subtitle: `Real: ${Math.floor(totalViews * 0.75).toLocaleString()} (75%)`,
      icon: Eye,
      color: "text-primary"
    },
    {
      title: "Total Payout",
      value: `$${totalBudgetUsed.toLocaleString()}`,
      icon: DollarSign,
      color: "text-success"
    },
    {
      title: "CPM",
      value: `$${avgRPM.toFixed(2)}`,
      subtitle: "Running Efficiently",
      icon: Activity,
      color: "text-warning"
    },
    {
      title: "Submissions",
      value: "50,000,000",
      subtitle: "50% Approved",
      icon: Users,
      color: "text-accent"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-card border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <span className="text-sm text-muted-foreground">{stat.title}</span>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                {stat.subtitle && (
                  <div className="text-sm text-muted-foreground">{stat.subtitle}</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Chart */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Analytics Overview</CardTitle>
            <div className="text-sm text-muted-foreground">Last 30 days</div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="realViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="bottedViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="likes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(280, 60%, 60%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(280, 60%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="comments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(180, 60%, 50%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(180, 60%, 50%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="shares" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(30, 70%, 60%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(30, 70%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.1} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Area 
                  type="monotone" 
                  dataKey="realViews" 
                  stackId="1"
                  stroke="hsl(var(--primary))" 
                  fill="url(#realViews)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="bottedViews" 
                  stackId="1"
                  stroke="hsl(var(--destructive))" 
                  fill="url(#bottedViews)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="likes" 
                  stackId="1"
                  stroke="hsl(280, 60%, 60%)" 
                  fill="url(#likes)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="comments" 
                  stackId="1"
                  stroke="hsl(180, 60%, 50%)" 
                  fill="url(#comments)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="shares" 
                  stackId="1"
                  stroke="hsl(30, 70%, 60%)" 
                  fill="url(#shares)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
