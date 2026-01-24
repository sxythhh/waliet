import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from "recharts";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, TrendingUp } from "lucide-react";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";

type TimePeriod = '1W' | '1M' | '3M' | 'ALL';

const TIME_OPTIONS = [
  { value: '1W', label: '1 Week' },
  { value: '1M', label: '1 Month' },
  { value: '3M', label: '3 Months' },
  { value: 'ALL', label: 'All Time' },
];

interface IncomeData {
  date: string;
  inbound: number;
  transferFee: number;
  total: number;
}

export function PlatformIncomeChart() {
  const [data, setData] = useState<IncomeData[]>([]);
  const [totals, setTotals] = useState({ inbound: 0, transferFee: 0, total: 0 });
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1W');
  const [loading, setLoading] = useState(true);

  const getDateRange = () => {
    const now = new Date();
    switch (timePeriod) {
      case '1W':
        return { start: subDays(now, 7), end: now };
      case '1M':
        return { start: subMonths(now, 1), end: now };
      case '3M':
        return { start: subMonths(now, 3), end: now };
      case 'ALL':
        return { start: new Date('2024-01-01'), end: now };
      default:
        return { start: subDays(now, 7), end: now };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      const { data: incomeData, error } = await supabase
        .from('platform_income')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const groupedData: { [key: string]: { inbound: number; transferFee: number } } = {};
      let totalInbound = 0;
      let totalTransferFee = 0;

      (incomeData || []).forEach((item: any) => {
        const dateKey = format(new Date(item.created_at), 'MMM dd');
        if (!groupedData[dateKey]) {
          groupedData[dateKey] = { inbound: 0, transferFee: 0 };
        }
        
        const amount = Number(item.amount) || 0;
        if (item.type === 'inbound') {
          groupedData[dateKey].inbound += amount;
          totalInbound += amount;
        } else if (item.type === 'transfer_fee') {
          groupedData[dateKey].transferFee += amount;
          totalTransferFee += amount;
        }
      });

      const chartData = Object.entries(groupedData).map(([date, values]) => ({
        date,
        inbound: values.inbound,
        transferFee: values.transferFee,
        total: values.inbound + values.transferFee,
      }));

      setData(chartData);
      setTotals({
        inbound: totalInbound,
        transferFee: totalTransferFee,
        total: totalInbound + totalTransferFee,
      });
    } catch (error) {
      console.error('Error fetching platform income:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timePeriod]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="py-24">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <CardTitle className="text-base font-medium tracking-[-0.5px]">
              Platform Income
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                {TIME_OPTIONS.find(o => o.value === timePeriod)?.label}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {TIME_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setTimePeriod(option.value as TimePeriod)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground tracking-[-0.3px]">Inbound Deposits</p>
            <p className="text-lg font-semibold text-emerald-500 tracking-tight">
              {formatCurrency(totals.inbound)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground tracking-[-0.3px]">Transfer Fees (3%)</p>
            <p className="text-lg font-semibold text-blue-500 tracking-tight">
              {formatCurrency(totals.transferFee)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground tracking-[-0.3px]">Total Income</p>
            <p className="text-lg font-semibold text-foreground tracking-tight">
              {formatCurrency(totals.total)}
            </p>
          </div>
        </div>

        {/* Chart */}
        {data.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No income data yet</p>
          </div>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTransferFee" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'inbound' ? 'Inbound Deposits' : 'Transfer Fees'
                  ]}
                />
                <Legend 
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">
                      {value === 'inbound' ? 'Inbound Deposits' : 'Transfer Fees (3%)'}
                    </span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="inbound"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorInbound)"
                />
                <Area
                  type="monotone"
                  dataKey="transferFee"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTransferFee)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
