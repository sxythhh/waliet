import { Rocket } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface BoostParticipation {
  id: string;
  bounty_campaign_id: string;
  status: string;
  applied_at: string;
  boost: {
    id: string;
    title: string;
    monthly_retainer: number;
    videos_per_month: number;
    brands?: {
      name: string;
      logo_url: string;
      is_verified?: boolean;
    } | null;
  };
  videos_submitted?: number;
  total_earned?: number;
}

interface DashboardBoostsSectionProps {
  participations: BoostParticipation[];
  onBoostClick?: (boostId: string) => void;
}

export function DashboardBoostsSection({
  participations,
  onBoostClick,
}: DashboardBoostsSectionProps) {
  if (participations.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Rocket className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="font-['Inter'] tracking-[-0.5px]">No boosts yet</p>
        <p className="text-sm mt-2 font-['Inter'] tracking-[-0.5px]">
          Apply to boost programs to earn monthly retainers
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Boost Cards */}
      <div className="grid gap-3">
        {participations.map((participation) => {
          const boost = participation.boost;
          const logoUrl = boost?.brands?.logo_url;
          const isVerified = boost?.brands?.is_verified;

          return (
            <div
              key={participation.id}
              onClick={() => onBoostClick?.(participation.bounty_campaign_id)}
              className="bg-card/50 border border-border/50 rounded-2xl p-4 hover:bg-card/80 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                {/* Brand Logo */}
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={boost?.brands?.name || "Brand"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                  )}
                </div>

                {/* Boost Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                      {boost?.brands?.name}
                    </span>
                    {isVerified && <VerifiedBadge size="sm" />}
                  </div>
                  <h3 className="font-semibold font-['Inter'] tracking-[-0.5px] line-clamp-1">
                    {boost?.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                    <span>${boost?.monthly_retainer}/mo</span>
                    <span className="text-foreground/30">•</span>
                    <span>{participation.videos_submitted || 0} videos</span>
                  </div>
                </div>

                {/* Earnings */}
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-emerald-500 font-['Geist'] tracking-[-0.5px]">
                    ${participation.total_earned?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                    earned
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
