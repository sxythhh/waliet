import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface FinancialStats {
  totalUserWalletBalance: number;
  totalCampaignBudgetRemaining: number;
  activeUserWallets: number;
  activeCampaigns: number;
}

export function FinancialContextCard() {
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Get user IDs for test accounts to exclude:
      // 1. @viral username
      // 2. matt@jenni.ai
      // 3. Any @virality.gg emails
      const excludedUserIds: string[] = [];

      // Exclude @viral username
      const { data: viralProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", "viral")
        .maybeSingle();

      if (viralProfile?.id) {
        excludedUserIds.push(viralProfile.id);
      }

      // Exclude matt@jenni.ai and @virality.gg emails
      const { data: excludedUsers } = await supabase
        .from("profiles")
        .select("id, email")
        .or("email.eq.matt@jenni.ai,email.ilike.%@virality.gg");

      if (excludedUsers) {
        excludedUsers.forEach((user) => {
          if (user.id && !excludedUserIds.includes(user.id)) {
            excludedUserIds.push(user.id);
          }
        });
      }

      // Get total user wallet balances (excluding test accounts)
      const { data: walletsData } = await supabase
        .from("wallets")
        .select("balance, user_id");

      const filteredWallets = (walletsData || []).filter(
        (wallet) => !excludedUserIds.includes(wallet.user_id)
      );

      const totalUserWalletBalance = filteredWallets.reduce(
        (sum, wallet) => sum + (Number(wallet.balance) || 0),
        0
      );

      const activeUserWallets = filteredWallets.filter(
        (wallet) => Number(wallet.balance) > 0
      ).length;

      // Get active campaign budgets excluding GoViral
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("budget, budget_used, title")
        .eq("status", "active");

      const filteredCampaigns = (campaignsData || []).filter(
        (c) => !c.title?.toLowerCase().includes("goviral")
      );

      const activeCampaigns = filteredCampaigns.length;

      const totalCampaignBudgetRemaining = filteredCampaigns.reduce(
        (sum, campaign) => {
          const budget = Number(campaign.budget) || 0;
          const budgetUsed = Number(campaign.budget_used) || 0;
          return sum + Math.max(0, budget - budgetUsed);
        },
        0
      );

      setStats({
        totalUserWalletBalance,
        totalCampaignBudgetRemaining,
        activeUserWallets,
        activeCampaigns,
      });
    } catch (error) {
      console.error("Error fetching financial stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-0 shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-inter tracking-[-0.5px]">
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const totalLiability = stats.totalUserWalletBalance + stats.totalCampaignBudgetRemaining;

  return (
    <Card className="bg-card border-0 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-inter tracking-[-0.5px]">
          Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">User Wallet Funds</p>
            <p className="text-2xl font-semibold font-inter tracking-[-0.5px] mt-1">
              ${stats.totalUserWalletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.5px]">
              {stats.activeUserWallets} active wallets
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Campaign Budget Remaining</p>
            <p className="text-2xl font-semibold font-inter tracking-[-0.5px] mt-1">
              ${stats.totalCampaignBudgetRemaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.5px]">
              {stats.activeCampaigns} active campaigns
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Total Platform Liability</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.5px]">
                Funds owed to users + remaining campaign budgets
              </p>
            </div>
            <p className="text-3xl font-semibold font-inter tracking-[-0.5px]">
              ${totalLiability.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
