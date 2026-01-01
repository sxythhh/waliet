import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  Database,
  Shield,
  Cloud,
  Zap,
  Globe,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronRight,
  Bell,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, subMinutes, subHours, subDays } from "date-fns";

// Demo data for system health
const SERVICES = [
  {
    id: "api",
    name: "API Gateway",
    status: "operational",
    latency: 45,
    uptime: 99.99,
    icon: Server,
    lastCheck: subMinutes(new Date(), 1)
  },
  {
    id: "database",
    name: "PostgreSQL Database",
    status: "operational",
    latency: 12,
    uptime: 99.98,
    icon: Database,
    lastCheck: subMinutes(new Date(), 1)
  },
  {
    id: "auth",
    name: "Authentication",
    status: "operational",
    latency: 89,
    uptime: 99.95,
    icon: Shield,
    lastCheck: subMinutes(new Date(), 2)
  },
  {
    id: "storage",
    name: "File Storage",
    status: "operational",
    latency: 156,
    uptime: 99.97,
    icon: Cloud,
    lastCheck: subMinutes(new Date(), 1)
  },
  {
    id: "functions",
    name: "Edge Functions",
    status: "degraded",
    latency: 234,
    uptime: 99.85,
    icon: Zap,
    lastCheck: subMinutes(new Date(), 3)
  },
  {
    id: "cdn",
    name: "CDN / Assets",
    status: "operational",
    latency: 23,
    uptime: 99.99,
    icon: Globe,
    lastCheck: subMinutes(new Date(), 1)
  },
];

const RECENT_INCIDENTS = [
  {
    id: "1",
    title: "Edge Functions Latency Increase",
    status: "investigating",
    severity: "warning",
    startedAt: subHours(new Date(), 2),
    description: "Investigating increased latency in edge function responses"
  },
  {
    id: "2",
    title: "Database Connection Pool Exhausted",
    status: "resolved",
    severity: "critical",
    startedAt: subDays(new Date(), 1),
    resolvedAt: subHours(new Date(), 20),
    description: "Connection pool limit was reached during peak traffic"
  },
  {
    id: "3",
    title: "Scheduled Maintenance Completed",
    status: "resolved",
    severity: "info",
    startedAt: subDays(new Date(), 3),
    resolvedAt: subDays(new Date(), 3),
    description: "Database optimization and index rebuilding"
  },
];

const METRICS = [
  {
    label: "Uptime (30d)",
    value: "99.97%",
    trend: "+0.02%",
    trendUp: true,
    icon: Clock
  },
  {
    label: "Avg Response",
    value: "89ms",
    trend: "-12ms",
    trendUp: true,
    icon: Zap
  },
  {
    label: "Error Rate",
    value: "0.03%",
    trend: "+0.01%",
    trendUp: false,
    icon: AlertTriangle
  },
  {
    label: "Active Users",
    value: "1,247",
    trend: "+156",
    trendUp: true,
    icon: Users
  },
];

// Generate demo uptime data for the last 90 days
const generateUptimeData = () => {
  const data = [];
  for (let i = 89; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const uptime = 99.5 + Math.random() * 0.5; // 99.5% - 100%
    data.push({ date, uptime, hasIncident: uptime < 99.9 });
  }
  return data;
};

const uptimeData = generateUptimeData();

function getStatusColor(status: string) {
  switch (status) {
    case "operational": return "text-emerald-500";
    case "degraded": return "text-amber-500";
    case "outage": return "text-rose-500";
    default: return "text-slate-400";
  }
}

function getStatusBg(status: string) {
  switch (status) {
    case "operational": return "bg-emerald-500";
    case "degraded": return "bg-amber-500";
    case "outage": return "bg-rose-500";
    default: return "bg-slate-400";
  }
}

function getSeverityStyles(severity: string) {
  switch (severity) {
    case "critical": return { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20" };
    case "warning": return { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" };
    case "info": return { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" };
    default: return { bg: "bg-slate-500/10", text: "text-slate-500", border: "border-slate-500/20" };
  }
}

export default function SystemHealth() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const operationalCount = SERVICES.filter(s => s.status === "operational").length;
  const overallStatus = operationalCount === SERVICES.length ? "operational" :
                        operationalCount >= SERVICES.length - 1 ? "degraded" : "outage";

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Health</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor platform status and performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="w-4 h-4" />
              Alerts
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="w-4 h-4" />
              Configure
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overall Status Banner */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-6",
          overallStatus === "operational" && "bg-emerald-500/5 border-emerald-500/20",
          overallStatus === "degraded" && "bg-amber-500/5 border-amber-500/20",
          overallStatus === "outage" && "bg-rose-500/5 border-rose-500/20"
        )}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center",
                overallStatus === "operational" && "bg-emerald-500/10",
                overallStatus === "degraded" && "bg-amber-500/10",
                overallStatus === "outage" && "bg-rose-500/10"
              )}>
                {overallStatus === "operational" && <CheckCircle2 className="w-7 h-7 text-emerald-500" />}
                {overallStatus === "degraded" && <AlertTriangle className="w-7 h-7 text-amber-500" />}
                {overallStatus === "outage" && <XCircle className="w-7 h-7 text-rose-500" />}
              </div>
              <div>
                <h2 className="text-xl font-semibold capitalize">
                  {overallStatus === "operational" ? "All Systems Operational" :
                   overallStatus === "degraded" ? "Partial System Degradation" :
                   "System Outage Detected"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {operationalCount} of {SERVICES.length} services running normally
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Last updated</p>
              <p className="text-sm font-medium">{format(new Date(), "MMM d, h:mm a")}</p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {METRICS.map((metric) => (
            <div
              key={metric.label}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <metric.icon className="w-5 h-5 text-primary" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                  metric.trendUp ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}>
                  {metric.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {metric.trend}
                </div>
              </div>
              <p className="text-2xl font-bold">{metric.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Services Status */}
          <div className="lg:col-span-2 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Service Status</h3>
              <Badge variant="secondary" className="text-xs">
                {operationalCount}/{SERVICES.length} Healthy
              </Badge>
            </div>
            <div className="space-y-3">
              {SERVICES.map((service) => (
                <div
                  key={service.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer",
                    "hover:bg-muted/50",
                    service.status === "degraded" && "bg-amber-500/5 border-amber-500/20",
                    service.status === "outage" && "bg-rose-500/5 border-rose-500/20",
                    service.status === "operational" && "border-border/50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      service.status === "operational" && "bg-slate-500/10",
                      service.status === "degraded" && "bg-amber-500/10",
                      service.status === "outage" && "bg-rose-500/10"
                    )}>
                      <service.icon className={cn(
                        "w-5 h-5",
                        getStatusColor(service.status)
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Checked {format(service.lastCheck, "h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">{service.latency}ms</p>
                      <p className="text-xs text-muted-foreground">Latency</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{service.uptime}%</p>
                      <p className="text-xs text-muted-foreground">Uptime</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        getStatusBg(service.status),
                        service.status === "operational" && "animate-pulse"
                      )} />
                      <span className={cn(
                        "text-xs font-medium capitalize",
                        getStatusColor(service.status)
                      )}>
                        {service.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Recent Incidents</h3>
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-3">
              {RECENT_INCIDENTS.map((incident) => {
                const styles = getSeverityStyles(incident.severity);
                return (
                  <div
                    key={incident.id}
                    className={cn(
                      "p-4 rounded-xl border cursor-pointer transition-colors hover:bg-muted/50",
                      styles.border,
                      styles.bg
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] capitalize", styles.text, styles.border)}
                      >
                        {incident.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {format(incident.startedAt, "MMM d, h:mm a")}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm mb-1">{incident.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {incident.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 90-Day Uptime Grid */}
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold">90-Day Uptime</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Daily uptime percentage for the past 90 days
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-muted-foreground">&gt;99.9%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-amber-500" />
                <span className="text-muted-foreground">99-99.9%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-rose-500" />
                <span className="text-muted-foreground">&lt;99%</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            {uptimeData.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "w-3 h-8 rounded-sm transition-all hover:scale-110 cursor-pointer",
                  day.uptime >= 99.9 && "bg-emerald-500",
                  day.uptime >= 99 && day.uptime < 99.9 && "bg-amber-500",
                  day.uptime < 99 && "bg-rose-500"
                )}
                title={`${format(day.date, "MMM d")}: ${day.uptime.toFixed(2)}%`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-3 text-xs text-muted-foreground">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Response Time Chart Placeholder */}
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold">Response Time Trend</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Average API response time over the last 24 hours
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs h-7">1H</Button>
              <Button variant="outline" size="sm" className="text-xs h-7 bg-primary/10">24H</Button>
              <Button variant="outline" size="sm" className="text-xs h-7">7D</Button>
              <Button variant="outline" size="sm" className="text-xs h-7">30D</Button>
            </div>
          </div>
          <div className="h-48 flex items-end gap-1">
            {Array.from({ length: 48 }, (_, i) => {
              const height = 30 + Math.random() * 60;
              const isHigh = height > 70;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-t transition-all hover:opacity-80 cursor-pointer",
                    isHigh ? "bg-amber-500/80" : "bg-primary/60"
                  )}
                  style={{ height: `${height}%` }}
                  title={`${Math.round(40 + height)}ms`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-3 text-xs text-muted-foreground">
            <span>24h ago</span>
            <span>Now</span>
          </div>
        </div>
      </div>
    </div>
  );
}
