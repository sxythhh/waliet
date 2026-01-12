import { useMemo, useState } from "react";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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

  // Check if there are any earning transactions at all (regardless of period)
  const hasAnyEarnings = transactions.some(
    t => (t.type === 'earning' || t.type === 'boost_earning' || t.type === 'referral' || t.type === 'team_earning' || t.type === 'affiliate_earning')
      && t.status === 'completed'
  );

  if (!chartData.length || chartData.every(d => d.earnings === 0)) {
    return (
      <div className={className}>
        {showPeriodSelector && (
          <div className="flex justify-end mb-2">
            <PeriodSelector />
          </div>
        )}
        <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground text-sm font-inter tracking-[-0.3px] gap-2">
          <span>No earnings data for this period</span>
          {hasAnyEarnings && period !== "ALL" && (
            <button
              onClick={() => handlePeriodChange("ALL")}
              className="text-xs text-primary hover:underline"
            >
              View all time
            </button>
          )}
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
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(217.2 91.2% 59.8%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(217.2 91.2% 59.8%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="0"
              vertical={false}
              horizontal={false}
              stroke="hsl(var(--border))"
              strokeOpacity={0.4}
            />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.3 }}
              tick={{
                fontSize: 11,
                fill: 'hsl(var(--muted-foreground))',
                fontFamily: 'Inter',
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: 11,
                fill: 'hsl(var(--muted-foreground))',
                fontFamily: 'Inter',
              }}
              tickMargin={8}
              tickFormatter={(value) => `$${value}`}
              width={50}
            />
            <Tooltip
              animationDuration={100}
              animationEasing="ease-out"
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0]?.payload;
                return (
                  <div className="bg-background rounded-lg dark:shadow-lg min-w-[140px] border border-border overflow-hidden">
                    <div className="px-2.5 py-1.5 border-b border-border">
                      <p className="text-xs font-medium font-inter text-foreground tracking-[-0.5px]">
                        {data?.week}
                      </p>
                    </div>
                    <div className="px-2.5 py-2 space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-[2px] flex-shrink-0 bg-blue-500" />
                          <span className="text-xs font-inter text-muted-foreground tracking-[-0.5px]">
                            Total
                          </span>
                        </div>
                        <span className="text-xs font-semibold font-inter text-foreground tracking-[-0.5px]">
                          {formatCurrency(data?.earnings || 0)}
                        </span>
                      </div>
                      {data?.weeklyEarnings > 0 && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-inter text-muted-foreground tracking-[-0.5px]">
                            This period
                          </span>
                          <span className="text-xs font-medium font-inter text-green-500 tracking-[-0.5px]">
                            +{formatCurrency(data?.weeklyEarnings || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
              wrapperStyle={{ transition: 'transform 150ms ease-out, opacity 150ms ease-out', zIndex: 50 }}
            />
            <Area
              type="monotone"
              dataKey="earnings"
              stroke="hsl(217.2 91.2% 59.8%)"
              strokeWidth={2}
              fill="url(#earningsGradient)"
              dot={false}
              activeDot={{
                r: 3.3,
                fill: 'hsl(217.2 91.2% 59.8%)',
                stroke: 'hsl(217.2 91.2% 59.8%)',
                strokeWidth: 0
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
