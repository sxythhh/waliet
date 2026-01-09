"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { AdminCard } from "../design-system/AdminCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-black-new.png";
import xLogo from "@/assets/x-logo.png";

// Database query result interfaces
interface ProfileRow {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  email?: string;
  total_earnings?: number;
  display_name?: string;
}

interface PayoutRequestRow {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  user_id: string;
  profiles: { username: string | null; avatar_url: string | null } | null;
}

interface FraudFlagRow {
  id: string;
  flag_type: string;
  flag_reason: string | null;
  created_at: string;
  user_id: string;
}

interface CampaignSubmissionRow {
  id: string;
  submitted_at: string;
  platform: string | null;
  status: string | null;
  profiles: { id: string; username: string | null; avatar_url: string | null } | null;
}

interface WalletTransactionRow {
  id: string;
  created_at: string;
  description: string | null;
  amount: number;
  status: string | null;
  user_id: string;
  type?: string;
  profiles: { username: string | null; avatar_url: string | null } | null;
}

interface BountyApplicationRow {
  id: string;
  applied_at: string;
  status: string | null;
  user_id: string;
}

interface SocialAccountCampaignRow {
  id: string;
  connected_at: string;
  status: string | null;
  user_id: string;
  social_accounts: { username: string | null; platform: string | null; avatar_url: string | null } | null;
}

// Realtime payload interfaces
interface RealtimeProfilePayload {
  id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

interface RealtimePayoutPayload {
  id: string;
  amount: number;
  status: string;
  user_id: string;
}

interface RealtimeFraudPayload {
  id: string;
  flag_type: string;
  flag_reason?: string | null;
  user_id: string;
}

interface RealtimeSubmissionPayload {
  id: string;
  platform?: string | null;
  user_id: string;
}

interface RealtimeTransactionPayload {
  id: string;
  type: string;
  description?: string | null;
  amount: number;
  status?: string | null;
  user_id: string;
}

interface RealtimeBountyPayload {
  id: string;
  status?: string | null;
  user_id: string;
}

interface RealtimeSocialLinkPayload {
  id: string;
  status?: string | null;
  user_id: string;
}

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

const eventConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  signup: { label: "Signup", color: "text-blue-500", bgColor: "bg-blue-500/10" },
  payout: { label: "Payout", color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  withdrawal: { label: "Withdrawal", color: "text-amber-500", bgColor: "bg-amber-500/10" },
  submission: { label: "Submission", color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
  fraud: { label: "Alert", color: "text-red-500", bgColor: "bg-red-500/10" },
  transaction: { label: "Earning", color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  bounty: { label: "Bounty", color: "text-purple-500", bgColor: "bg-purple-500/10" },
  link: { label: "Link", color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
  demographics: { label: "Demographics", color: "text-pink-500", bgColor: "bg-pink-500/10" },
};

const getPlatformIcon = (platform?: string) => {
  if (!platform) return null;
  const p = platform.toLowerCase();
  if (p === 'tiktok') return <img src={tiktokLogo} alt="TikTok" className="w-3.5 h-3.5" />;
  if (p === 'instagram') return <img src={instagramLogo} alt="Instagram" className="w-3.5 h-3.5" />;
  if (p === 'youtube') return <img src={youtubeLogo} alt="YouTube" className="w-3.5 h-3.5" />;
  if (p === 'x' || p === 'twitter') return <img src={xLogo} alt="X" className="w-3.5 h-3.5 dark:invert" />;
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
  if (!user) return <div className="p-3 text-xs text-muted-foreground">Loading...</div>;

  return (
    <div className="p-3 space-y-2.5 min-w-[200px]">
      <div className="flex items-center gap-2.5">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback className="bg-muted text-foreground text-xs">
            {user.username?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {user.full_name || user.username}
          </p>
          <p className="text-xs text-muted-foreground">
            @{user.username}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 pt-2 border-t border-border">
        <div>
          <p className="text-[10px] text-muted-foreground">Earned</p>
          <p className="text-xs font-medium text-emerald-500">
            ${(user.total_earnings || 0).toFixed(0)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Joined</p>
          <p className="text-xs font-medium text-foreground">
            {user.created_at ? format(new Date(user.created_at), 'MMM yyyy') : '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export function LiveActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());
  const eventsRef = useRef<ActivityEvent[]>([]);
  const userProfilesRef = useRef<Map<string, UserProfile>>(userProfiles);
  const loadingUsersRef = useRef<Set<string>>(loadingUsers);

  // Keep refs in sync with state
  useEffect(() => {
    userProfilesRef.current = userProfiles;
  }, [userProfiles]);

  useEffect(() => {
    loadingUsersRef.current = loadingUsers;
  }, [loadingUsers]);

  // Define fetchUserProfile using refs to avoid dependency issues
  const fetchUserProfile = useCallback(async (userId: string) => {
    if (userProfilesRef.current.has(userId) || loadingUsersRef.current.has(userId)) return;

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
  }, []);

  // Define addEvent using ref for userProfiles to avoid excessive dependency updates
  const addEvent = useCallback((event: ActivityEvent) => {
    eventsRef.current = [event, ...eventsRef.current].slice(0, 25);
    setEvents([...eventsRef.current]);

    // Auto-fetch user profile if we have userId but no avatar
    if (event.userId && !event.userAvatar && !userProfilesRef.current.has(event.userId)) {
      fetchUserProfile(event.userId);
    }
  }, [fetchUserProfile]);

  // Define loadRecentEvents
  const loadRecentEvents = useCallback(async () => {
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

    (profiles as ProfileRow[] | null)?.forEach((p) => {
      initialEvents.push({
        id: `signup-${p.id}`,
        type: "signup",
        title: p.full_name || p.username || "New user",
        detail: `@${p.username || "user"}`,
        timestamp: new Date(p.created_at),
        userId: p.id,
        username: p.username ?? undefined,
        userAvatar: p.avatar_url ?? undefined,
      });
    });

    (payouts as PayoutRequestRow[] | null)?.forEach((p) => {
      const profile = p.profiles;
      initialEvents.push({
        id: `payout-${p.id}`,
        type: p.status === "completed" ? "payout" : "withdrawal",
        title: p.status === "completed" ? "Payout completed" : "Withdrawal requested",
        detail: `$${Number(p.amount).toFixed(2)}`,
        timestamp: new Date(p.created_at),
        userId: p.user_id,
        username: profile?.username ?? undefined,
        userAvatar: profile?.avatar_url ?? undefined,
        amount: Number(p.amount),
        status: p.status,
      });
    });

    (fraudFlags as FraudFlagRow[] | null)?.forEach((f) => {
      initialEvents.push({
        id: `fraud-${f.id}`,
        type: "fraud",
        title: `Fraud flag: ${f.flag_type}`,
        detail: f.flag_reason?.slice(0, 50) ?? undefined,
        timestamp: new Date(f.created_at),
        userId: f.user_id,
      });
    });

    (submissions as CampaignSubmissionRow[] | null)?.forEach((s) => {
      const profile = s.profiles;
      initialEvents.push({
        id: `submission-${s.id}`,
        type: "submission",
        title: `${s.platform || 'Content'} submission`,
        timestamp: new Date(s.submitted_at),
        userId: profile?.id,
        username: profile?.username ?? undefined,
        userAvatar: profile?.avatar_url ?? undefined,
        platform: s.platform ?? undefined,
        status: s.status ?? undefined,
      });
    });

    (transactions as WalletTransactionRow[] | null)?.forEach((t) => {
      const profile = t.profiles;
      initialEvents.push({
        id: `tx-${t.id}`,
        type: "transaction",
        title: t.description || "Earning",
        timestamp: new Date(t.created_at),
        userId: t.user_id,
        username: profile?.username ?? undefined,
        userAvatar: profile?.avatar_url ?? undefined,
        amount: Number(t.amount),
        status: t.status ?? undefined,
      });
    });

    (bountyApps as BountyApplicationRow[] | null)?.forEach((b) => {
      initialEvents.push({
        id: `bounty-${b.id}`,
        type: "bounty",
        title: "Bounty application",
        timestamp: new Date(b.applied_at),
        userId: b.user_id,
        status: b.status ?? undefined,
      });
    });

    (socialLinks as SocialAccountCampaignRow[] | null)?.forEach((s) => {
      const account = s.social_accounts;
      initialEvents.push({
        id: `link-${s.id}`,
        type: "link",
        title: `Connected @${account?.username || 'account'}`,
        timestamp: new Date(s.connected_at),
        userId: s.user_id,
        platform: account?.platform ?? undefined,
        accountLink: generateAccountLink(account?.platform ?? undefined, account?.username ?? undefined),
        status: s.status ?? undefined,
      });
    });

    // Sort by timestamp descending
    initialEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    eventsRef.current = initialEvents.slice(0, 25);
    setEvents(eventsRef.current);

    // Fetch profiles for events that don't have avatar data
    const userIdsToFetch = new Set<string>();
    eventsRef.current.forEach(event => {
      if (event.userId && !event.userAvatar) {
        userIdsToFetch.add(event.userId);
      }
    });

    // Batch fetch user profiles
    if (userIdsToFetch.size > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, email, total_earnings, created_at")
        .in("id", Array.from(userIdsToFetch));

      if (profilesData) {
        setUserProfiles(prev => {
          const newProfiles = new Map(prev);
          profilesData.forEach(p => newProfiles.set(p.id, p));
          return newProfiles;
        });
      }
    }
  }, []);

  // Load initial recent events
  useEffect(() => {
    loadRecentEvents();
  }, [loadRecentEvents]);

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
          const profile = payload.new as RealtimeProfilePayload;
          addEvent({
            id: `signup-${profile.id}`,
            type: "signup",
            title: profile.display_name || profile.username || "New user",
            detail: `@${profile.username || "user"}`,
            timestamp: new Date(),
            userId: profile.id,
            username: profile.username ?? undefined,
            userAvatar: profile.avatar_url ?? undefined,
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
          const payout = payload.new as RealtimePayoutPayload;
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
          const payout = payload.new as RealtimePayoutPayload;
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
          const flag = payload.new as RealtimeFraudPayload;
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
          const submission = payload.new as RealtimeSubmissionPayload;
          addEvent({
            id: `submission-${submission.id}`,
            type: "submission",
            title: "New submission",
            timestamp: new Date(),
            userId: submission.user_id,
            platform: submission.platform ?? undefined,
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
          const tx = payload.new as RealtimeTransactionPayload;
          if (tx.type === 'earning') {
            addEvent({
              id: `tx-${tx.id}`,
              type: "transaction",
              title: tx.description || "Earning",
              timestamp: new Date(),
              userId: tx.user_id,
              amount: Number(tx.amount),
              status: tx.status ?? undefined,
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
          const app = payload.new as RealtimeBountyPayload;
          addEvent({
            id: `bounty-${app.id}`,
            type: "bounty",
            title: "Bounty application",
            timestamp: new Date(),
            userId: app.user_id,
            status: app.status ?? undefined,
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
          const link = payload.new as RealtimeSocialLinkPayload;
          addEvent({
            id: `link-${link.id}`,
            type: "link",
            title: "Account connected",
            timestamp: new Date(),
            userId: link.user_id,
            status: link.status ?? undefined,
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
  }, [isLive, addEvent]);

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
        <button
          onClick={() => setIsLive(!isLive)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
            "text-muted-foreground hover:text-foreground"
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
      }
      noPadding
    >
      <div className="max-h-[460px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {events.map((event) => {
              const config = eventConfig[event.type];
              const profile = event.userId ? userProfiles.get(event.userId) : null;
              const displayUsername = event.username || profile?.username;
              const displayAvatar = event.userAvatar || profile?.avatar_url;

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  {/* User avatar with popover */}
                  {event.userId ? (
                    <Popover>
                      <PopoverTrigger
                        asChild
                        onMouseEnter={() => fetchUserProfile(event.userId!)}
                      >
                        <button className="flex-shrink-0 hover:opacity-80 transition-opacity">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={displayAvatar || undefined} />
                            <AvatarFallback className="bg-muted text-foreground text-xs">
                              {(displayUsername || '?').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="bg-card border-border p-0 w-auto"
                        align="start"
                        sideOffset={8}
                      >
                        <UserContextCard user={profile} />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">?</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {displayUsername && (
                        <span className="text-sm font-medium text-foreground">
                          @{displayUsername}
                        </span>
                      )}
                      {!displayUsername && (
                        <span className="text-sm text-foreground">
                          {event.title}
                        </span>
                      )}
                      {event.platform && getPlatformIcon(event.platform)}
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
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={cn("font-medium", config?.color)}>
                        {config?.label}
                      </span>
                      {event.detail && (
                        <>
                          <span>·</span>
                          <span className="truncate">{event.detail}</span>
                        </>
                      )}
                      {displayUsername && event.title !== `@${displayUsername}` && event.type !== 'signup' && (
                        <>
                          <span>·</span>
                          <span className="truncate">{event.title}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right side: amount, status, time */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Amount */}
                    {event.amount !== undefined && (
                      <span className="text-sm font-medium text-emerald-500 tabular-nums">
                        ${event.amount.toFixed(2)}
                      </span>
                    )}

                    {/* Status badge */}
                    {event.status && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium capitalize",
                        event.status === 'completed' || event.status === 'approved' ? "bg-emerald-500/10 text-emerald-500" :
                        event.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                        event.status === 'rejected' || event.status === 'failed' ? "bg-red-500/10 text-red-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {event.status}
                      </span>
                    )}

                    {/* Timestamp */}
                    <span className="text-[11px] text-muted-foreground tabular-nums w-12 text-right">
                      {formatDistanceToNow(event.timestamp, { addSuffix: false }).replace(' minutes', 'm').replace(' minute', 'm').replace(' hours', 'h').replace(' hour', 'h').replace(' days', 'd').replace(' day', 'd').replace(' seconds', 's').replace(' second', 's').replace('about ', '').replace('less than a', '<1')}
                    </span>
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
