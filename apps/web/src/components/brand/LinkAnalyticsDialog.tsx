import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Globe, Smartphone, Monitor, Tablet, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface LinkAnalytics {
  link: any;
  analytics: {
    totalClicks: number;
    uniqueClicks: number;
    totalConversions: number;
    conversionValue: number;
    conversionRate: string;
    clicksByCountry: Record<string, number>;
    clicksByDevice: Record<string, number>;
    clicksByBrowser: Record<string, number>;
    clicksByDay: Record<string, number>;
    recentClicks: any[];
    conversions: any[];
  };
}

interface LinkAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkId: string;
}

export function LinkAnalyticsDialog({ open, onOpenChange, linkId }: LinkAnalyticsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LinkAnalytics | null>(null);

  useEffect(() => {
    if (open && linkId) {
      fetchAnalytics();
    }
  }, [open, linkId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("get-link-analytics", {
        body: null,
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Manual fetch since we need query params
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-link-analytics?linkId=${linkId}`,
        {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch analytics");

      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const copyLinkUrl = () => {
    if (!data?.link) return;
    const url = data.link.dub_short_link || 
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-link-click?code=${data.link.short_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  // Format clicks by day for chart
  const chartData = data?.analytics?.clicksByDay
    ? Object.entries(data.analytics.clicksByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14) // Last 14 days
        .map(([date, clicks]) => ({
          date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          clicks,
        }))
    : [];

  const deviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Analytics</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-lg" />
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Link Info */}
            <div className="bg-muted/30 rounded-lg p-4 border border-border/40">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{data.link.title || data.link.short_code}</h4>
                  <p className="text-sm text-muted-foreground truncate max-w-[400px]">
                    {data.link.destination_url}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyLinkUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open(data.link.destination_url, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Badge variant={data.link.is_active ? "default" : "secondary"}>
                  {data.link.is_active ? "Active" : "Inactive"}
                </Badge>
                {data.link.dub_short_link && (
                  <Badge variant="outline">Dub.co</Badge>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 border border-border/40 text-center">
                <p className="text-xs text-muted-foreground">Total Clicks</p>
                <p className="text-xl font-bold">{data.analytics.totalClicks.toLocaleString()}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 border border-border/40 text-center">
                <p className="text-xs text-muted-foreground">Unique Clicks</p>
                <p className="text-xl font-bold">{data.analytics.uniqueClicks.toLocaleString()}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 border border-border/40 text-center">
                <p className="text-xs text-muted-foreground">Conversions</p>
                <p className="text-xl font-bold">{data.analytics.totalConversions}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 border border-border/40 text-center">
                <p className="text-xs text-muted-foreground">Conv. Rate</p>
                <p className="text-xl font-bold">{data.analytics.conversionRate}%</p>
              </div>
            </div>

            {/* Clicks Chart */}
            {chartData.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4 border border-border/40">
                <h4 className="text-sm font-medium mb-3">Clicks Over Time</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        tickLine={false}
                        axisLine={false}
                        width={30}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px"
                        }}
                      />
                      <Bar 
                        dataKey="clicks" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* By Country */}
              {Object.keys(data.analytics.clicksByCountry || {}).length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4 border border-border/40">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    By Country
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(data.analytics.clicksByCountry)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([country, clicks]) => (
                        <div key={country} className="flex justify-between text-sm">
                          <span>{country}</span>
                          <span className="text-muted-foreground">{clicks}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* By Device */}
              {Object.keys(data.analytics.clicksByDevice || {}).length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4 border border-border/40">
                  <h4 className="text-sm font-medium mb-3">By Device</h4>
                  <div className="space-y-2">
                    {Object.entries(data.analytics.clicksByDevice)
                      .sort(([, a], [, b]) => b - a)
                      .map(([device, clicks]) => (
                        <div key={device} className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-2 capitalize">
                            {deviceIcon(device)}
                            {device}
                          </span>
                          <span className="text-muted-foreground">{clicks}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No analytics data available
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
