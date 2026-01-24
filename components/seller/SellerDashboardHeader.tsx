"use client";

import { TrendingUp, Users, DollarSign, Calendar, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SellerDashboardHeaderProps {
  workspace: {
    name: string;
  };
  stats: {
    totalEarnings: number;
    pendingPayouts: number;
    totalBookings: number;
    activeClients: number;
  };
  onEditSettings?: () => void;
}

export function SellerDashboardHeader({
  workspace,
  stats,
  onEditSettings,
}: SellerDashboardHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Title Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {workspace.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Workspace Overview
          </p>
        </div>
        {onEditSettings && (
          <Button variant="outline" size="sm" onClick={onEditSettings}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Earnings */}
        <div className="bg-muted/20 rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
          <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Total Earnings
          </span>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500" />
            </div>
            <p className="text-lg md:text-xl font-semibold text-foreground tabular-nums">
              ${stats.totalEarnings.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Pending Payouts */}
        <div className="bg-muted/20 rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
          <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pending
          </span>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" />
            </div>
            <p className="text-lg md:text-xl font-semibold text-foreground tabular-nums">
              ${stats.pendingPayouts.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-muted/20 rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
          <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Bookings
          </span>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
            </div>
            <p className="text-lg md:text-xl font-semibold text-foreground tabular-nums">
              {stats.totalBookings}
            </p>
          </div>
        </div>

        {/* Active Clients */}
        <div className="bg-muted/20 rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
          <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Clients
          </span>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
            </div>
            <p className="text-lg md:text-xl font-semibold text-foreground tabular-nums">
              {stats.activeClients}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
