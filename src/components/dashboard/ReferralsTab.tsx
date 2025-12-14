import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Gift, Pencil, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { format, subDays, subMonths } from "date-fns";

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
export function ReferralsTab() {
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<ReferralWithMilestones[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [chartData, setChartData] = useState<ReferralChartDataPoint[]>([]);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newReferralCode, setNewReferralCode] = useState("");
  const [saving, setSaving] = useState(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchProfile();
    fetchReferrals();
    fetchMilestones();
    fetchAffiliateEarningsData();
  }, []);
  const fetchProfile = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;
    const {
      data
    } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(data);
    if (data?.referral_code) {
      setNewReferralCode(data.referral_code);
    }
  };
  const fetchMilestones = async () => {
    const {
      data
    } = await supabase.from("referral_milestones").select("*").order("threshold", {
      ascending: true
    });
    setMilestones(data || []);
  };
  const fetchReferrals = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;
    const {
      data: referralsData
    } = await supabase.from("referrals").select("*").eq("referrer_id", user.id).order("created_at", {
      ascending: false
    });
    if (referralsData && referralsData.length > 0) {
      // Fetch profiles for referred users
      const referredIds = referralsData.map(r => r.referred_id);
      const {
        data: profilesData
      } = await supabase.from("profiles").select("id, username, avatar_url, full_name, total_earnings").in("id", referredIds);

      // Fetch milestone rewards for each referral
      const referralIds = referralsData.map(r => r.id);
      const {
        data: rewards
      } = await supabase.from("referral_milestone_rewards").select("*").in("referral_id", referralIds);
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
    
    // Fetch referral transactions
    const { data: affiliateTransactions } = await supabase
      .from("wallet_transactions")
      .select("amount, created_at, type")
      .eq("user_id", session.user.id)
      .eq("type", "referral")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: true });
    
    // Fetch referrals data
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
  const referralLink = profile?.referral_code ? `${window.location.origin}/?ref=${profile.referral_code}` : "";
  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Your referral link has been copied to clipboard."
    });
    setTimeout(() => setCopied(false), 2000);
  };
  const handleSaveReferralCode = async () => {
    if (!newReferralCode.trim()) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid referral code.",
        variant: "destructive"
      });
      return;
    }
    const sanitizedCode = newReferralCode.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (sanitizedCode.length < 3) {
      toast({
        title: "Code too short",
        description: "Referral code must be at least 3 characters.",
        variant: "destructive"
      });
      return;
    }
    setSaving(true);
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;
    const {
      data: existing
    } = await supabase.from("profiles").select("id").eq("referral_code", sanitizedCode).neq("id", user.id).maybeSingle();
    if (existing) {
      toast({
        title: "Code taken",
        description: "This referral code is already in use. Please choose another.",
        variant: "destructive"
      });
      setSaving(false);
      return;
    }
    const {
      error
    } = await supabase.from("profiles").update({
      referral_code: sanitizedCode
    }).eq("id", user.id);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update referral code.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Updated!",
        description: "Your referral code has been updated."
      });
      setProfile({
        ...profile,
        referral_code: sanitizedCode
      });
      setIsEditing(false);
    }
    setSaving(false);
  };

  // Calculate total potential earnings from milestones
  const totalPotentialPerReferral = milestones.reduce((sum, m) => sum + m.reward_amount, 0);

  // Get milestones achieved for a specific referral
  const getMilestoneStatus = (referral: ReferralWithMilestones, milestone: Milestone) => {
    return referral.milestone_rewards?.some(r => r.milestone_id === milestone.id) || false;
  };
  return <div className="px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-2 sm:pt-3 md:pt-4 space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Referrals</h1>
        <a 
          href="https://join.virality.gg/affiliate" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}
        >
          How it works →
        </a>
      </div>

      <div className="space-y-8">

      {/* Chart and Referral Link Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Affiliate Earnings Chart */}
        <Card className="bg-card border-0">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>Referral Activity</p>
            </div>
            
            {/* Stats inline */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-bold font-geist" style={{ letterSpacing: '-0.3px' }}>{referrals.length}</p>
                <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>referrals</p>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-bold font-geist text-emerald-500" style={{ letterSpacing: '-0.3px' }}>{profile?.successful_referrals || 0}</p>
                <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>successful</p>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-bold font-geist text-violet-500" style={{ letterSpacing: '-0.3px' }}>${profile?.referral_earnings?.toFixed(2) || "0.00"}</p>
                <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>earned</p>
              </div>
            </div>
            
            <div className="h-24 -mx-2">
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
                  <RechartsTooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return <div className="bg-popover text-popover-foreground border border-border rounded-xl shadow-xl px-4 py-2.5" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                          <p className="text-[10px] text-muted-foreground mb-1">{data.date}</p>
                          <div className="space-y-0.5">
                            <p className="text-xs"><span className="text-blue-500">●</span> {data.referrals} referrals</p>
                            <p className="text-xs"><span className="text-emerald-500">●</span> {data.successful} successful</p>
                            <p className="text-xs"><span className="text-violet-500">●</span> ${data.earnings.toFixed(2)} earned</p>
                          </div>
                        </div>;
                    }
                    return null;
                  }} cursor={false} />
                  <Area type="monotone" dataKey="referrals" stroke="#3b82f6" strokeWidth={2} fill="url(#referralsGradient)" dot={false} activeDot={{ r: 3, fill: '#3b82f6', stroke: 'none' }} />
                  <Area type="monotone" dataKey="successful" stroke="#10b981" strokeWidth={2} fill="url(#successfulGradient)" dot={false} activeDot={{ r: 3, fill: '#10b981', stroke: 'none' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Referral Link Section */}
        <Card className="bg-card border-0">
          <CardContent className="pt-4 pb-4 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#2060df]/10 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-[#2060df]" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Your Referral Link</h3>
                  <p className="text-xs text-muted-foreground">Share this link to earn rewards</p>
                </div>
              </div>
            </div>

            {isEditing ? <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground shrink-0">{window.location.origin}/?ref=</span>
                  <Input value={newReferralCode} onChange={e => setNewReferralCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))} placeholder="your-code" className="font-mono text-sm bg-background/50 border-0" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveReferralCode} size="sm" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button onClick={() => {
                setIsEditing(false);
                setNewReferralCode(profile?.referral_code || "");
              }} variant="ghost" size="sm">
                    Cancel
                  </Button>
                </div>
              </div> : <div className="flex gap-2 items-stretch">
                <Input value={referralLink} readOnly className="font-['Geist'] text-sm bg-background/50 border-0 h-10" style={{
              letterSpacing: '-0.5px'
            }} />
                <Button onClick={copyReferralLink} variant="ghost" className="gap-2 shrink-0 h-10 bg-foreground text-background" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button onClick={() => setIsEditing(true)} variant="ghost" size="icon" className="shrink-0 h-10 w-10">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* Milestone Rewards */}
      

      {/* Referrals List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Your Referrals</h3>
          <span className="text-xs text-muted-foreground">{referrals.length} total</span>
        </div>

        {referrals.length === 0 ? <div className="text-center py-12 rounded-xl bg-neutral-100/0">
            
            <h3 className="font-semibold mb-1">No referrals yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Start sharing your referral link to invite creators and earn rewards
            </p>
          </div> : <div className="space-y-3">
            {referrals.map(referral => {
          const achievedMilestones = referral.milestone_rewards?.length || 0;
          const totalMilestones = milestones.length;
          const totalEarned = referral.reward_earned || 0;
          return <div key={referral.id} className="p-4 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f] space-y-3">
                  {/* User Info Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={referral.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-[#e0e0e0] dark:bg-[#1a1a1a] text-sm">
                          {referral.profiles?.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {referral.profiles?.full_name || referral.profiles?.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{referral.profiles?.username}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#2060df]">
                        +${totalEarned.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {achievedMilestones}/{totalMilestones} milestones
                      </p>
                    </div>
                  </div>

                  {/* Milestone Progress */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {milestones.map(milestone => {
                const achieved = getMilestoneStatus(referral, milestone);
                return <div key={milestone.id} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${achieved ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted/50 text-muted-foreground'}`}>
                          {achieved ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                          <span>
                            {milestone.milestone_type === 'signup' ? 'Signup' : `$${milestone.threshold}`}
                          </span>
                        </div>;
              })}
                  </div>
                </div>;
        })}
          </div>}
      </div>
      </div>
    </div>;
}