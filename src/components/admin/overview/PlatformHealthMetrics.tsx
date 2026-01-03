import { Server, Database, Wifi, Activity, AlertCircle } from "lucide-react";

interface MetricPlaceholder {
  label: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}

const PLACEHOLDER_METRICS: MetricPlaceholder[] = [
  {
    label: "Edge Functions",
    value: "--",
    icon: <Server className="w-4 h-4" />,
    description: "Invocations / errors",
  },
  {
    label: "Database Storage",
    value: "--",
    icon: <Database className="w-4 h-4" />,
    description: "Used / limit",
  },
  {
    label: "Bandwidth",
    value: "--",
    icon: <Wifi className="w-4 h-4" />,
    description: "Network traffic",
  },
  {
    label: "Connections",
    value: "--",
    icon: <Activity className="w-4 h-4" />,
    description: "Active / pooled",
  },
];

export function PlatformHealthMetrics() {
  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold font-inter tracking-[-0.5px] text-foreground">
              Platform Health
            </h3>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
              Infrastructure metrics
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
              Requires setup
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {PLACEHOLDER_METRICS.map((metric, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-muted/30 border border-border/50"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                {metric.icon}
                <span className="text-xs font-medium font-inter tracking-[-0.5px]">
                  {metric.label}
                </span>
              </div>
              <p className="text-xl font-bold font-['Geist'] tracking-[-0.5px] text-muted-foreground/50">
                {metric.value}
              </p>
              <p className="text-[10px] text-muted-foreground/60 font-inter tracking-[-0.5px] mt-1">
                {metric.description}
              </p>
            </div>
          ))}
        </div>

        {/* Info Banner */}
        <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border/30">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Platform health metrics require{" "}
                <span className="font-medium text-foreground">
                  Supabase Management API
                </span>{" "}
                configuration.
              </p>
              <p className="text-[10px] text-muted-foreground/70 font-inter tracking-[-0.5px] mt-1">
                Contact your administrator to enable real-time infrastructure monitoring.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
