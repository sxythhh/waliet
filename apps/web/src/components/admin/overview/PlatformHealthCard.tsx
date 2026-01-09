import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard } from "@/components/admin/design-system/AdminCard";
import {
  Database,
  HardDrive,
  Activity,
  Server,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Zap,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface DatabaseStats {
  active_connections: number;
  idle_connections: number;
  total_connections: number;
  cache_hit_ratio: number;
  deadlocks: number;
  transactions_committed: number;
  transactions_rolled_back: number;
}

interface DbSize {
  size_bytes: number;
  size_formatted: string;
}

interface TableSize {
  table_name: string;
  total_size: string;
  data_size: string;
  index_size: string;
  row_estimate: number;
}

interface PlatformCounts {
  users: number;
  campaigns: number;
  submissions: number;
  transactions: number;
}

export function PlatformHealthCard() {
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [dbSize, setDbSize] = useState<DbSize | null>(null);
  const [tableSizes, setTableSizes] = useState<TableSize[]>([]);
  const [counts, setCounts] = useState<PlatformCounts | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Fetch database stats
      const { data: statsData } = await supabase.rpc("get_database_stats");
      if (statsData && statsData.length > 0) {
        setDbStats(statsData[0]);
      }

      // Fetch database size
      const { data: sizeData } = await supabase.rpc("get_db_size");
      if (sizeData && sizeData.length > 0) {
        setDbSize(sizeData[0]);
      }

      // Fetch table sizes
      const { data: tableData } = await supabase.rpc("get_table_sizes");
      if (tableData) {
        setTableSizes(tableData.slice(0, 10)); // Top 10 tables
      }

      // Fetch counts from main tables
      const [
        { count: userCount },
        { count: campaignCount },
        { count: submissionCount },
        { count: transactionCount }
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("campaigns").select("*", { count: "exact", head: true }),
        supabase.from("campaign_submissions").select("*", { count: "exact", head: true }),
        supabase.from("wallet_transactions").select("*", { count: "exact", head: true })
      ]);

      setCounts({
        users: userCount || 0,
        campaigns: campaignCount || 0,
        submissions: submissionCount || 0,
        transactions: transactionCount || 0
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching platform metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Refresh every 60 seconds
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  const getHealthStatus = () => {
    if (!dbStats) return "unknown";
    if (dbStats.cache_hit_ratio < 90 || dbStats.deadlocks > 0) return "warning";
    if (dbStats.cache_hit_ratio >= 95 && dbStats.total_connections < 80) return "healthy";
    return "good";
  };

  const healthStatus = getHealthStatus();

  return (
    <AdminCard
      title="Platform Health"
      subtitle="Database and system metrics"
      headerAction={
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchMetrics}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Health Status Banner */}
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg",
          healthStatus === "healthy" && "bg-green-500/10 border border-green-500/20",
          healthStatus === "good" && "bg-blue-500/10 border border-blue-500/20",
          healthStatus === "warning" && "bg-yellow-500/10 border border-yellow-500/20",
          healthStatus === "unknown" && "bg-muted"
        )}>
          {healthStatus === "healthy" && <CheckCircle className="h-5 w-5 text-green-500" />}
          {healthStatus === "good" && <Activity className="h-5 w-5 text-blue-500" />}
          {healthStatus === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
          {healthStatus === "unknown" && <Server className="h-5 w-5 text-muted-foreground" />}
          <div>
            <p className="font-medium">
              {healthStatus === "healthy" && "All systems operational"}
              {healthStatus === "good" && "Systems running normally"}
              {healthStatus === "warning" && "Performance attention needed"}
              {healthStatus === "unknown" && "Loading metrics..."}
            </p>
            <p className="text-xs text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Database Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Database Size */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Database className="h-4 w-4" />
              <span className="text-xs font-medium">Database Size</span>
            </div>
            <p className="text-2xl font-bold">{dbSize?.size_formatted || "—"}</p>
          </div>

          {/* Connections */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-medium">Connections</span>
            </div>
            <p className="text-2xl font-bold">
              {dbStats?.total_connections ?? "—"}
              <span className="text-sm font-normal text-muted-foreground"> / 100</span>
            </p>
            {dbStats && (
              <Progress
                value={(dbStats.total_connections / 100) * 100}
                className="h-1"
              />
            )}
          </div>

          {/* Cache Hit Ratio */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium">Cache Hit Ratio</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              dbStats && dbStats.cache_hit_ratio >= 95 && "text-green-500",
              dbStats && dbStats.cache_hit_ratio < 95 && dbStats.cache_hit_ratio >= 90 && "text-yellow-500",
              dbStats && dbStats.cache_hit_ratio < 90 && "text-red-500"
            )}>
              {dbStats?.cache_hit_ratio?.toFixed(1) ?? "—"}%
            </p>
          </div>

          {/* Active Queries */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">Active Queries</span>
            </div>
            <p className="text-2xl font-bold">{dbStats?.active_connections ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {dbStats?.idle_connections ?? 0} idle
            </p>
          </div>
        </div>

        {/* Record Counts */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Record Counts</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground">Users</p>
              <p className="text-lg font-semibold">{counts?.users?.toLocaleString() ?? "—"}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground">Campaigns</p>
              <p className="text-lg font-semibold">{counts?.campaigns?.toLocaleString() ?? "—"}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground">Submissions</p>
              <p className="text-lg font-semibold">{counts?.submissions?.toLocaleString() ?? "—"}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-lg font-semibold">{counts?.transactions?.toLocaleString() ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Top Tables by Size */}
        {tableSizes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Largest Tables</h4>
            <div className="space-y-2">
              {tableSizes.slice(0, 5).map((table) => (
                <div
                  key={table.table_name}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono">{table.table_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{table.total_size}</span>
                    <span className="text-xs">~{table.row_estimate?.toLocaleString()} rows</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction Stats */}
        {dbStats && (
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
            <div className="flex items-center gap-4">
              <span>
                <span className="text-green-500 font-medium">
                  {dbStats.transactions_committed?.toLocaleString()}
                </span> committed
              </span>
              <span>
                <span className="text-red-500 font-medium">
                  {dbStats.transactions_rolled_back?.toLocaleString()}
                </span> rolled back
              </span>
              {dbStats.deadlocks > 0 && (
                <span className="text-yellow-500">
                  {dbStats.deadlocks} deadlocks
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
