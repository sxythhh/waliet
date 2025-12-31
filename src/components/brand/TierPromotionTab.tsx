import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, TrendingUp, ArrowUp, ArrowDown, Users } from "lucide-react";
import { toast } from "sonner";

interface CreatorTier {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  tier_order: number;
  rpm_multiplier: number;
  color: string | null;
  is_default: boolean;
}

interface TierPromotionRule {
  id: string;
  brand_id: string;
  from_tier_id: string | null;
  to_tier_id: string;
  rule_type: string;
  threshold_value: number;
  evaluation_period_days: number | null;
  is_active: boolean;
}

interface TierAssignment {
  id: string;
  user_id: string;
  tier_id: string;
  assigned_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface TierPromotionTabProps {
  brandId: string;
}

const RULE_TYPES = [
  { value: "min_total_views", label: "Minimum Total Views", description: "Total views across all videos" },
  { value: "min_avg_views", label: "Minimum Average Views", description: "Average views per video" },
  { value: "min_videos_count", label: "Minimum Videos Count", description: "Number of approved videos" },
  { value: "min_total_earnings", label: "Minimum Total Earnings", description: "Total earnings in USD" },
  { value: "min_avg_engagement", label: "Minimum Engagement Rate", description: "Average engagement percentage" },
  { value: "max_rejection_rate", label: "Maximum Rejection Rate", description: "Keep rejection rate below %" },
  { value: "min_days_active", label: "Minimum Days Active", description: "Days since first submission" }
];

export function TierPromotionTab({ brandId }: TierPromotionTabProps) {
  const [tiers, setTiers] = useState<CreatorTier[]>([]);
  const [rules, setRules] = useState<TierPromotionRule[]>([]);
  const [assignments, setAssignments] = useState<TierAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTierDialogOpen, setIsTierDialogOpen] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTier, setEditingTier] = useState<CreatorTier | null>(null);
  const [editingRule, setEditingRule] = useState<TierPromotionRule | null>(null);
  const [activeTab, setActiveTab] = useState("tiers");

  // Tier form state
  const [tierName, setTierName] = useState("");
  const [tierDescription, setTierDescription] = useState("");
  const [tierOrder, setTierOrder] = useState("1");
  const [rpmMultiplier, setRpmMultiplier] = useState("1.0");
  const [tierColor, setTierColor] = useState("#8B5CF6");
  const [isDefault, setIsDefault] = useState(false);

  // Rule form state
  const [fromTierId, setFromTierId] = useState<string>("");
  const [toTierId, setToTierId] = useState<string>("");
  const [ruleType, setRuleType] = useState("min_total_views");
  const [thresholdValue, setThresholdValue] = useState("");
  const [evaluationPeriod, setEvaluationPeriod] = useState("");

  useEffect(() => {
    fetchData();
  }, [brandId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tiersResult, rulesResult, assignmentsResult] = await Promise.all([
        (supabase
          .from("creator_tiers" as any)
          .select("*")
          .eq("brand_id", brandId)
          .order("tier_order") as any),
        (supabase
          .from("tier_promotion_rules" as any)
          .select("*")
          .eq("brand_id", brandId)
          .order("created_at") as any),
        (supabase
          .from("creator_tier_assignments" as any)
          .select(`
            *,
            profiles:user_id(username, avatar_url)
          `)
          .eq("brand_id", brandId)
          .order("assigned_at", { ascending: false })
          .limit(20) as any)
      ]);

      if (!tiersResult.error) setTiers((tiersResult.data || []) as CreatorTier[]);
      if (!rulesResult.error) setRules((rulesResult.data || []) as TierPromotionRule[]);
      if (!assignmentsResult.error) setAssignments((assignmentsResult.data || []) as TierAssignment[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultTiers = async () => {
    try {
      const { error } = await (supabase.rpc as any)("create_default_creator_tiers", {
        p_brand_id: brandId
      });

      if (error) throw error;
      toast.success("Default tiers created");
      fetchData();
    } catch (error) {
      console.error("Error creating default tiers:", error);
      toast.error("Failed to create default tiers");
    }
  };

  const resetTierForm = () => {
    setTierName("");
    setTierDescription("");
    setTierOrder("1");
    setRpmMultiplier("1.0");
    setTierColor("#8B5CF6");
    setIsDefault(false);
    setEditingTier(null);
  };

  const resetRuleForm = () => {
    setFromTierId("");
    setToTierId("");
    setRuleType("min_total_views");
    setThresholdValue("");
    setEvaluationPeriod("");
    setEditingRule(null);
  };

  const handleOpenTierDialog = (tier?: CreatorTier) => {
    if (tier) {
      setEditingTier(tier);
      setTierName(tier.name);
      setTierDescription(tier.description || "");
      setTierOrder(tier.tier_order.toString());
      setRpmMultiplier(tier.rpm_multiplier.toString());
      setTierColor(tier.color || "#8B5CF6");
      setIsDefault(tier.is_default);
    } else {
      resetTierForm();
      setTierOrder((tiers.length + 1).toString());
    }
    setIsTierDialogOpen(true);
  };

  const handleOpenRuleDialog = (rule?: TierPromotionRule) => {
    if (rule) {
      setEditingRule(rule);
      setFromTierId(rule.from_tier_id || "");
      setToTierId(rule.to_tier_id);
      setRuleType(rule.rule_type);
      setThresholdValue(rule.threshold_value.toString());
      setEvaluationPeriod(rule.evaluation_period_days?.toString() || "");
    } else {
      resetRuleForm();
    }
    setIsRuleDialogOpen(true);
  };

  const handleSaveTier = async () => {
    if (!tierName.trim()) {
      toast.error("Please enter a tier name");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        brand_id: brandId,
        name: tierName.trim(),
        description: tierDescription.trim() || null,
        tier_order: parseInt(tierOrder) || 1,
        rpm_multiplier: parseFloat(rpmMultiplier) || 1.0,
        color: tierColor,
        is_default: isDefault
      };

      if (editingTier) {
        const { error } = await (supabase
          .from("creator_tiers" as any)
          .update(data)
          .eq("id", editingTier.id) as any);

        if (error) throw error;
        toast.success("Tier updated");
      } else {
        const { error } = await (supabase
          .from("creator_tiers" as any)
          .insert(data) as any);

        if (error) throw error;
        toast.success("Tier created");
      }

      setIsTierDialogOpen(false);
      resetTierForm();
      fetchData();
    } catch (error: any) {
      console.error("Error saving tier:", error);
      toast.error(error.message || "Failed to save tier");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRule = async () => {
    if (!toTierId || !thresholdValue) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        brand_id: brandId,
        from_tier_id: fromTierId || null,
        to_tier_id: toTierId,
        rule_type: ruleType,
        threshold_value: parseFloat(thresholdValue),
        evaluation_period_days: evaluationPeriod ? parseInt(evaluationPeriod) : null
      };

      if (editingRule) {
        const { error } = await (supabase
          .from("tier_promotion_rules" as any)
          .update(data)
          .eq("id", editingRule.id) as any);

        if (error) throw error;
        toast.success("Rule updated");
      } else {
        const { error } = await (supabase
          .from("tier_promotion_rules" as any)
          .insert(data) as any);

        if (error) throw error;
        toast.success("Rule created");
      }

      setIsRuleDialogOpen(false);
      resetRuleForm();
      fetchData();
    } catch (error) {
      console.error("Error saving rule:", error);
      toast.error("Failed to save rule");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    try {
      const { error } = await (supabase
        .from("creator_tiers" as any)
        .delete()
        .eq("id", tierId) as any);

      if (error) throw error;
      toast.success("Tier deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting tier:", error);
      toast.error("Failed to delete tier");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { error } = await (supabase
        .from("tier_promotion_rules" as any)
        .delete()
        .eq("id", ruleId) as any);

      if (error) throw error;
      toast.success("Rule deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Failed to delete rule");
    }
  };

  const handleToggleRule = async (rule: TierPromotionRule) => {
    try {
      const { error } = await (supabase
        .from("tier_promotion_rules" as any)
        .update({ is_active: !rule.is_active })
        .eq("id", rule.id) as any);

      if (error) throw error;
      setRules(prev =>
        prev.map(r =>
          r.id === rule.id ? { ...r, is_active: !r.is_active } : r
        )
      );
    } catch (error) {
      console.error("Error toggling rule:", error);
      toast.error("Failed to update rule");
    }
  };

  const getTierById = (id: string) => tiers.find(t => t.id === id);
  const getRuleLabel = (type: string) => RULE_TYPES.find(r => r.value === type)?.label || type;

  const formatThreshold = (type: string, value: number) => {
    switch (type) {
      case "min_total_views":
      case "min_avg_views":
        return value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toString();
      case "min_total_earnings":
        return `$${value.toLocaleString()}`;
      case "min_avg_engagement":
      case "max_rejection_rate":
        return `${value}%`;
      case "min_days_active":
        return `${value} days`;
      default:
        return value.toString();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Creator Tiers</h2>
          <p className="text-sm text-muted-foreground">
            Configure tiers and automatic promotion rules for creators
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tiers">
            Tiers ({tiers.length})
          </TabsTrigger>
          <TabsTrigger value="rules">
            Promotion Rules ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="assignments">
            Assignments ({assignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tiers" className="mt-4 space-y-4">
          <div className="flex justify-end">
            {tiers.length === 0 ? (
              <Button onClick={createDefaultTiers}>
                Create Default Tiers
              </Button>
            ) : (
              <Dialog open={isTierDialogOpen} onOpenChange={setIsTierDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenTierDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tier
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingTier ? "Edit Tier" : "Create Tier"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={tierName}
                        onChange={(e) => setTierName(e.target.value)}
                        placeholder="e.g., Gold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={tierDescription}
                        onChange={(e) => setTierDescription(e.target.value)}
                        placeholder="Description of this tier"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Order (1 = highest)</Label>
                        <Input
                          type="number"
                          value={tierOrder}
                          onChange={(e) => setTierOrder(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>RPM Multiplier</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={rpmMultiplier}
                          onChange={(e) => setRpmMultiplier(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <Input
                        type="color"
                        value={tierColor}
                        onChange={(e) => setTierColor(e.target.value)}
                        className="w-20 h-10"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                      <Label>Default tier for new creators</Label>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setIsTierDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveTier} disabled={isSaving}>
                        {isSaving ? "Saving..." : editingTier ? "Update" : "Create"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {tiers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No tiers configured</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Create default tiers to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tiers.map(tier => (
                <Card key={tier.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tier.color || "#8B5CF6" }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tier.name}</span>
                            {tier.is_default && (
                              <Badge variant="outline" className="text-xs">Default</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {tier.rpm_multiplier}x RPM
                            </Badge>
                          </div>
                          {tier.description && (
                            <p className="text-sm text-muted-foreground">{tier.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenTierDialog(tier)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDeleteTier(tier.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenRuleDialog()} disabled={tiers.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingRule ? "Edit Rule" : "Create Promotion Rule"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>From Tier (optional)</Label>
                      <Select value={fromTierId} onValueChange={setFromTierId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any tier</SelectItem>
                          {tiers.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>To Tier</Label>
                      <Select value={toTierId} onValueChange={setToTierId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiers.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Requirement Type</Label>
                    <Select value={ruleType} onValueChange={setRuleType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {RULE_TYPES.find(r => r.value === ruleType)?.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Threshold</Label>
                      <Input
                        type="number"
                        value={thresholdValue}
                        onChange={(e) => setThresholdValue(e.target.value)}
                        placeholder={ruleType.includes("earnings") ? "1000" : "10000"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Period (days, optional)</Label>
                      <Input
                        type="number"
                        value={evaluationPeriod}
                        onChange={(e) => setEvaluationPeriod(e.target.value)}
                        placeholder="All time"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveRule} disabled={isSaving}>
                      {isSaving ? "Saving..." : editingRule ? "Update" : "Create"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {rules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ArrowUp className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No promotion rules configured</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {tiers.length === 0 ? "Create tiers first" : "Add rules to auto-promote creators"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => {
                const fromTier = rule.from_tier_id ? getTierById(rule.from_tier_id) : null;
                const toTier = getTierById(rule.to_tier_id);
                return (
                  <Card key={rule.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={() => handleToggleRule(rule)}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              {fromTier ? (
                                <>
                                  <Badge variant="outline" style={{ borderColor: fromTier.color || undefined }}>
                                    {fromTier.name}
                                  </Badge>
                                  <ArrowUp className="h-4 w-4" />
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">Any</span>
                              )}
                              {toTier && (
                                <Badge style={{ backgroundColor: toTier.color || "#8B5CF6", color: "white" }}>
                                  {toTier.name}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {getRuleLabel(rule.rule_type)}: {formatThreshold(rule.rule_type, rule.threshold_value)}
                              {rule.evaluation_period_days && ` (last ${rule.evaluation_period_days} days)`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenRuleDialog(rule)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          {assignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No tier assignments yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Creators will be assigned tiers automatically or manually
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {assignments.map(assignment => {
                const tier = getTierById(assignment.tier_id);
                return (
                  <Card key={assignment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">@{assignment.profiles?.username || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">
                              Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {tier && (
                          <Badge style={{ backgroundColor: tier.color || "#8B5CF6", color: "white" }}>
                            {tier.name}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
