"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Star,
  ArrowUpRight,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface HomeData {
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
    email: string | null;
  };
  isSeller: boolean;
  stats: {
    totalEarnings: number;
    pendingEarnings: number;
    pendingPayoutAmount: number;
    totalSessions: number;
    uniqueBuyers: number;
    averageRating: number | null;
    totalReviews: number;
    hourlyRate: number;
  };
  earningsChart: Array<{ date: string; amount: number }>;
  earningsChange: number;
  pendingActions: {
    sessionRequests: number;
    awaitingConfirmation: number;
    inProgress: number;
    pendingPayouts: number;
  };
  upcomingSessions: Array<{
    id: string;
    topic: string;
    scheduledAt: string | null;
    status: string;
    buyer: { id: string; name: string | null; avatar: string | null } | null;
  }>;
  recentActivity: Array<{
    id: string;
    type: "session" | "purchase";
    title: string;
    description: string;
    timestamp: string;
    status: string;
    amount?: number;
  }>;
}

// Mini sparkline chart component
function EarningsSparkline({ data, change }: { data: Array<{ date: string; amount: number }>; change: number }) {
  const maxValue = Math.max(...data.map(d => d.amount), 1);
  const minValue = Math.min(...data.map(d => d.amount), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.amount - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const isPositive = change >= 0;

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 100 40" className="w-24 h-8" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`text-xs font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
        {isPositive ? "+" : ""}{change.toFixed(1)}%
      </span>
    </div>
  );
}

export function HomeTab() {
  const router = useRouter();
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch home data from API
  useEffect(() => {
    async function fetchHomeData() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/app/home");
        if (!response.ok) {
          throw new Error("Failed to fetch home data");
        }
        const data = await response.json();
        setHomeData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }
    fetchHomeData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !homeData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">{error || "Failed to load data"}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  const { user, isSeller, stats, earningsChart, earningsChange, pendingActions, upcomingSessions, recentActivity } = homeData;
  const userName = user.name || "User";
  const totalPendingActions = pendingActions.sessionRequests + pendingActions.awaitingConfirmation + pendingActions.inProgress + pendingActions.pendingPayouts;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here&apos;s what&apos;s happening with your {isSeller ? "sessions" : "account"}
          </p>
        </div>
      </div>

      {/* Pending Actions Card */}
      {isSeller && totalPendingActions > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {totalPendingActions} Pending Action{totalPendingActions > 1 ? "s" : ""}
                </h3>
                <div className="flex flex-wrap gap-3 mt-2">
                  {pendingActions.sessionRequests > 0 && (
                    <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400">
                      {pendingActions.sessionRequests} new request{pendingActions.sessionRequests > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {pendingActions.awaitingConfirmation > 0 && (
                    <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400">
                      {pendingActions.awaitingConfirmation} awaiting confirmation
                    </Badge>
                  )}
                  {pendingActions.inProgress > 0 && (
                    <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400">
                      {pendingActions.inProgress} in progress
                    </Badge>
                  )}
                  {pendingActions.pendingPayouts > 0 && (
                    <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400">
                      {pendingActions.pendingPayouts} pending payout{pendingActions.pendingPayouts > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                onClick={() => router.push("/dashboard?tab=sessions")}
              >
                View
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Earned</p>
                <p className="text-lg font-bold tracking-tight">${stats.totalEarnings.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pending</p>
                <p className="text-lg font-bold tracking-tight">${stats.pendingEarnings.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Sessions</p>
                <p className="text-lg font-bold tracking-tight">{stats.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Clients</p>
                <p className="text-lg font-bold tracking-tight">{stats.uniqueBuyers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart Card */}
      {isSeller && earningsChart.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Last 7 Days Earnings</p>
                <p className="text-xl font-bold tracking-tight mt-1">
                  ${earningsChart.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
                </p>
              </div>
              <EarningsSparkline data={earningsChart} change={earningsChange} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          onClick={() => router.push("/dashboard?tab=discover")}
          className="group flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:bg-muted/50 transition-all duration-200 text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-foreground tracking-tight block">
              Browse Sellers
            </span>
            <span className="text-[10px] text-muted-foreground block truncate">
              Find experts for your needs
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-all" />
        </button>

        <button
          onClick={() => router.push("/dashboard?tab=wallet")}
          className="group flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:bg-muted/50 transition-all duration-200 text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-4 h-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-foreground tracking-tight block">
              Manage Wallet
            </span>
            <span className="text-[10px] text-muted-foreground block truncate">
              View balance and transactions
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-all" />
        </button>

        <button
          onClick={() => router.push("/dashboard?tab=profile")}
          className="group flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:bg-muted/50 transition-all duration-200 text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Star className="w-4 h-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-foreground tracking-tight block">
              Your Profile
            </span>
            <span className="text-[10px] text-muted-foreground block truncate">
              Edit your public profile
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Upcoming Sessions</h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              View all
              <ArrowUpRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingSessions.map((session) => (
              <Card
                key={session.id}
                className="group bg-card border-border hover:border-primary/30 transition-all cursor-pointer"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={session.buyer?.avatar || undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {session.buyer?.name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold truncate">{session.topic}</h3>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${
                            session.status === "ACCEPTED"
                              ? "bg-green-500/10 text-green-600"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {session.status === "ACCEPTED" ? "Confirmed" : "Pending"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">with {session.buyer?.name || "Unknown"}</p>
                      {session.scheduledAt && (
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(session.scheduledAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(session.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Recent Activity</h2>
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-4">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        item.type === "purchase" ? "bg-green-500/10" : "bg-primary/10"
                      }`}
                    >
                      {item.type === "purchase" ? (
                        <DollarSign className="w-4 h-4 text-green-500" />
                      ) : (
                        <Calendar className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="text-right">
                      {item.amount !== undefined && (
                        <p className="text-sm font-semibold text-green-500">+${item.amount}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Seller Stats (Rating & Reviews) */}
      {isSeller && (stats.averageRating !== null || stats.totalReviews > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Rating</p>
                  <p className="text-lg font-bold tracking-tight">
                    {stats.averageRating?.toFixed(1) || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Reviews</p>
                  <p className="text-lg font-bold tracking-tight">{stats.totalReviews}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
