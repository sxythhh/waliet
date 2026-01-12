import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { DiscordServerSettings } from "./DiscordServerSettings";
import { useAuth } from "@/contexts/AuthContext";

interface BrandSettingsTabProps {
  brandId: string;
  subscriptionStatus?: string | null;
}

interface BrandSettings {
  auto_approve_applications: boolean;
  auto_approve_min_followers: number | null;
  payout_clearing_days: number;
  require_contract_signature: boolean;
  application_questions_required: boolean;
  email_on_new_application: boolean;
  email_on_submission: boolean;
  email_on_payout_request: boolean;
}

// Types
interface MilestoneConfig {
  id: string;
  brand_id: string;
  milestone_type: "views" | "earnings" | "submissions";
  threshold: number;
  message_template: string;
  is_active: boolean;
}

interface CreatorTier {
  id: string;
  name: string;
  description: string | null;
  tier_order: number;
  rpm_multiplier: number;
  color: string | null;
  is_default: boolean;
}

interface Strike {
  id: string;
  creator_id: string;
  strike_type: string;
  reason: string | null;
  severity: number;
  is_appealed: boolean;
  appeal_status: string | null;
  created_at: string;
  creator?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Type for participant query results
interface ParticipantQueryResult {
  user_id: string;
  profiles: {
    id: string;
    username: string;
    full_name: string | null;
  } | null;
}

// Milestone type union
type MilestoneType = "views" | "earnings" | "submissions";

const STRIKE_TYPES = [
  { value: "missed_deadline", label: "Missed Deadline" },
  { value: "late_submission", label: "Late Submission" },
  { value: "content_violation", label: "Content Violation" },
  { value: "no_show", label: "No Show" },
  { value: "other", label: "Other" },
];

const SEVERITY_LEVELS = [
  { value: 1, label: "Minor", color: "text-yellow-500 bg-yellow-500/10" },
  { value: 2, label: "Moderate", color: "text-orange-500 bg-orange-500/10" },
  { value: 3, label: "Severe", color: "text-red-500 bg-red-500/10" },
];

const DEFAULT_SETTINGS: BrandSettings = {
  auto_approve_applications: false,
  auto_approve_min_followers: null,
  payout_clearing_days: 7,
  require_contract_signature: false,
  application_questions_required: true,
  email_on_new_application: true,
  email_on_submission: true,
  email_on_payout_request: true,
};

export function BrandSettingsTab({ brandId, subscriptionStatus }: BrandSettingsTabProps) {
  console.log('[BrandSettingsTab] Rendered with brandId:', brandId, 'subscriptionStatus:', subscriptionStatus);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<BrandSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  // Payout settings state
  const [payoutHoldingDays, setPayoutHoldingDays] = useState(0);
  const [payoutMinimumAmount, setPayoutMinimumAmount] = useState(0);
  const [payoutSettingsUpdatedAt, setPayoutSettingsUpdatedAt] = useState<string | null>(null);
  const [savingPayoutSettings, setSavingPayoutSettings] = useState(false);

  // Milestones state
  const [milestones, setMilestones] = useState<MilestoneConfig[]>([]);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [milestoneType, setMilestoneType] = useState<"views" | "earnings" | "submissions">("views");
  const [milestoneThreshold, setMilestoneThreshold] = useState("");
  const [milestoneMessage, setMilestoneMessage] = useState("");

  // Tiers state
  const [tiers, setTiers] = useState<CreatorTier[]>([]);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [tierName, setTierName] = useState("");
  const [tierRpm, setTierRpm] = useState("1.0");
  const [tierColor, setTierColor] = useState("#8B5CF6");
  const [tierDescription, setTierDescription] = useState("");
  const [editingTier, setEditingTier] = useState<CreatorTier | null>(null);

  // Strikes state
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [strikeDialogOpen, setStrikeDialogOpen] = useState(false);
  const [creators, setCreators] = useState<{ id: string; username: string; full_name: string | null }[]>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const [strikeType, setStrikeType] = useState("missed_deadline");
  const [strikeSeverity, setStrikeSeverity] = useState(1);
  const [strikeReason, setStrikeReason] = useState("");

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [brandResult, milestonesResult, tiersResult, strikesResult, creatorsResult] = await Promise.all([
        supabase.from("brands").select("settings, owner_id").eq("id", brandId).single(),
        (supabase.from("milestone_configs" as "brands").select("*").eq("brand_id", brandId).order("threshold")),
        (supabase.from("creator_tiers" as "brands").select("*").eq("brand_id", brandId).order("tier_order")),
        (supabase.from("creator_strikes" as "brands").select("*, creator:creator_id(username, full_name, avatar_url)").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(10)),
        (supabase.from("campaign_participants").select("user_id, profiles:user_id(id, username, full_name)").eq("status", "accepted"))
      ]);

      // Parse brand settings from JSONB column
      if (brandResult.data?.settings && typeof brandResult.data.settings === 'object' && !Array.isArray(brandResult.data.settings)) {
        setSettings({ ...DEFAULT_SETTINGS, ...(brandResult.data.settings as unknown as BrandSettings) });
      }

      // Fetch payout settings from brand owner's profile
      if (brandResult.data?.owner_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("payout_holding_days, payout_minimum_amount, payout_settings_updated_at")
          .eq("id", brandResult.data.owner_id)
          .single();

        if (profileData) {
          setPayoutHoldingDays(profileData.payout_holding_days || 0);
          setPayoutMinimumAmount(profileData.payout_minimum_amount || 0);
          setPayoutSettingsUpdatedAt(profileData.payout_settings_updated_at || null);
        }
      }

      setMilestones((milestonesResult.data || []) as MilestoneConfig[]);
      setTiers((tiersResult.data || []) as CreatorTier[]);
      setStrikes((strikesResult.data || []) as Strike[]);

      const uniqueCreators = new Map<string, { id: string; username: string; full_name: string | null }>();
      (creatorsResult.data as ParticipantQueryResult[] | null)?.forEach((p: ParticipantQueryResult) => {
        if (p.profiles && !uniqueCreators.has(p.profiles.id)) {
          uniqueCreators.set(p.profiles.id, p.profiles);
        }
      });
      setCreators(Array.from(uniqueCreators.values()));
    } catch (error: unknown) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("brands")
        .update({ settings: settings as unknown as Record<string, unknown> })
        .eq("id", brandId);
      if (error) throw error;
      toast.success("Settings saved");
    } catch (error: unknown) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const updateSetting = <K extends keyof BrandSettings>(key: K, value: BrandSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Check if payout settings are rate limited (once per day)
  const isPayoutSettingsRateLimited = payoutSettingsUpdatedAt
    ? differenceInHours(new Date(), new Date(payoutSettingsUpdatedAt)) < 24
    : false;

  const hoursUntilPayoutSettingsUnlock = payoutSettingsUpdatedAt
    ? Math.max(0, 24 - differenceInHours(new Date(), new Date(payoutSettingsUpdatedAt)))
    : 0;

  const handleSavePayoutSettings = async () => {
    if (!user) return;

    if (isPayoutSettingsRateLimited) {
      toast.error(`Payout settings can only be changed once per day. Try again in ${hoursUntilPayoutSettingsUnlock} hours.`);
      return;
    }

    setSavingPayoutSettings(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("update-payout-settings", {
        body: {
          entity_type: "brand",
          entity_id: user.id,
          holding_days: payoutHoldingDays,
          minimum_amount: payoutMinimumAmount,
        },
      });

      if (response.error) throw response.error;

      setPayoutSettingsUpdatedAt(new Date().toISOString());
      toast.success("Payout settings saved");
    } catch (error: unknown) {
      console.error("Error saving payout settings:", error);
      toast.error("Failed to save payout settings");
    } finally {
      setSavingPayoutSettings(false);
    }
  };

  // Milestone handlers
  const handleAddMilestone = async () => {
    if (!milestoneThreshold || !milestoneMessage) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      const { error } = await supabase.from("milestone_configs" as "brands").insert({
        brand_id: brandId,
        milestone_type: milestoneType,
        threshold: parseFloat(milestoneThreshold),
        message_template: milestoneMessage
      } as Record<string, unknown>);
      if (error) throw error;
      toast.success("Milestone created");
      setMilestoneDialogOpen(false);
      setMilestoneThreshold("");
      setMilestoneMessage("");
      fetchAllData();
    } catch {
      toast.error("Failed to create milestone");
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    try {
      await supabase.from("milestone_configs" as "brands").delete().eq("id", id);
      setMilestones(milestones.filter(m => m.id !== id));
      toast.success("Milestone deleted");
    } catch {
      toast.error("Failed to delete milestone");
    }
  };

  // Tier handlers
  const handleCreateDefaultTiers = async () => {
    try {
      await supabase.rpc("create_default_creator_tiers" as "get_user_permissions", { p_brand_id: brandId } as Record<string, unknown>);
      toast.success("Default tiers created");
      fetchAllData();
    } catch {
      toast.error("Failed to create tiers");
    }
  };

  const handleAddTier = async () => {
    if (!tierName) {
      toast.error("Please enter a tier name");
      return;
    }
    try {
      const { error } = await supabase.from("creator_tiers" as "brands").insert({
        brand_id: brandId,
        name: tierName,
        tier_order: tiers.length + 1,
        rpm_multiplier: parseFloat(tierRpm) || 1.0,
        color: tierColor,
        description: tierDescription || null
      } as Record<string, unknown>);
      if (error) throw error;
      toast.success("Tier created");
      resetTierForm();
      fetchAllData();
    } catch {
      toast.error("Failed to create tier");
    }
  };

  const handleEditTier = async () => {
    if (!editingTier || !tierName) {
      toast.error("Please enter a tier name");
      return;
    }
    try {
      const { error } = await supabase.from("creator_tiers" as "brands").update({
        name: tierName,
        rpm_multiplier: parseFloat(tierRpm) || 1.0,
        color: tierColor,
        description: tierDescription || null
      } as Record<string, unknown>).eq("id", editingTier.id);
      if (error) throw error;
      toast.success("Tier updated");
      resetTierForm();
      fetchAllData();
    } catch {
      toast.error("Failed to update tier");
    }
  };

  const resetTierForm = () => {
    setTierDialogOpen(false);
    setTierName("");
    setTierRpm("1.0");
    setTierColor("#8B5CF6");
    setTierDescription("");
    setEditingTier(null);
  };

  const openEditTierDialog = (tier: CreatorTier) => {
    setEditingTier(tier);
    setTierName(tier.name);
    setTierRpm(tier.rpm_multiplier.toString());
    setTierColor(tier.color || "#8B5CF6");
    setTierDescription(tier.description || "");
    setTierDialogOpen(true);
  };

  const handleDeleteTier = async (id: string) => {
    try {
      await supabase.from("creator_tiers" as "brands").delete().eq("id", id);
      setTiers(tiers.filter(t => t.id !== id));
      toast.success("Tier deleted");
    } catch {
      toast.error("Failed to delete tier");
    }
  };

  // Strike handlers
  const handleAddStrike = async () => {
    if (!selectedCreatorId) {
      toast.error("Please select a creator");
      return;
    }
    try {
      const { error } = await supabase.from("creator_strikes" as "brands").insert({
        brand_id: brandId,
        creator_id: selectedCreatorId,
        strike_type: strikeType,
        severity: strikeSeverity,
        reason: strikeReason || null
      } as Record<string, unknown>);
      if (error) throw error;
      toast.success("Strike recorded");
      setStrikeDialogOpen(false);
      setSelectedCreatorId("");
      setStrikeReason("");
      fetchAllData();
    } catch {
      toast.error("Failed to add strike");
    }
  };

  const handleRemoveStrike = async (id: string) => {
    try {
      await supabase.from("creator_strikes" as "brands").delete().eq("id", id);
      setStrikes(strikes.filter(s => s.id !== id));
      toast.success("Strike removed");
    } catch {
      toast.error("Failed to remove strike");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-20 space-y-8">
      {/* Global Save Button - Fixed */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-[-0.5px]">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your brand preferences</p>
        </div>
        <Button
          size="sm"
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="font-inter tracking-[-0.5px]"
        >
          {savingSettings ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Discord Server Integration */}
      <DiscordServerSettings
        brandId={brandId}
        subscriptionStatus={subscriptionStatus}
      />


      {/* Application Settings */}
      <section className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-8">
        <div className="md:pt-1">
          <h2 className="text-sm font-medium tracking-[-0.3px]">Applications</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Configure how creators can apply to your campaigns</p>
        </div>

        <div className="rounded-lg border border-border/50 dark:border-white/[0.06] divide-y divide-border/50 dark:divide-white/[0.06] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-card/50">
            <div>
              <p className="text-sm font-medium tracking-[-0.3px]">Auto-approve Applications</p>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically accept creators who meet your criteria</p>
            </div>
            <Switch
              checked={settings.auto_approve_applications}
              onCheckedChange={(checked) => updateSetting("auto_approve_applications", checked)}
            />
          </div>

          {settings.auto_approve_applications && (
            <div className="px-4 py-3 bg-muted/20">
              <Label className="text-xs text-muted-foreground">Minimum follower count for auto-approval</Label>
              <Input
                type="number"
                placeholder="e.g., 1000 (leave empty for any)"
                value={settings.auto_approve_min_followers || ""}
                onChange={(e) => updateSetting("auto_approve_min_followers", e.target.value ? parseInt(e.target.value, 10) : null)}
                className="mt-1.5 h-9 max-w-xs"
              />
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 bg-card/50">
            <div>
              <p className="text-sm font-medium tracking-[-0.3px]">Require Application Questions</p>
              <p className="text-xs text-muted-foreground mt-0.5">Creators must answer your custom questions when applying</p>
            </div>
            <Switch
              checked={settings.application_questions_required}
              onCheckedChange={(checked) => updateSetting("application_questions_required", checked)}
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-card/50">
            <div>
              <p className="text-sm font-medium tracking-[-0.3px]">Require Contract Signature</p>
              <p className="text-xs text-muted-foreground mt-0.5">Creators must sign a contract before they can submit content</p>
            </div>
            <Switch
              checked={settings.require_contract_signature}
              onCheckedChange={(checked) => updateSetting("require_contract_signature", checked)}
            />
          </div>
        </div>
      </section>

      {/* Payout Settings */}
      <section className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-8">
        <div className="md:pt-1">
          <h2 className="text-sm font-medium tracking-[-0.3px]">Payouts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Configure payout timing and thresholds for boosts</p>
        </div>

        <div className="rounded-lg border border-border/50 dark:border-white/[0.06] divide-y divide-border/50 dark:divide-white/[0.06] overflow-hidden">
          {/* Holding Period */}
          <div className="px-4 py-4 bg-card/50">
            <p className="text-sm font-medium tracking-[-0.3px] mb-1">Holding Period</p>
            <p className="text-xs text-muted-foreground mb-4">
              How long to hold funds after video approval before creators can withdraw.
            </p>
            <div className="flex items-center gap-4">
              <Slider
                value={[payoutHoldingDays]}
                onValueChange={([v]) => setPayoutHoldingDays(v)}
                min={0}
                max={30}
                step={1}
                className="flex-1"
                disabled={isPayoutSettingsRateLimited}
              />
              <span className="text-sm font-medium tabular-nums w-16 text-right">
                {payoutHoldingDays} {payoutHoldingDays === 1 ? "day" : "days"}
              </span>
            </div>
          </div>

          {/* Minimum Payout */}
          <div className="px-4 py-4 bg-card/50">
            <p className="text-sm font-medium tracking-[-0.3px] mb-1">Minimum Payout</p>
            <p className="text-xs text-muted-foreground mb-4">
              Minimum amount required before funds are released. Both conditions must be met.
            </p>
            <div className="flex items-center gap-4">
              <Slider
                value={[payoutMinimumAmount]}
                onValueChange={([v]) => setPayoutMinimumAmount(v)}
                min={0}
                max={50}
                step={5}
                className="flex-1"
                disabled={isPayoutSettingsRateLimited}
              />
              <span className="text-sm font-medium tabular-nums w-16 text-right">
                ${payoutMinimumAmount}
              </span>
            </div>
          </div>

          {/* Save Button */}
          <div className="px-4 py-3 bg-muted/20 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {payoutSettingsUpdatedAt
                ? `Last updated ${formatDistanceToNow(new Date(payoutSettingsUpdatedAt), { addSuffix: true })}`
                : "Not yet configured"}
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      onClick={handleSavePayoutSettings}
                      disabled={savingPayoutSettings || isPayoutSettingsRateLimited}
                      className="font-inter tracking-[-0.5px]"
                    >
                      {savingPayoutSettings ? "Saving..." : "Save Payout Settings"}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isPayoutSettingsRateLimited && (
                  <TooltipContent>
                    <p>Settings can only be changed once per day. Try again in {hoursUntilPayoutSettingsUnlock}h.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-8">
        <div className="md:pt-1">
          <h2 className="text-sm font-medium tracking-[-0.3px]">Milestones</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Auto-notify creators when they hit performance milestones</p>
        </div>

        <div>
          <div className="flex justify-end mb-2">
            <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 text-xs font-inter tracking-[-0.3px]">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Milestone</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={milestoneType} onValueChange={(v) => setMilestoneType(v as MilestoneType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="views">Views</SelectItem>
                        <SelectItem value="earnings">Earnings ($)</SelectItem>
                        <SelectItem value="submissions">Submissions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Threshold</Label>
                    <Input type="number" placeholder={milestoneType === "earnings" ? "100" : "10000"} value={milestoneThreshold} onChange={(e) => setMilestoneThreshold(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea placeholder="Congratulations on reaching this milestone!" value={milestoneMessage} onChange={(e) => setMilestoneMessage(e.target.value)} rows={2} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" className="font-inter tracking-[-0.5px]" onClick={() => setMilestoneDialogOpen(false)}>Cancel</Button>
                    <Button className="font-inter tracking-[-0.5px]" onClick={handleAddMilestone}>Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {milestones.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/50 dark:border-white/[0.06] px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">No milestones configured</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 dark:border-white/[0.06] divide-y divide-border/50 dark:divide-white/[0.06] overflow-hidden">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3 bg-card/50">
                  <div className="flex items-center gap-3">
                    <Switch checked={m.is_active} onCheckedChange={async (checked) => {
                      await supabase.from("milestone_configs" as "brands").update({ is_active: checked } as Record<string, unknown>).eq("id", m.id);
                      setMilestones(milestones.map(x => x.id === m.id ? { ...x, is_active: checked } : x));
                    }} />
                    <div>
                      <p className="text-sm font-medium tracking-[-0.3px]">
                        {m.milestone_type === "earnings" ? `$${m.threshold.toLocaleString()}` : m.threshold >= 1000 ? `${(m.threshold / 1000).toFixed(0)}K` : m.threshold} {m.milestone_type}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[240px]">{m.message_template}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteMilestone(m.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Creator Tiers */}
      <section className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-8">
        <div className="md:pt-1">
          <h2 className="text-sm font-medium tracking-[-0.3px]">Creator Tiers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Reward top performers with tier-based RPM multipliers</p>
        </div>

        <div>
          <div className="flex justify-end mb-2">
            {tiers.length === 0 ? (
              <Button size="sm" variant="ghost" className="h-7 text-xs font-inter tracking-[-0.3px]" onClick={handleCreateDefaultTiers}>
                Create Default Tiers
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="h-7 text-xs font-inter tracking-[-0.3px]" onClick={() => { resetTierForm(); setTierDialogOpen(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            )}
            <Dialog open={tierDialogOpen} onOpenChange={(open) => { if (!open) resetTierForm(); else setTierDialogOpen(true); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTier ? "Edit Tier" : "Add Tier"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input placeholder="e.g., Gold" value={tierName} onChange={(e) => setTierName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input placeholder="e.g., For top performers" value={tierDescription} onChange={(e) => setTierDescription(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>RPM Multiplier</Label>
                      <Input type="number" step="0.1" value={tierRpm} onChange={(e) => setTierRpm(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <Input type="color" value={tierColor} onChange={(e) => setTierColor(e.target.value)} className="h-10 w-20" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" className="font-inter tracking-[-0.5px]" onClick={resetTierForm}>Cancel</Button>
                    <Button className="font-inter tracking-[-0.5px]" onClick={editingTier ? handleEditTier : handleAddTier}>
                      {editingTier ? "Save" : "Create"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {tiers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/50 dark:border-white/[0.06] px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">No tiers configured</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 dark:border-white/[0.06] divide-y divide-border/50 dark:divide-white/[0.06] overflow-hidden">
              {tiers.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || "#8B5CF6" }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium tracking-[-0.3px]">{t.name}</span>
                        {t.is_default && <Badge variant="outline" className="text-[10px] font-inter tracking-[-0.3px] h-5">Default</Badge>}
                        <span className="text-xs text-muted-foreground tabular-nums">{t.rpm_multiplier}x RPM</span>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEditTierDialog(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTier(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Creator Strikes */}
      <section className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-8">
        <div className="md:pt-1">
          <h2 className="text-sm font-medium tracking-[-0.3px]">Creator Strikes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Track missed deadlines and content issues</p>
        </div>

        <div>
          <div className="flex justify-end mb-2">
            <Dialog open={strikeDialogOpen} onOpenChange={setStrikeDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 text-xs font-inter tracking-[-0.3px]">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Strike</DialogTitle>
                  <DialogDescription>Add a strike to a creator's record</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Creator</Label>
                    <Select value={selectedCreatorId} onValueChange={setSelectedCreatorId}>
                      <SelectTrigger><SelectValue placeholder="Select creator" /></SelectTrigger>
                      <SelectContent>
                        {creators.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.full_name || c.username}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={strikeType} onValueChange={setStrikeType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STRIKE_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select value={strikeSeverity.toString()} onValueChange={(v) => setStrikeSeverity(parseInt(v, 10))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SEVERITY_LEVELS.map((l) => (
                            <SelectItem key={l.value} value={l.value.toString()}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason (Optional)</Label>
                    <Textarea placeholder="Describe the issue..." value={strikeReason} onChange={(e) => setStrikeReason(e.target.value)} rows={2} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" className="font-inter tracking-[-0.5px]" onClick={() => setStrikeDialogOpen(false)}>Cancel</Button>
                    <Button className="font-inter tracking-[-0.5px]" onClick={handleAddStrike}>Record Strike</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {strikes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/50 dark:border-white/[0.06] px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">No strikes recorded</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 dark:border-white/[0.06] divide-y divide-border/50 dark:divide-white/[0.06] overflow-hidden">
              {strikes.map((s) => {
                const severityInfo = SEVERITY_LEVELS.find(l => l.value === s.severity);
                return (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-card/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={s.creator?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{s.creator?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium tracking-[-0.3px]">{s.creator?.full_name || s.creator?.username}</span>
                          <Badge variant="outline" className={`text-[10px] h-5 ${severityInfo?.color}`}>{severityInfo?.label}</Badge>
                          {s.is_appealed && <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-500">{s.appeal_status || "Appeal Pending"}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {STRIKE_TYPES.find(t => t.value === s.strike_type)?.label} · {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveStrike(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
