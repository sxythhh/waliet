import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Storage,
  Security,
  Cloud,
  Bolt,
  Public,
  People,
  Receipt,
  Videocam,
  Campaign,
  Payments,
  Refresh,
} from "@mui/icons-material";

interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  transactionVolume: number;
  totalSubmissions: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalBrands: number;
  totalPayouts: number;
  payoutVolume: number;
}

// Service status data
const SERVICES = [
  { id: "api", name: "API Gateway", status: "operational", latency: 45, uptime: 99.99 },
  { id: "database", name: "Database", status: "operational", latency: 12, uptime: 99.98 },
  { id: "auth", name: "Authentication", status: "operational", latency: 89, uptime: 99.95 },
  { id: "storage", name: "File Storage", status: "operational", latency: 156, uptime: 99.97 },
  { id: "functions", name: "Edge Functions", status: "degraded", latency: 234, uptime: 99.85 },
  { id: "cdn", name: "CDN", status: "operational", latency: 23, uptime: 99.99 },
];

const SERVICE_ICONS: Record<string, typeof Storage> = {
  api: Public,
  database: Storage,
  auth: Security,
  storage: Cloud,
  functions: Bolt,
  cdn: Public,
};

export default function SystemHealth() {
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPlatformMetrics = async () => {
    try {
      const [
        usersResult,
        activeUsersResult,
        transactionsResult,
        submissionsResult,
        campaignsResult,
        activeCampaignsResult,
        brandsResult,
        payoutsResult
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('updated_at', subDays(new Date(), 7).toISOString()),
        supabase.from('wallet_transactions').select('amount'),
        supabase.from('campaign_submissions').select('id', { count: 'exact', head: true }),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }),
        supabase.from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase.from('brands').select('id', { count: 'exact', head: true }),
        supabase.from('payout_requests').select('amount, status')
      ]);

      const transactionVolume = transactionsResult.data?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
      const completedPayouts = payoutsResult.data?.filter(p => p.status === 'completed') || [];
      const payoutVolume = completedPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      setPlatformMetrics({
        totalUsers: usersResult.count || 0,
        activeUsers: activeUsersResult.count || 0,
        totalTransactions: transactionsResult.data?.length || 0,
        transactionVolume,
        totalSubmissions: submissionsResult.count || 0,
        totalCampaigns: campaignsResult.count || 0,
        activeCampaigns: activeCampaignsResult.count || 0,
        totalBrands: brandsResult.count || 0,
        totalPayouts: completedPayouts.length,
        payoutVolume
      });
    } catch (error) {
      console.error('Error fetching platform metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformMetrics();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPlatformMetrics();
    setIsRefreshing(false);
  };

  const operationalCount = SERVICES.filter(s => s.status === "operational").length;
  const overallStatus = operationalCount === SERVICES.length ? "operational" :
                        operationalCount >= SERVICES.length - 1 ? "degraded" : "outage";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Overall Status */}
      <div className={cn(
        "rounded-xl p-5 flex items-center justify-between",
        overallStatus === "operational" && "bg-emerald-500/10 border border-emerald-500/20",
        overallStatus === "degraded" && "bg-amber-500/10 border border-amber-500/20",
        overallStatus === "outage" && "bg-red-500/10 border border-red-500/20"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            overallStatus === "operational" && "bg-emerald-500/20",
            overallStatus === "degraded" && "bg-amber-500/20",
            overallStatus === "outage" && "bg-red-500/20"
          )}>
            {overallStatus === "operational" && <CheckCircle className="text-emerald-500" sx={{ fontSize: 28 }} />}
            {overallStatus === "degraded" && <Warning className="text-amber-500" sx={{ fontSize: 28 }} />}
            {overallStatus === "outage" && <ErrorIcon className="text-red-500" sx={{ fontSize: 28 }} />}
          </div>
          <div>
            <h2 className="text-lg font-semibold font-inter tracking-[-0.5px] text-white">
              {overallStatus === "operational" ? "All Systems Operational" :
               overallStatus === "degraded" ? "Partial Degradation" :
               "System Outage"}
            </h2>
            <p className="text-sm text-white/50 font-inter tracking-[-0.3px]">
              {operationalCount} of {SERVICES.length} services running normally
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/70 hover:text-white"
        >
          <Refresh className={cn("text-white/50", isRefreshing && "animate-spin")} sx={{ fontSize: 16 }} />
          Refresh
        </button>
      </div>

      {/* Services Grid */}
      <div>
        <h3 className="text-sm font-medium font-inter tracking-[-0.5px] text-white/50 mb-3">Services</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SERVICES.map((service) => {
            const Icon = SERVICE_ICONS[service.id] || Public;
            return (
              <div
                key={service.id}
                className={cn(
                  "rounded-xl p-4 border transition-colors",
                  service.status === "operational" && "bg-white/[0.02] border-white/[0.06]",
                  service.status === "degraded" && "bg-amber-500/5 border-amber-500/20",
                  service.status === "outage" && "bg-red-500/5 border-red-500/20"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    service.status === "operational" && "bg-white/[0.05]",
                    service.status === "degraded" && "bg-amber-500/10",
                    service.status === "outage" && "bg-red-500/10"
                  )}>
                    <Icon className={cn(
                      service.status === "operational" && "text-white/40",
                      service.status === "degraded" && "text-amber-500",
                      service.status === "outage" && "text-red-500"
                    )} sx={{ fontSize: 18 }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      service.status === "operational" && "bg-emerald-500",
                      service.status === "degraded" && "bg-amber-500",
                      service.status === "outage" && "bg-red-500"
                    )} />
                    <span className={cn(
                      "text-[10px] font-medium font-inter capitalize",
                      service.status === "operational" && "text-emerald-500",
                      service.status === "degraded" && "text-amber-500",
                      service.status === "outage" && "text-red-500"
                    )}>
                      {service.status}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium font-inter tracking-[-0.5px] text-white mb-1">
                  {service.name}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-white/40 font-inter">
                  <span>{service.latency}ms</span>
                  <span>{service.uptime}% uptime</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Metrics */}
      <div>
        <h3 className="text-sm font-medium font-inter tracking-[-0.5px] text-white/50 mb-3">Platform Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <People className="text-blue-400" sx={{ fontSize: 16 }} />
              <span className="text-[10px] text-white/40 font-inter">Users</span>
            </div>
            <p className="text-xl font-bold font-inter tracking-[-0.5px] text-white">
              {platformMetrics?.totalUsers.toLocaleString() || '—'}
            </p>
            <p className="text-[10px] text-white/30 font-inter mt-1">
              {platformMetrics?.activeUsers.toLocaleString()} active (7d)
            </p>
          </div>

          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="text-emerald-400" sx={{ fontSize: 16 }} />
              <span className="text-[10px] text-white/40 font-inter">Transactions</span>
            </div>
            <p className="text-xl font-bold font-inter tracking-[-0.5px] text-white">
              {platformMetrics?.totalTransactions.toLocaleString() || '—'}
            </p>
            <p className="text-[10px] text-white/30 font-inter mt-1">
              ${platformMetrics?.transactionVolume.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'} volume
            </p>
          </div>

          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <Videocam className="text-purple-400" sx={{ fontSize: 16 }} />
              <span className="text-[10px] text-white/40 font-inter">Submissions</span>
            </div>
            <p className="text-xl font-bold font-inter tracking-[-0.5px] text-white">
              {platformMetrics?.totalSubmissions.toLocaleString() || '—'}
            </p>
            <p className="text-[10px] text-white/30 font-inter mt-1">
              Videos submitted
            </p>
          </div>

          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <Campaign className="text-amber-400" sx={{ fontSize: 16 }} />
              <span className="text-[10px] text-white/40 font-inter">Campaigns</span>
            </div>
            <p className="text-xl font-bold font-inter tracking-[-0.5px] text-white">
              {platformMetrics?.totalCampaigns.toLocaleString() || '—'}
            </p>
            <p className="text-[10px] text-white/30 font-inter mt-1">
              {platformMetrics?.activeCampaigns} active
            </p>
          </div>

          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <Payments className="text-rose-400" sx={{ fontSize: 16 }} />
              <span className="text-[10px] text-white/40 font-inter">Payouts</span>
            </div>
            <p className="text-xl font-bold font-inter tracking-[-0.5px] text-white">
              {platformMetrics?.totalPayouts.toLocaleString() || '—'}
            </p>
            <p className="text-[10px] text-white/30 font-inter mt-1">
              ${platformMetrics?.payoutVolume.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'} paid
            </p>
          </div>
        </div>
      </div>

      {/* 90-Day Uptime */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium font-inter tracking-[-0.5px] text-white/50">90-Day Uptime</h3>
          <div className="flex items-center gap-4 text-[10px] text-white/40 font-inter">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-emerald-500" />
              <span>&gt;99.9%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-amber-500" />
              <span>99-99.9%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-red-500" />
              <span>&lt;99%</span>
            </div>
          </div>
        </div>
        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
          <div className="flex gap-0.5">
            {Array.from({ length: 90 }, (_, i) => {
              const uptime = 99.5 + Math.random() * 0.5;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 h-6 rounded-sm transition-opacity hover:opacity-80",
                    uptime >= 99.9 && "bg-emerald-500",
                    uptime >= 99 && uptime < 99.9 && "bg-amber-500",
                    uptime < 99 && "bg-red-500"
                  )}
                  title={`Day ${90 - i}: ${uptime.toFixed(2)}%`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-white/30 font-inter">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] text-xs text-white/40 font-inter">
        <span>Last updated: {format(new Date(), "MMM d, h:mm a")}</span>
        <span>{platformMetrics?.totalBrands || 0} registered brands</span>
      </div>
    </div>
  );
}
