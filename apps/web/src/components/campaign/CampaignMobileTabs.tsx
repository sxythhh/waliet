import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignLeaderboardCard } from "./CampaignLeaderboardCard";
import { CampaignTipsCard } from "./CampaignTipsCard";
import { CampaignQuickActionsCard } from "./CampaignQuickActionsCard";
import { Trophy, Lightbulb, Zap } from "lucide-react";

interface CampaignMobileTabsProps {
  campaign: {
    id: string;
    brand_name: string;
    brand_slug?: string;
    blueprint_id?: string | null;
    payment_model?: string | null;
    slug?: string;
  };
  hasConnectedAccounts: boolean;
  onSubmitVideo: () => void;
  className?: string;
}

export function CampaignMobileTabs({
  campaign,
  hasConnectedAccounts,
  onSubmitVideo,
  className
}: CampaignMobileTabsProps) {
  return (
    <Tabs defaultValue="actions" className={className}>
      <TabsList className="w-full grid grid-cols-3 h-10 bg-muted/50 p-1 rounded-xl">
        <TabsTrigger
          value="actions"
          className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Actions</span>
        </TabsTrigger>
        <TabsTrigger
          value="tips"
          className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tips</span>
        </TabsTrigger>
        <TabsTrigger
          value="leaderboard"
          className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Leaders</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="actions" className="mt-3">
        <CampaignQuickActionsCard
          campaign={campaign}
          hasConnectedAccounts={hasConnectedAccounts}
          onSubmitVideo={onSubmitVideo}
        />
      </TabsContent>

      <TabsContent value="tips" className="mt-3">
        <CampaignTipsCard blueprintId={campaign.blueprint_id || null} />
      </TabsContent>

      <TabsContent value="leaderboard" className="mt-3">
        <CampaignLeaderboardCard campaignId={campaign.id} />
      </TabsContent>
    </Tabs>
  );
}
