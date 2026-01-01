import { useMemo, useState } from "react";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, startOfMonth, eachWeekOfInterval, eachDayOfInterval, eachMonthOfInterval, subMonths, subDays, subYears } from "date-fns";

export type EarningsChartPeriod = "1W" | "1M" | "3M" | "ALL";

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
  period?: EarningsChartPeriod;
  onPeriodChange?: (period: EarningsChartPeriod) => void;
  showPeriodSelector?: boolean;
}

const chartConfig = {
  earnings: {
    label: "Earnings",
    color: "hsl(142.1 76.2% 36.3%)", // emerald-500
  },
};

const periodLabels: Record<EarningsChartPeriod, string> = {
  "1W": "Last 7 days",
  "1M": "Last month",
  "3M": "Last 3 months",
  "ALL": "All time",
};

export function EarningsChart({
  transactions,
  totalEarned,
  className,
  period: externalPeriod,
  onPeriodChange,
  showPeriodSelector = true,
}: EarningsChartProps) {
  const [internalPeriod, setInternalPeriod] = useState<EarningsChartPeriod>("3M");
  const period = externalPeriod ?? internalPeriod;

  const handlePeriodChange = (newPeriod: EarningsChartPeriod) => {
    if (onPeriodChange) {
      onPeriodChange(newPeriod);
    } else {
      setInternalPeriod(newPeriod);
    }
  };

  const chartData = useMemo(() => {
    // Filter to only earning transactions
    const earningTransactions = transactions.filter(
      t => (t.type === 'earning' || t.type === 'boost_earning' || t.type === 'referral' || t.type === 'team_earning' || t.type === 'affiliate_earning')
        && t.status === 'completed'
    );

    if (!earningTransactions.length) return [];

    const now = new Date();

    if (period === "1W") {
      // Last 7 days, grouped by day
      const startDate = subDays(now, 6);
      const days = eachDayOfInterval({ start: startDate, end: now });

      const dailyEarnings: Record<string, number> = {};
      days.forEach(day => {
        dailyEarnings[format(day, "yyyy-MM-dd")] = 0;
      });

      earningTransactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        const dayKey = format(transactionDate, "yyyy-MM-dd");
        if (dailyEarnings.hasOwnProperty(dayKey)) {
          dailyEarnings[dayKey] += Math.abs(transaction.amount) || 0;
        }
      });

      let cumulative = 0;
      return days.map(day => {
        const dayKey = format(day, "yyyy-MM-dd");
        cumulative += dailyEarnings[dayKey] || 0;
        return {
          week: format(day, "EEE"),
          earnings: Math.round(cumulative * 100) / 100,
          weeklyEarnings: Math.round((dailyEarnings[dayKey] || 0) * 100) / 100,
        };
      });
    }

    if (period === "1M") {
      // Last month, grouped by week
      const startDate = startOfWeek(subMonths(now, 1));
      const weeks = eachWeekOfInterval({ start: startDate, end: now });

      const weeklyEarnings: Record<string, number> = {};
      weeks.forEach(week => {
        weeklyEarnings[format(week, "yyyy-MM-dd")] = 0;
      });

      earningTransactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        const weekStart = startOfWeek(transactionDate);
        const weekKey = format(weekStart, "yyyy-MM-dd");
        if (weeklyEarnings.hasOwnProperty(weekKey)) {
          weeklyEarnings[weekKey] += Math.abs(transaction.amount) || 0;
        }
      });

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
    }

    if (period === "3M") {
      // Last 3 months, grouped by week
      const startDate = startOfWeek(subMonths(now, 3));
      const weeks = eachWeekOfInterval({ start: startDate, end: now });

      const weeklyEarnings: Record<string, number> = {};
      weeks.forEach(week => {
        weeklyEarnings[format(week, "yyyy-MM-dd")] = 0;
      });

      earningTransactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        const weekStart = startOfWeek(transactionDate);
        const weekKey = format(weekStart, "yyyy-MM-dd");
        if (weeklyEarnings.hasOwnProperty(weekKey)) {
          weeklyEarnings[weekKey] += Math.abs(transaction.amount) || 0;
        }
      });

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
    }

    // ALL - All time, grouped by month
    if (!earningTransactions.length) return [];

    // Find earliest transaction date
    const sortedTransactions = [...earningTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const earliestDate = startOfMonth(new Date(sortedTransactions[0].date));
    const months = eachMonthOfInterval({ start: earliestDate, end: now });

    const monthlyEarnings: Record<string, number> = {};
    months.forEach(month => {
      monthlyEarnings[format(month, "yyyy-MM")] = 0;
    });

    earningTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const monthKey = format(transactionDate, "yyyy-MM");
      if (monthlyEarnings.hasOwnProperty(monthKey)) {
        monthlyEarnings[monthKey] += Math.abs(transaction.amount) || 0;
      }
    });

    let cumulative = 0;
    return months.map(month => {
      const monthKey = format(month, "yyyy-MM");
      cumulative += monthlyEarnings[monthKey] || 0;
      return {
        week: format(month, "MMM ''yy"),
        earnings: Math.round(cumulative * 100) / 100,
        weeklyEarnings: Math.round((monthlyEarnings[monthKey] || 0) * 100) / 100,
      };
    });
  }, [transactions, period]);

  const PeriodSelector = () => (
    <Select value={period} onValueChange={(value) => handlePeriodChange(value as EarningsChartPeriod)}>
      <SelectTrigger className="w-[130px] h-8 text-xs bg-muted/50 border-border/50">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1W">Last 7 days</SelectItem>
        <SelectItem value="1M">Last month</SelectItem>
        <SelectItem value="3M">Last 3 months</SelectItem>
        <SelectItem value="ALL">All time</SelectItem>
      </SelectContent>
    </Select>
  );

  if (!chartData.length || chartData.every(d => d.earnings === 0)) {
    return (
      <div className={className}>
        {showPeriodSelector && (
          <div className="flex justify-end mb-2">
            <PeriodSelector />
          </div>
        )}
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm font-['Inter'] tracking-[-0.3px]">
          No earnings data for this period
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showPeriodSelector && (
        <div className="flex justify-end mb-2">
          <PeriodSelector />
        </div>
      )}
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
            tick={false}
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
