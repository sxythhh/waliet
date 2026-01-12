import * as React from "react";
import { Clock, DollarSign, Eye, TrendingUp, Calendar, ArrowUpRight, Wallet } from "lucide-react";
import { CampaignQuickActionsCard } from "./CampaignQuickActionsCard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CampaignDetailsRightPanelProps {
  campaign: {
    id: string;
    brand_name: string;
    brand_slug?: string;
    blueprint_id?: string | null;
    payment_model?: string | null;
    slug?: string;
    payout_day_of_week?: number | null;
    rpm_rate?: number;
  };
  hasConnectedAccounts: boolean;
  onSubmitVideo: () => void;
  onLeaveCampaign?: () => void;
  expectedPayout?: { views: number; amount: number } | null;
  className?: string;
}

const getNextPayoutDate = (payoutDayOfWeek: number = 2) => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  let daysUntilPayout = (payoutDayOfWeek - dayOfWeek + 7) % 7;
  if (daysUntilPayout === 0) daysUntilPayout = 7;
  const nextPayoutDate = new Date(now);
  nextPayoutDate.setDate(now.getDate() + daysUntilPayout);
  nextPayoutDate.setHours(12, 0, 0, 0);
  return {
    date: nextPayoutDate,
    daysUntil: daysUntilPayout
  };
};

export function CampaignDetailsRightPanel({
  campaign,
  hasConnectedAccounts,
  onSubmitVideo,
  onLeaveCampaign,
  expectedPayout,
  className,
}: CampaignDetailsRightPanelProps) {
  const nextPayout = getNextPayoutDate(campaign.payout_day_of_week ?? 2);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const payoutDayName = dayNames[campaign.payout_day_of_week ?? 2];

  return (
    <aside
      className={cn(
        "w-72 flex-shrink-0 bg-card overflow-y-auto border-l border-border/50",
        className
      )}
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <Wallet className="h-4 w-4 text-muted-foreground/60" />
          <h3 className="text-[13px] font-semibold text-foreground/80 uppercase tracking-wide">Earnings</h3>
        </div>

        {/* Countdown to next payout */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
                Next Payout
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground tabular-nums">
                  {nextPayout.daysUntil}
                </span>
                <span className="text-sm text-muted-foreground font-medium">
                  {nextPayout.daysUntil === 1 ? "day" : "days"}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          </div>
          <p className="text-[13px] text-foreground/70 font-medium">
            {nextPayout.date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${((7 - nextPayout.daysUntil) / 7) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground/50">Last {payoutDayName}</span>
              <span className="text-[10px] text-muted-foreground/50">Next {payoutDayName}</span>
            </div>
          </div>
        </div>

        {/* Expected Payout */}
        {expectedPayout && expectedPayout.amount > 0 && (
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
                  Estimated Earnings
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] text-muted-foreground/60">$</span>
                  <span className="text-xl font-bold text-foreground tabular-nums">
                    {expectedPayout.amount.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" />
                <span className="text-[10px] font-semibold">Active</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                <span>{expectedPayout.views.toLocaleString()} views tracked</span>
              </div>
            </div>
          </div>
        )}

        {/* Rate Info */}
        {campaign.rpm_rate && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground/60" />
                <span className="text-[12px] text-muted-foreground">Per 1M Views</span>
              </div>
              <span className="text-[14px] font-bold text-primary">
                ${(campaign.rpm_rate * 1000).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border/50 my-2" />

        {/* Quick Actions Header */}
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-primary rounded-full" />
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </h4>
        </div>

        {/* Quick Actions */}
        <CampaignQuickActionsCard
          campaign={campaign}
          hasConnectedAccounts={hasConnectedAccounts}
          onSubmitVideo={onSubmitVideo}
          onLeaveCampaign={onLeaveCampaign}
          compact
          className="bg-transparent border-0 p-0"
        />

        {/* Help Card */}
        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-[11px] text-muted-foreground/60 mb-2">Need help with this campaign?</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/30 justify-start gap-2"
          >
            <ArrowUpRight className="h-3 w-3" />
            Contact Support
          </Button>
        </div>
      </div>
    </aside>
  );
}
