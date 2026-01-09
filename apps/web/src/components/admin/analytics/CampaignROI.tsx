import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Target } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  budget: number;
  spent: number;
  views: number;
  roi: number;
}

interface CampaignROIProps {
  campaigns: Campaign[];
}

export function CampaignROI({ campaigns }: CampaignROIProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const chartData = campaigns.slice(0, 8).map((c) => ({
    name: c.title.length > 15 ? c.title.slice(0, 15) + "..." : c.title,
    roi: c.roi,
    spent: c.spent,
    budget: c.budget,
    fullName: c.title,
    brand: c.brand_name,
  }));

  const getBarColor = (roi: number) => {
    if (roi >= 80) return "#22c55e";
    if (roi >= 50) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-500" />
          Campaign Budget Utilization
        </CardTitle>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No campaign data available
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <XAxis type="number" domain={[0, 100]} unit="%" stroke="#666" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  stroke="#666"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toFixed(1)}%`,
                    "Utilization",
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const item = payload[0].payload;
                      return `${item.fullName} (${item.brand})`;
                    }
                    return label;
                  }}
                />
                <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.roi)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">High (80%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Medium (50-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Low (&lt;50%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
