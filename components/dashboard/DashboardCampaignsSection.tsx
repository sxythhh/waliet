import { Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface CampaignParticipation {
  id: string;
  campaign_id: string;
  status: string;
  submitted_at: string;
  views?: number;
  earnings?: number;
  campaign: {
    id: string;
    title: string;
    brand_name: string;
    brand_logo_url: string | null;
    banner_url: string | null;
    rpm_rate: number;
    brands?: {
      logo_url: string;
      is_verified?: boolean;
    } | null;
  };
}

interface DashboardCampaignsSectionProps {
  participations: CampaignParticipation[];
  onCampaignClick?: (campaignId: string) => void;
}

export function DashboardCampaignsSection({
  participations,
  onCampaignClick,
}: DashboardCampaignsSectionProps) {
  if (participations.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="font-inter tracking-[-0.5px]">No campaigns yet</p>
        <p className="text-sm mt-2 font-inter tracking-[-0.5px]">
          Join campaigns from the Discover tab to start earning
        </p>
      </div>
    );
  }

  const scrollCampaigns = (direction: "left" | "right") => {
    const container = document.getElementById("dashboard-campaigns-scroll");
    if (container) {
      container.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Scroll Controls */}
      {participations.length > 2 && (
        <div className="flex items-center justify-end">
          <div className="flex items-center border border-border/50 rounded-full overflow-hidden bg-muted/30">
            <button
              onClick={() => scrollCampaigns("left")}
              className="p-2.5 hover:bg-muted/50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="w-px h-5 bg-border/50" />
            <button
              onClick={() => scrollCampaigns("right")}
              className="p-2.5 hover:bg-muted/50 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Campaign Cards */}
      <div
        id="dashboard-campaigns-scroll"
        className="flex gap-3 overflow-x-auto pt-2 pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {participations.map((participation) => {
          const campaign = participation.campaign;
          const logoUrl = campaign?.brands?.logo_url || campaign?.brand_logo_url;
          const isVerified = campaign?.brands?.is_verified;

          return (
            <div key={participation.id} className="flex-shrink-0 w-[160px]">
              <CampaignCard
                id={campaign?.id || participation.campaign_id}
                title={campaign?.title || "Campaign"}
                brand_name={campaign?.brand_name || ""}
                brand_logo_url={logoUrl || null}
                brand_is_verified={isVerified}
                banner_url={campaign?.banner_url || null}
                budget={0}
                budget_used={0}
                is_infinite_budget={false}
                onClick={() => onCampaignClick?.(participation.campaign_id)}
                showBookmark={false}
                showFullscreen={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
