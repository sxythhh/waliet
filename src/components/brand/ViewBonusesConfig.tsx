import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Gift, TrendingUp, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type BonusType = 'milestone' | 'cpm';

export interface ViewBonusTier {
  bonus_type: BonusType;
  view_threshold: number;
  bonus_amount: number; // For milestone: flat bonus, For CPM: calculated max
  cpm_rate?: number; // Only for CPM type
}

interface ViewBonusesConfigProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  tiers: ViewBonusTier[];
  onTiersChange: (tiers: ViewBonusTier[]) => void;
  disabled?: boolean;
}

export function ViewBonusesConfig({
  enabled,
  onEnabledChange,
  tiers,
  onTiersChange,
  disabled = false,
}: ViewBonusesConfigProps) {
  const [bonusType, setBonusType] = useState<BonusType>('milestone');
  const [newThreshold, setNewThreshold] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCpmRate, setNewCpmRate] = useState("");

  const addTier = () => {
    if (bonusType === 'milestone') {
      const threshold = parseInt(newThreshold);
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
      // CPM type
      const maxViews = parseInt(newThreshold);
      const cpmRate = parseFloat(newCpmRate);
      
      if (isNaN(maxViews) || maxViews <= 0) return;
      if (isNaN(cpmRate) || cpmRate <= 0) return;
      
      // Calculate max bonus amount based on CPM and max views
      const maxBonus = (cpmRate * maxViews) / 1000;
      
      const newTier: ViewBonusTier = { 
        bonus_type: 'cpm' as const,
        view_threshold: maxViews,
        bonus_amount: maxBonus,
        cpm_rate: cpmRate
      };
      
      const newTiers = [...tiers, newTier].sort((a, b) => a.view_threshold - b.view_threshold);
      
      onTiersChange(newTiers);
      setNewThreshold("");
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
    <div className="space-y-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Gift className="h-4 w-4 text-primary" />
          </div>
          <div>
            <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
              View Bonuses
            </Label>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
              Reward creators when videos hit view milestones
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
          disabled={disabled}
        />
      </div>

      {/* Tiers Configuration */}
      {enabled && (
        <div className="space-y-3 pl-11">
          {/* Existing Tiers */}
          {tiers.length > 0 && (
            <div className="space-y-2">
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {tier.bonus_type === 'cpm' ? (
                      <DollarSign className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    )}
                    {tier.bonus_type === 'cpm' ? (
                      <span className="text-sm font-inter tracking-[-0.5px]">
                        <span className="font-semibold text-green-600">${tier.cpm_rate} CPM</span>
                        <span className="text-muted-foreground"> until {formatViews(tier.view_threshold)} views</span>
                        <span className="text-xs text-muted-foreground ml-1">(max ${tier.bonus_amount.toFixed(0)})</span>
                      </span>
                    ) : (
                      <span className="text-sm font-inter tracking-[-0.5px]">
                        <span className="font-medium">{formatViews(tier.view_threshold)} views</span>
                        <span className="text-muted-foreground"> → </span>
                        <span className="font-semibold text-primary">+${tier.bonus_amount.toFixed(0)} bonus</span>
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTier(index)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Tier */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Select value={bonusType} onValueChange={(v: BonusType) => setBonusType(v)} disabled={disabled}>
                <SelectTrigger className="w-28 h-9 bg-background border-0 text-xs font-inter">
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
                      placeholder="Views (e.g. 100000)"
                      value={newThreshold}
                      onChange={(e) => setNewThreshold(e.target.value)}
                      className="h-9 bg-background border-0 text-sm font-inter tracking-[-0.5px]"
                      disabled={disabled}
                    />
                  </div>
                  <div className="relative w-24">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Bonus"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="h-9 bg-background border-0 pl-7 text-sm font-inter tracking-[-0.5px]"
                      disabled={disabled}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="relative w-24">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="CPM"
                      value={newCpmRate}
                      onChange={(e) => setNewCpmRate(e.target.value)}
                      className="h-9 bg-background border-0 pl-7 text-sm font-inter tracking-[-0.5px]"
                      disabled={disabled}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">until</span>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="1000"
                      step="1000"
                      placeholder="Max views"
                      value={newThreshold}
                      onChange={(e) => setNewThreshold(e.target.value)}
                      className="h-9 bg-background border-0 text-sm font-inter tracking-[-0.5px]"
                      disabled={disabled}
                    />
                  </div>
                </>
              )}
              
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 px-3"
                onClick={addTier}
                disabled={disabled || !newThreshold || (bonusType === 'milestone' ? !newAmount : !newCpmRate)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Helper text based on type */}
            <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">
              {bonusType === 'milestone' 
                ? 'e.g., $100 bonus when video hits 100K views'
                : 'e.g., $5 CPM until 100K views = $500 max bonus'
              }
            </p>
          </div>

          <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] pt-1">
            Bonuses are cumulative — creators earn all tiers their videos qualify for.
          </p>
        </div>
      )}
    </div>
  );
}
