import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Crown,
  Star,
  Trophy,
  Award,
  Sparkles,
  Users,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  History,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreatorTier, CreatorTierAssignment, TierChangeHistory } from "@/types/creatorTiers";
import { cn } from "@/lib/utils";

interface CreatorTiersOverviewProps {
  boostId: string;
  onConfigureClick?: () => void;
}

interface CreatorWithTier extends CreatorTierAssignment {
  tier: CreatorTier;
  profile?: {
    id: string;
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

export function CreatorTiersOverview({
  boostId,
  onConfigureClick,
}: CreatorTiersOverviewProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<CreatorTier[]>([]);
  const [creators, setCreators] = useState<CreatorWithTier[]>([]);
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("all");
  const [changeTierDialog, setChangeTierDialog] = useState<{
    open: boolean;
    creator: CreatorWithTier | null;
    newTierId: string;
  }>({ open: false, creator: null, newTierId: "" });
  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean;
    creatorId: string;
    history: TierChangeHistory[];
  }>({ open: false, creatorId: "", history: [] });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from("boost_creator_tiers")
        .select("*")
        .eq("bounty_campaign_id", boostId)
        .order("level", { ascending: true });

      if (tiersError) throw tiersError;
      setTiers((tiersData as CreatorTier[]) || []);

      // Fetch creator assignments with profiles
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("creator_tier_assignments")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        .eq("bounty_campaign_id", boostId);

      if (assignmentsError) throw assignmentsError;

      // Map assignments with tier data
      interface AssignmentWithProfiles extends CreatorTierAssignment {
        profiles?: {
          id: string;
          full_name: string;
          avatar_url: string;
          username: string;
        };
      }

      const creatorsWithTiers = (assignmentsData || []).map((assignment: AssignmentWithProfiles) => ({
        ...assignment,
        tier: tiersData?.find((t: CreatorTier) => t.id === assignment.tier_id),
        profile: assignment.profiles,
      }));

      setCreators(creatorsWithTiers as CreatorWithTier[]);
    } catch (error) {
      console.error("Error fetching tier data:", error);
      toast({
        title: "Error loading tier data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [boostId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openChangeTierDialog = (creator: CreatorWithTier) => {
    setChangeTierDialog({
      open: true,
      creator,
      newTierId: creator.tier_id,
    });
  };

  const changeTier = async () => {
    if (!changeTierDialog.creator || !changeTierDialog.newTierId) return;
    if (changeTierDialog.newTierId === changeTierDialog.creator.tier_id) {
      setChangeTierDialog({ open: false, creator: null, newTierId: "" });
      return;
    }

    setSaving(true);
    try {
      const oldTierId = changeTierDialog.creator.tier_id;
      const newTier = tiers.find((t) => t.id === changeTierDialog.newTierId);
      const oldTier = tiers.find((t) => t.id === oldTierId);

      // Update assignment
      const { error: updateError } = await supabase
        .from("creator_tier_assignments")
        .update({
          tier_id: changeTierDialog.newTierId,
          previous_tier_id: oldTierId,
          assignment_reason: "manual",
          assigned_at: new Date().toISOString(),
        })
        .eq("id", changeTierDialog.creator.id);

      if (updateError) throw updateError;

      // Record in history
      const changeType =
        newTier && oldTier
          ? newTier.level > oldTier.level
            ? "promotion"
            : newTier.level < oldTier.level
            ? "demotion"
            : "lateral"
          : "manual";

      const { error: historyError } = await supabase
        .from("tier_change_history")
        .insert({
          bounty_campaign_id: boostId,
          user_id: changeTierDialog.creator.user_id,
          from_tier_id: oldTierId,
          to_tier_id: changeTierDialog.newTierId,
          change_type: changeType,
          change_reason: `Manual ${changeType} by brand`,
        });

      if (historyError) throw historyError;

      toast({
        title: "Tier updated",
        description: `Creator moved to ${newTier?.name} tier`,
      });

      setChangeTierDialog({ open: false, creator: null, newTierId: "" });
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error updating tier",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const viewHistory = async (creatorId: string) => {
    try {
      const { data, error } = await supabase
        .from("tier_change_history")
        .select(`
          *,
          from_tier:from_tier_id (name, color, level),
          to_tier:to_tier_id (name, color, level)
        `)
        .eq("bounty_campaign_id", boostId)
        .eq("user_id", creatorId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setHistoryDialog({
        open: true,
        creatorId,
        history: (data as TierChangeHistory[]) || [],
      });
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const getTierIcon = (level: number, className?: string) => {
    const iconClass = cn("h-4 w-4", className);
    switch (level) {
      case 1:
        return <Award className={iconClass} />;
      case 2:
        return <Star className={iconClass} />;
      case 3:
        return <Trophy className={iconClass} />;
      case 4:
        return <Crown className={iconClass} />;
      default:
        return <Sparkles className={iconClass} />;
    }
  };

  const getTierDistribution = () => {
    return tiers.map((tier) => ({
      tier,
      count: creators.filter((c) => c.tier_id === tier.id).length,
    }));
  };

  const filteredCreators =
    selectedTierFilter === "all"
      ? creators
      : creators.filter((c) => c.tier_id === selectedTierFilter);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (tiers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm font-medium font-inter tracking-[-0.5px] mb-1">
            No tiers configured
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Set up tiers to create progression levels for creators
          </p>
          {onConfigureClick && (
            <Button size="sm" onClick={onConfigureClick}>
              <Settings className="h-4 w-4 mr-2" />
              Configure Tiers
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const distribution = getTierDistribution();

  return (
    <div className="space-y-4">
      {/* Tier Distribution Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-inter tracking-[-0.5px] flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Creator Distribution
            </CardTitle>
            {onConfigureClick && (
              <Button variant="ghost" size="sm" onClick={onConfigureClick}>
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {distribution.map(({ tier, count }) => (
              <button
                key={tier.id}
                onClick={() =>
                  setSelectedTierFilter(
                    selectedTierFilter === tier.id ? "all" : tier.id
                  )
                }
                className={cn(
                  "flex-1 p-3 rounded-lg border transition-all",
                  selectedTierFilter === tier.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg mx-auto mb-2"
                  style={{ backgroundColor: `${tier.color}20` }}
                >
                  <div style={{ color: tier.color }}>
                    {getTierIcon(tier.level)}
                  </div>
                </div>
                <p className="text-lg font-semibold font-inter tracking-[-0.5px]">
                  {count}
                </p>
                <p className="text-xs text-muted-foreground">{tier.name}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Creator List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-inter tracking-[-0.5px]">
              Creators ({filteredCreators.length})
            </CardTitle>
            <Select value={selectedTierFilter} onValueChange={setSelectedTierFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Filter tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                {tiers.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    {tier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCreators.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No creators in this tier</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCreators.map((creator) => (
                <div
                  key={creator.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 group"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={creator.profile?.avatar_url} />
                    <AvatarFallback>
                      {creator.profile?.full_name?.charAt(0) ||
                        creator.profile?.username?.charAt(0) ||
                        "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">
                      {creator.profile?.full_name || creator.profile?.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {creator.months_in_tier || 0} months in tier
                    </p>
                  </div>
                  <Badge
                    className="text-[10px] px-2"
                    style={{
                      backgroundColor: `${creator.tier?.color}20`,
                      color: creator.tier?.color,
                    }}
                  >
                    {getTierIcon(creator.tier?.level || 1, "h-3 w-3 mr-1")}
                    {creator.tier?.name}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openChangeTierDialog(creator)}>
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Change Tier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => viewHistory(creator.user_id)}>
                        <History className="h-4 w-4 mr-2" />
                        View History
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Tier Dialog */}
      <Dialog
        open={changeTierDialog.open}
        onOpenChange={(open) =>
          !open && setChangeTierDialog({ open: false, creator: null, newTierId: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Creator Tier</DialogTitle>
            <DialogDescription>
              Move{" "}
              {changeTierDialog.creator?.profile?.full_name ||
                changeTierDialog.creator?.profile?.username}{" "}
              to a different tier
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={changeTierDialog.newTierId}
              onValueChange={(v) =>
                setChangeTierDialog({ ...changeTierDialog, newTierId: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    <div className="flex items-center gap-2">
                      <div style={{ color: tier.color }}>
                        {getTierIcon(tier.level, "h-4 w-4")}
                      </div>
                      <span>{tier.name}</span>
                      <span className="text-muted-foreground text-xs">
                        ${tier.monthly_retainer}/mo
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setChangeTierDialog({ open: false, creator: null, newTierId: "" })
              }
            >
              Cancel
            </Button>
            <Button onClick={changeTier} disabled={saving}>
              {saving ? "Saving..." : "Change Tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={historyDialog.open}
        onOpenChange={(open) =>
          !open && setHistoryDialog({ open: false, creatorId: "", history: [] })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tier History</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-[300px] overflow-y-auto">
            {historyDialog.history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tier changes recorded
              </p>
            ) : (
              <div className="space-y-3">
                {historyDialog.history.map((record) => {
                  // Type assertion for the joined tier data
                  const recordWithTiers = record as TierChangeHistory & {
                    from_tier?: { name: string; color: string; level: number };
                    to_tier?: { name: string; color: string; level: number };
                  };
                  return (
                    <div
                      key={record.id}
                      className="flex items-start gap-3 p-2 rounded-lg bg-muted/30"
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full mt-0.5",
                          record.change_type === "promotion" && "bg-green-500/20 text-green-600",
                          record.change_type === "demotion" && "bg-red-500/20 text-red-600",
                          record.change_type === "initial" && "bg-blue-500/20 text-blue-600",
                          record.change_type === "manual" && "bg-yellow-500/20 text-yellow-600"
                        )}
                      >
                        {record.change_type === "promotion" && (
                          <ArrowUp className="h-3 w-3" />
                        )}
                        {record.change_type === "demotion" && (
                          <ArrowDown className="h-3 w-3" />
                        )}
                        {record.change_type === "initial" && (
                          <Star className="h-3 w-3" />
                        )}
                        {record.change_type === "manual" && (
                          <Settings className="h-3 w-3" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          {recordWithTiers.from_tier ? (
                            <>
                              <span style={{ color: recordWithTiers.from_tier.color }}>
                                {recordWithTiers.from_tier.name}
                              </span>
                              <span className="text-muted-foreground">→</span>
                            </>
                          ) : null}
                          <span style={{ color: recordWithTiers.to_tier?.color }}>
                            {recordWithTiers.to_tier?.name}
                          </span>
                        </div>
                        {record.change_reason && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {record.change_reason}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(record.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
