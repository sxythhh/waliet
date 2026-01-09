import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  rule_type: string;
  rule_config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RejectionLog {
  id: string;
  rule_id: string | null;
  submission_id: string | null;
  rejection_reason: string | null;
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

  // Form state
  const [ruleType, setRuleType] = useState("duplicate_video");
  const [ruleValue, setRuleValue] = useState("");
  const [rejectionMessage, setRejectionMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, [brandId, boostId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch rules
      const { data: rulesData, error: rulesError } = await supabase
        .from("auto_rejection_rules")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });

      if (rulesError) throw rulesError;

      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from("auto_rejection_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("id, title")
        .eq("brand_id", brandId)
        .order("title");

      // Fetch boosts
      const { data: boostsData } = await supabase
        .from("bounty_campaigns")
        .select("id, title")
        .eq("brand_id", brandId)
        .order("title");

      setRules(rulesData || []);
      setLogs(logsData || []);
      setCampaigns(campaignsData || []);
      setBoosts(boostsData || []);
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
    setEditingRule(null);
  };

  const handleOpenDialog = (rule?: AutoRejectionRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleType(rule.rule_type);
      setRuleValue(rule.rule_config?.value || "");
      setRejectionMessage(rule.rule_config?.message || "");
    } else {
      resetForm();
      setRejectionMessage("This video has already been submitted. Please submit a unique video.");
    }
    setIsDialogOpen(true);
  };

  const handleRuleTypeChange = (type: string) => {
    setRuleType(type);
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

    setIsSaving(true);
    try {
      const ruleConfig = {
        value: ruleValue.trim() || null,
        message: rejectionMessage.trim()
      };

      if (editingRule) {
        const { error } = await supabase
          .from("auto_rejection_rules")
          .update({
            rule_type: ruleType,
            rule_config: ruleConfig,
          })
          .eq("id", editingRule.id);

        if (error) throw error;
        toast.success("Rule updated");
      } else {
        const { error } = await supabase
          .from("auto_rejection_rules")
          .insert({
            brand_id: brandId,
            rule_type: ruleType,
            rule_config: ruleConfig,
          });

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

  const getValueLabel = (type: string) => {
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
                  <Label>{getValueLabel(ruleType)}</Label>
                  <Input
                    value={ruleValue}
                    onChange={(e) => setRuleValue(e.target.value)}
                    placeholder={getValuePlaceholder(ruleType)}
                  />
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

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {editingRule ? "Update" : "Create"} Rule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="logs">Recent Rejections ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          {rules.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-lg font-medium text-muted-foreground">No rules configured</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create auto-rejection rules to automatically filter submissions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {rules.map((rule) => (
                <Card key={rule.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {getRuleIcon(rule.rule_type)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{getRuleLabel(rule.rule_type)}</p>
                        {rule.rule_config?.value && (
                          <p className="text-xs text-muted-foreground">
                            Value: {rule.rule_config.value}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active ?? true}
                        onCheckedChange={() => handleToggleActive(rule)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(rule)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          {logs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-lg font-medium text-muted-foreground">No rejections yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Auto-rejected submissions will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <Card key={log.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{log.rejection_reason || "Auto-rejected"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "PPp")}
                      </p>
                    </div>
                    <Badge variant="destructive">Rejected</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
