import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye,
  Users,
  MousePointerClick,
  TrendingUp,
  Globe,
  Smartphone,
  Chrome,
  AlertCircle,
  Loader2,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AnalyticsData {
  configured: boolean;
  error?: string;
  message?: string;
  period?: string;
  dateRange?: { start: string; end: string };
  summary?: {
    pageviews: number;
    uniqueVisitors: number;
    sessions: number;
    bounceRate: number;
    pagesPerSession: string;
  };
  dailyData?: Array<{
    date: string;
    pageviews: number;
    uniqueVisitors: number;
  }>;
  topPages?: Array<{
    pathname: string;
    views: number;
  }>;
  devices?: Array<{
    device: string;
    count: number;
  }>;
  browsers?: Array<{
    browser: string;
    count: number;
  }>;
  countries?: Array<{
    country: string;
    count: number;
  }>;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

function MiniBarChart({ data, maxValue }: { data: number[]; maxValue: number }) {
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((value, index) => (
        <div
          key={index}
          className="flex-1 bg-primary/70 rounded-t-sm transition-all duration-300"
          style={{
            height: `${maxValue > 0 ? (value / maxValue) * 100 : 0}%`,
            minHeight: value > 0 ? "2px" : "0",
          }}
        />
      ))}
    </div>
  );
}

export function PostHogAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const response = await supabase.functions.invoke("posthog-analytics", {
        body: null,
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      // Handle the response properly - check for query params
      const url = new URL(
        `${window.location.origin}/functions/posthog-analytics`
      );
      url.searchParams.set("period", period);

      const directResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/posthog-analytics?period=${period}`,
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (directResponse.ok) {
        const result = await directResponse.json();
        setData(result);
      } else {
        setData({
          configured: false,
          error: "Failed to fetch analytics",
        });
      }
    } catch (error) {
      console.error("Error fetching PostHog analytics:", error);
      setData({
        configured: false,
        error: "Failed to connect to analytics",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  if (loading) {
    return (
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold font-inter tracking-[-0.5px] text-foreground">
              Site Analytics
            </h3>
          </div>
        </div>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data?.configured) {
    return (
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold font-inter tracking-[-0.5px] text-foreground">
                Site Analytics
              </h3>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Requires setup
              </span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  PostHog analytics require{" "}
                  <span className="font-medium text-foreground">
                    POSTHOG_API_KEY
                  </span>{" "}
                  to be configured in Supabase secrets.
                </p>
                <p className="text-[10px] text-muted-foreground/70 font-inter tracking-[-0.5px] mt-1">
                  Generate a Personal API Key from PostHog Settings → Personal API Keys.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (data.error && data.configured) {
    return (
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold font-inter tracking-[-0.5px] text-foreground">
              Site Analytics
            </h3>
          </div>
        </div>
        <div className="p-4">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-red-600 dark:text-red-400 font-inter tracking-[-0.5px]">
                  {data.error}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { summary, dailyData, topPages, devices, browsers, countries } = data;
  const chartData = dailyData?.map((d) => d.pageviews) || [];
  const maxChartValue = Math.max(...chartData, 1);

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold font-inter tracking-[-0.5px] text-foreground">
              Site Analytics
            </h3>
            <span className="text-[10px] text-muted-foreground font-inter">
              via PostHog
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5", refreshing && "animate-spin")}
              />
            </Button>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-7 w-[90px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium font-inter tracking-[-0.5px]">
                Pageviews
              </span>
            </div>
            <p className="text-xl font-bold font-['Geist'] tracking-[-0.5px]">
              {formatNumber(summary?.pageviews || 0)}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
              <Users className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium font-inter tracking-[-0.5px]">
                Visitors
              </span>
            </div>
            <p className="text-xl font-bold font-['Geist'] tracking-[-0.5px]">
              {formatNumber(summary?.uniqueVisitors || 0)}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
              <MousePointerClick className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium font-inter tracking-[-0.5px]">
                Sessions
              </span>
            </div>
            <p className="text-xl font-bold font-['Geist'] tracking-[-0.5px]">
              {formatNumber(summary?.sessions || 0)}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium font-inter tracking-[-0.5px]">
                Pages/Session
              </span>
            </div>
            <p className="text-xl font-bold font-['Geist'] tracking-[-0.5px]">
              {summary?.pagesPerSession || "0"}
            </p>
          </div>
        </div>

        {/* Sparkline Chart */}
        {chartData.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">
                Daily pageviews
              </span>
              <span className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">
                {data.dateRange?.start} → {data.dateRange?.end}
              </span>
            </div>
            <MiniBarChart data={chartData} maxValue={maxChartValue} />
          </div>
        )}

        {/* Breakdown Grids */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Top Pages */}
          {topPages && topPages.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-1.5 mb-2">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground font-inter tracking-[-0.5px]">
                  Top Pages
                </span>
              </div>
              <div className="space-y-1.5">
                {topPages.slice(0, 5).map((page, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="text-foreground truncate max-w-[140px] font-inter tracking-[-0.3px]">
                      {page.pathname || "/"}
                    </span>
                    <span className="text-muted-foreground font-['Geist']">
                      {formatNumber(page.views)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Devices */}
          {devices && devices.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-1.5 mb-2">
                <Smartphone className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground font-inter tracking-[-0.5px]">
                  Devices
                </span>
              </div>
              <div className="space-y-1.5">
                {devices.slice(0, 5).map((device, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="text-foreground capitalize font-inter tracking-[-0.3px]">
                      {device.device || "Unknown"}
                    </span>
                    <span className="text-muted-foreground font-['Geist']">
                      {formatNumber(device.count)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Browsers */}
          {browsers && browsers.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-1.5 mb-2">
                <Chrome className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground font-inter tracking-[-0.5px]">
                  Browsers
                </span>
              </div>
              <div className="space-y-1.5">
                {browsers.slice(0, 5).map((browser, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="text-foreground font-inter tracking-[-0.3px]">
                      {browser.browser || "Unknown"}
                    </span>
                    <span className="text-muted-foreground font-['Geist']">
                      {formatNumber(browser.count)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Countries */}
        {countries && countries.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex items-center gap-1.5 mb-2">
              <Globe className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground font-inter tracking-[-0.5px]">
                Top Countries
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {countries.slice(0, 8).map((country, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50"
                >
                  <span className="text-[11px] font-medium text-foreground font-inter tracking-[-0.3px]">
                    {country.country || "??"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-['Geist']">
                    {formatNumber(country.count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
