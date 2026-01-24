import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Star, Trophy, Award, Sparkles, Gift, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CreatorTier, CreatorTierAssignment, PerformanceSnapshot } from "@/types/creatorTiers";
import { CreatorTierBadge } from "./CreatorTierBadge";
import { CreatorTierProgress } from "./CreatorTierProgress";
import { cn } from "@/lib/utils";

interface CreatorTierCardProps {
  boostId: string;
  userId: string;
  className?: string;
  compact?: boolean;
}

export function CreatorTierCard({
  boostId,
  userId,
  className,
  compact = false,
}: CreatorTierCardProps) {
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<CreatorTierAssignment | null>(null);
  const [currentTier, setCurrentTier] = useState<CreatorTier | null>(null);
  const [nextTier, setNextTier] = useState<CreatorTier | null>(null);
  const [allTiers, setAllTiers] = useState<CreatorTier[]>([]);
  const [metrics, setMetrics] = useState<PerformanceSnapshot>({});

  const fetchTierData = useCallback(async () => {
    try {
      // Fetch all tiers for this boost
      const { data: tiersData, error: tiersError } = await supabase
        .from("boost_creator_tiers")
        .select("*")
        .eq("bounty_campaign_id", boostId)
        .order("level", { ascending: true });

      if (tiersError) throw tiersError;

      const tiers = (tiersData as CreatorTier[]) || [];
      setAllTiers(tiers);

      if (tiers.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch user's tier assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("creator_tier_assignments")
        .select("*")
        .eq("bounty_campaign_id", boostId)
        .eq("user_id", userId)
        .single();

      if (assignmentError && assignmentError.code !== "PGRST116") {
        throw assignmentError;
      }

      if (assignmentData) {
        setAssignment(assignmentData as CreatorTierAssignment);

        const current = tiers.find((t) => t.id === assignmentData.tier_id);
        setCurrentTier(current || null);

        // Find next tier
        if (current) {
          const next = tiers.find((t) => t.level === current.level + 1);
          setNextTier(next || null);
        }
      }

      // Fetch performance metrics for the current month
      const now = new Date();
      const { data: metricsData } = await supabase
        .from("creator_tier_metrics")
        .select("*")
        .eq("bounty_campaign_id", boostId)
        .eq("user_id", userId)
        .eq("period_year", now.getFullYear())
        .eq("period_month", now.getMonth() + 1)
        .single();

      if (metricsData) {
        setMetrics({
          avg_views: metricsData.avg_views_per_video,
          completion_rate: metricsData.completion_rate,
          engagement_rate: metricsData.engagement_rate,
          months_active: assignmentData?.months_in_tier || 0,
          total_earned: metricsData.total_earnings,
          videos_submitted: metricsData.videos_submitted,
          videos_approved: metricsData.videos_approved,
        });
      } else if (assignmentData) {
        // Use assignment data for months_in_tier at minimum
        setMetrics({
          months_active: assignmentData.months_in_tier || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching tier data:", error);
    } finally {
      setLoading(false);
    }
  }, [boostId, userId]);

  useEffect(() => {
    fetchTierData();
  }, [fetchTierData]);

  if (loading) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No tier system enabled for this boost
  if (allTiers.length === 0) {
    return null;
  }

  // User not assigned to a tier yet
  if (!currentTier) {
    return (
      <Card className={cn(className)}>
        <CardContent className="py-4">
          <div className="text-center text-muted-foreground">
            <Award className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-inter tracking-[-0.5px]">
              Tier assignment pending
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <CreatorTierBadge
            tierName={currentTier.name}
            tierLevel={currentTier.level}
            tierColor={currentTier.color}
            size="md"
          />
          <div>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
              {currentTier.perks?.length || 0} perks •{" "}
              ${currentTier.monthly_retainer}/mo
            </p>
          </div>
        </div>
        {nextTier && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Next: {nextTier.name}</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-inter tracking-[-0.5px] flex items-center gap-2">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          Your Tier
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Tier Display */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl"
            style={{ backgroundColor: `${currentTier.color}20` }}
          >
            <div style={{ color: currentTier.color }}>
              {currentTier.level === 1 && <Award className="h-6 w-6" />}
              {currentTier.level === 2 && <Star className="h-6 w-6" />}
              {currentTier.level === 3 && <Trophy className="h-6 w-6" />}
              {currentTier.level === 4 && <Crown className="h-6 w-6" />}
              {currentTier.level > 4 && <Sparkles className="h-6 w-6" />}
            </div>
          </div>
          <div>
            <p className="font-semibold font-inter tracking-[-0.5px]">
              {currentTier.name}
            </p>
            <p className="text-xs text-muted-foreground">
              ${currentTier.monthly_retainer}/mo • {currentTier.videos_per_month} videos
            </p>
          </div>
        </div>

        {/* Perks */}
        {currentTier.perks && currentTier.perks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Gift className="h-3 w-3" />
              Your Perks
            </p>
            <div className="flex flex-wrap gap-1">
              {currentTier.perks.slice(0, 3).map((perk, index) => (
                <span
                  key={index}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {perk}
                </span>
              ))}
              {currentTier.perks.length > 3 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  +{currentTier.perks.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Progress to Next Tier */}
        {nextTier && (
          <CreatorTierProgress
            currentTier={currentTier}
            nextTier={nextTier}
            currentMetrics={metrics}
          />
        )}

        {/* Time in tier */}
        {assignment && assignment.months_in_tier > 0 && (
          <p className="text-[10px] text-center text-muted-foreground">
            You've been in this tier for {assignment.months_in_tier}{" "}
            {assignment.months_in_tier === 1 ? "month" : "months"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
