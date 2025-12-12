import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowUpRight, ArrowDownLeft, Link2, Users, DollarSign, PieChart, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import tiktokLogo from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-black-new.png";
import xLogo from "@/assets/x-logo.png";

interface ApiLog {
  timestamp: number;
  type: string;
  description: string;
  details?: string;
  status?: string;
  amount?: number;
  user?: string;
  userId?: string;
  userAvatar?: string;
  platform?: string;
  accountLink?: string;
  accountUsername?: string;
  accountAvatar?: string;
  campaignTitle?: string;
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

const getPlatformIcon = (platform?: string) => {
  if (!platform) return null;
  const p = platform.toLowerCase();
  if (p === 'tiktok') return <img src={tiktokLogo} alt="TikTok" className="w-4 h-4 rounded" />;
  if (p === 'instagram') return <img src={instagramLogo} alt="Instagram" className="w-4 h-4 rounded" />;
  if (p === 'youtube') return <img src={youtubeLogo} alt="YouTube" className="w-4 h-4 rounded" />;
  if (p === 'x' || p === 'twitter') return <img src={xLogo} alt="X" className="w-4 h-4 rounded" />;
  return null;
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Transaction': return <DollarSign className="w-4 h-4 text-emerald-500" />;
    case 'Submission': return <ArrowUpRight className="w-4 h-4 text-blue-500" />;
    case 'Bounty App': return <Users className="w-4 h-4 text-purple-500" />;
    case 'Payout': return <ArrowDownLeft className="w-4 h-4 text-amber-500" />;
    case 'Account Link': return <Link2 className="w-4 h-4 text-cyan-500" />;
    case 'Demographics': return <PieChart className="w-4 h-4 text-pink-500" />;
    default: return null;
  }
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
  if (!user) return <div className="p-4 text-xs text-white/50">Loading...</div>;
  
  return (
    <div className="p-4 space-y-3 min-w-[240px]">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback className="bg-white/10 text-white text-sm">
            {user.username?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-inter tracking-[-0.3px] text-sm font-medium text-white">
            {user.full_name || user.username}
          </p>
          <p className="font-inter tracking-[-0.3px] text-xs text-white/50">
            @{user.username}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
        <div>
          <p className="text-[10px] text-white/40 font-inter">Total Earnings</p>
          <p className="text-sm font-medium text-emerald-400 font-inter">
            ${(user.total_earnings || 0).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 font-inter">Joined</p>
          <p className="text-sm font-medium text-white font-inter">
            {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '-'}
          </p>
        </div>
      </div>
      {user.email && (
        <p className="text-[10px] text-white/40 font-inter truncate">{user.email}</p>
      )}
    </div>
  );
};

export function ApiActivityTab() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchApiActivity();
  }, []);

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

  const fetchApiActivity = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel with rich context
      const [transactionsResult, submissionsResult, applicationsResult, payoutsResult, socialAccountsResult, demographicsResult] = await Promise.all([
        supabase
          .from("wallet_transactions")
          .select("created_at, description, type, status, amount, metadata, user_id")
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("campaign_submissions")
          .select("submitted_at, reviewed_at, status, platform, content_url, campaigns(title), profiles:creator_id(id, username, avatar_url)")
          .order("submitted_at", { ascending: false })
          .limit(25),
        supabase
          .from("bounty_applications")
          .select("applied_at, status, video_url, user_id, bounty_campaigns(title)")
          .order("applied_at", { ascending: false })
          .limit(25),
        supabase
          .from("payout_requests")
          .select("requested_at, payout_method, status, amount, profiles:user_id(id, username, avatar_url)")
          .order("requested_at", { ascending: false })
          .limit(25),
        supabase
          .from("social_account_campaigns")
          .select("connected_at, disconnected_at, status, user_id, social_accounts(username, platform, user_id, avatar_url), campaigns(title)")
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("demographic_submissions")
          .select("submitted_at, status, tier1_percentage, social_accounts(username, platform, user_id, avatar_url)")
          .order("submitted_at", { ascending: false })
          .limit(25)
      ]);

      const allLogs: ApiLog[] = [];

      // Process transactions with rich context
      if (transactionsResult.data) {
        allLogs.push(...transactionsResult.data.map(t => {
          const metadata = t.metadata as Record<string, any> | null;
          const campaignName = metadata?.campaign_title || metadata?.campaign_name || '';
          return {
            timestamp: new Date(t.created_at).getTime(),
            type: "Transaction",
            description: t.type === 'earning' ? `Earning: ${t.description || 'Campaign payment'}` : 
                        t.type === 'withdrawal' ? `Withdrawal: ${t.description || 'Payout'}` :
                        t.description || t.type,
            details: campaignName ? `Campaign: ${campaignName}` : undefined,
            status: t.status,
            amount: t.amount,
            userId: t.user_id,
            campaignTitle: campaignName,
          };
        }));
      }

      // Process submissions with campaign and user context
      if (submissionsResult.data) {
        allLogs.push(...submissionsResult.data.map(s => {
          const campaign = s.campaigns as { title: string } | null;
          const profile = s.profiles as { id: string; username: string; avatar_url: string | null } | null;
          return {
            timestamp: new Date(s.submitted_at || s.reviewed_at || new Date()).getTime(),
            type: "Submission",
            description: `${s.platform || 'Content'} submission`,
            details: s.content_url ? `${s.content_url.substring(0, 40)}...` : undefined,
            status: s.status || "pending",
            user: profile?.username,
            userId: profile?.id,
            userAvatar: profile?.avatar_url || undefined,
            platform: s.platform,
            campaignTitle: campaign?.title,
          };
        }));
      }

      // Process bounty applications with campaign context
      if (applicationsResult.data) {
        allLogs.push(...applicationsResult.data.map(a => {
          const bounty = a.bounty_campaigns as { title: string } | null;
          return {
            timestamp: new Date(a.applied_at).getTime(),
            type: "Bounty App",
            description: `Application`,
            details: a.video_url ? `${a.video_url.substring(0, 30)}...` : undefined,
            status: a.status,
            userId: a.user_id,
            campaignTitle: bounty?.title,
          };
        }));
      }

      // Process payouts with amount and user context
      if (payoutsResult.data) {
        allLogs.push(...payoutsResult.data.map(p => {
          const profile = p.profiles as { id: string; username: string; avatar_url: string | null } | null;
          return {
            timestamp: new Date(p.requested_at).getTime(),
            type: "Payout",
            description: `${p.payout_method} withdrawal`,
            status: p.status,
            amount: p.amount,
            user: profile?.username,
            userId: profile?.id,
            userAvatar: profile?.avatar_url || undefined,
          };
        }));
      }

      // Process social account connections
      if (socialAccountsResult.data) {
        allLogs.push(...socialAccountsResult.data.map(s => {
          const account = s.social_accounts as { username: string; platform: string; user_id: string; avatar_url: string | null } | null;
          const campaign = s.campaigns as { title: string } | null;
          const isDisconnect = s.status === 'disconnected';
          return {
            timestamp: new Date(isDisconnect ? s.disconnected_at! : s.connected_at).getTime(),
            type: "Account Link",
            description: `${isDisconnect ? 'Disconnected' : 'Connected'} @${account?.username || 'unknown'}`,
            status: s.status,
            platform: account?.platform,
            accountLink: generateAccountLink(account?.platform, account?.username),
            accountUsername: account?.username,
            accountAvatar: account?.avatar_url || undefined,
            userId: s.user_id,
            campaignTitle: campaign?.title,
          };
        }));
      }

      // Process demographic submissions
      if (demographicsResult.data) {
        allLogs.push(...demographicsResult.data.map(d => {
          const account = d.social_accounts as { username: string; platform: string; user_id: string; avatar_url: string | null } | null;
          return {
            timestamp: new Date(d.submitted_at).getTime(),
            type: "Demographics",
            description: `Demographics @${account?.username || 'unknown'}`,
            details: `Tier 1: ${d.tier1_percentage}%`,
            status: d.status,
            platform: account?.platform,
            accountUsername: account?.username,
            accountAvatar: account?.avatar_url || undefined,
            userId: account?.user_id,
          };
        }));
      }

      // Sort by timestamp
      allLogs.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(allLogs.slice(0, 100));
    } catch (error) {
      console.error("Error fetching API activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return "secondary";
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'approved' || s === 'active') return "default";
    if (s === 'pending' || s === 'in_transit') return "secondary";
    if (s === 'rejected' || s === 'failed') return "destructive";
    return "secondary";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards - responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card/50">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Activity</CardDescription>
            <CardTitle className="text-xl">{logs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Transactions</CardDescription>
            <CardTitle className="text-xl">
              {logs.filter(l => l.type === 'Transaction').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Links</CardDescription>
            <CardTitle className="text-xl">
              {logs.filter(l => l.type === 'Account Link').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Payouts</CardDescription>
            <CardTitle className="text-xl">
              {logs.filter(l => l.type === 'Payout').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Activity table - scrollable on mobile */}
      <Card className="border-[#141414]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-inter tracking-[-0.3px]">Recent Activity</CardTitle>
          <CardDescription className="text-xs font-inter tracking-[-0.3px]">Latest platform events</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto border border-[#141414] rounded-md mx-4 mb-4">
            <Table>
              <TableHeader>
                <TableRow className="border-[#141414] hover:bg-transparent">
                  <TableHead className="text-xs whitespace-nowrap font-inter tracking-[-0.3px] text-white font-medium">Time</TableHead>
                  <TableHead className="text-xs font-inter tracking-[-0.3px] text-white font-medium">Type</TableHead>
                  <TableHead className="text-xs font-inter tracking-[-0.3px] text-white font-medium">User</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell font-inter tracking-[-0.3px] text-white font-medium">Details</TableHead>
                  <TableHead className="text-xs font-inter tracking-[-0.3px] text-white font-medium">Status</TableHead>
                  <TableHead className="text-xs hidden md:table-cell font-inter tracking-[-0.3px] text-white font-medium text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow className="border-[#141414] hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8 font-inter tracking-[-0.3px]">
                      No recent activity
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.slice(0, 50).map((log, index) => (
                    <TableRow key={index} className="border-[#141414] hover:bg-transparent">
                      <TableCell className="font-inter tracking-[-0.3px] text-xs whitespace-nowrap py-3 text-muted-foreground">
                        {format(new Date(log.timestamp), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(log.type)}
                          <span className="font-inter tracking-[-0.3px] text-xs">{log.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {log.userId ? (
                          <Popover>
                            <PopoverTrigger 
                              asChild
                              onMouseEnter={() => fetchUserProfile(log.userId!)}
                            >
                              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={log.userAvatar || log.accountAvatar || userProfiles.get(log.userId)?.avatar_url || undefined} />
                                  <AvatarFallback className="bg-white/10 text-white text-[10px]">
                                    {(log.user || log.accountUsername || userProfiles.get(log.userId)?.username || '?').charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-inter tracking-[-0.3px] text-xs text-white/70 hover:text-white transition-colors">
                                  @{log.user || log.accountUsername || userProfiles.get(log.userId)?.username || 'user'}
                                </span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="bg-[#0a0a0a] border-white/10 p-0 w-auto"
                              align="start"
                            >
                              <UserContextCard user={userProfiles.get(log.userId) || null} />
                            </PopoverContent>
                          </Popover>
                        ) : log.accountUsername ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={log.accountAvatar} />
                              <AvatarFallback className="bg-white/10 text-white text-[10px]">
                                {log.accountUsername?.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            {log.accountLink ? (
                              <a 
                                href={log.accountLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 font-inter tracking-[-0.3px] text-xs text-white/70 hover:text-white transition-colors"
                              >
                                {getPlatformIcon(log.platform)}
                                <span>@{log.accountUsername}</span>
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </a>
                            ) : (
                              <span className="font-inter tracking-[-0.3px] text-xs text-white/50">
                                @{log.accountUsername}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="font-inter tracking-[-0.3px] text-xs text-muted-foreground/50">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 hidden sm:table-cell max-w-[200px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-inter tracking-[-0.3px] text-xs text-white/80 truncate">
                            {log.description}
                          </span>
                          {log.campaignTitle && (
                            <span className="font-inter tracking-[-0.3px] text-[10px] text-white/40 truncate">
                              {log.campaignTitle}
                            </span>
                          )}
                          {log.details && !log.campaignTitle && (
                            <span className="font-inter tracking-[-0.3px] text-[10px] text-white/40 truncate">
                              {log.details}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge 
                          variant={getStatusColor(log.status)} 
                          className="text-[10px] px-2 py-0.5 font-inter tracking-[-0.3px] uppercase"
                        >
                          {log.status || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-inter tracking-[-0.3px] text-xs py-3 hidden md:table-cell text-right">
                        {log.amount ? (
                          <span className="text-emerald-500 font-medium">${log.amount.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
