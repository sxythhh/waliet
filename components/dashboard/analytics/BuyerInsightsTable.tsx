"use client";

import { useState } from "react";
import { MdWarning, MdCheckCircle, MdError } from "react-icons/md";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCents, getInitials, formatRelativeTime, cn } from "@/lib/utils";

interface BuyerInsight {
  buyerId: string;
  buyerName: string | null;
  buyerAvatar: string | null;
  firstPurchaseAt: string;
  lastPurchaseAt: string;
  totalPurchases: number;
  totalSpent: number;
  totalSessions: number;
  completedSessions: number;
  lifetimeValue: number;
  churnRisk: "low" | "medium" | "high" | null;
}

interface BuyerInsightsTableProps {
  buyers: BuyerInsight[];
  onSortChange?: (sort: "totalSpent" | "lastPurchaseAt" | "totalSessions") => void;
  onChurnRiskFilter?: (risk: "low" | "medium" | "high" | null) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const churnRiskConfig = {
  low: { label: "Low Risk", icon: MdCheckCircle, color: "text-success", bg: "bg-success/10" },
  medium: { label: "Medium Risk", icon: MdWarning, color: "text-warning", bg: "bg-warning/10" },
  high: { label: "High Risk", icon: MdError, color: "text-destructive", bg: "bg-destructive/10" },
};

export function BuyerInsightsTable({
  buyers,
  onSortChange,
  onChurnRiskFilter,
  onLoadMore,
  hasMore,
}: BuyerInsightsTableProps) {
  const [sort, setSort] = useState<"totalSpent" | "lastPurchaseAt" | "totalSessions">("totalSpent");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const handleSortChange = (value: string) => {
    const newSort = value as "totalSpent" | "lastPurchaseAt" | "totalSessions";
    setSort(newSort);
    onSortChange?.(newSort);
  };

  const handleRiskChange = (value: string) => {
    setRiskFilter(value);
    onChurnRiskFilter?.(value === "all" ? null : (value as "low" | "medium" | "high"));
  };

  if (buyers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buyer Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No buyers yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Buyer insights will appear as you make sales
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Buyer Insights</CardTitle>
        <div className="flex gap-2">
          <Select value={riskFilter} onValueChange={handleRiskChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buyers</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="totalSpent">Total Spent</SelectItem>
              <SelectItem value="lastPurchaseAt">Last Active</SelectItem>
              <SelectItem value="totalSessions">Sessions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {buyers.map((buyer) => {
            const riskConfig = buyer.churnRisk ? churnRiskConfig[buyer.churnRisk] : null;

            return (
              <div
                key={buyer.buyerId}
                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={buyer.buyerAvatar || undefined} />
                  <AvatarFallback>{getInitials(buyer.buyerName)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {buyer.buyerName || "Anonymous"}
                    </p>
                    {riskConfig && (
                      <Badge variant="secondary" className={cn("text-xs", riskConfig.bg, riskConfig.color)}>
                        <riskConfig.icon className="h-3 w-3 mr-1" />
                        {riskConfig.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {buyer.totalPurchases} purchases • {buyer.completedSessions}/{buyer.totalSessions} sessions completed
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-foreground">{formatCents(buyer.lifetimeValue)}</p>
                  <p className="text-xs text-muted-foreground">
                    Last active {formatRelativeTime(buyer.lastPurchaseAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <Button variant="outline" className="w-full mt-4" onClick={onLoadMore}>
            Load More
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
