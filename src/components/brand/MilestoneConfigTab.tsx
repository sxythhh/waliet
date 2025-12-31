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
import { Plus, Eye, DollarSign, Video, Trash2, Pencil, Trophy, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface MilestoneConfig {
  id: string;
  brand_id: string;
  campaign_id: string | null;
  boost_id: string | null;
  milestone_type: "views" | "earnings" | "submissions";
  threshold: number;
  message_template: string;
  is_active: boolean;
  created_at: string;
}

interface Campaign {
  id: string;
  title: string;
}

interface Boost {
  id: string;
  title: string;
}

interface MilestoneConfigTabProps {
  brandId: string;
}

export function MilestoneConfigTab({ brandId }: MilestoneConfigTabProps) {
  const [milestones, setMilestones] = useState<MilestoneConfig[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneConfig | null>(null);

  // Form state
  const [milestoneType, setMilestoneType] = useState<"views" | "earnings" | "submissions">("views");
  const [threshold, setThreshold] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [targetType, setTargetType] = useState<"all" | "campaign" | "boost">("all");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedBoost, setSelectedBoost] = useState("");

  useEffect(() => {
    fetchData();
  }, [brandId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [milestonesResult, campaignsResult, boostsResult] = await Promise.all([
        (supabase
          .from("milestone_configs" as any)
          .select("*")
          .eq("brand_id", brandId)
          .order("milestone_type")
          .order("threshold") as any),
        supabase
          .from("campaigns")
          .select("id, title")
          .eq("brand_id", brandId)
          .order("title"),
        supabase
          .from("bounty_campaigns")
          .select("id, title")
          .eq("brand_id", brandId)
          .order("title")
      ]);

      if (milestonesResult.error) throw milestonesResult.error;
      setMilestones((milestonesResult.data || []) as MilestoneConfig[]);
      setCampaigns(campaignsResult.data || []);
      setBoosts(boostsResult.data || []);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      toast.error("Failed to load milestones");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setMilestoneType("views");
    setThreshold("");
    setMessageTemplate("");
    setTargetType("all");
    setSelectedCampaign("");
    setSelectedBoost("");
    setEditingMilestone(null);
  };

  const handleOpenDialog = (milestone?: MilestoneConfig) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setMilestoneType(milestone.milestone_type);
      setThreshold(milestone.threshold.toString());
      setMessageTemplate(milestone.message_template);
      if (milestone.campaign_id) {
        setTargetType("campaign");
        setSelectedCampaign(milestone.campaign_id);
      } else if (milestone.boost_id) {
        setTargetType("boost");
        setSelectedBoost(milestone.boost_id);
      } else {
        setTargetType("all");
      }
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!threshold || !messageTemplate.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const thresholdNum = parseFloat(threshold);
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      toast.error("Please enter a valid threshold");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        brand_id: brandId,
        milestone_type: milestoneType,
        threshold: thresholdNum,
        message_template: messageTemplate.trim(),
        campaign_id: targetType === "campaign" ? selectedCampaign : null,
        boost_id: targetType === "boost" ? selectedBoost : null
      };

      if (editingMilestone) {
        const { error } = await (supabase
          .from("milestone_configs" as any)
          .update(data)
          .eq("id", editingMilestone.id) as any);

        if (error) throw error;
        toast.success("Milestone updated");
      } else {
        const { error } = await (supabase
          .from("milestone_configs" as any)
          .insert(data) as any);

        if (error) throw error;
        toast.success("Milestone created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving milestone:", error);
      toast.error("Failed to save milestone");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (milestone: MilestoneConfig) => {
    try {
      const { error } = await (supabase
        .from("milestone_configs" as any)
        .update({ is_active: !milestone.is_active })
        .eq("id", milestone.id) as any);

      if (error) throw error;

      setMilestones(prev =>
        prev.map(m =>
          m.id === milestone.id ? { ...m, is_active: !m.is_active } : m
        )
      );
    } catch (error) {
      console.error("Error toggling milestone:", error);
      toast.error("Failed to update milestone");
    }
  };

  const handleDelete = async (milestoneId: string) => {
    try {
      const { error } = await (supabase
        .from("milestone_configs" as any)
        .delete()
        .eq("id", milestoneId) as any);

      if (error) throw error;
      toast.success("Milestone deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting milestone:", error);
      toast.error("Failed to delete milestone");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "views":
        return <Eye className="h-4 w-4" />;
      case "earnings":
        return <DollarSign className="h-4 w-4" />;
      case "submissions":
        return <Video className="h-4 w-4" />;
      default:
        return <Trophy className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "views":
        return "bg-blue-500/10 text-blue-500";
      case "earnings":
        return "bg-green-500/10 text-green-500";
      case "submissions":
        return "bg-purple-500/10 text-purple-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatThreshold = (type: string, value: number) => {
    if (type === "earnings") {
      return `$${value.toLocaleString()}`;
    } else if (type === "views") {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
      return value.toString();
    }
    return value.toString();
  };

  const getTargetLabel = (milestone: MilestoneConfig) => {
    if (milestone.campaign_id) {
      const campaign = campaigns.find(c => c.id === milestone.campaign_id);
      return campaign?.title || "Campaign";
    }
    if (milestone.boost_id) {
      const boost = boosts.find(b => b.id === milestone.boost_id);
      return boost?.title || "Boost";
    }
    return "All programs";
  };

  // Group milestones by type
  const viewsMilestones = milestones.filter(m => m.milestone_type === "views");
  const earningsMilestones = milestones.filter(m => m.milestone_type === "earnings");
  const submissionsMilestones = milestones.filter(m => m.milestone_type === "submissions");

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Milestone Notifications
          </h2>
          <p className="text-sm text-muted-foreground">
            Automatically notify creators when they reach performance milestones
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMilestone ? "Edit Milestone" : "Create Milestone"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Milestone Type</Label>
                <Select value={milestoneType} onValueChange={(v) => setMilestoneType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="views">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Views
                      </div>
                    </SelectItem>
                    <SelectItem value="earnings">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Earnings
                      </div>
                    </SelectItem>
                    <SelectItem value="submissions">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Submissions
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Threshold {milestoneType === "earnings" ? "(USD)" : milestoneType === "views" ? "(views)" : "(count)"}
                </Label>
                <Input
                  type="number"
                  placeholder={milestoneType === "earnings" ? "100" : "10000"}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Applies To</Label>
                <Select value={targetType} onValueChange={(v) => setTargetType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All programs</SelectItem>
                    <SelectItem value="campaign">Specific campaign</SelectItem>
                    <SelectItem value="boost">Specific boost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType === "campaign" && campaigns.length > 0 && (
                <div className="space-y-2">
                  <Label>Campaign</Label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {targetType === "boost" && boosts.length > 0 && (
                <div className="space-y-2">
                  <Label>Boost</Label>
                  <Select value={selectedBoost} onValueChange={setSelectedBoost}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select boost" />
                    </SelectTrigger>
                    <SelectContent>
                      {boosts.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Message Template</Label>
                <Textarea
                  placeholder="Congratulations! You've reached a new milestone..."
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This message will be sent to creators when they hit this milestone
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : editingMilestone ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Views Milestones */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Eye className="h-4 w-4 text-blue-500" />
              </div>
              View Milestones
            </CardTitle>
            <CardDescription>
              Notify when views reach thresholds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {viewsMilestones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No view milestones configured
              </p>
            ) : (
              viewsMilestones.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={m.is_active}
                      onCheckedChange={() => handleToggleActive(m)}
                    />
                    <div>
                      <p className="font-medium text-sm">
                        {formatThreshold(m.milestone_type, m.threshold)} views
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getTargetLabel(m)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleOpenDialog(m)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(m.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Earnings Milestones */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              Earnings Milestones
            </CardTitle>
            <CardDescription>
              Notify when earnings reach thresholds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {earningsMilestones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No earnings milestones configured
              </p>
            ) : (
              earningsMilestones.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={m.is_active}
                      onCheckedChange={() => handleToggleActive(m)}
                    />
                    <div>
                      <p className="font-medium text-sm">
                        {formatThreshold(m.milestone_type, m.threshold)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getTargetLabel(m)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleOpenDialog(m)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(m.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Submissions Milestones */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Video className="h-4 w-4 text-purple-500" />
              </div>
              Submission Milestones
            </CardTitle>
            <CardDescription>
              Notify when submissions reach count
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {submissionsMilestones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No submission milestones configured
              </p>
            ) : (
              submissionsMilestones.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={m.is_active}
                      onCheckedChange={() => handleToggleActive(m)}
                    />
                    <div>
                      <p className="font-medium text-sm">
                        {m.threshold} submissions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getTargetLabel(m)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleOpenDialog(m)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(m.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <div className="font-medium">1. Configure Milestones</div>
              <p className="text-muted-foreground">
                Set thresholds for views, earnings, or submissions that trigger notifications.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-medium">2. Automatic Detection</div>
              <p className="text-muted-foreground">
                The system monitors creator performance and detects when milestones are reached.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-medium">3. Instant Notification</div>
              <p className="text-muted-foreground">
                Creators receive your custom message when they hit the milestone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
