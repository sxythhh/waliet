import { Edit, TrendingUp, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Campaign {
  id: string;
  title: string;
  budget: number;
  budget_used: number | null;
  rpm_rate: number;
  status: string;
}

interface DashboardHeaderProps {
  campaign: Campaign;
  creatorCount: number;
  isAdmin?: boolean;
  onEditBudget?: () => void;
}

export function DashboardHeader({ 
  campaign, 
  creatorCount, 
  isAdmin, 
  onEditBudget 
}: DashboardHeaderProps) {
  const budgetRemaining = (campaign.budget || 0) - (campaign.budget_used || 0);
  const budgetPercentUsed = campaign.budget > 0 
    ? ((campaign.budget_used || 0) / campaign.budget) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Title Section */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {campaign.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Campaign Overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Budget Overview */}
        <div className="bg-muted/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget</span>
            {isAdmin && onEditBudget && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onEditBudget}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xl font-semibold text-foreground tabular-nums">
              ${campaign.budget?.toLocaleString() || '0'}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(budgetPercentUsed, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {budgetPercentUsed.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Budget Used */}
        <div className="bg-muted/20 rounded-xl p-4 space-y-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Used</span>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-xl font-semibold text-foreground tabular-nums">
              ${campaign.budget_used?.toLocaleString() || '0'}
            </p>
          </div>
        </div>

        {/* Remaining */}
        <div className="bg-muted/20 rounded-xl p-4 space-y-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Remaining</span>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-xl font-semibold text-foreground tabular-nums">
              ${budgetRemaining.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Creators */}
        <div className="bg-muted/20 rounded-xl p-4 space-y-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Creators</span>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xl font-semibold text-foreground tabular-nums">
              {creatorCount}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
