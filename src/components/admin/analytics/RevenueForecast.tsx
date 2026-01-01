import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";

interface RevenueForecastProps {
  data: {
    current: number;
    previous: number;
    change: number;
    daily: { date: string; amount: number }[];
    forecast: { date: string; amount: number; confidence: number }[];
  };
}

export function RevenueForecast({ data }: RevenueForecastProps) {
  // Combine actual and forecast data
  const chartData = [
    ...data.daily.map((d) => ({
      date: d.date,
      actual: d.amount,
      forecast: null as number | null,
      confidence: null as number | null,
    })),
    ...data.forecast.map((d) => ({
      date: d.date,
      actual: null as number | null,
      forecast: d.amount,
      confidence: d.confidence,
    })),
  ];

  const isPositive = data.change >= 0;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Revenue Trend</CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold">
                {formatCurrency(data.current)}
              </p>
              <div
                className={`flex items-center gap-1 text-sm ${
                  isPositive ? "text-green-500" : "text-red-500"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {data.change.toFixed(1)}% vs last period
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="forecastGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="date"
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => format(parseISO(value), "MMM d")}
              />
              <YAxis
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                }}
                labelFormatter={(value) =>
                  format(parseISO(value as string), "MMM d, yyyy")
                }
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "actual" ? "Revenue" : "Forecast",
                ]}
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#actualGradient)"
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#forecastGradient)"
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span className="text-muted-foreground">Actual Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Forecast</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
