import { useState, useEffect } from "react";
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
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface BrandSettingsTabProps {
  brandId: string;
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

export function BrandSettingsTab({ brandId }: BrandSettingsTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<BrandSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

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

  useEffect(() => {
    fetchAllData();
  }, [brandId]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [brandResult, milestonesResult, tiersResult, strikesResult, creatorsResult] = await Promise.all([
        supabase.from("brands").select("settings").eq("id", brandId).single(),
        (supabase.from("milestone_configs" as any).select("*").eq("brand_id", brandId).order("threshold") as any),
        (supabase.from("creator_tiers" as any).select("*").eq("brand_id", brandId).order("tier_order") as any),
        (supabase.from("creator_strikes" as any).select("*, creator:creator_id(username, full_name, avatar_url)").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(10) as any),
        (supabase.from("campaign_participants" as any).select("user_id, profiles:user_id(id, username, full_name)").eq("brand_id", brandId).eq("status", "accepted") as any)
      ]);

      // Parse brand settings from JSONB column
      if (brandResult.data?.settings && typeof brandResult.data.settings === 'object' && !Array.isArray(brandResult.data.settings)) {
        setSettings({ ...DEFAULT_SETTINGS, ...(brandResult.data.settings as unknown as BrandSettings) });
      }

      setMilestones((milestonesResult.data || []) as MilestoneConfig[]);
      setTiers((tiersResult.data || []) as CreatorTier[]);
      setStrikes((strikesResult.data || []) as Strike[]);

      const uniqueCreators = new Map();
      creatorsResult.data?.forEach((p: any) => {
        if (p.profiles && !uniqueCreators.has(p.profiles.id)) {
          uniqueCreators.set(p.profiles.id, p.profiles);
        }
      });
      setCreators(Array.from(uniqueCreators.values()));
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("brands")
        .update({ settings: settings as any })
        .eq("id", brandId);
      if (error) throw error;
      toast.success("Settings saved");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const updateSetting = <K extends keyof BrandSettings>(key: K, value: BrandSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Milestone handlers
  const handleAddMilestone = async () => {
    if (!milestoneThreshold || !milestoneMessage) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      const { error } = await (supabase.from("milestone_configs" as any).insert({
        brand_id: brandId,
        milestone_type: milestoneType,
        threshold: parseFloat(milestoneThreshold),
        message_template: milestoneMessage
      }) as any);
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
      await (supabase.from("milestone_configs" as any).delete().eq("id", id) as any);
      setMilestones(milestones.filter(m => m.id !== id));
      toast.success("Milestone deleted");
    } catch {
      toast.error("Failed to delete milestone");
    }
  };

  // Tier handlers
  const handleCreateDefaultTiers = async () => {
    try {
      await (supabase.rpc as any)("create_default_creator_tiers", { p_brand_id: brandId });
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
      const { error } = await (supabase.from("creator_tiers" as any).insert({
        brand_id: brandId,
        name: tierName,
        tier_order: tiers.length + 1,
        rpm_multiplier: parseFloat(tierRpm) || 1.0,
        color: tierColor,
        description: tierDescription || null
      }) as any);
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
      const { error } = await (supabase.from("creator_tiers" as any).update({
        name: tierName,
        rpm_multiplier: parseFloat(tierRpm) || 1.0,
        color: tierColor,
        description: tierDescription || null
      }).eq("id", editingTier.id) as any);
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
      await (supabase.from("creator_tiers" as any).delete().eq("id", id) as any);
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
      const { error } = await (supabase.from("creator_strikes" as any).insert({
        brand_id: brandId,
        creator_id: selectedCreatorId,
        strike_type: strikeType,
        severity: strikeSeverity,
        reason: strikeReason || null
      }) as any);
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
      await (supabase.from("creator_strikes" as any).delete().eq("id", id) as any);
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
    <div className="p-6 space-y-10 max-w-4xl mx-auto">
      {/* Application Settings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold font-inter tracking-[-0.5px]">Application Settings</h2>
            <p className="text-xs text-muted-foreground">Configure how creators can apply to your campaigns</p>
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

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <p className="text-sm font-medium">Auto-approve Applications</p>
              <p className="text-xs text-muted-foreground">Automatically accept creators who meet your criteria</p>
            </div>
            <Switch
              checked={settings.auto_approve_applications}
              onCheckedChange={(checked) => updateSetting("auto_approve_applications", checked)}
            />
          </div>

          {settings.auto_approve_applications && (
            <div className="p-4 rounded-lg border bg-muted/30 ml-4">
              <Label className="text-xs text-muted-foreground">Minimum follower count for auto-approval</Label>
              <Input
                type="number"
                placeholder="e.g., 1000 (leave empty for any)"
                value={settings.auto_approve_min_followers || ""}
                onChange={(e) => updateSetting("auto_approve_min_followers", e.target.value ? parseInt(e.target.value) : null)}
                className="mt-1.5 h-9"
              />
            </div>
          )}

          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <p className="text-sm font-medium">Require Application Questions</p>
              <p className="text-xs text-muted-foreground">Creators must answer your custom questions when applying</p>
            </div>
            <Switch
              checked={settings.application_questions_required}
              onCheckedChange={(checked) => updateSetting("application_questions_required", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <p className="text-sm font-medium">Require Contract Signature</p>
              <p className="text-xs text-muted-foreground">Creators must sign a contract before they can submit content</p>
            </div>
            <Switch
              checked={settings.require_contract_signature}
              onCheckedChange={(checked) => updateSetting("require_contract_signature", checked)}
            />
          </div>
        </div>
      </section>

      <hr className="border-border/50" />

      {/* Payout Settings */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold font-inter tracking-[-0.5px]">Payout Settings</h2>
          <p className="text-xs text-muted-foreground">Configure payout timing and review periods</p>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <Label className="text-xs text-muted-foreground">Payout Clearing Period (days)</Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">Time to review submissions before payouts are released</p>
          <Select
            value={settings.payout_clearing_days.toString()}
            onValueChange={(v) => updateSetting("payout_clearing_days", parseInt(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="5">5 days</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <hr className="border-border/50" />

      {/* Notification Settings */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold font-inter tracking-[-0.5px]">Notification Preferences</h2>
          <p className="text-xs text-muted-foreground">Choose when to receive email notifications</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <p className="text-sm font-medium">New Application</p>
              <p className="text-xs text-muted-foreground">Email when a creator applies to your campaign</p>
            </div>
            <Switch
              checked={settings.email_on_new_application}
              onCheckedChange={(checked) => updateSetting("email_on_new_application", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <p className="text-sm font-medium">Content Submission</p>
              <p className="text-xs text-muted-foreground">Email when a creator submits new content</p>
            </div>
            <Switch
              checked={settings.email_on_submission}
              onCheckedChange={(checked) => updateSetting("email_on_submission", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <p className="text-sm font-medium">Payout Request</p>
              <p className="text-xs text-muted-foreground">Email when a creator requests a payout</p>
            </div>
            <Switch
              checked={settings.email_on_payout_request}
              onCheckedChange={(checked) => updateSetting("email_on_payout_request", checked)}
            />
          </div>
        </div>
      </section>

      <hr className="border-border/50" />

      {/* Milestones */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold font-inter tracking-[-0.5px]">Milestone Notifications</h2>
            <p className="text-xs text-muted-foreground">Auto-notify creators when they hit performance milestones</p>
          </div>
          <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="font-inter tracking-[-0.5px]">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Milestone</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={milestoneType} onValueChange={(v) => setMilestoneType(v as any)}>
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
          <p className="text-sm text-muted-foreground">No milestones configured yet</p>
        ) : (
          <div className="space-y-2">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <Switch checked={m.is_active} onCheckedChange={async (checked) => {
                    await (supabase.from("milestone_configs" as any).update({ is_active: checked }).eq("id", m.id) as any);
                    setMilestones(milestones.map(x => x.id === m.id ? { ...x, is_active: checked } : x));
                  }} />
                  <div>
                    <p className="text-sm font-medium">
                      {m.milestone_type === "earnings" ? `$${m.threshold.toLocaleString()}` : m.threshold >= 1000 ? `${(m.threshold / 1000).toFixed(0)}K` : m.threshold} {m.milestone_type}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{m.message_template}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteMilestone(m.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-border/50" />

      {/* Creator Tiers */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold font-inter tracking-[-0.5px]">Creator Tiers</h2>
            <p className="text-xs text-muted-foreground">Reward top performers with tier-based RPM multipliers</p>
          </div>
          {tiers.length === 0 ? (
            <Button size="sm" variant="ghost" className="font-inter tracking-[-0.5px]" onClick={handleCreateDefaultTiers}>
              Create Default Tiers
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="font-inter tracking-[-0.5px]" onClick={() => { resetTierForm(); setTierDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
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
          <p className="text-sm text-muted-foreground">No tiers configured yet</p>
        ) : (
          <div className="space-y-2">
            {tiers.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color || "#8B5CF6" }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium font-geist">{t.name}</span>
                      {t.is_default && <Badge variant="outline" className="text-[10px] font-inter tracking-[-0.5px]">Default</Badge>}
                      <Badge variant="outline" className="text-[10px] font-inter tracking-[-0.5px]">{t.rpm_multiplier}x RPM</Badge>
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">{t.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
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
      </section>

      <hr className="border-border/50" />

      {/* Creator Strikes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold font-inter tracking-[-0.5px]">Creator Strikes</h2>
            <p className="text-xs text-muted-foreground">Track missed deadlines and content issues</p>
          </div>
          <Dialog open={strikeDialogOpen} onOpenChange={setStrikeDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="font-inter tracking-[-0.5px]">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
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
                    <Select value={strikeSeverity.toString()} onValueChange={(v) => setStrikeSeverity(parseInt(v))}>
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
          <p className="text-sm text-muted-foreground">No strikes recorded - all creators meeting commitments</p>
        ) : (
          <div className="space-y-2">
            {strikes.map((s) => {
              const severityInfo = SEVERITY_LEVELS.find(l => l.value === s.severity);
              return (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={s.creator?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{s.creator?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{s.creator?.full_name || s.creator?.username}</span>
                        <Badge variant="outline" className={`text-[10px] ${severityInfo?.color}`}>{severityInfo?.label}</Badge>
                        {s.is_appealed && <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500">{s.appeal_status || "Appeal Pending"}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
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
      </section>
    </div>
  );
}
