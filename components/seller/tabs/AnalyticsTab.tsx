"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Clock,
  DollarSign,
  Users,
} from "lucide-react";

// Default empty data - replace with real API data
const weeklyStats = [
  { day: "Mon", earnings: 0, bookings: 0 },
  { day: "Tue", earnings: 0, bookings: 0 },
  { day: "Wed", earnings: 0, bookings: 0 },
  { day: "Thu", earnings: 0, bookings: 0 },
  { day: "Fri", earnings: 0, bookings: 0 },
  { day: "Sat", earnings: 0, bookings: 0 },
  { day: "Sun", earnings: 0, bookings: 0 },
];

interface Activity {
  id: string;
  type: "booking" | "payment" | "review";
  title: string;
  time: string;
}

const recentActivity: Activity[] = [];

export function AnalyticsTab() {
  const maxEarnings = Math.max(...weeklyStats.map((d) => d.earnings));

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">This Week</p>
                <p className="text-2xl font-bold">$0</p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <span>—</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bookings</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <span>—</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Profile Views</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <span>—</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Avg. Rating</p>
                <p className="text-2xl font-bold">—</p>
              </div>
              <div className="flex items-center gap-1 text-amber-500 text-xs">
                <span>★</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Earnings Chart */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Weekly Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-40">
              {weeklyStats.map((day) => (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-primary/20 rounded-t-md transition-all hover:bg-primary/30"
                    style={{
                      height: `${(day.earnings / maxEarnings) * 100}%`,
                      minHeight: "8px",
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total this week</p>
                <p className="text-lg font-semibold">$0</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Avg per day</p>
                <p className="text-lg font-semibold">$0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {activity.type === "booking" && (
                        <Clock className="w-4 h-4 text-primary" />
                      )}
                      {activity.type === "payment" && (
                        <DollarSign className="w-4 h-4 text-green-500" />
                      )}
                      {activity.type === "review" && (
                        <span className="text-amber-500">★</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Conversion Rate</span>
              </div>
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground mt-1">
                No data yet
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Avg. Session</span>
              </div>
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground mt-1">
                No completed bookings
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Repeat Clients</span>
              </div>
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground mt-1">
                No returning clients yet
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
