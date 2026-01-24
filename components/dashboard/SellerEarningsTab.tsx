"use client";

import { useState, useEffect } from "react";
import {
  MdAttachMoney,
  MdSchedule,
  MdCheck,
  MdClose,
  MdRefresh,
  MdArrowUpward,
} from "react-icons/md";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents, formatDateTime, cn, getInitials } from "@/lib/utils";

interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  totalSales: number;
  totalFees: number;
  netEarnings: number;
  completedPayouts: number;
  pendingPayouts: number;
  completedSessions: number;
  totalPurchases: number;
}

interface PayoutSession {
  id: string;
  topic: string;
  buyerName: string | null;
  buyerAvatar: string | null;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  processedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  sessions: PayoutSession[];
}

interface RecentPurchase {
  id: string;
  units: number;
  totalAmount: number;
  sellerReceives: number;
  platformFee: number;
  communityFee: number;
  buyerName: string | null;
  buyerAvatar: string | null;
  createdAt: string;
}

interface SellerEarningsTabProps {
  experienceId: string;
}

export function SellerEarningsTab({ experienceId }: SellerEarningsTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchEarnings = async (newPeriod?: string, loadMore?: boolean) => {
    try {
      const params = new URLSearchParams({
        period: newPeriod || period,
        limit: "20",
      });

      if (loadMore && cursor) {
        params.set("cursor", cursor);
      }

      const res = await fetch(`/api/sellers/earnings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);

        if (loadMore) {
          setPayouts((prev) => [...prev, ...data.payouts]);
        } else {
          setPayouts(data.payouts);
          setRecentPurchases(data.recentPurchases);
        }

        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    setIsLoading(true);
    fetchEarnings(newPeriod);
  };

  if (isLoading) {
    return <EarningsLoading />;
  }

  const stats = [
    {
      label: "Total Earnings",
      value: formatCents(summary?.totalEarnings || 0),
      icon: MdAttachMoney,
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      label: "Pending",
      value: formatCents(summary?.pendingEarnings || 0),
      icon: MdSchedule,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      label: "Completed Payouts",
      value: summary?.completedPayouts.toString() || "0",
      icon: MdCheck,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Sessions Completed",
      value: summary?.completedSessions.toString() || "0",
      icon: MdArrowUpward,
      iconBg: "bg-muted",
      iconColor: "text-foreground",
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Earnings</h1>
          <p className="text-muted-foreground mt-1">
            Track your earnings and payout history
          </p>
        </div>
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", stat.iconBg)}>
                  <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Earnings Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Fee Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fee Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Sales</span>
                <span className="font-medium">{formatCents(summary?.totalSales || 0)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>Fees Paid</span>
                <span>-{formatCents(summary?.totalFees || 0)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-medium">Net Earnings</span>
                <span className="font-semibold text-success">{formatCents(summary?.netEarnings || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPurchases.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No purchases yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPurchases.slice(0, 5).map((purchase) => (
                  <div key={purchase.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={purchase.buyerAvatar || undefined} />
                      <AvatarFallback>{getInitials(purchase.buyerName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {purchase.buyerName || "Anonymous"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {purchase.units / 2} {purchase.units > 2 ? "hours" : "hour"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-success">
                        +{formatCents(purchase.sellerReceives)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-12">
              <MdAttachMoney className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payouts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Complete sessions to earn payouts
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <PayoutCard key={payout.id} payout={payout} />
              ))}

              {hasMore && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fetchEarnings(undefined, true)}
                >
                  Load More
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PayoutCard({ payout }: { payout: Payout }) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof MdCheck }> = {
    COMPLETED: { label: "Completed", variant: "secondary", icon: MdCheck },
    PENDING: { label: "Pending", variant: "default", icon: MdSchedule },
    PROCESSING: { label: "Processing", variant: "default", icon: MdRefresh },
    FAILED: { label: "Failed", variant: "destructive", icon: MdClose },
  };

  const config = statusConfig[payout.status] || statusConfig.PENDING;

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-lg font-semibold text-foreground">{formatCents(payout.amount)}</p>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(payout.processedAt || payout.createdAt)}
          </p>
        </div>
        <Badge variant={config.variant} className="flex items-center gap-1">
          <config.icon className="h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      {payout.failureReason && (
        <p className="text-sm text-destructive mb-3">{payout.failureReason}</p>
      )}

      {payout.sessions.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground mb-2">Sessions included:</p>
          <div className="flex flex-wrap gap-2">
            {payout.sessions.map((session) => (
              <div key={session.id} className="flex items-center gap-2 text-sm">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={session.buyerAvatar || undefined} />
                  <AvatarFallback className="text-xs">{getInitials(session.buyerName)}</AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground truncate max-w-[120px]">
                  {session.topic}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EarningsLoading() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
