import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Crown,
  Star,
  Trophy,
  Award,
  Sparkles,
  Edit2,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CreatorTier,
  PromotionCriteria,
  DemotionCriteria,
  DEFAULT_TIER_TEMPLATES,
  TIER_COLORS,
} from "@/types/creatorTiers";

interface TierConfigurationTabProps {
  boostId: string;
  tiersEnabled: boolean;
  autoProgression: boolean;
  onTiersEnabledChange: (enabled: boolean) => void;
  onAutoProgressionChange: (enabled: boolean) => void;
}

interface TierFormData {
  name: string;
  level: number;
  monthly_retainer: number;
  videos_per_month: number;
  perks: string[];
  color: string;
  is_entry_tier: boolean;
  promotion_criteria: PromotionCriteria;
  demotion_criteria: DemotionCriteria;
}

const DEFAULT_FORM_DATA: TierFormData = {
  name: "",
  level: 1,
  monthly_retainer: 100,
  videos_per_month: 2,
  perks: [],
  color: "#6366f1",
  is_entry_tier: false,
  promotion_criteria: {
    min_months_active: 2,
    min_avg_views: 1000,
    min_completion_rate: 0.9,
    min_engagement_rate: 0.02,
  },
  demotion_criteria: {
    consecutive_missed_quotas: 2,
    min_completion_rate: 0.5,
  },
};

export function TierConfigurationTab({
  boostId,
  tiersEnabled,
  autoProgression,
  onTiersEnabledChange,
  onAutoProgressionChange,
}: TierConfigurationTabProps) {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<CreatorTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<CreatorTier | null>(null);
  const [formData, setFormData] = useState<TierFormData>(DEFAULT_FORM_DATA);
  const [newPerk, setNewPerk] = useState("");
  const [expandedCriteria, setExpandedCriteria] = useState(false);

  const fetchTiers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("boost_creator_tiers")
        .select("*")
        .eq("bounty_campaign_id", boostId)
        .order("level", { ascending: true });

      if (error) throw error;
      setTiers((data as CreatorTier[]) || []);
    } catch (error) {
      console.error("Error fetching tiers:", error);
      toast({
        title: "Error loading tiers",
        description: "Failed to load tier configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [boostId, toast]);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  const openCreateDialog = () => {
    setEditingTier(null);
    setFormData({
      ...DEFAULT_FORM_DATA,
      level: tiers.length > 0 ? Math.max(...tiers.map((t) => t.level)) + 1 : 1,
      is_entry_tier: tiers.length === 0, // First tier is entry by default
    });
    setDialogOpen(true);
  };

  const openEditDialog = (tier: CreatorTier) => {
    setEditingTier(tier);
    setFormData({
      name: tier.name,
      level: tier.level,
      monthly_retainer: tier.monthly_retainer,
      videos_per_month: tier.videos_per_month,
      perks: tier.perks || [],
      color: tier.color,
      is_entry_tier: tier.is_entry_tier,
      promotion_criteria: tier.promotion_criteria,
      demotion_criteria: tier.demotion_criteria,
    });
    setDialogOpen(true);
  };

  const saveTier = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const tierData = {
        bounty_campaign_id: boostId,
        name: formData.name.trim(),
        level: formData.level,
        monthly_retainer: formData.monthly_retainer,
        videos_per_month: formData.videos_per_month,
        perks: formData.perks,
        color: formData.color,
        is_entry_tier: formData.is_entry_tier,
        promotion_criteria: formData.promotion_criteria,
        demotion_criteria: formData.demotion_criteria,
      };

      if (editingTier) {
        const { error } = await supabase
          .from("boost_creator_tiers")
          .update(tierData)
          .eq("id", editingTier.id);
        if (error) throw error;
        toast({ title: "Tier updated successfully" });
      } else {
        const { error } = await supabase
          .from("boost_creator_tiers")
          .insert(tierData);
        if (error) throw error;
        toast({ title: "Tier created successfully" });
      }

      // If this tier is set as entry, remove entry from others
      if (formData.is_entry_tier) {
        await supabase
          .from("boost_creator_tiers")
          .update({ is_entry_tier: false })
          .eq("bounty_campaign_id", boostId)
          .neq("level", formData.level);
      }

      setDialogOpen(false);
      fetchTiers();
    } catch (error: unknown) {
      console.error("Error saving tier:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save tier";
      toast({
        title: "Error saving tier",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteTier = async (tier: CreatorTier) => {
    if (!confirm(`Delete "${tier.name}" tier? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from("boost_creator_tiers")
        .delete()
        .eq("id", tier.id);
      if (error) throw error;
      toast({ title: "Tier deleted" });
      fetchTiers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete tier";
      toast({
        title: "Error deleting tier",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const applyDefaultTiers = async () => {
    if (tiers.length > 0) {
      if (!confirm("This will replace existing tiers. Continue?")) return;
      // Delete existing tiers
      await supabase
        .from("boost_creator_tiers")
        .delete()
        .eq("bounty_campaign_id", boostId);
    }

    try {
      const tiersToInsert = DEFAULT_TIER_TEMPLATES.map((template) => ({
        ...template,
        bounty_campaign_id: boostId,
      }));

      const { error } = await supabase
        .from("boost_creator_tiers")
        .insert(tiersToInsert);
      if (error) throw error;

      toast({ title: "Default tiers applied successfully" });
      fetchTiers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to apply default tiers";
      toast({
        title: "Error applying default tiers",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const addPerk = () => {
    if (!newPerk.trim()) return;
    if (!formData.perks.includes(newPerk.trim())) {
      setFormData({
        ...formData,
        perks: [...formData.perks, newPerk.trim()],
      });
    }
    setNewPerk("");
  };

  const removePerk = (perk: string) => {
    setFormData({
      ...formData,
      perks: formData.perks.filter((p) => p !== perk),
    });
  };

  const getTierIcon = (level: number) => {
    switch (level) {
      case 1:
        return <Award className="h-4 w-4" />;
      case 2:
        return <Star className="h-4 w-4" />;
      case 3:
        return <Trophy className="h-4 w-4" />;
      case 4:
        return <Crown className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enable Tiers Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-inter tracking-[-0.5px]">
                Creator Tier System
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Create progression levels with different compensation and perks
              </CardDescription>
            </div>
            <Switch
              checked={tiersEnabled}
              onCheckedChange={onTiersEnabledChange}
            />
          </div>
        </CardHeader>

        {tiersEnabled && (
          <CardContent className="space-y-4">
            {/* Auto Progression Toggle */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium font-inter tracking-[-0.5px]">
                  Automatic Tier Progression
                </p>
                <p className="text-xs text-muted-foreground">
                  Automatically promote/demote creators based on performance
                </p>
              </div>
              <Switch
                checked={autoProgression}
                onCheckedChange={onAutoProgressionChange}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={openCreateDialog}
                className="font-inter tracking-[-0.5px]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={applyDefaultTiers}
                className="font-inter tracking-[-0.5px]"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Apply Defaults
              </Button>
            </div>

            {/* Tiers List */}
            {tiers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-inter tracking-[-0.5px]">
                  No tiers configured yet
                </p>
                <p className="text-xs mt-1">
                  Add tiers manually or apply default templates
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/20 transition-colors group"
                  >
                    {/* Tier Icon & Color */}
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-lg"
                      style={{ backgroundColor: `${tier.color}20` }}
                    >
                      <div style={{ color: tier.color }}>
                        {getTierIcon(tier.level)}
                      </div>
                    </div>

                    {/* Tier Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm font-inter tracking-[-0.5px]">
                          {tier.name}
                        </span>
                        {tier.is_entry_tier && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Entry
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{formatCurrency(tier.monthly_retainer)}/mo</span>
                        <span>•</span>
                        <span>{tier.videos_per_month} videos/mo</span>
                        {tier.perks && tier.perks.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{tier.perks.length} perks</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEditDialog(tier)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteTier(tier)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Create/Edit Tier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px]">
              {editingTier ? "Edit Tier" : "Create New Tier"}
            </DialogTitle>
            <DialogDescription>
              Configure the tier settings, compensation, and requirements
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Tier Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Gold"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Level</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({ ...formData, level: parseInt(e.target.value) || 1 })
                  }
                  className="h-9"
                />
              </div>
            </div>

            {/* Compensation */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Monthly Retainer ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.monthly_retainer}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthly_retainer: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Videos per Month</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.videos_per_month}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      videos_per_month: parseInt(e.target.value) || 1,
                    })
                  }
                  className="h-9"
                />
              </div>
            </div>

            {/* Per-video rate display */}
            <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
              Per-video rate:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(formData.monthly_retainer / formData.videos_per_month)}
              </span>
            </div>

            {/* Color Selection */}
            <div className="space-y-2">
              <Label className="text-xs">Tier Color</Label>
              <div className="flex flex-wrap gap-2">
                {TIER_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      formData.color === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Entry Tier Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Entry Tier</p>
                <p className="text-xs text-muted-foreground">
                  New creators start at this tier
                </p>
              </div>
              <Switch
                checked={formData.is_entry_tier}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_entry_tier: checked })
                }
              />
            </div>

            {/* Perks */}
            <div className="space-y-2">
              <Label className="text-xs">Perks</Label>
              {formData.perks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.perks.map((perk) => (
                    <Badge
                      key={perk}
                      variant="secondary"
                      className="text-xs pl-2 pr-1 py-0.5"
                    >
                      {perk}
                      <button
                        type="button"
                        onClick={() => removePerk(perk)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newPerk}
                  onChange={(e) => setNewPerk(e.target.value)}
                  placeholder="Add a perk..."
                  className="h-9 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPerk();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9"
                  onClick={addPerk}
                  disabled={!newPerk.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Promotion/Demotion Criteria (Collapsible) */}
            <Collapsible open={expandedCriteria} onOpenChange={setExpandedCriteria}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs h-8"
                >
                  Progression Criteria
                  {expandedCriteria ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                {/* Promotion Criteria */}
                <div className="space-y-2 p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                  <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    Promotion to Next Tier
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Min Months Active
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.promotion_criteria.min_months_active}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            promotion_criteria: {
                              ...formData.promotion_criteria,
                              min_months_active: parseInt(e.target.value) || 1,
                            },
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Min Avg Views
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.promotion_criteria.min_avg_views}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            promotion_criteria: {
                              ...formData.promotion_criteria,
                              min_avg_views: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Min Completion Rate (%)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.promotion_criteria.min_completion_rate * 100}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            promotion_criteria: {
                              ...formData.promotion_criteria,
                              min_completion_rate: (parseFloat(e.target.value) || 0) / 100,
                            },
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Min Engagement Rate (%)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={formData.promotion_criteria.min_engagement_rate * 100}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            promotion_criteria: {
                              ...formData.promotion_criteria,
                              min_engagement_rate: (parseFloat(e.target.value) || 0) / 100,
                            },
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Demotion Criteria */}
                <div className="space-y-2 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                  <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                    <ArrowDown className="h-3 w-3" />
                    Demotion Warning
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Consecutive Missed Quotas
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.demotion_criteria.consecutive_missed_quotas}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            demotion_criteria: {
                              ...formData.demotion_criteria,
                              consecutive_missed_quotas: parseInt(e.target.value) || 1,
                            },
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Min Completion Rate (%)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.demotion_criteria.min_completion_rate * 100}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            demotion_criteria: {
                              ...formData.demotion_criteria,
                              min_completion_rate: (parseFloat(e.target.value) || 0) / 100,
                            },
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTier} disabled={saving}>
              {saving ? "Saving..." : editingTier ? "Save Changes" : "Create Tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
