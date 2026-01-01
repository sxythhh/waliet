import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, Loader2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
      // Get total user wallet balances
      const { data: walletsData } = await supabase
        .from("wallets")
        .select("balance");

      const totalUserWalletBalance = (walletsData || []).reduce(
        (sum, wallet) => sum + (Number(wallet.balance) || 0),
        0
      );

      const activeUserWallets = (walletsData || []).filter(
        (wallet) => Number(wallet.balance) > 0
      ).length;

      // Get campaign budgets (budget - budget_used)
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("budget, budget_used, status")
        .in("status", ["active", "pending"]);

      const activeCampaigns = (campaignsData || []).filter(
        (c) => c.status === "active"
      ).length;

      const totalCampaignBudgetRemaining = (campaignsData || []).reduce(
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
          <CardTitle className="text-lg font-inter tracking-[-0.5px] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
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

  const statItems = [
    {
      label: "User Wallet Funds",
      value: stats.totalUserWalletBalance,
      subtext: `${stats.activeUserWallets} active wallets`,
      icon: <Wallet className="h-5 w-5" />,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Campaign Budget Remaining",
      value: stats.totalCampaignBudgetRemaining,
      subtext: `${stats.activeCampaigns} active campaigns`,
      icon: <Building2 className="h-5 w-5" />,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <Card className="bg-card border-0 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-inter tracking-[-0.5px] flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 rounded-lg bg-muted/30"
            >
              <div
                className={cn(
                  "flex items-center justify-center h-12 w-12 rounded-lg",
                  item.bgColor,
                  item.color
                )}
              >
                {item.icon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className={cn("text-2xl font-semibold tracking-tight", item.color)}>
                  ${item.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">{item.subtext}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Combined total */}
        <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Platform Liability</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Funds owed to users + remaining campaign budgets
              </p>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-primary">
              ${(stats.totalUserWalletBalance + stats.totalCampaignBudgetRemaining).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
