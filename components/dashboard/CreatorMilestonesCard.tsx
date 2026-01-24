import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, DollarSign, Video, Trophy, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
  brand?: {
    name: string;
    logo_url: string | null;
  };
}

interface MilestoneAchievement {
  id: string;
  milestone_config_id: string;
  user_id: string;
  achieved_at: string;
  achieved_value: number;
  campaign_id: string | null;
  boost_id: string | null;
  milestone_config?: MilestoneConfig;
}

interface CreatorProgress {
  views: number;
  earnings: number;
  submissions: number;
}

interface CreatorMilestonesCardProps {
  userId: string;
  className?: string;
}

const MILESTONE_ICONS = {
  views: Eye,
  earnings: DollarSign,
  submissions: Video,
};

const MILESTONE_COLORS = {
  views: "text-blue-500",
  earnings: "text-emerald-500",
  submissions: "text-purple-500",
};

const MILESTONE_BG_COLORS = {
  views: "bg-blue-500/10",
  earnings: "bg-emerald-500/10",
  submissions: "bg-purple-500/10",
};

function formatThreshold(value: number, type: string): string {
  if (type === "earnings") {
    return `$${value.toLocaleString()}`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toString();
}

function getMilestoneLabel(type: string): string {
  switch (type) {
    case "views":
      return "Views";
    case "earnings":
      return "Earned";
    case "submissions":
      return "Videos";
    default:
      return type;
  }
}

export function CreatorMilestonesCard({ userId, className }: CreatorMilestonesCardProps) {
  const [milestones, setMilestones] = useState<MilestoneConfig[]>([]);
  const [achievements, setAchievements] = useState<MilestoneAchievement[]>([]);
  const [progress, setProgress] = useState<CreatorProgress>({ views: 0, earnings: 0, submissions: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchMilestoneData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get campaigns and boosts the creator is part of
      const [campaignMemberships, boostMemberships] = await Promise.all([
        supabase
          .from("campaign_memberships")
          .select("campaign_id, campaigns(brand_id)")
          .eq("user_id", userId),
        supabase
          .from("boost_memberships")
          .select("boost_id, bounty_campaigns(brand_id)")
          .eq("user_id", userId),
      ]);

      const campaignIds = (campaignMemberships.data || []).map((m) => m.campaign_id);
      const boostIds = (boostMemberships.data || []).map((m) => m.boost_id);
      const brandIds = new Set<string>();

      (campaignMemberships.data || []).forEach((m) => {
        if (m.campaigns && typeof m.campaigns === "object" && "brand_id" in m.campaigns) {
          brandIds.add(m.campaigns.brand_id as string);
        }
      });
      (boostMemberships.data || []).forEach((m) => {
        if (m.bounty_campaigns && typeof m.bounty_campaigns === "object" && "brand_id" in m.bounty_campaigns) {
          brandIds.add(m.bounty_campaigns.brand_id as string);
        }
      });

      if (brandIds.size === 0 && campaignIds.length === 0 && boostIds.length === 0) {
        setIsLoading(false);
        return;
      }

      // Fetch milestone configs for relevant brands/campaigns/boosts
      let milestonesQuery = supabase
        .from("milestone_configs")
        .select("*, brand:brands(name, logo_url)")
        .eq("is_active", true);

      // Build OR conditions for milestones
      const orConditions: string[] = [];
      if (brandIds.size > 0) {
        // Global milestones for brands
        orConditions.push(`and(brand_id.in.(${Array.from(brandIds).join(",")}),campaign_id.is.null,boost_id.is.null)`);
      }
      if (campaignIds.length > 0) {
        orConditions.push(`campaign_id.in.(${campaignIds.join(",")})`);
      }
      if (boostIds.length > 0) {
        orConditions.push(`boost_id.in.(${boostIds.join(",")})`);
      }

      if (orConditions.length > 0) {
        milestonesQuery = milestonesQuery.or(orConditions.join(","));
      }

      const [milestonesResult, achievementsResult] = await Promise.all([
        milestonesQuery.order("milestone_type").order("threshold"),
        supabase
          .from("milestone_achievements")
          .select("*, milestone_config:milestone_configs(*)")
          .eq("user_id", userId)
          .order("achieved_at", { ascending: false }),
      ]);

      setMilestones((milestonesResult.data || []) as MilestoneConfig[]);
      setAchievements((achievementsResult.data || []) as MilestoneAchievement[]);

      // Calculate current progress
      const [viewsResult, earningsResult, submissionsResult] = await Promise.all([
        // Total views from video submissions
        supabase
          .from("video_submissions")
          .select("views")
          .eq("user_id", userId)
          .eq("status", "approved"),
        // Total earnings from wallet
        supabase
          .from("wallets")
          .select("total_earned")
          .eq("user_id", userId)
          .single(),
        // Total approved submissions
        supabase
          .from("video_submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "approved"),
      ]);

      const totalViews = (viewsResult.data || []).reduce((sum, v) => sum + (v.views || 0), 0);
      const totalEarnings = earningsResult.data?.total_earned || 0;
      const totalSubmissions = submissionsResult.count || 0;

      setProgress({
        views: totalViews,
        earnings: totalEarnings,
        submissions: totalSubmissions,
      });
    } catch (error) {
      console.error("Error fetching milestone data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchMilestoneData();
    }
  }, [userId, fetchMilestoneData]);

  // Get next milestone for each type
  const achievedConfigIds = new Set(achievements.map((a) => a.milestone_config_id));

  const getNextMilestone = (type: "views" | "earnings" | "submissions") => {
    const currentValue = progress[type];
    const typeMilestones = milestones
      .filter((m) => m.milestone_type === type && !achievedConfigIds.has(m.id))
      .sort((a, b) => a.threshold - b.threshold);

    return typeMilestones.find((m) => m.threshold > currentValue) || typeMilestones[0];
  };

  const nextMilestones = {
    views: getNextMilestone("views"),
    earnings: getNextMilestone("earnings"),
    submissions: getNextMilestone("submissions"),
  };

  // Recent achievements (last 5)
  const recentAchievements = achievements.slice(0, 5);

  // Check if there are any milestones to show
  const hasMilestones = milestones.length > 0 || achievements.length > 0;

  if (isLoading) {
    return (
      <div className={cn("bg-card border border-border rounded-xl p-5", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!hasMilestones) {
    return null; // Don't show card if no milestones configured
  }

  return (
    <div className={cn("bg-card border border-border rounded-xl p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">
            Milestones
          </h3>
        </div>
        {achievements.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {achievements.length} achieved
          </Badge>
        )}
      </div>

      {/* Progress toward next milestones */}
      <div className="space-y-3 mb-4">
        {(["views", "earnings", "submissions"] as const).map((type) => {
          const nextMilestone = nextMilestones[type];
          if (!nextMilestone) return null;

          const Icon = MILESTONE_ICONS[type];
          const currentValue = progress[type];
          const targetValue = nextMilestone.threshold;
          const progressPercent = Math.min((currentValue / targetValue) * 100, 100);

          return (
            <div key={type} className={cn("rounded-lg p-3", MILESTONE_BG_COLORS[type])}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-3.5 w-3.5", MILESTONE_COLORS[type])} />
                  <span className="text-xs font-medium text-foreground tracking-[-0.5px]">
                    {getMilestoneLabel(type)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground tracking-[-0.5px]">
                  {formatThreshold(currentValue, type)} / {formatThreshold(targetValue, type)}
                </span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
              {progressPercent >= 80 && progressPercent < 100 && (
                <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Almost there!
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent achievements */}
      {recentAchievements.length > 0 && (
        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-medium text-muted-foreground mb-3 tracking-[-0.5px]">
            Recent Achievements
          </h4>
          <div className="space-y-2">
            {recentAchievements.map((achievement) => {
              const config = achievement.milestone_config;
              if (!config) return null;

              const Icon = MILESTONE_ICONS[config.milestone_type as keyof typeof MILESTONE_ICONS] || Trophy;
              const isRecent = new Date(achievement.achieved_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

              return (
                <div
                  key={achievement.id}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg transition-colors",
                    isRecent ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    isRecent ? "bg-amber-500/20" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      isRecent ? "text-amber-500" : MILESTONE_COLORS[config.milestone_type as keyof typeof MILESTONE_COLORS]
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate tracking-[-0.5px]">
                      {formatThreshold(config.threshold, config.milestone_type)} {getMilestoneLabel(config.milestone_type)}
                    </p>
                    <p className="text-[10px] text-muted-foreground tracking-[-0.5px]">
                      {format(new Date(achievement.achieved_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  {isRecent && (
                    <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0 text-[10px]">
                      New
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
