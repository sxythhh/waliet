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
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-yellow-500/10">
          <AlertTriangle className="h-6 w-6 text-yellow-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Low Balance Protection</h2>
          <p className="text-sm text-muted-foreground">
            Configure automatic actions when your brand wallet runs low
          </p>
        </div>
      </div>

      {/* Current Balance Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-muted-foreground">Current balance</p>
              </div>
            </div>
            <Badge variant={balanceStatus.color as any} className="gap-1">
              {balanceStatus.status === "healthy" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {balanceStatus.message}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Threshold Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alert Thresholds</CardTitle>
          <CardDescription>
            Set balance levels that trigger different actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notify Threshold */}
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-blue-500/10 mt-1">
              <Bell className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Notification Alert</Label>
                  <p className="text-xs text-muted-foreground">
                    Send email notification when balance drops below this amount
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={notifyThreshold}
                  onChange={(e) => setNotifyThreshold(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
          </div>

          {/* Pause Payouts Threshold */}
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-yellow-500/10 mt-1">
              <Pause className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Pause Payouts</Label>
                  <p className="text-xs text-muted-foreground">
                    Queue payouts instead of processing when balance is below this
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={pausePayoutsThreshold}
                  onChange={(e) => setPausePayoutsThreshold(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
          </div>

          {/* Pause Campaign Threshold */}
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-red-500/10 mt-1">
              <Ban className="h-4 w-4 text-red-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Pause Campaigns</Label>
                  <p className="text-xs text-muted-foreground">
                    Stop accepting new submissions when balance is critically low
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={pauseCampaignThreshold}
                  onChange={(e) => setPauseCampaignThreshold(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto Top-up Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Auto Top-up
          </CardTitle>
          <CardDescription>
            Automatically add funds when balance gets low
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Enable Auto Top-up</Label>
              <p className="text-xs text-muted-foreground">
                Automatically charge your card to maintain minimum balance
              </p>
            </div>
            <Switch
              checked={autoTopupEnabled}
              onCheckedChange={setAutoTopupEnabled}
            />
          </div>

          {autoTopupEnabled && (
            <div className="space-y-2 pt-2 border-t">
              <Label>Top-up Amount</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={autoTopupAmount}
                  onChange={(e) => setAutoTopupAmount(e.target.value)}
                  className="w-32"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This amount will be charged when balance falls below the notification threshold
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {alert.alert_type === "notify" && <Bell className="h-4 w-4 text-blue-500" />}
                    {alert.alert_type === "pause_payouts" && <Pause className="h-4 w-4 text-yellow-500" />}
                    {alert.alert_type === "pause_campaign" && <Ban className="h-4 w-4 text-red-500" />}
                    <div>
                      <p className="font-medium text-sm capitalize">
                        {alert.alert_type.replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance: ${alert.balance_at_alert.toFixed(2)} (threshold: ${alert.threshold_value})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </p>
                    {alert.resolved_at ? (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500">
                        Resolved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
