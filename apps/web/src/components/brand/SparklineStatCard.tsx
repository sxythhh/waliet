import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface SparklineStatCardProps {
  label: string;
  value: string | number;
  sparklineData: number[];
  isSelected: boolean;
  onClick: () => void;
  formatValue?: (value: number) => string;
  color?: string;
}

export function SparklineStatCard({
  label,
  value,
  sparklineData,
  isSelected,
  onClick,
  formatValue,
  color = "#3b82f6",
}: SparklineStatCardProps) {
  // Convert sparkline data array to chart format
  const chartData = sparklineData.map((val, idx) => ({ value: val, idx }));

  const displayValue = typeof value === "number" && formatValue
    ? formatValue(value)
    : value;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col p-4 rounded-xl border bg-card text-left transition-opacity",
        "hover:opacity-80",
        isSelected ? "border-primary" : "border-border"
      )}
    >
      {/* Label */}
      <span className="text-xs font-medium text-muted-foreground tracking-[-0.3px]">
        {label}
      </span>

      {/* Value and Sparkline Row */}
      <div className="flex items-end justify-between mt-1">
        <span className="text-xl font-semibold text-foreground tracking-[-0.5px]">
          {displayValue}
        </span>

        {/* Mini Sparkline */}
        {sparklineData.length > 1 && (
          <div className="w-20 h-8 -mb-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`sparkline-gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="linear"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#sparkline-gradient-${label})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </button>
  );
}
