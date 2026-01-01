import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, Pause, Ban, CreditCard, CheckCircle2, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface LowBalanceSettingsTabProps {
  brandId: string;
}

interface BrandSettings {
  slash_balance_cents: number | null;
  low_balance_notify_threshold: number | null;
  low_balance_pause_payouts_threshold: number | null;
  low_balance_pause_campaign_threshold: number | null;
  low_balance_auto_topup_enabled: boolean | null;
  low_balance_auto_topup_amount: number | null;
}

interface Alert {
  id: string;
  alert_type: string;
  balance_at_alert: number;
  threshold_value: number;
  created_at: string;
  resolved_at: string | null;
}

export function LowBalanceSettingsTab({ brandId }: LowBalanceSettingsTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<BrandSettings | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Form state
  const [notifyThreshold, setNotifyThreshold] = useState("1000");
  const [pausePayoutsThreshold, setPausePayoutsThreshold] = useState("500");
  const [pauseCampaignThreshold, setPauseCampaignThreshold] = useState("100");
  const [autoTopupEnabled, setAutoTopupEnabled] = useState(false);
  const [autoTopupAmount, setAutoTopupAmount] = useState("1000");

  useEffect(() => {
    fetchData();
  }, [brandId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [settingsResult, alertsResult] = await Promise.all([
        supabase
          .from("brands")
          .select(`slash_balance_cents`)
          .eq("id", brandId)
          .single(),
        (supabase
          .from("low_balance_alerts" as any)
          .select("*")
          .eq("brand_id", brandId)
          .order("created_at", { ascending: false })
          .limit(10) as any)
      ]);

      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
        // Ignore column not found errors - table might not be migrated yet
        console.log("Settings query returned:", settingsResult);
      }

      if (settingsResult.data) {
        // Cast to any since columns may not exist yet
        const data = settingsResult.data as any;
        setSettings(data as BrandSettings);
        setNotifyThreshold(String(data.low_balance_notify_threshold || 1000));
        setPausePayoutsThreshold(String(data.low_balance_pause_payouts_threshold || 500));
        setPauseCampaignThreshold(String(data.low_balance_pause_campaign_threshold || 100));
        setAutoTopupEnabled(data.low_balance_auto_topup_enabled || false);
        setAutoTopupAmount(String(data.low_balance_auto_topup_amount || 1000));
      }

      if (!alertsResult.error && alertsResult.data) {
        setAlerts(alertsResult.data as Alert[]);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await (supabase
        .from("brands")
        .update({
          low_balance_notify_threshold: parseFloat(notifyThreshold) || 1000,
          low_balance_pause_payouts_threshold: parseFloat(pausePayoutsThreshold) || 500,
          low_balance_pause_campaign_threshold: parseFloat(pauseCampaignThreshold) || 100,
          low_balance_auto_topup_enabled: autoTopupEnabled,
          low_balance_auto_topup_amount: parseFloat(autoTopupAmount) || 1000
        } as any)
        .eq("id", brandId) as any);

      if (error) throw error;

      toast.success("Low balance settings saved");
      fetchData();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const currentBalance = (settings?.slash_balance_cents || 0) / 100;

  const getBalanceStatus = () => {
    const notify = parseFloat(notifyThreshold) || 1000;
    const pause = parseFloat(pausePayoutsThreshold) || 500;
    const critical = parseFloat(pauseCampaignThreshold) || 100;

    if (currentBalance <= critical) {
      return { status: "critical", color: "destructive", message: "Balance is critically low" };
    } else if (currentBalance <= pause) {
      return { status: "warning", color: "warning", message: "Payouts may be paused" };
    } else if (currentBalance <= notify) {
      return { status: "low", color: "secondary", message: "Balance is getting low" };
    }
    return { status: "healthy", color: "default", message: "Balance is healthy" };
  };

  const balanceStatus = getBalanceStatus();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">Low Balance Protection</h2>
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
            Configure automatic actions when your wallet runs low
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Alert Thresholds */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Thresholds</h3>
        
        <div className="grid gap-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Bell className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm font-medium font-inter tracking-[-0.3px]">Email Notification</p>
                <p className="text-xs text-muted-foreground">Alert when balance drops below</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                value={notifyThreshold}
                onChange={(e) => setNotifyThreshold(e.target.value)}
                className="w-24 h-9 text-right"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Pause className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium font-inter tracking-[-0.3px]">Pause Payouts</p>
                <p className="text-xs text-muted-foreground">Queue payouts when below</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                value={pausePayoutsThreshold}
                onChange={(e) => setPausePayoutsThreshold(e.target.value)}
                className="w-24 h-9 text-right"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Ban className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium font-inter tracking-[-0.3px]">Pause Campaigns</p>
                <p className="text-xs text-muted-foreground">Stop new submissions when below</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                value={pauseCampaignThreshold}
                onChange={(e) => setPauseCampaignThreshold(e.target.value)}
                className="w-24 h-9 text-right"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Auto Top-up */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Auto Top-up</h3>
        
        <div className="p-4 rounded-xl bg-card/50 border border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium font-inter tracking-[-0.3px]">Enable Auto Top-up</p>
                <p className="text-xs text-muted-foreground">Automatically charge your card</p>
              </div>
            </div>
            <Switch
              checked={autoTopupEnabled}
              onCheckedChange={setAutoTopupEnabled}
            />
          </div>

          {autoTopupEnabled && (
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground">Top-up amount</p>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  value={autoTopupAmount}
                  onChange={(e) => setAutoTopupAmount(e.target.value)}
                  className="w-24 h-9 text-right"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recent Alerts</h3>
          
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium capitalize font-inter tracking-[-0.3px]">
                      {alert.alert_type.replace("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${alert.balance_at_alert.toFixed(2)} → threshold ${alert.threshold_value}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </span>
                  {alert.resolved_at ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
