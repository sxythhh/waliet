"use client";

import { MdWarning, MdEmail } from "react-icons/md";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials, formatRelativeTime } from "@/lib/utils";

interface AtRiskBuyer {
  buyerId: string;
  buyerName: string | null;
  buyerAvatar: string | null;
  lastPurchaseAt: string;
  totalSessions: number;
}

interface ChurnAlertsProps {
  atRiskBuyers: AtRiskBuyer[];
}

export function ChurnAlerts({ atRiskBuyers }: ChurnAlertsProps) {
  if (atRiskBuyers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MdWarning className="h-5 w-5 text-warning" />
            At-Risk Buyers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-success font-medium">No at-risk buyers!</p>
            <p className="text-sm text-muted-foreground mt-1">
              All your buyers have been active recently
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-warning/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MdWarning className="h-5 w-5 text-warning" />
          At-Risk Buyers ({atRiskBuyers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          These buyers haven&apos;t purchased in over 90 days. Consider reaching out to re-engage them.
        </p>

        {atRiskBuyers.slice(0, 5).map((buyer) => (
          <div
            key={buyer.buyerId}
            className="flex items-center gap-3 p-3 rounded-lg bg-warning/5 border border-warning/20"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={buyer.buyerAvatar || undefined} />
              <AvatarFallback>{getInitials(buyer.buyerName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {buyer.buyerName || "Anonymous"}
              </p>
              <p className="text-sm text-muted-foreground">
                {buyer.totalSessions} sessions • Last active {formatRelativeTime(buyer.lastPurchaseAt)}
              </p>
            </div>
            <Button size="sm" variant="outline" className="gap-1">
              <MdEmail className="h-4 w-4" />
              Reach Out
            </Button>
          </div>
        ))}

        {atRiskBuyers.length > 5 && (
          <p className="text-sm text-muted-foreground text-center">
            +{atRiskBuyers.length - 5} more at-risk buyers
          </p>
        )}
      </CardContent>
    </Card>
  );
}
