import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, CheckCircle, XCircle, Clock, Shield, TrendingDown, MoreHorizontal, Trash2, MessageSquare } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface CreatorStrikesTabProps {
  brandId: string;
}

interface Strike {
  id: string;
  creator_id: string;
  strike_type: string;
  reason: string | null;
  scheduled_date: string | null;
  severity: number;
  is_appealed: boolean;
  appeal_status: string | null;
  expires_at: string | null;
  created_at: string;
  creator?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ReliabilityScore {
  creator_id: string;
  total_strikes: number;
  active_strikes: number;
  reliability_score: number;
  on_time_rate: number;
  creator?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface StrikeThreshold {
  id: string;
  threshold_name: string;
  strike_count: number;
  action_type: string;
  is_active: boolean;
}

const STRIKE_TYPES = [
  { value: "missed_deadline", label: "Missed Deadline" },
  { value: "late_submission", label: "Late Submission" },
  { value: "content_violation", label: "Content Violation" },
  { value: "no_show", label: "No Show" },
  { value: "other", label: "Other" },
];

const SEVERITY_LEVELS = [
  { value: 1, label: "Minor", color: "bg-yellow-500/10 text-yellow-500" },
  { value: 2, label: "Moderate", color: "bg-orange-500/10 text-orange-500" },
  { value: 3, label: "Severe", color: "bg-red-500/10 text-red-500" },
];

export function CreatorStrikesTab({ brandId }: CreatorStrikesTabProps) {
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [reliabilityScores, setReliabilityScores] = useState<ReliabilityScore[]>([]);
  const [thresholds, setThresholds] = useState<StrikeThreshold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const [creators, setCreators] = useState<{ id: string; username: string; full_name: string | null; avatar_url: string | null }[]>([]);

  // Form state
  const [strikeType, setStrikeType] = useState("missed_deadline");
  const [severity, setSeverity] = useState(1);
  const [reason, setReason] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  useEffect(() => {
    fetchData();
  }, [brandId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch strikes with creator info
      const { data: strikesData } = await supabase
        .from("creator_strikes")
        .select(`
          *,
          creator:creator_id(username, full_name, avatar_url)
        `)
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .limit(50);

      setStrikes((strikesData || []) as Strike[]);

      // Fetch reliability scores
      const { data: scoresData } = await supabase
        .from("creator_reliability_scores")
        .select(`
          *,
          creator:creator_id(username, full_name, avatar_url)
        `)
        .eq("brand_id", brandId)
        .order("reliability_score", { ascending: true });

      setReliabilityScores((scoresData || []) as ReliabilityScore[]);

      // Fetch thresholds
      const { data: thresholdsData } = await supabase
        .from("strike_thresholds")
        .select("*")
        .eq("brand_id", brandId)
        .order("strike_count");

      setThresholds(thresholdsData || []);

      // Fetch creators for the dropdown
      const { data: creatorsData } = await supabase
        .from("campaign_participants")
        .select(`
          user_id,
          profiles:user_id(id, username, full_name, avatar_url)
        `)
        .eq("brand_id", brandId)
        .eq("status", "accepted");

      const uniqueCreators = new Map();
      creatorsData?.forEach((p: any) => {
        if (p.profiles && !uniqueCreators.has(p.profiles.id)) {
          uniqueCreators.set(p.profiles.id, p.profiles);
        }
      });
      setCreators(Array.from(uniqueCreators.values()));

    } catch (error) {
      console.error("Error fetching strike data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStrike = async () => {
    if (!selectedCreatorId) {
      toast.error("Please select a creator");
      return;
    }

    try {
      const { error } = await supabase
        .from("creator_strikes")
        .insert({
          brand_id: brandId,
          creator_id: selectedCreatorId,
          strike_type: strikeType,
          severity,
          reason: reason || null,
          scheduled_date: scheduledDate || null,
        });

      if (error) throw error;

      toast.success("Strike recorded");
      setAddDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error adding strike:", error);
      toast.error(error.message || "Failed to add strike");
    }
  };

  const handleRemoveStrike = async (strikeId: string) => {
    try {
      const { error } = await supabase
        .from("creator_strikes")
        .delete()
        .eq("id", strikeId);

      if (error) throw error;

      toast.success("Strike removed");
      setStrikes(strikes.filter(s => s.id !== strikeId));
    } catch (error) {
      console.error("Error removing strike:", error);
      toast.error("Failed to remove strike");
    }
  };

  const handleAppealDecision = async (strikeId: string, decision: "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from("creator_strikes")
        .update({
          appeal_status: decision,
          appeal_reviewed_at: new Date().toISOString(),
        })
        .eq("id", strikeId);

      if (error) throw error;

      toast.success(`Appeal ${decision}`);
      fetchData();
    } catch (error) {
      console.error("Error updating appeal:", error);
      toast.error("Failed to update appeal");
    }
  };

  const resetForm = () => {
    setSelectedCreatorId("");
    setStrikeType("missed_deadline");
    setSeverity(1);
    setReason("");
    setScheduledDate("");
  };

  const getReliabilityColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getReliabilityBg = (score: number) => {
    if (score >= 80) return "bg-green-500/10";
    if (score >= 60) return "bg-yellow-500/10";
    if (score >= 40) return "bg-orange-500/10";
    return "bg-red-500/10";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const activeStrikes = strikes.filter(s =>
    (!s.expires_at || new Date(s.expires_at) > new Date()) &&
    s.appeal_status !== "approved"
  );

  const pendingAppeals = strikes.filter(s => s.is_appealed && !s.appeal_status);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Active Strikes
          </div>
          <p className="text-2xl font-bold">{activeStrikes.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Clock className="h-3.5 w-3.5" />
            Pending Appeals
          </div>
          <p className="text-2xl font-bold">{pendingAppeals.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingDown className="h-3.5 w-3.5" />
            At-Risk Creators
          </div>
          <p className="text-2xl font-bold">
            {reliabilityScores.filter(s => s.reliability_score < 60).length}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Shield className="h-3.5 w-3.5" />
            Avg Reliability
          </div>
          <p className="text-2xl font-bold">
            {reliabilityScores.length > 0
              ? Math.round(reliabilityScores.reduce((sum, s) => sum + s.reliability_score, 0) / reliabilityScores.length)
              : 100}%
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Strikes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Recent Strikes
                </CardTitle>
                <CardDescription>
                  Track missed deadlines and content issues
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Strike
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {strikes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500/50 mb-3" />
                  <p className="text-sm font-medium">No strikes recorded</p>
                  <p className="text-xs text-muted-foreground">
                    All creators are meeting their commitments
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {strikes.map((strike) => {
                    const severityInfo = SEVERITY_LEVELS.find(s => s.value === strike.severity);
                    const isExpired = strike.expires_at && new Date(strike.expires_at) < new Date();
                    const isApproved = strike.appeal_status === "approved";

                    return (
                      <div
                        key={strike.id}
                        className={`p-3 rounded-lg border ${isExpired || isApproved ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={strike.creator?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {strike.creator?.username?.slice(0, 2).toUpperCase() || "??"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {strike.creator?.full_name || strike.creator?.username}
                                </span>
                                <Badge variant="outline" className={severityInfo?.color}>
                                  {severityInfo?.label}
                                </Badge>
                                {strike.is_appealed && (
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                                    {strike.appeal_status || "Appeal Pending"}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {STRIKE_TYPES.find(t => t.value === strike.strike_type)?.label}
                                {strike.scheduled_date && ` - ${format(new Date(strike.scheduled_date), "MMM d")}`}
                              </p>
                              {strike.reason && (
                                <p className="text-xs text-muted-foreground mt-1">{strike.reason}</p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(strike.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {strike.is_appealed && !strike.appeal_status && (
                                <>
                                  <DropdownMenuItem onClick={() => handleAppealDecision(strike.id, "approved")}>
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                    Approve Appeal
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAppealDecision(strike.id, "rejected")}>
                                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                    Reject Appeal
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleRemoveStrike(strike.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Strike
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Reliability Scores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Creator Reliability
            </CardTitle>
            <CardDescription>
              Track creator performance and reliability scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {reliabilityScores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium">No reliability data yet</p>
                  <p className="text-xs text-muted-foreground">
                    Scores will appear as creators complete content
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reliabilityScores.map((score) => (
                    <div
                      key={score.creator_id}
                      className="p-3 rounded-lg border flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={score.creator?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {score.creator?.username?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {score.creator?.full_name || score.creator?.username}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{score.active_strikes} active strikes</span>
                            <span>|</span>
                            <span>{score.on_time_rate}% on-time</span>
                          </div>
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getReliabilityBg(score.reliability_score)} ${getReliabilityColor(score.reliability_score)}`}
                      >
                        {score.reliability_score}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Strike Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Strike Thresholds</CardTitle>
          <CardDescription>
            Configure automatic actions when creators reach strike thresholds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {thresholds.map((threshold) => (
              <div
                key={threshold.id}
                className="p-4 rounded-lg border bg-muted/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">
                    {threshold.threshold_name.replace("_", " ")}
                  </span>
                  <Badge variant={threshold.is_active ? "default" : "secondary"}>
                    {threshold.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-2xl font-bold">{threshold.strike_count} strikes</p>
                <p className="text-xs text-muted-foreground capitalize">
                  Action: {threshold.action_type.replace("_", " ")}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Strike Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Strike</DialogTitle>
            <DialogDescription>
              Add a strike to a creator's record for missed deadlines or issues
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Creator</Label>
              <Select value={selectedCreatorId} onValueChange={setSelectedCreatorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select creator" />
                </SelectTrigger>
                <SelectContent>
                  {creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      {creator.full_name || creator.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Strike Type</Label>
              <Select value={strikeType} onValueChange={setStrikeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRIKE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity.toString()} onValueChange={(v) => setSeverity(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value.toString()}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Scheduled Date (Optional)</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder="Describe the issue..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStrike}>
              Record Strike
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
