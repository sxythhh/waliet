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
import {
  Plus, Trash2, Pencil, Shield, Copy, Globe, Hash, Clock,
  Eye, AtSign, Ban, AlertTriangle, CheckCircle2, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AutoRejectionRule {
  id: string;
  brand_id: string;
  campaign_id: string | null;
  boost_id: string | null;
  rule_type: string;
  rule_value: string | null;
  rejection_message: string;
  is_active: boolean;
  created_at: string;
}

interface RejectionLog {
  id: string;
  rule_id: string;
  submission_type: string;
  user_id: string;
  rejection_reason: string;
  video_url: string | null;
  created_at: string;
  profiles?: {
    username: string;
  };
}

interface Campaign {
  id: string;
  title: string;
}

interface Boost {
  id: string;
  title: string;
}

interface AutoRejectionRulesTabProps {
  brandId: string;
  boostId?: string;
}

const RULE_TYPES = [
  { value: "duplicate_video", label: "Duplicate Video", icon: Copy, description: "Reject videos that have already been submitted" },
  { value: "wrong_platform", label: "Wrong Platform", icon: Globe, description: "Reject submissions from unauthorized platforms" },
  { value: "blacklisted_hashtag", label: "Blacklisted Hashtag", icon: Hash, description: "Reject videos containing specific hashtags" },
  { value: "minimum_views", label: "Minimum Views", icon: Eye, description: "Reject videos with fewer than required views" },
  { value: "minimum_duration", label: "Minimum Duration", icon: Clock, description: "Reject videos shorter than required duration" },
  { value: "maximum_duration", label: "Maximum Duration", icon: Clock, description: "Reject videos longer than allowed duration" },
  { value: "missing_hashtag", label: "Missing Hashtag", icon: Hash, description: "Reject videos missing required hashtags" },
  { value: "missing_mention", label: "Missing Mention", icon: AtSign, description: "Reject videos missing required mentions" }
];

export function AutoRejectionRulesTab({ brandId, boostId }: AutoRejectionRulesTabProps) {
  const [rules, setRules] = useState<AutoRejectionRule[]>([]);
  const [logs, setLogs] = useState<RejectionLog[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoRejectionRule | null>(null);
  const [activeTab, setActiveTab] = useState("rules");

  // Form state - when boostId is provided, default to boost target
  const [ruleType, setRuleType] = useState("duplicate_video");
  const [ruleValue, setRuleValue] = useState("");
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [targetType, setTargetType] = useState<"all" | "campaign" | "boost">(boostId ? "boost" : "all");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedBoost, setSelectedBoost] = useState(boostId || "");

  useEffect(() => {
    fetchData();
  }, [brandId, boostId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Build rules query - filter by boostId if provided
      let rulesQuery = supabase
        .from("auto_rejection_rules")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });

      if (boostId) {
        rulesQuery = rulesQuery.eq("boost_id", boostId);
      }

      const [rulesResult, logsResult, campaignsResult, boostsResult] = await Promise.all([
        rulesQuery,
        supabase
          .from("auto_rejection_log")
          .select(`
            *,
            profiles:user_id(username)
          `)
          .order("created_at", { ascending: false })
          .limit(50),
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

      if (!rulesResult.error) setRules(rulesResult.data || []);
      if (!logsResult.error) setLogs(logsResult.data || []);
      if (!campaignsResult.error) setCampaigns(campaignsResult.data || []);
      if (!boostsResult.error) setBoosts(boostsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setRuleType("duplicate_video");
    setRuleValue("");
    setRejectionMessage("");
    setTargetType(boostId ? "boost" : "all");
    setSelectedCampaign("");
    setSelectedBoost(boostId || "");
    setEditingRule(null);
  };

  const handleOpenDialog = (rule?: AutoRejectionRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleType(rule.rule_type);
      setRuleValue(rule.rule_value || "");
      setRejectionMessage(rule.rejection_message);
      if (rule.campaign_id) {
        setTargetType("campaign");
        setSelectedCampaign(rule.campaign_id);
      } else if (rule.boost_id) {
        setTargetType("boost");
        setSelectedBoost(rule.boost_id);
      } else {
        setTargetType("all");
      }
    } else {
      resetForm();
      // Set default message based on rule type
      const ruleInfo = RULE_TYPES.find(r => r.value === "duplicate_video");
      setRejectionMessage("This video has already been submitted. Please submit a unique video.");
    }
    setIsDialogOpen(true);
  };

  const handleRuleTypeChange = (type: string) => {
    setRuleType(type);
    // Set default rejection message
    const messages: Record<string, string> = {
      duplicate_video: "This video has already been submitted. Please submit a unique video.",
      wrong_platform: "This video was submitted from an unauthorized platform.",
      blacklisted_hashtag: "This video contains a prohibited hashtag.",
      minimum_views: "This video does not meet the minimum view requirement.",
      minimum_duration: "This video is shorter than the minimum required duration.",
      maximum_duration: "This video exceeds the maximum allowed duration.",
      missing_hashtag: "This video is missing a required hashtag.",
      missing_mention: "This video is missing a required mention."
    };
    setRejectionMessage(messages[type] || "");
  };

  const handleSave = async () => {
    if (!rejectionMessage.trim()) {
      toast.error("Please provide a rejection message");
      return;
    }

    // Validate rule value for certain types
    if (["blacklisted_hashtag", "missing_hashtag", "missing_mention", "minimum_views", "minimum_duration", "maximum_duration", "wrong_platform"].includes(ruleType) && !ruleValue.trim()) {
      toast.error("Please provide a value for this rule type");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        brand_id: brandId,
        rule_type: ruleType,
        rule_value: ruleValue.trim() || null,
        rejection_message: rejectionMessage.trim(),
        campaign_id: targetType === "campaign" ? selectedCampaign : null,
        boost_id: targetType === "boost" ? selectedBoost : null
      };

      if (editingRule) {
        const { error } = await supabase
          .from("auto_rejection_rules")
          .update(data)
          .eq("id", editingRule.id);

        if (error) throw error;
        toast.success("Rule updated");
      } else {
        const { error } = await supabase
          .from("auto_rejection_rules")
          .insert(data);

        if (error) throw error;
        toast.success("Rule created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving rule:", error);
      toast.error("Failed to save rule");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (rule: AutoRejectionRule) => {
    try {
      const { error } = await supabase
        .from("auto_rejection_rules")
        .update({ is_active: !rule.is_active })
        .eq("id", rule.id);

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

  const handleDelete = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from("auto_rejection_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;
      toast.success("Rule deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Failed to delete rule");
    }
  };

  const getRuleIcon = (type: string) => {
    const ruleInfo = RULE_TYPES.find(r => r.value === type);
    const Icon = ruleInfo?.icon || Shield;
    return <Icon className="h-4 w-4" />;
  };

  const getRuleLabel = (type: string) => {
    const ruleInfo = RULE_TYPES.find(r => r.value === type);
    return ruleInfo?.label || type;
  };

  const getTargetLabel = (rule: AutoRejectionRule) => {
    if (rule.campaign_id) {
      const campaign = campaigns.find(c => c.id === rule.campaign_id);
      return campaign?.title || "Campaign";
    }
    if (rule.boost_id) {
      const boost = boosts.find(b => b.id === rule.boost_id);
      return boost?.title || "Boost";
    }
    return "All programs";
  };

  const getValueLabel = (rule: AutoRejectionRule) => {
    if (!rule.rule_value) return null;

    switch (rule.rule_type) {
      case "minimum_views":
        return `${parseInt(rule.rule_value).toLocaleString()} views`;
      case "minimum_duration":
      case "maximum_duration":
        return `${rule.rule_value} seconds`;
      case "blacklisted_hashtag":
      case "missing_hashtag":
        return `#${rule.rule_value}`;
      case "missing_mention":
        return `@${rule.rule_value}`;
      case "wrong_platform":
        return rule.rule_value;
      default:
        return rule.rule_value;
    }
  };

  const needsValueInput = (type: string) => {
    return ["blacklisted_hashtag", "missing_hashtag", "missing_mention", "minimum_views", "minimum_duration", "maximum_duration", "wrong_platform"].includes(type);
  };

  const getValuePlaceholder = (type: string) => {
    switch (type) {
      case "minimum_views":
        return "1000";
      case "minimum_duration":
      case "maximum_duration":
        return "30";
      case "blacklisted_hashtag":
      case "missing_hashtag":
        return "hashtag (without #)";
      case "missing_mention":
        return "username (without @)";
      case "wrong_platform":
        return "tiktok, youtube, instagram";
      default:
        return "";
    }
  };

  const getValueLabel2 = (type: string) => {
    switch (type) {
      case "minimum_views":
        return "Minimum Views";
      case "minimum_duration":
        return "Minimum Duration (seconds)";
      case "maximum_duration":
        return "Maximum Duration (seconds)";
      case "blacklisted_hashtag":
        return "Hashtag to Block";
      case "missing_hashtag":
        return "Required Hashtag";
      case "missing_mention":
        return "Required Mention";
      case "wrong_platform":
        return "Allowed Platforms (comma-separated)";
      default:
        return "Value";
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
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-red-500/10">
            <Shield className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Auto-Rejection Rules</h2>
            <p className="text-sm text-muted-foreground">
              Automatically reject submissions that don't meet your criteria
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? "Edit Rule" : "Create Auto-Rejection Rule"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Rule Type</Label>
                <Select value={ruleType} onValueChange={handleRuleTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {RULE_TYPES.find(r => r.value === ruleType)?.description}
                </p>
              </div>

              {needsValueInput(ruleType) && (
                <div className="space-y-2">
                  <Label>{getValueLabel2(ruleType)}</Label>
                  <Input
                    value={ruleValue}
                    onChange={(e) => setRuleValue(e.target.value)}
                    placeholder={getValuePlaceholder(ruleType)}
                  />
                </div>
              )}

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
                <Label>Rejection Message</Label>
                <Textarea
                  value={rejectionMessage}
                  onChange={(e) => setRejectionMessage(e.target.value)}
                  placeholder="Message shown to the creator when rejected..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This message will be shown to creators when their submission is auto-rejected
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : editingRule ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules" className="gap-2">
            <Shield className="h-4 w-4" />
            Rules ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Ban className="h-4 w-4" />
            Rejection Log ({logs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          {rules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No auto-rejection rules configured</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Create rules to automatically filter submissions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => handleToggleActive(rule)}
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getRuleIcon(rule.rule_type)}
                            <span className="font-medium">{getRuleLabel(rule.rule_type)}</span>
                            {getValueLabel(rule) && (
                              <Badge variant="outline" className="text-xs">
                                {getValueLabel(rule)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {rule.rejection_message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Applies to: {getTargetLabel(rule)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(rule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(rule.id)}
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

        <TabsContent value="logs" className="mt-4">
          {logs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No auto-rejections yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Auto-rejections will appear here when rules are triggered
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <Card key={log.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10">
                          <XCircle className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            @{log.profiles?.username || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.rejection_reason}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "MMM d, h:mm a")}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {log.submission_type}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            How Auto-Rejection Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <div className="font-medium">1. Configure Rules</div>
              <p className="text-muted-foreground">
                Set up rules based on video content, platform, hashtags, or performance metrics.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-medium">2. Automatic Checking</div>
              <p className="text-muted-foreground">
                Every submission is checked against your active rules before review.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-medium">3. Instant Feedback</div>
              <p className="text-muted-foreground">
                Creators receive your custom rejection message immediately if rules are violated.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
