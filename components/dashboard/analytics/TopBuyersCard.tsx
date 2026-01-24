"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCents, getInitials, formatRelativeTime } from "@/lib/utils";

interface TopBuyer {
  buyerId: string;
  buyerName: string | null;
  buyerAvatar: string | null;
  totalSpent: number;
  totalSessions: number;
  lastPurchaseAt: string;
}

interface TopBuyersCardProps {
  buyers: TopBuyer[];
}

export function TopBuyersCard({ buyers }: TopBuyersCardProps) {
  if (buyers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Buyers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground">No buyers yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your top customers will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top Buyers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {buyers.map((buyer, index) => (
          <div key={buyer.buyerId} className="flex items-center gap-3">
            <span className="text-lg font-semibold text-muted-foreground w-6">
              #{index + 1}
            </span>
            <Avatar className="h-10 w-10">
              <AvatarImage src={buyer.buyerAvatar || undefined} />
              <AvatarFallback>{getInitials(buyer.buyerName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {buyer.buyerName || "Anonymous"}
              </p>
              <p className="text-sm text-muted-foreground">
                {buyer.totalSessions} sessions • Last {formatRelativeTime(buyer.lastPurchaseAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">{formatCents(buyer.totalSpent)}</p>
              <p className="text-xs text-muted-foreground">total spent</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
