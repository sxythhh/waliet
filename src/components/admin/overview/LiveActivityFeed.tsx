"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AdminCard } from "../design-system/AdminCard";

interface ActivityEvent {
  id: string;
  type: "signup" | "payout" | "submission" | "fraud" | "campaign" | "withdrawal";
  title: string;
  detail?: string;
  timestamp: Date;
  userId?: string;
  amount?: number;
}

const eventLabels = {
  signup: "New User",
  payout: "Payout",
  submission: "Submission",
  fraud: "Alert",
  campaign: "Campaign",
  withdrawal: "Withdrawal",
};

export function LiveActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const eventsRef = useRef<ActivityEvent[]>([]);

  // Load initial recent events
  useEffect(() => {
    loadRecentEvents();
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!isLive) return;

    // Subscribe to new profiles (signups)
    const profilesChannel = supabase
      .channel("admin-profiles")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          const profile = payload.new as any;
          addEvent({
            id: `signup-${profile.id}`,
            type: "signup",
            title: profile.display_name || profile.username || "New user",
            detail: `@${profile.username || "user"}`,
            timestamp: new Date(),
            userId: profile.id,
          });
        }
      )
      .subscribe();

    // Subscribe to payout requests
    const payoutsChannel = supabase
      .channel("admin-payouts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payout_requests" },
        (payload) => {
          const payout = payload.new as any;
          addEvent({
            id: `payout-${payout.id}`,
            type: "withdrawal",
            title: `Withdrawal requested`,
            detail: `$${Number(payout.amount).toFixed(2)}`,
            timestamp: new Date(),
            userId: payout.user_id,
            amount: Number(payout.amount),
          });
        }
      )
      .subscribe();

    // Subscribe to completed payouts
    const completedPayoutsChannel = supabase
      .channel("admin-completed-payouts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payout_requests" },
        (payload) => {
          const payout = payload.new as any;
          if (payout.status === "completed") {
            addEvent({
              id: `payout-completed-${payout.id}-${Date.now()}`,
              type: "payout",
              title: `Payout completed`,
              detail: `$${Number(payout.amount).toFixed(2)}`,
              timestamp: new Date(),
              userId: payout.user_id,
              amount: Number(payout.amount),
            });
          }
        }
      )
      .subscribe();

    // Subscribe to fraud flags
    const fraudChannel = supabase
      .channel("admin-fraud")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "fraud_flags" },
        (payload) => {
          const flag = payload.new as any;
          addEvent({
            id: `fraud-${flag.id}`,
            type: "fraud",
            title: `Fraud flag: ${flag.flag_type}`,
            detail: flag.flag_reason?.slice(0, 50),
            timestamp: new Date(),
            userId: flag.user_id,
          });
        }
      )
      .subscribe();

    // Subscribe to campaign submissions
    const submissionsChannel = supabase
      .channel("admin-submissions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "campaign_submissions" },
        (payload) => {
          const submission = payload.new as any;
          addEvent({
            id: `submission-${submission.id}`,
            type: "submission",
            title: "New submission",
            timestamp: new Date(),
            userId: submission.user_id,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(payoutsChannel);
      supabase.removeChannel(completedPayoutsChannel);
      supabase.removeChannel(fraudChannel);
      supabase.removeChannel(submissionsChannel);
    };
  }, [isLive]);

  const loadRecentEvents = async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Load recent signups
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, created_at")
      .gte("created_at", oneDayAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    // Load recent payouts
    const { data: payouts } = await supabase
      .from("payout_requests")
      .select("id, amount, status, created_at, user_id")
      .gte("created_at", oneDayAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    // Load recent fraud flags
    const { data: fraudFlags } = await supabase
      .from("fraud_flags")
      .select("id, flag_type, flag_reason, created_at, user_id")
      .gte("created_at", oneDayAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(3);

    const initialEvents: ActivityEvent[] = [];

    profiles?.forEach((p: any) => {
      initialEvents.push({
        id: `signup-${p.id}`,
        type: "signup",
        title: p.full_name || p.username || "New user",
        detail: `@${p.username || "user"}`,
        timestamp: new Date(p.created_at),
        userId: p.id,
      });
    });

    payouts?.forEach((p) => {
      initialEvents.push({
        id: `payout-${p.id}`,
        type: p.status === "completed" ? "payout" : "withdrawal",
        title: p.status === "completed" ? "Payout completed" : "Withdrawal requested",
        detail: `$${Number(p.amount).toFixed(2)}`,
        timestamp: new Date(p.created_at),
        userId: p.user_id,
        amount: Number(p.amount),
      });
    });

    fraudFlags?.forEach((f) => {
      initialEvents.push({
        id: `fraud-${f.id}`,
        type: "fraud",
        title: `Fraud flag: ${f.flag_type}`,
        detail: f.flag_reason?.slice(0, 50),
        timestamp: new Date(f.created_at),
        userId: f.user_id,
      });
    });

    // Sort by timestamp descending
    initialEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    eventsRef.current = initialEvents.slice(0, 15);
    setEvents(eventsRef.current);
  };

  const addEvent = (event: ActivityEvent) => {
    eventsRef.current = [event, ...eventsRef.current].slice(0, 15);
    setEvents([...eventsRef.current]);
  };

  return (
    <AdminCard
      title="Live Activity"
      subtitle="Real-time platform events"
      action={
        <button
          onClick={() => setIsLive(!isLive)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            "bg-muted border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isLive ? "bg-foreground animate-pulse" : "bg-muted-foreground"
            )}
          />
          {isLive ? "Live" : "Paused"}
        </button>
      }
      noPadding
    >
      <div className="max-h-[400px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-sm font-inter">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((event, index) => {
              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors",
                    index === 0 && "bg-muted/20"
                  )}
                >
                  {/* Label badge */}
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground min-w-[70px] justify-center">
                    {eventLabels[event.type]}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-inter tracking-[-0.5px] truncate">
                      {event.title}
                    </p>
                    {event.detail && (
                      <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] truncate">
                        {event.detail}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px] whitespace-nowrap">
                    {formatDistanceToNow(event.timestamp, { addSuffix: false })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminCard>
  );
}
