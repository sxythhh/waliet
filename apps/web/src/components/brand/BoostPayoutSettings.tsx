import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, DollarSign, RotateCcw, Info } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, differenceInHours } from "date-fns";

interface BoostPayoutSettingsProps {
  boostId: string;
}

interface BrandDefaults {
  holdingDays: number;
  minimumAmount: number;
}

export function BoostPayoutSettings({ boostId }: BoostPayoutSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Boost-level settings (null means inherit from brand)
  const [holdingDays, setHoldingDays] = useState<number | null>(null);
  const [minimumAmount, setMinimumAmount] = useState<number | null>(null);
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState<string | null>(null);

  // Brand defaults for display
  const [brandDefaults, setBrandDefaults] = useState<BrandDefaults>({ holdingDays: 0, minimumAmount: 0 });

  // Local state for sliders (uses boost value if set, otherwise brand default)
  const [localHoldingDays, setLocalHoldingDays] = useState(0);
  const [localMinimumAmount, setLocalMinimumAmount] = useState(0);

  const hasOverride = holdingDays !== null || minimumAmount !== null;

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch boost settings and brand owner
      const { data: boost, error: boostError } = await supabase
        .from("bounty_campaigns")
        .select("payout_holding_days, payout_minimum_amount, payout_settings_updated_at, brand_id")
        .eq("id", boostId)
        .single();

      if (boostError) throw boostError;

      // Fetch brand defaults from owner's profile
      if (boost?.brand_id) {
        const { data: brand } = await supabase
          .from("brands")
          .select("owner_id")
          .eq("id", boost.brand_id)
          .single();

        if (brand?.owner_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("payout_holding_days, payout_minimum_amount")
            .eq("id", brand.owner_id)
            .single();

          if (profile) {
            setBrandDefaults({
              holdingDays: profile.payout_holding_days || 0,
              minimumAmount: profile.payout_minimum_amount || 0,
            });
          }
        }
      }

      // Set boost-level overrides (null if not set)
      setHoldingDays(boost?.payout_holding_days ?? null);
      setMinimumAmount(boost?.payout_minimum_amount ?? null);
      setSettingsUpdatedAt(boost?.payout_settings_updated_at ?? null);

      // Set local slider values
      setLocalHoldingDays(boost?.payout_holding_days ?? brandDefaults.holdingDays);
      setLocalMinimumAmount(boost?.payout_minimum_amount ?? brandDefaults.minimumAmount);
    } catch (error) {
      console.error("Error fetching payout settings:", error);
      toast.error("Failed to load payout settings");
    } finally {
      setIsLoading(false);
    }
  }, [boostId, brandDefaults.holdingDays, brandDefaults.minimumAmount]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update local values when settings change
  useEffect(() => {
    setLocalHoldingDays(holdingDays ?? brandDefaults.holdingDays);
    setLocalMinimumAmount(minimumAmount ?? brandDefaults.minimumAmount);
  }, [holdingDays, minimumAmount, brandDefaults]);

  // Rate limit check
  const isRateLimited = settingsUpdatedAt
    ? differenceInHours(new Date(), new Date(settingsUpdatedAt)) < 24
    : false;

  const hoursUntilUnlock = settingsUpdatedAt
    ? Math.max(0, 24 - differenceInHours(new Date(), new Date(settingsUpdatedAt)))
    : 0;

  const handleSave = async () => {
    if (isRateLimited) {
      toast.error(`Settings can only be changed once per day. Try again in ${hoursUntilUnlock} hours.`);
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("update-payout-settings", {
        body: {
          entity_type: "boost",
          entity_id: boostId,
          holding_days: localHoldingDays,
          minimum_amount: localMinimumAmount,
        },
      });

      if (response.error) throw response.error;

      setHoldingDays(localHoldingDays);
      setMinimumAmount(localMinimumAmount);
      setSettingsUpdatedAt(new Date().toISOString());
      toast.success("Payout settings saved");
    } catch (error) {
      console.error("Error saving payout settings:", error);
      toast.error("Failed to save payout settings");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (isRateLimited) {
      toast.error(`Settings can only be changed once per day. Try again in ${hoursUntilUnlock} hours.`);
      return;
    }

    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("update-payout-settings", {
        body: {
          entity_type: "boost",
          entity_id: boostId,
          reset_to_default: true,
        },
      });

      if (response.error) throw response.error;

      setHoldingDays(null);
      setMinimumAmount(null);
      setLocalHoldingDays(brandDefaults.holdingDays);
      setLocalMinimumAmount(brandDefaults.minimumAmount);
      setSettingsUpdatedAt(new Date().toISOString());
      toast.success("Reset to brand defaults");
    } catch (error) {
      console.error("Error resetting payout settings:", error);
      toast.error("Failed to reset settings");
    } finally {
      setResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold tracking-[-0.5px]">Payout Settings</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure when earnings are released to creators for this boost.
        </p>
      </div>

      {/* Brand Defaults Indicator */}
      {!hasOverride && (
        <div className="flex items-center gap-2 p-3 bg-muted/30 dark:bg-muted/20 rounded-lg border border-border/50">
          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
            Using brand defaults: <span className="font-medium">{brandDefaults.holdingDays} days</span> holding period,{" "}
            <span className="font-medium">${brandDefaults.minimumAmount}</span> minimum payout
          </p>
        </div>
      )}

      {hasOverride && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
            Custom Settings
          </Badge>
          <span className="text-xs text-muted-foreground">
            This boost overrides brand defaults
          </span>
        </div>
      )}

      {/* Settings Card */}
      <div className="rounded-lg border border-border/50 dark:border-white/[0.06] divide-y divide-border/50 dark:divide-white/[0.06] overflow-hidden">
        {/* Holding Period */}
        <div className="px-4 py-4 bg-card/50">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium tracking-[-0.3px]">Holding Period</p>
            {holdingDays !== null && (
              <Badge variant="outline" className="text-[10px] h-5 ml-1">Override</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            How long to hold funds after video approval before creators can withdraw.
          </p>
          <div className="flex items-center gap-4">
            <Slider
              value={[localHoldingDays]}
              onValueChange={([v]) => setLocalHoldingDays(v)}
              min={0}
              max={30}
              step={1}
              className="flex-1"
              disabled={isRateLimited}
            />
            <span className="text-sm font-medium tabular-nums w-16 text-right">
              {localHoldingDays} {localHoldingDays === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        {/* Minimum Payout */}
        <div className="px-4 py-4 bg-card/50">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium tracking-[-0.3px]">Minimum Payout</p>
            {minimumAmount !== null && (
              <Badge variant="outline" className="text-[10px] h-5 ml-1">Override</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Minimum amount required before funds are released. Both conditions must be met.
          </p>
          <div className="flex items-center gap-4">
            <Slider
              value={[localMinimumAmount]}
              onValueChange={([v]) => setLocalMinimumAmount(v)}
              min={0}
              max={50}
              step={5}
              className="flex-1"
              disabled={isRateLimited}
            />
            <span className="text-sm font-medium tabular-nums w-16 text-right">
              ${localMinimumAmount}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 bg-muted/20 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {settingsUpdatedAt
              ? `Last updated ${formatDistanceToNow(new Date(settingsUpdatedAt), { addSuffix: true })}`
              : "Not yet configured"}
          </p>
          <div className="flex items-center gap-2">
            {hasOverride && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResetToDefault}
                        disabled={resetting || isRateLimited}
                        className="font-inter tracking-[-0.5px]"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        {resetting ? "Resetting..." : "Reset to Default"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isRateLimited && (
                    <TooltipContent>
                      <p>Settings can only be changed once per day. Try again in {hoursUntilUnlock}h.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving || isRateLimited}
                      className="font-inter tracking-[-0.5px]"
                    >
                      {saving ? "Saving..." : "Save Settings"}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isRateLimited && (
                  <TooltipContent>
                    <p>Settings can only be changed once per day. Try again in {hoursUntilUnlock}h.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-muted/30 dark:bg-muted/20 rounded-lg border border-border/50">
        <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
          <strong className="font-medium text-foreground">How it works:</strong>{" "}
          When a video is approved, earnings are held for the specified period. After the holding period ends
          AND the minimum amount is reached, funds are released to the creator's wallet. If the boost ends
          before the minimum is met, remaining funds are auto-released.
        </p>
      </div>
    </div>
  );
}
