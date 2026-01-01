"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { AdminCard } from "../design-system/AdminCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DollarSign, ArrowUpRight, Users, Link2, PieChart, AlertTriangle, UserPlus, ArrowDownLeft, ExternalLink } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-black-new.png";
import xLogo from "@/assets/x-logo.png";

interface ActivityEvent {
  id: string;
  type: "signup" | "payout" | "submission" | "fraud" | "withdrawal" | "transaction" | "bounty" | "link" | "demographics";
  title: string;
  detail?: string;
  timestamp: Date;
  userId?: string;
  username?: string;
  userAvatar?: string;
  amount?: number;
  status?: string;
  platform?: string;
  accountLink?: string;
}

interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  total_earnings?: number;
  created_at?: string;
}

const eventConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  signup: { label: "Signup", icon: <UserPlus className="w-3.5 h-3.5" />, color: "text-blue-400" },
  payout: { label: "Payout", icon: <DollarSign className="w-3.5 h-3.5" />, color: "text-emerald-400" },
  withdrawal: { label: "Withdrawal", icon: <ArrowDownLeft className="w-3.5 h-3.5" />, color: "text-amber-400" },
  submission: { label: "Submission", icon: <ArrowUpRight className="w-3.5 h-3.5" />, color: "text-cyan-400" },
  fraud: { label: "Alert", icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-red-400" },
  transaction: { label: "Transaction", icon: <DollarSign className="w-3.5 h-3.5" />, color: "text-emerald-400" },
  bounty: { label: "Bounty App", icon: <Users className="w-3.5 h-3.5" />, color: "text-purple-400" },
  link: { label: "Account Link", icon: <Link2 className="w-3.5 h-3.5" />, color: "text-cyan-400" },
  demographics: { label: "Demographics", icon: <PieChart className="w-3.5 h-3.5" />, color: "text-pink-400" },
};

const getPlatformIcon = (platform?: string) => {
  if (!platform) return null;
  const p = platform.toLowerCase();
  if (p === 'tiktok') return <img src={tiktokLogo} alt="TikTok" className="w-4 h-4 rounded" />;
  if (p === 'instagram') return <img src={instagramLogo} alt="Instagram" className="w-4 h-4 rounded" />;
  if (p === 'youtube') return <img src={youtubeLogo} alt="YouTube" className="w-4 h-4 rounded" />;
  if (p === 'x' || p === 'twitter') return <img src={xLogo} alt="X" className="w-4 h-4 rounded" />;
  return null;
};

const generateAccountLink = (platform?: string, username?: string) => {
  if (!platform || !username) return null;
  const p = platform.toLowerCase();
  const cleanUsername = username.replace('@', '');
  if (p === 'tiktok') return `https://tiktok.com/@${cleanUsername}`;
  if (p === 'instagram') return `https://instagram.com/${cleanUsername}`;
  if (p === 'youtube') return `https://youtube.com/@${cleanUsername}`;
  if (p === 'x' || p === 'twitter') return `https://x.com/${cleanUsername}`;
  return null;
};

const UserContextCard = ({ user }: { user: UserProfile | null }) => {
  if (!user) return <div className="p-4 text-xs text-muted-foreground">Loading...</div>;

  return (
    <div className="p-4 space-y-3 min-w-[240px]">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback className="bg-muted text-foreground text-sm">
            {user.username?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-inter tracking-[-0.3px] text-sm font-medium text-foreground">
            {user.full_name || user.username}
          </p>
          <p className="font-inter tracking-[-0.3px] text-xs text-muted-foreground">
            @{user.username}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
        <div>
          <p className="text-[10px] text-muted-foreground font-inter">Total Earnings</p>
          <p className="text-sm font-medium text-emerald-400 font-inter">
            ${(user.total_earnings || 0).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-inter">Joined</p>
          <p className="text-sm font-medium text-foreground font-inter">
            {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '-'}
          </p>
        </div>
      </div>
      {user.email && (
        <p className="text-[10px] text-muted-foreground font-inter truncate">{user.email}</p>
      )}
    </div>
  );
};

export function LiveActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());
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
            username: profile.username,
            userAvatar: profile.avatar_url,
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
            status: "pending",
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
              status: "completed",
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
            platform: submission.platform,
            status: "pending",
          });
        }
      )
      .subscribe();

    // Subscribe to wallet transactions
    const transactionsChannel = supabase
      .channel("admin-transactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wallet_transactions" },
        (payload) => {
          const tx = payload.new as any;
          if (tx.type === 'earning') {
            addEvent({
              id: `tx-${tx.id}`,
              type: "transaction",
              title: tx.description || "Earning",
              timestamp: new Date(),
              userId: tx.user_id,
              amount: Number(tx.amount),
              status: tx.status,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to bounty applications
    const bountyChannel = supabase
      .channel("admin-bounty")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bounty_applications" },
        (payload) => {
          const app = payload.new as any;
          addEvent({
            id: `bounty-${app.id}`,
            type: "bounty",
            title: "Bounty application",
            timestamp: new Date(),
            userId: app.user_id,
            status: app.status,
          });
        }
      )
      .subscribe();

    // Subscribe to social account connections
    const socialChannel = supabase
      .channel("admin-social")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "social_account_campaigns" },
        (payload) => {
          const link = payload.new as any;
          addEvent({
            id: `link-${link.id}`,
            type: "link",
            title: "Account connected",
            timestamp: new Date(),
            userId: link.user_id,
            status: link.status,
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
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(bountyChannel);
      supabase.removeChannel(socialChannel);
    };
  }, [isLive]);

  const fetchUserProfile = async (userId: string) => {
    if (userProfiles.has(userId) || loadingUsers.has(userId)) return;

    setLoadingUsers(prev => new Set(prev).add(userId));

    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, email, total_earnings, created_at")
      .eq("id", userId)
      .single();

    if (data) {
      setUserProfiles(prev => new Map(prev).set(userId, data));
    }
    setLoadingUsers(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  const loadRecentEvents = async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Load recent signups with more user data
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, created_at")
      .gte("created_at", oneDayAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    // Load recent payouts
    const { data: payouts } = await supabase
      .from("payout_requests")
      .select("id, amount, status, created_at, user_id, profiles:user_id(username, avatar_url)")
      .gte("created_at", oneDayAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    // Load recent fraud flags
    const { data: fraudFlags } = await supabase
      .from("fraud_flags")
      .select("id, flag_type, flag_reason, created_at, user_id")
      .gte("created_at", oneDayAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    // Load recent submissions
    const { data: submissions } = await supabase
      .from("campaign_submissions")
      .select("id, submitted_at, platform, status, profiles:creator_id(id, username, avatar_url)")
      .gte("submitted_at", oneDayAgo.toISOString())
      .order("submitted_at", { ascending: false })
      .limit(10);

    // Load recent transactions (earnings only)
    const { data: transactions } = await supabase
      .from("wallet_transactions")
      .select("id, created_at, description, amount, status, user_id, profiles:user_id(username, avatar_url)")
      .eq("type", "earning")
      .gte("created_at", oneDayAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    // Load recent bounty applications
    const { data: bountyApps } = await supabase
      .from("bounty_applications")
      .select("id, applied_at, status, user_id")
      .gte("applied_at", oneDayAgo.toISOString())
      .order("applied_at", { ascending: false })
      .limit(5);

    // Load recent social account links
    const { data: socialLinks } = await supabase
      .from("social_account_campaigns")
      .select("id, connected_at, status, user_id, social_accounts(username, platform, avatar_url)")
      .gte("created_at", oneDayAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    const initialEvents: ActivityEvent[] = [];

    profiles?.forEach((p: any) => {
      initialEvents.push({
        id: `signup-${p.id}`,
        type: "signup",
        title: p.full_name || p.username || "New user",
        detail: `@${p.username || "user"}`,
        timestamp: new Date(p.created_at),
        userId: p.id,
        username: p.username,
        userAvatar: p.avatar_url,
      });
    });

    payouts?.forEach((p: any) => {
      const profile = p.profiles as any;
      initialEvents.push({
        id: `payout-${p.id}`,
        type: p.status === "completed" ? "payout" : "withdrawal",
        title: p.status === "completed" ? "Payout completed" : "Withdrawal requested",
        detail: `$${Number(p.amount).toFixed(2)}`,
        timestamp: new Date(p.created_at),
        userId: p.user_id,
        username: profile?.username,
        userAvatar: profile?.avatar_url,
        amount: Number(p.amount),
        status: p.status,
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

    submissions?.forEach((s: any) => {
      const profile = s.profiles as any;
      initialEvents.push({
        id: `submission-${s.id}`,
        type: "submission",
        title: `${s.platform || 'Content'} submission`,
        timestamp: new Date(s.submitted_at),
        userId: profile?.id,
        username: profile?.username,
        userAvatar: profile?.avatar_url,
        platform: s.platform,
        status: s.status,
      });
    });

    transactions?.forEach((t: any) => {
      const profile = t.profiles as any;
      initialEvents.push({
        id: `tx-${t.id}`,
        type: "transaction",
        title: t.description || "Earning",
        timestamp: new Date(t.created_at),
        userId: t.user_id,
        username: profile?.username,
        userAvatar: profile?.avatar_url,
        amount: Number(t.amount),
        status: t.status,
      });
    });

    bountyApps?.forEach((b) => {
      initialEvents.push({
        id: `bounty-${b.id}`,
        type: "bounty",
        title: "Bounty application",
        timestamp: new Date(b.applied_at),
        userId: b.user_id,
        status: b.status,
      });
    });

    socialLinks?.forEach((s: any) => {
      const account = s.social_accounts as any;
      initialEvents.push({
        id: `link-${s.id}`,
        type: "link",
        title: `Connected @${account?.username || 'account'}`,
        timestamp: new Date(s.connected_at),
        userId: s.user_id,
        platform: account?.platform,
        accountLink: generateAccountLink(account?.platform, account?.username),
        status: s.status,
      });
    });

    // Sort by timestamp descending
    initialEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    eventsRef.current = initialEvents.slice(0, 25);
    setEvents(eventsRef.current);
  };

  const addEvent = (event: ActivityEvent) => {
    eventsRef.current = [event, ...eventsRef.current].slice(0, 25);
    setEvents([...eventsRef.current]);
  };

  // Calculate stats
  const stats = {
    total: events.length,
    payouts: events.filter(e => e.type === 'payout' || e.type === 'withdrawal').length,
    submissions: events.filter(e => e.type === 'submission').length,
    signups: events.filter(e => e.type === 'signup').length,
  };

  return (
    <AdminCard
      title="Live Activity"
      subtitle="Real-time platform events"
      action={
        <div className="flex items-center gap-3">
          {/* Mini stats */}
          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
            <span>{stats.signups} signups</span>
            <span>{stats.submissions} submissions</span>
            <span>{stats.payouts} payouts</span>
          </div>
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
                isLive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
              )}
            />
            {isLive ? "Live" : "Paused"}
          </button>
        </div>
      }
      noPadding
    >
      <div className="max-h-[500px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-sm font-inter">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((event, index) => {
              const config = eventConfig[event.type];
              const profile = event.userId ? userProfiles.get(event.userId) : null;
              const displayUsername = event.username || profile?.username;
              const displayAvatar = event.userAvatar || profile?.avatar_url;

              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors",
                    index === 0 && "bg-muted/20"
                  )}
                >
                  {/* Type icon */}
                  <div className={cn("flex-shrink-0", config?.color)}>
                    {config?.icon}
                  </div>

                  {/* User avatar with popover */}
                  {event.userId ? (
                    <Popover>
                      <PopoverTrigger
                        asChild
                        onMouseEnter={() => fetchUserProfile(event.userId!)}
                      >
                        <button className="flex-shrink-0 hover:opacity-80 transition-opacity">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={displayAvatar || undefined} />
                            <AvatarFallback className="bg-muted text-foreground text-[10px]">
                              {(displayUsername || '?').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="bg-card border-border p-0 w-auto"
                        align="start"
                      >
                        <UserContextCard user={profile} />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="w-7" />
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-foreground font-inter tracking-[-0.5px] truncate">
                        {event.title}
                      </p>
                      {event.platform && getPlatformIcon(event.platform)}
                    </div>
                    <div className="flex items-center gap-2">
                      {displayUsername && (
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                          @{displayUsername}
                        </p>
                      )}
                      {event.detail && !displayUsername && (
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] truncate">
                          {event.detail}
                        </p>
                      )}
                      {event.accountLink && (
                        <a
                          href={event.accountLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  {event.amount !== undefined && (
                    <span className="text-xs font-medium text-emerald-400 font-inter">
                      ${event.amount.toFixed(2)}
                    </span>
                  )}

                  {/* Status badge */}
                  {event.status && (
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded font-medium font-inter uppercase",
                      event.status === 'completed' || event.status === 'approved' ? "bg-emerald-500/10 text-emerald-400" :
                      event.status === 'pending' ? "bg-amber-500/10 text-amber-400" :
                      event.status === 'rejected' || event.status === 'failed' ? "bg-red-500/10 text-red-400" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {event.status}
                    </span>
                  )}

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
