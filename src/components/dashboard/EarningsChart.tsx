import { useMemo } from "react";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format, startOfWeek, eachWeekOfInterval, subMonths } from "date-fns";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: Date;
  status?: string;
}

interface EarningsChartProps {
  transactions: Transaction[];
  totalEarned: number;
  className?: string;
}

const chartConfig = {
  earnings: {
    label: "Earnings",
    color: "hsl(142.1 76.2% 36.3%)", // emerald-500
  },
};

export function EarningsChart({ transactions, totalEarned, className }: EarningsChartProps) {
  const chartData = useMemo(() => {
    // Filter to only earning transactions
    const earningTransactions = transactions.filter(
      t => (t.type === 'earning' || t.type === 'boost_earning' || t.type === 'referral' || t.type === 'team_earning' || t.type === 'affiliate_earning')
        && t.status === 'completed'
    );

    if (!earningTransactions.length) return [];

    // Get date range - last 12 weeks
    const now = new Date();
    const startDate = startOfWeek(subMonths(now, 3));
    const weeks = eachWeekOfInterval({ start: startDate, end: now });

    // Aggregate earnings by week
    const weeklyEarnings: Record<string, number> = {};

    weeks.forEach(week => {
      const weekKey = format(week, "yyyy-MM-dd");
      weeklyEarnings[weekKey] = 0;
    });

    earningTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const weekStart = startOfWeek(transactionDate);
      const weekKey = format(weekStart, "yyyy-MM-dd");

      // Only include transactions within our date range
      if (weeklyEarnings.hasOwnProperty(weekKey)) {
        weeklyEarnings[weekKey] += Math.abs(transaction.amount) || 0;
      }
    });

    // Convert to chart format with cumulative totals
    let cumulative = 0;
    return weeks.map(week => {
      const weekKey = format(week, "yyyy-MM-dd");
      cumulative += weeklyEarnings[weekKey] || 0;
      return {
        week: format(week, "MMM d"),
        earnings: Math.round(cumulative * 100) / 100,
        weeklyEarnings: Math.round((weeklyEarnings[weekKey] || 0) * 100) / 100,
      };
    });
  }, [transactions]);

  if (!chartData.length || chartData.every(d => d.earnings === 0)) {
    return (
      <div className={className}>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm font-['Inter'] tracking-[-0.3px]">
          No earnings data yet
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickMargin={8}
            tickFormatter={(value) => `$${value}`}
            width={50}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label) => label}
                formatter={(value, name) => (
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold text-emerald-500">${Number(value).toFixed(2)}</span>
                  </div>
                )}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="earnings"
            stroke="hsl(142.1 76.2% 36.3%)"
            strokeWidth={2}
            fill="url(#earningsGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(142.1 76.2% 36.3%)" }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
