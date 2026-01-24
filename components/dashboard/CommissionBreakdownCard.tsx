"use client";

import { useState, useEffect } from "react";
import { MdInfo, MdCheckCircle } from "react-icons/md";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CommissionRates {
  platformFeeBps: number;
  communityFeeBps: number;
  totalFeeBps: number;
  netPercentage: number;
  source: {
    platform: "seller" | "community" | "default";
    community: "seller" | "community" | "default";
  };
  hasCustomRate: boolean;
}

export function CommissionBreakdownCard() {
  const [rates, setRates] = useState<CommissionRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("/api/sellers/commissions");
        if (res.ok) {
          const data = await res.json();
          setRates(data);
        }
      } catch (error) {
        console.error("Error fetching commission rates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fee Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rates) {
    return null;
  }

  const formatBps = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;

  const sourceLabel = (source: "seller" | "community" | "default") => {
    switch (source) {
      case "seller":
        return "Custom";
      case "community":
        return "Community";
      default:
        return "Standard";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Fee Breakdown</CardTitle>
        {rates.hasCustomRate && (
          <Badge variant="secondary" className="text-xs bg-success/10 text-success">
            <MdCheckCircle className="h-3 w-3 mr-1" />
            Custom Rate
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Platform Fee */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Platform Fee</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <MdInfo className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fee charged by Waliet ({sourceLabel(rates.source.platform)} rate)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className={cn(
              "font-medium",
              rates.source.platform !== "default" && "text-success"
            )}>
              {formatBps(rates.platformFeeBps)}
            </span>
          </div>

          {/* Community Fee */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Community Fee</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <MdInfo className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fee shared with the community ({sourceLabel(rates.source.community)} rate)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className={cn(
              "font-medium",
              rates.source.community !== "default" && "text-success"
            )}>
              {formatBps(rates.communityFeeBps)}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t my-2" />

          {/* Total Fees */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Fees</span>
            <span className="font-medium">{formatBps(rates.totalFeeBps)}</span>
          </div>

          {/* Net Earnings */}
          <div className="flex items-center justify-between bg-primary/5 -mx-4 px-4 py-3 rounded-lg mt-4">
            <span className="text-sm font-medium text-foreground">You Receive</span>
            <span className="text-xl font-bold text-primary">{rates.netPercentage.toFixed(1)}%</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          For every $100 you earn, you keep ${(rates.netPercentage).toFixed(0)}
        </p>
      </CardContent>
    </Card>
  );
}
