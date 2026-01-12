import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type BonusType = 'milestone' | 'cpm';

export interface ViewBonusTier {
  bonus_type: BonusType;
  view_threshold: number; // For milestone: target views, For CPM: max views
  min_views?: number; // Only for CPM: minimum views before bonus kicks in
  bonus_amount: number; // For milestone: flat bonus, For CPM: calculated max
  cpm_rate?: number; // Only for CPM type
}

interface ViewBonusesConfigProps {
  tiers: ViewBonusTier[];
  onTiersChange: (tiers: ViewBonusTier[]) => void;
  disabled?: boolean;
}

export function ViewBonusesConfig({
  tiers,
  onTiersChange,
  disabled = false,
}: ViewBonusesConfigProps) {
  const [bonusType, setBonusType] = useState<BonusType>('milestone');
  const [newThreshold, setNewThreshold] = useState("");
  const [newMinViews, setNewMinViews] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCpmRate, setNewCpmRate] = useState("");

  const addTier = () => {
    if (bonusType === 'milestone') {
      const threshold = parseInt(newThreshold, 10);
      const amount = parseFloat(newAmount);

      if (isNaN(threshold) || threshold <= 0) return;
      if (isNaN(amount) || amount <= 0) return;

      // Check if threshold already exists for milestone type
      if (tiers.some(t => t.bonus_type === 'milestone' && t.view_threshold === threshold)) return;

      const newTier: ViewBonusTier = {
        bonus_type: 'milestone' as const,
        view_threshold: threshold,
        bonus_amount: amount
      };

      const newTiers = [...tiers, newTier].sort((a, b) => a.view_threshold - b.view_threshold);

      onTiersChange(newTiers);
      setNewThreshold("");
      setNewAmount("");
    } else {
      // CPM type - only CPM rate is required, min/max are optional
      const cpmRate = parseFloat(newCpmRate);
      if (isNaN(cpmRate) || cpmRate <= 0) return;

      const maxViews = newThreshold ? parseInt(newThreshold, 10) : undefined;
      const minViews = newMinViews ? parseInt(newMinViews, 10) : undefined;

      // Validate min < max if both provided
      if (maxViews && minViews && minViews >= maxViews) return;

      // Calculate estimated bonus (for display purposes)
      const estimatedBonus = maxViews
        ? (cpmRate * (maxViews - (minViews || 0))) / 1000
        : 0;

      const newTier: ViewBonusTier = {
        bonus_type: 'cpm' as const,
        view_threshold: maxViews || 0,
        min_views: minViews,
        bonus_amount: estimatedBonus,
        cpm_rate: cpmRate
      };

      const newTiers = [...tiers, newTier].sort((a, b) => a.view_threshold - b.view_threshold);

      onTiersChange(newTiers);
      setNewThreshold("");
      setNewMinViews("");
      setNewCpmRate("");
    }
  };

  const removeTier = (index: number) => {
    onTiersChange(tiers.filter((_, i) => i !== index));
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views.toString();
  };

  return (
    <div className="space-y-3">
      {/* Existing Tiers as Badges */}
      {tiers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50"
            >
              {tier.bonus_type === 'cpm' ? (
                <span className="text-sm font-inter tracking-[-0.3px]">
                  <span className="font-medium text-green-600 dark:text-green-400">${tier.cpm_rate} CPM</span>
                  {(tier.min_views || tier.view_threshold > 0) && (
                    <>
                      <span className="text-muted-foreground mx-1">·</span>
                      <span className="text-muted-foreground">
                        {tier.min_views ? `${formatViews(tier.min_views)}` : '0'}
                        {tier.view_threshold > 0 ? `-${formatViews(tier.view_threshold)}` : '+'}
                      </span>
                    </>
                  )}
                </span>
              ) : (
                <span className="text-sm font-inter tracking-[-0.3px]">
                  <span className="text-foreground font-medium">{formatViews(tier.view_threshold)}</span>
                  <span className="text-muted-foreground"> views earn </span>
                  <span className="font-medium text-primary">${tier.bonus_amount.toFixed(0)}</span>
                </span>
              )}
              <button
                type="button"
                className="text-muted-foreground/60 hover:text-destructive transition-colors"
                onClick={() => removeTier(index)}
                disabled={disabled}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Tier */}
      <div className="flex items-center gap-2">
        <Select value={bonusType} onValueChange={(v: BonusType) => setBonusType(v)} disabled={disabled}>
          <SelectTrigger className="w-[110px] h-10 bg-muted/30 border-0 text-xs font-inter tracking-[-0.3px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="milestone" className="text-xs">Milestone</SelectItem>
            <SelectItem value="cpm" className="text-xs">CPM</SelectItem>
          </SelectContent>
        </Select>

        {bonusType === 'milestone' ? (
          <>
            <div className="flex-1">
              <Input
                type="number"
                min="1"
                placeholder="100000"
                value={newThreshold}
                onChange={(e) => setNewThreshold(e.target.value)}
                className="h-10 !bg-transparent border border-border/50 text-sm font-geist tracking-[-0.3px]"
                disabled={disabled}
              />
            </div>
            <div className="relative w-24">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-geist">
                $
              </span>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="50"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="h-10 !bg-transparent border border-border/50 pl-7 text-sm font-geist tracking-[-0.3px]"
                disabled={disabled}
              />
            </div>
          </>
        ) : (
          <>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-geist">
                $
              </span>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="2.50"
                value={newCpmRate}
                onChange={(e) => setNewCpmRate(e.target.value)}
                className="h-10 !bg-transparent border border-border/50 pl-7 text-sm font-geist tracking-[-0.3px]"
                disabled={disabled}
              />
            </div>
            <div className="flex-1">
              <Input
                type="number"
                min="0"
                step="1000"
                placeholder="Min"
                value={newMinViews}
                onChange={(e) => setNewMinViews(e.target.value)}
                className="h-10 !bg-transparent border border-border/50 text-sm font-geist tracking-[-0.3px]"
                disabled={disabled}
              />
            </div>
            <div className="flex-1">
              <Input
                type="number"
                min="1000"
                step="1000"
                placeholder="Max"
                value={newThreshold}
                onChange={(e) => setNewThreshold(e.target.value)}
                className="h-10 !bg-transparent border border-border/50 text-sm font-geist tracking-[-0.3px]"
                disabled={disabled}
              />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={addTier}
          disabled={disabled || (bonusType === 'milestone' ? (!newThreshold || !newAmount) : !newCpmRate)}
          className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
