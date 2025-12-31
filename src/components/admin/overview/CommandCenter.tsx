"use client";

import { useState } from "react";
import { MetricsGrid } from "./MetricsGrid";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { QuickActions } from "./QuickActions";
import { SendAnnouncementDialog } from "../SendAnnouncementDialog";
import { AdminSearchCommand } from "../AdminSearchCommand";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function CommandCenter() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="w-full h-full p-4 md:p-6 pt-16 md:pt-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-inter tracking-[-0.5px] text-white">
              Command Center
            </h1>
            <p className="text-sm text-white/40 font-inter tracking-[-0.5px] mt-0.5">
              Platform overview and real-time monitoring
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="gap-2 bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
            <AdminSearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
            <SendAnnouncementDialog />
          </div>
        </div>

        {/* Metrics Grid */}
        <MetricsGrid />

        {/* Two column layout for activity and quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Activity Feed - takes 2 columns */}
          <div className="lg:col-span-2">
            <LiveActivityFeed />
          </div>

          {/* Quick Actions */}
          <div>
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  );
}
