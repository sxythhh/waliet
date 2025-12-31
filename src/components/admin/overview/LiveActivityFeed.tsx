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

const eventStyles = {
  signup: {
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    color: "text-green-400",
    bg: "bg-green-500/10",
    label: "New User",
  },
  payout: {
    icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    label: "Payout",
  },
  submission: {
    icon: "M15 10l-4 4l6 6l4-16l-18 7l4 2l2 6l3-4",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    label: "Submission",
  },
  fraud: {
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    color: "text-red-400",
    bg: "bg-red-500/10",
    label: "Alert",
  },
  campaign: {
    icon: "M9 12l2 2l4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806a3.42 3.42 0 0 1 4.438 0a3.42 3.42 0 0 0 1.946.806a3.42 3.42 0 0 1 3.138 3.138a3.42 3.42 0 0 0 .806 1.946a3.42 3.42 0 0 1 0 4.438a3.42 3.42 0 0 0-.806 1.946a3.42 3.42 0 0 1-3.138 3.138a3.42 3.42 0 0 0-1.946.806a3.42 3.42 0 0 1-4.438 0a3.42 3.42 0 0 0-1.946-.806a3.42 3.42 0 0 1-3.138-3.138a3.42 3.42 0 0 0-.806-1.946a3.42 3.42 0 0 1 0-4.438a3.42 3.42 0 0 0 .806-1.946a3.42 3.42 0 0 1 3.138-3.138z",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    label: "Campaign",
  },
  withdrawal: {
    icon: "M3 3v18h18M18.7 8l-5.1 5.2l-2.8-2.7L7 14.3",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    label: "Withdrawal",
  },
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
      .select("id, display_name, username, created_at")
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

    profiles?.forEach((p) => {
      initialEvents.push({
        id: `signup-${p.id}`,
        type: "signup",
        title: p.display_name || p.username || "New user",
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
            isLive
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-white/5 text-white/50 border border-white/10"
          )}
        >
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isLive ? "bg-green-400 animate-pulse" : "bg-white/30"
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
            <p className="text-white/30 text-sm font-inter">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {events.map((event, index) => {
              const style = eventStyles[event.type];
              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors",
                    index === 0 && "bg-white/[0.01]"
                  )}
                >
                  {/* Icon */}
                  <div className={cn("p-2 rounded-lg", style.bg)}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={style.color}
                    >
                      <path d={style.icon} />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-inter tracking-[-0.5px] truncate">
                      {event.title}
                    </p>
                    {event.detail && (
                      <p className="text-xs text-white/40 font-inter tracking-[-0.5px] truncate">
                        {event.detail}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-[10px] text-white/30 font-inter tracking-[-0.5px] whitespace-nowrap">
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
