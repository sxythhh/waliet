import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Gift, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewBonusTier {
  view_threshold: number;
  bonus_amount: number;
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
  const [newThreshold, setNewThreshold] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const addTier = () => {
    const threshold = parseInt(newThreshold);
    const amount = parseFloat(newAmount);
    
    if (isNaN(threshold) || threshold <= 0) return;
    if (isNaN(amount) || amount <= 0) return;
    
    // Check if threshold already exists
    if (tiers.some(t => t.view_threshold === threshold)) return;
    
    const newTiers = [...tiers, { view_threshold: threshold, bonus_amount: amount }]
      .sort((a, b) => a.view_threshold - b.view_threshold);
    
    onTiersChange(newTiers);
    setNewThreshold("");
    setNewAmount("");
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
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium font-inter tracking-[-0.5px]">
                      {formatViews(tier.view_threshold)} views
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-sm font-semibold text-primary font-inter tracking-[-0.5px]">
                      +${tier.bonus_amount.toFixed(0)} bonus
                    </span>
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
          <div className="flex items-center gap-2">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  placeholder="Views"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                  className="h-9 bg-muted/30 border-0 text-sm font-inter tracking-[-0.5px]"
                  disabled={disabled}
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Bonus"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="h-9 bg-muted/30 border-0 pl-7 text-sm font-inter tracking-[-0.5px]"
                  disabled={disabled}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 px-3"
              onClick={addTier}
              disabled={disabled || !newThreshold || !newAmount}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
            Bonuses are cumulative — creators earn all tiers their videos cross.
          </p>
        </div>
      )}
    </div>
  );
}
