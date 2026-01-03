import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from "recharts";
import { format, subMonths } from "date-fns";
import { Link } from "react-router-dom";

interface Milestone {
  id: string;
  milestone_type: string;
  threshold: number;
  reward_amount: number;
  display_name: string;
}

interface MilestoneReward {
  milestone_id: string;
  reward_amount: number;
  awarded_at: string;
}

interface ReferralWithMilestones {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: string;
  reward_earned: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
    total_earnings: number | null;
  } | null;
  milestone_rewards?: MilestoneReward[];
}

interface ReferralChartDataPoint {
  date: string;
  earnings: number;
  referrals: number;
  successful: number;
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

export function ReferralsTab(): JSX.Element {
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<ReferralWithMilestones[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [chartData, setChartData] = useState<ReferralChartDataPoint[]>([]);
  const [brandCommission, setBrandCommission] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchProfile(),
        fetchReferrals(),
        fetchMilestones(),
        fetchAffiliateEarningsData(),
        fetchBrandCommission()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data);
  };

  const fetchMilestones = async () => {
    const { data } = await supabase
      .from("referral_milestones")
      .select("*")
      .order("threshold", { ascending: true });
    setMilestones(data || []);
  };

  const fetchReferrals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: referralsData } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (referralsData && referralsData.length > 0) {
      const referredIds = referralsData.map(r => r.referred_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name, total_earnings")
        .in("id", referredIds);

      const referralIds = referralsData.map(r => r.id);
      const { data: rewards } = await supabase
        .from("referral_milestone_rewards")
        .select("*")
        .in("referral_id", referralIds);

      const referralsWithMilestones: ReferralWithMilestones[] = referralsData.map(referral => ({
        ...referral,
        profiles: profilesData?.find(p => p.id === referral.referred_id) || null,
        milestone_rewards: rewards?.filter(r => r.referral_id === referral.id) || []
      }));
      setReferrals(referralsWithMilestones);
    } else {
      setReferrals([]);
    }
  };

  const fetchAffiliateEarningsData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const now = new Date();
    const start = subMonths(now, 1);
    const days = 30;

    const { data: affiliateTransactions } = await supabase
      .from("wallet_transactions")
      .select("amount, created_at, type")
      .eq("user_id", session.user.id)
      .eq("type", "referral")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: true });

    const { data: referralsData } = await supabase
      .from("referrals")
      .select("created_at, status")
      .eq("referrer_id", session.user.id)
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: true });

    const dataPoints: ReferralChartDataPoint[] = [];
    let cumulativeEarnings = 0;
    let cumulativeReferrals = 0;
    let cumulativeSuccessful = 0;
    const pointCount = Math.min(days, 30);
    const interval = Math.max(1, Math.floor(days / pointCount));

    for (let i = 0; i <= pointCount; i++) {
      const currentDate = new Date(start.getTime() + i * interval * 24 * 60 * 60 * 1000);
      if (currentDate > now) break;
      const dateStr = format(currentDate, 'MMM dd');
      const prevDate = new Date(start.getTime() + (i - 1) * interval * 24 * 60 * 60 * 1000);

      if (affiliateTransactions) {
        affiliateTransactions.forEach(txn => {
          const txnDate = new Date(txn.created_at);
          if (txnDate <= currentDate && txnDate > prevDate) {
            cumulativeEarnings += Number(txn.amount) || 0;
          }
        });
      }
      if (referralsData) {
        referralsData.forEach(ref => {
          const refDate = new Date(ref.created_at);
          if (refDate <= currentDate && refDate > prevDate) {
            cumulativeReferrals += 1;
            if (ref.status === 'completed') {
              cumulativeSuccessful += 1;
            }
          }
        });
      }
      dataPoints.push({
        date: dateStr,
        earnings: Number(cumulativeEarnings.toFixed(2)),
        referrals: cumulativeReferrals,
        successful: cumulativeSuccessful
      });
    }
    setChartData(dataPoints);
  };

  const fetchBrandCommission = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("brand_referrals")
      .select("reward_earned")
      .eq("referrer_id", user.id)
      .eq("status", "completed");

    const totalCommission = data?.reduce((sum, r) => sum + (Number(r.reward_earned) || 0), 0) || 0;
    setBrandCommission(totalCommission);
  };

  const referralLink = profile?.referral_code
    ? `${window.location.origin}/?ref=${profile.referral_code}`
    : "";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Your referral link has been copied to clipboard."
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getMilestoneStatus = (referral: ReferralWithMilestones, milestone: Milestone) => {
    return referral.milestone_rewards?.some(r => r.milestone_id === milestone.id) || false;
  };

  const clicks = profile?.referral_clicks || 0;
  const signedUp = referrals.length;
  const converted = referrals.filter(r => r.status === 'completed').length;
  const totalRewards = profile?.referral_earnings || 0;
  const creatorEarnings = referrals.reduce((sum, r) => sum + (Number(r.reward_earned) || 0), 0);

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-2 sm:pt-3 md:pt-4 w-full">
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="p-4 space-y-5">
          {/* Stats Cards - Funnel Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <Card className={`p-4 bg-muted/20 border-0 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
              <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px] mb-1">Clicks</p>
              <p className="text-2xl font-bold font-['Geist'] tracking-[-0.5px]">{formatNumber(clicks)}</p>
            </Card>

            <Card className={`p-4 bg-muted/20 border-0 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
              <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px] mb-1">Signed Up</p>
              <p className="text-2xl font-bold font-['Geist'] tracking-[-0.5px]">{formatNumber(signedUp)}</p>
            </Card>

            <Card className={`p-4 bg-muted/20 border-0 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
              <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px] mb-1">Converted</p>
              <p className="text-2xl font-bold font-['Geist'] tracking-[-0.5px]">{formatNumber(converted)}</p>
            </Card>
          </div>

          {/* Stats Cards - Earnings Split Card */}
          <Card className={`p-4 bg-muted/20 border-0 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="pr-4">
                <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px] mb-1">Total Rewards</p>
                <p className="text-2xl font-bold font-['Geist'] tracking-[-0.5px]">${totalRewards.toFixed(2)}</p>
              </div>
              <div className="px-4">
                <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px] mb-1">Creator Earnings</p>
                <p className="text-2xl font-bold font-['Geist'] tracking-[-0.5px]">${creatorEarnings.toFixed(2)}</p>
              </div>
              <div className="pl-4">
                <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px] mb-1">Brand Commission</p>
                <p className="text-2xl font-bold font-['Geist'] tracking-[-0.5px]">${brandCommission.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          {/* Referral Link Section */}
          <Card className="p-4 bg-muted/20 border-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center justify-between flex-1 gap-4">
                <div>
                  <h3 className="font-semibold text-sm font-['Inter'] tracking-[-0.5px]">Your Referral Link</h3>
                  <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Share to earn rewards on signups & brand subscriptions</p>
                </div>
                <Link
                  to="/affiliate"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-['Inter'] tracking-[-0.5px] shrink-0"
                >
                  How it works
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex gap-2 items-stretch">
                <Input
                  value={referralLink}
                  readOnly
                  className="font-['Geist'] text-sm bg-background/50 border-0 h-10 tracking-[-0.5px]"
                />
                <Button
                  onClick={copyReferralLink}
                  className="gap-2 shrink-0 h-10 bg-foreground text-background hover:bg-foreground/90 font-['Inter'] tracking-[-0.5px]"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Activity Chart */}
          <Card className="p-4 bg-muted/20 border-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm font-['Inter'] tracking-[-0.5px]">Referral Activity</h3>
              <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Last 30 days</span>
            </div>

            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="referralsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="successfulGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover text-popover-foreground border border-border rounded-xl shadow-xl px-4 py-2.5 font-['Inter'] tracking-[-0.3px]">
                            <p className="text-[10px] text-muted-foreground mb-1">{data.date}</p>
                            <div className="space-y-0.5">
                              <p className="text-xs"><span className="text-blue-500">●</span> {data.referrals} referrals</p>
                              <p className="text-xs"><span className="text-emerald-500">●</span> {data.successful} successful</p>
                              <p className="text-xs"><span className="text-violet-500">●</span> ${data.earnings.toFixed(2)} earned</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="referrals"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#referralsGradient)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#3b82f6', stroke: 'none' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="successful"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#successfulGradient)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#10b981', stroke: 'none' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Total Referrals</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">Successful</span>
              </div>
            </div>
          </Card>

          {/* Referrals List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm font-['Inter'] tracking-[-0.5px]">Your Referrals</h3>
              <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">{referrals.length} total</span>
            </div>

            {referrals.length === 0 ? (
              <Card className="p-8 bg-muted/20 border-0 text-center">
                <h4 className="font-semibold text-sm font-['Inter'] tracking-[-0.5px] mb-1">No referrals yet</h4>
                <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px] max-w-xs mx-auto">
                  Share your referral link to invite creators and brands, and earn rewards
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {referrals.map(referral => {
                  const achievedMilestones = referral.milestone_rewards?.length || 0;
                  const totalMilestones = milestones.length;
                  const totalEarned = referral.reward_earned || 0;

                  return (
                    <Card key={referral.id} className="p-4 bg-muted/20 border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={referral.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted text-sm font-medium">
                              {referral.profiles?.username?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm font-['Inter'] tracking-[-0.5px]">
                              {referral.profiles?.full_name || referral.profiles?.username}
                            </p>
                            <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                              @{referral.profiles?.username}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-500 font-['Inter'] tracking-[-0.5px]">
                            +${totalEarned.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                            {achievedMilestones}/{totalMilestones} milestones
                          </p>
                        </div>
                      </div>

                      {/* Milestone Progress */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-border/30">
                        {milestones.map(milestone => {
                          const achieved = getMilestoneStatus(referral, milestone);
                          return (
                            <div
                              key={milestone.id}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium font-['Inter'] tracking-[-0.5px] ${
                                achieved
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-muted/50 text-muted-foreground'
                              }`}
                            >
                              {achieved ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                              <span>
                                {milestone.milestone_type === 'signup' ? 'Signup' : `$${milestone.threshold}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
