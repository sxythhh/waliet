"use client";

import { MdStar, MdTrendingUp, MdTrendingDown, MdChevronRight, MdAccessTime } from "react-icons/md";
import { cn, formatCents, formatUnitsToHours } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export interface WalletBalanceData {
  id: string;
  balanceUnits: number;
  reservedUnits?: number;
  avgPurchasePricePerUnit: number;
  totalPaid: number;
  seller: {
    id: string;
    name: string | null;
    avatar: string | null;
    sellerProfile: {
      hourlyRate: number;
      averageRating: number | null;
      totalSessionsCompleted?: number;
    } | null;
  };
}

interface WalletBalanceCardProps {
  balance: WalletBalanceData;
  onClick?: () => void;
  className?: string;
}

export function WalletBalanceCard({
  balance,
  onClick,
  className,
}: WalletBalanceCardProps) {
  const seller = balance.seller;
  const currentRate = seller.sellerProfile?.hourlyRate || 0;
  const purchasedRate = balance.avgPurchasePricePerUnit * 2;
  const currentValue = (balance.balanceUnits / 2) * currentRate;
  const rateChange =
    purchasedRate > 0 ? ((currentRate - purchasedRate) / purchasedRate) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left bg-card rounded-xl border border-border p-4 sm:p-5",
        "transition-all duration-[var(--duration-normal)]",
        "hover:border-primary/50 hover:shadow-[var(--shadow-md)]",
        "focus:outline-none focus:ring-2 focus:ring-primary/20",
        "group cursor-pointer",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Avatar with rating badge overlay */}
        <div className="relative flex-shrink-0">
          <Avatar className="h-14 w-14 ring-2 ring-background shadow-[var(--shadow-sm)]">
            <AvatarImage src={seller.avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              {seller.name?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          {seller.sellerProfile?.averageRating && (
            <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 bg-background rounded-full px-1.5 py-0.5 text-xs font-medium shadow-[var(--shadow-xs)] border border-border">
              <MdStar className="h-3 w-3 text-warning" />
              {seller.sellerProfile.averageRating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">
              {seller.name || "Anonymous"}
            </h3>
            {/* Rate change indicator */}
            {rateChange !== 0 && (
              <Badge
                variant={rateChange > 0 ? "success-subtle" : "destructive-subtle"}
                className="text-[10px] px-1.5 py-0 h-5"
              >
                {rateChange > 0 ? (
                  <MdTrendingUp className="h-3 w-3 mr-0.5" />
                ) : (
                  <MdTrendingDown className="h-3 w-3 mr-0.5" />
                )}
                {Math.abs(rateChange).toFixed(0)}%
              </Badge>
            )}
          </div>
          {/* Hours and current rate */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MdAccessTime className="h-3.5 w-3.5" />
              {formatUnitsToHours(balance.balanceUnits)}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span>{formatCents(currentRate)}/hr</span>
          </div>
        </div>

        {/* Current value and expand arrow */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">
              {formatCents(currentValue)}
            </p>
            <p className="text-xs text-muted-foreground">value</p>
          </div>
          <MdChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  );
}
