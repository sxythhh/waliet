import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { AddReferralDialog } from "@/components/admin/AddReferralDialog";
import { UserContextSheet } from "@/components/admin/UserContextSheet";

type SubTab = "all" | "top" | "milestones" | "brands";
type StatusFilter = "all" | "pending" | "completed";

interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: string;
  reward_earned: number;
  created_at: string;
  referrer: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
    referral_tier: string | null;
  } | null;
  referred: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
    total_earnings: number | null;
  } | null;
}

interface TopReferrer {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
  total_referrals: number;
  successful_referrals: number;
  referral_earnings: number;
  referral_tier: string | null;
}

interface MilestoneReward {
  id: string;
  referral_id: string;
  milestone_id: string;
  reward_amount: number;
  awarded_at: string;
  milestone: {
    display_name: string;
    milestone_type: string;
  } | null;
  referral: {
    referrer_id: string;
    referred_id: string;
    referrer: { username: string; avatar_url: string | null } | null;
    referred: { username: string; avatar_url: string | null } | null;
  } | null;
}

interface BrandReferral {
  id: string;
  referrer_id: string;
  brand_id: string;
  status: string;
  reward_earned: number;
  created_at: string;
  referrer: {
    username: string;
    avatar_url: string | null;
  } | null;
  brand: {
    name: string;
    logo_url: string | null;
  } | null;
}

export default function Referrals() {
  const [activeTab, setActiveTab] = useState<SubTab>("all");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Data states
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [milestoneRewards, setMilestoneRewards] = useState<MilestoneReward[]>([]);
  const [brandReferrals, setBrandReferrals] = useState<BrandReferral[]>([]);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    conversionRate: 0,
    totalRewards: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchReferrals(),
      fetchTopReferrers(),
      fetchMilestoneRewards(),
      fetchBrandReferrals(),
    ]);
    setLoading(false);
  };

  const fetchReferrals = async () => {
    const { data, error } = await supabase
      .from("referrals")
      .select(`
        *,
        referrer:profiles!referrals_referrer_id_fkey(username, avatar_url, full_name, referral_tier),
        referred:profiles!referrals_referred_id_fkey(username, avatar_url, full_name, total_earnings)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching referrals:", error);
    }

    if (data) {
      setReferrals(data as Referral[]);
      const successful = data.filter((r) => r.status === "completed").length;
      const totalRewards = data.reduce((sum, r) => sum + (Number(r.reward_earned) || 0), 0);
      setStats({
        total: data.length,
        successful,
        conversionRate: data.length > 0 ? (successful / data.length) * 100 : 0,
        totalRewards,
      });
    }
  };

  const fetchTopReferrers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, full_name, total_referrals, successful_referrals, referral_earnings, referral_tier")
      .gt("total_referrals", 0)
      .order("successful_referrals", { ascending: false })
      .limit(50);

    if (data) {
      setTopReferrers(data as TopReferrer[]);
    }
  };

  const fetchMilestoneRewards = async () => {
    const { data } = await supabase
      .from("referral_milestone_rewards")
      .select(`
        *,
        milestone:referral_milestones(display_name, milestone_type),
        referral:referrals(
          referrer_id,
          referred_id,
          referrer:profiles!referrals_referrer_id_fkey(username, avatar_url),
          referred:profiles!referrals_referred_id_fkey(username, avatar_url)
        )
      `)
      .order("awarded_at", { ascending: false })
      .limit(100);

    if (data) {
      setMilestoneRewards(data as MilestoneReward[]);
    }
  };

  const fetchBrandReferrals = async () => {
    const { data } = await supabase
      .from("brand_referrals")
      .select(`
        *,
        referrer:profiles(username, avatar_url),
        brand:brands(name, logo_url)
      `)
      .order("created_at", { ascending: false });

    if (data) {
      setBrandReferrals(data as BrandReferral[]);
    }
  };

  const filteredReferrals = referrals.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.referrer?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referred?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const tabs = [
    { id: "all" as const, label: "All Referrals" },
    { id: "top" as const, label: "Top Referrers" },
    { id: "milestones" as const, label: "Milestones" },
    { id: "brands" as const, label: "Brand Referrals" },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-muted/30 rounded-xl p-5 border border-border">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold font-['Inter'] tracking-[-0.5px]">Referrals</h1>
          <p className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px]">
            Monitor and manage the referral program
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Referral
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-muted/30 border-0 rounded-xl">
          <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px] mb-1">Total Referrals</p>
          <p className="text-2xl font-bold font-['Geist'] tracking-[-0.5px]">{stats.total}</p>
        </Card>
        <Card className="p-5 bg-muted/30 border-0 rounded-xl">
          <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px] mb-1">Successful</p>
          <p className="text-2xl font-bold font-['Geist'] tracking-[-0.5px]">{stats.successful}</p>
        </Card>
        <Card className="p-5 bg-muted/30 border-0 rounded-xl">
          <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px] mb-1">Conversion Rate</p>
          <p className="text-2xl font-bold font-['Geist'] tracking-[-0.5px]">{stats.conversionRate.toFixed(1)}%</p>
        </Card>
        <Card className="p-5 bg-muted/30 border-0 rounded-xl">
          <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px] mb-1">Total Rewards</p>
          <p className="text-2xl font-bold font-['Geist'] tracking-[-0.5px]">${stats.totalRewards.toFixed(2)}</p>
        </Card>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium font-['Inter'] tracking-[-0.5px] transition-colors border-b-2 -mb-[1px] ${
                activeTab === tab.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "all" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 font-['Inter'] tracking-[-0.5px]"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "pending", "completed"] as StatusFilter[]).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="font-['Inter'] tracking-[-0.5px] capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>

          {/* Referrals Table */}
          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Referrer</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Referred User</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Reward</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.map((referral) => (
                    <tr key={referral.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedUserId(referral.referrer_id)}
                          className="flex items-center gap-3 hover:underline"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={referral.referrer?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {referral.referrer?.username?.[0]?.toUpperCase() || "R"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                              {referral.referrer?.full_name || referral.referrer?.username}
                            </p>
                            <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                              @{referral.referrer?.username}
                            </p>
                          </div>
                        </button>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedUserId(referral.referred_id)}
                          className="flex items-center gap-3 hover:underline"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={referral.referred?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {referral.referred?.username?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                              {referral.referred?.full_name || referral.referred?.username}
                            </p>
                            <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                              @{referral.referred?.username}
                            </p>
                          </div>
                        </button>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={referral.status === "completed" ? "default" : "secondary"}
                          className="font-['Inter'] tracking-[-0.5px] capitalize"
                        >
                          {referral.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium font-['Geist'] tracking-[-0.5px]">
                          ${(referral.reward_earned || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                          {format(new Date(referral.created_at), "MMM d, yyyy")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredReferrals.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground font-['Inter'] tracking-[-0.5px]">No referrals found</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "top" && (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Rank</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">User</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Total</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Successful</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Earnings</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Tier</th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map((user, index) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <span className="text-sm font-bold font-['Geist'] tracking-[-0.5px]">#{index + 1}</span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedUserId(user.id)}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.username?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                            {user.full_name || user.username}
                          </p>
                          <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                            @{user.username}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-['Geist'] tracking-[-0.5px]">{user.total_referrals}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-['Geist'] tracking-[-0.5px]">{user.successful_referrals}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-emerald-500 font-['Geist'] tracking-[-0.5px]">
                        ${(user.referral_earnings || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="font-['Inter'] tracking-[-0.5px] capitalize">
                        {user.referral_tier || "beginner"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topReferrers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-['Inter'] tracking-[-0.5px]">No referrers found</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === "milestones" && (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Referrer</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Referred User</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Milestone</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Reward</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Date</th>
                </tr>
              </thead>
              <tbody>
                {milestoneRewards.map((reward) => (
                  <tr key={reward.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <button
                        onClick={() => reward.referral?.referrer_id && setSelectedUserId(reward.referral.referrer_id)}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={reward.referral?.referrer?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {reward.referral?.referrer?.username?.[0]?.toUpperCase() || "R"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                          @{reward.referral?.referrer?.username}
                        </span>
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => reward.referral?.referred_id && setSelectedUserId(reward.referral.referred_id)}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={reward.referral?.referred?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {reward.referral?.referred?.username?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                          @{reward.referral?.referred?.username}
                        </span>
                      </button>
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary" className="font-['Inter'] tracking-[-0.5px]">
                        {reward.milestone?.display_name}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-emerald-500 font-['Geist'] tracking-[-0.5px]">
                        +${reward.reward_amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                        {format(new Date(reward.awarded_at), "MMM d, yyyy")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {milestoneRewards.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-['Inter'] tracking-[-0.5px]">No milestone rewards found</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === "brands" && (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Referrer</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Brand</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Reward</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.5px]">Date</th>
                </tr>
              </thead>
              <tbody>
                {brandReferrals.map((referral) => (
                  <tr key={referral.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <button
                        onClick={() => referral.referrer_id && setSelectedUserId(referral.referrer_id)}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={referral.referrer?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {referral.referrer?.username?.[0]?.toUpperCase() || "R"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                          @{referral.referrer?.username}
                        </span>
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {referral.brand?.logo_url ? (
                          <img
                            src={referral.brand.logo_url}
                            alt={referral.brand.name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
                            {referral.brand?.name?.[0] || "B"}
                          </div>
                        )}
                        <span className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">
                          {referral.brand?.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={referral.status === "completed" ? "default" : "secondary"}
                        className="font-['Inter'] tracking-[-0.5px] capitalize"
                      >
                        {referral.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium font-['Geist'] tracking-[-0.5px]">
                        ${(referral.reward_earned || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                        {format(new Date(referral.created_at), "MMM d, yyyy")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {brandReferrals.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-['Inter'] tracking-[-0.5px]">No brand referrals found</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Dialogs */}
      <AddReferralDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onSuccess={fetchData} />

      {selectedUserId && (
        <UserContextSheet
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(open) => !open && setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
