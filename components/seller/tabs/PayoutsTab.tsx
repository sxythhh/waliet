"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  ChevronDown,
  Download,
  Building2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow } from "date-fns";

type PayoutStatus = "pending" | "completed" | "failed";

interface Payout {
  id: string;
  amount: number;
  status: PayoutStatus;
  method: string;
  created_at: string;
  completed_at?: string;
  reference?: string;
}

// Default empty payouts - replace with real API data
const defaultPayouts: Payout[] = [];

const statusConfig: Record<PayoutStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-amber-500/10 text-amber-500" },
  completed: { label: "Completed", icon: CheckCircle2, className: "bg-green-500/10 text-green-500" },
  failed: { label: "Failed", icon: XCircle, className: "bg-red-500/10 text-red-500" },
};

export function PayoutsTab() {
  const [filter, setFilter] = useState<PayoutStatus | "all">("all");
  const [payouts] = useState(defaultPayouts);
  const [availableBalance] = useState(0);

  const filteredPayouts = payouts.filter(
    (payout) => filter === "all" || payout.status === filter
  );

  const totalEarnings = payouts
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Available Balance
              </span>
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">${availableBalance.toLocaleString()}</p>
            <Button className="w-full mt-4 gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Withdraw
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pending Payouts
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">${pendingAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Processing within 1-3 business days
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total Withdrawn
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">${totalEarnings.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Lifetime earnings withdrawn
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payouts List Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payout History</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                {filter === "all" ? "All" : statusConfig[filter].label}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter("all")}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("completed")}>Completed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("pending")}>Pending</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("failed")}>Failed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Payouts List */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {filteredPayouts.map((payout) => {
              const status = statusConfig[payout.status];
              const StatusIcon = status.icon;

              return (
                <div
                  key={payout.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${status.className}`}
                  >
                    <StatusIcon className="w-4 h-4" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-foreground">
                        ${payout.amount.toLocaleString()}
                      </p>
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {payout.method} · {payout.reference}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="text-right">
                    <p className="text-sm text-foreground">
                      {format(new Date(payout.created_at), "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(payout.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}

            {filteredPayouts.length === 0 && (
              <div className="py-12 text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-1">No payouts found</h3>
                <p className="text-sm text-muted-foreground">
                  {filter === "all"
                    ? "You haven't requested any payouts yet"
                    : `No ${filter} payouts`}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
