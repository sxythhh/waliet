import { memo, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";

export interface BoostCardCompactProps {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_is_verified?: boolean;
  brand_slug?: string;
  banner_url: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  payment_model?: 'retainer' | 'flat_rate' | null;
  flat_rate_min?: number | null;
  flat_rate_max?: number | null;
  approved_rate?: number | null;
  onClick?: () => void;
}

export const BoostCardCompact = memo(function BoostCardCompact({
  id,
  title,
  brand_name,
  brand_logo_url,
  brand_is_verified,
  brand_slug,
  banner_url,
  monthly_retainer,
  videos_per_month,
  payment_model,
  flat_rate_min,
  flat_rate_max,
  approved_rate,
  onClick
}: BoostCardCompactProps) {
  const navigate = useNavigate();
  const [submissionStats, setSubmissionStats] = useState({ approved: 0, pending: 0 });
  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const { data } = await supabase
        .from("video_submissions")
        .select("status, submitted_at")
        .eq("source_type", "boost")
        .eq("source_id", id)
        .eq("creator_id", user.id)
        .gte("submitted_at", monthStart.toISOString())
        .lte("submitted_at", monthEnd.toISOString());

      if (data) {
        setSubmissionStats({
          approved: data.filter(s => s.status === "approved").length,
          pending: data.filter(s => s.status === "pending").length
        });
      }
    };
    fetchStats();
  }, [id]);

  const totalSubmitted = submissionStats.approved + submissionStats.pending;
  const hasUnlimitedVideos = !videos_per_month || videos_per_month === 0;
  const isFlatRate = payment_model === 'flat_rate';

  return (
    <div className="group h-full">
      <Card
        className="relative overflow-hidden rounded-xl cursor-pointer transition-all duration-200 ease-out border border-border/50 bg-card h-full flex flex-col"
        onClick={onClick}
      >
        {/* Full-width Banner - Top */}
        <div className="relative w-full aspect-[21/9]">
          {banner_url ? (
            <OptimizedImage
              src={banner_url}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20"
            >
              {brand_logo_url && (
                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg">
                  <OptimizedImage
                    src={brand_logo_url}
                    alt={brand_name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>
          )}

        </div>

        {/* Content - Below Banner */}
        <div className="p-3 space-y-2.5 font-inter flex-1 flex flex-col" style={{ letterSpacing: '-0.5px' }}>
          {/* Title Row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-2 flex-1 group-hover:underline">
              {title}
            </h3>
          </div>

          {/* Brand Info */}
          <div className="flex items-center gap-1.5">
            {brand_logo_url && (
              <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                <OptimizedImage
                  src={brand_logo_url}
                  alt={brand_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (brand_slug) navigate(`/b/${brand_slug}`);
              }}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate"
            >
              {brand_name}
            </button>
            {brand_is_verified && <VerifiedBadge size="sm" />}
          </div>

          {/* Progress Section */}
          <div className="pt-1 mt-auto">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground font-medium">
                <span className="text-foreground font-semibold">{totalSubmitted}</span>
                {hasUnlimitedVideos ? (
                  <span className="text-muted-foreground"> videos submitted</span>
                ) : (
                  <span className="text-muted-foreground"> / {videos_per_month} videos</span>
                )}
              </span>
            </div>
            {!hasUnlimitedVideos && (
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#f4f4f4] dark:bg-[#1b1b1b] border-t border-t-[#e0e0e0] dark:border-t-[#262626]">
                <div className="h-full flex">
                  {submissionStats.approved > 0 && (
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${(submissionStats.approved / videos_per_month) * 100}%` }}
                    />
                  )}
                  {submissionStats.pending > 0 && (
                    <div
                      className="h-full bg-orange-500 transition-all duration-300"
                      style={{ width: `${(submissionStats.pending / videos_per_month) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
});
