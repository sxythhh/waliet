import { Briefcase } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { format } from "date-fns";

interface HistoryItem {
  id: string;
  type: "campaign" | "boost";
  title: string;
  brandName: string;
  brandLogoUrl: string | null;
  brandIsVerified?: boolean;
  joinedAt: string;
  earnings?: number;
}

interface DashboardHistorySectionProps {
  items: HistoryItem[];
  onItemClick?: (id: string) => void;
}

export function DashboardHistorySection({
  items,
  onItemClick,
}: DashboardHistorySectionProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="font-['Inter'] tracking-[-0.5px]">No history yet</p>
        <p className="text-sm mt-2 font-['Inter'] tracking-[-0.5px]">
          Join campaigns or boosts from the Discover tab to start earning
        </p>
      </div>
    );
  }

  // Sort by date, most recent first
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedItems.map((item) => (
        <div
          key={`${item.type}-${item.id}`}
          onClick={() => onItemClick?.(item.id)}
          className="bg-card/50 border border-border/50 rounded-xl p-4 hover:bg-card/80 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-4">
            {/* Brand Logo */}
            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
              {item.brandLogoUrl ? (
                <img
                  src={item.brandLogoUrl}
                  alt={item.brandName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary/60">
                    {item.brandName?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                  {item.brandName}
                </span>
                {item.brandIsVerified && <VerifiedBadge size="sm" />}
              </div>
              <h3 className="font-medium font-['Inter'] tracking-[-0.5px] line-clamp-1">
                {item.title}
              </h3>
            </div>

            {/* Date & Earnings */}
            <div className="text-right flex-shrink-0">
              {item.earnings !== undefined && item.earnings > 0 && (
                <p className="text-sm font-semibold text-emerald-500 font-['Geist'] tracking-[-0.5px]">
                  ${item.earnings.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                {format(new Date(item.joinedAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
