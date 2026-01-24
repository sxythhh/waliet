import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface BudgetProgressCardProps {
  budgetUsed: number;
  budgetTotal: number;
  onTopUp: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export function BudgetProgressCard({
  budgetUsed,
  budgetTotal,
  onTopUp
}: BudgetProgressCardProps) {
  const budgetRemaining = Math.max(0, budgetTotal - budgetUsed);
  const budgetPercentage = budgetTotal > 0 ? Math.min(100, (budgetUsed / budgetTotal) * 100) : 0;

  // Budget status indicators
  const isUnfunded = budgetTotal === 0;
  const isDepleted = budgetTotal > 0 && budgetPercentage >= 100;

  return (
    <div className="rounded-xl p-5 bg-muted/30 dark:bg-[#0a0a0a] space-y-5">
      {/* Budget Section - Inline Compact */}
      <div className="space-y-2.5">
        {/* Top row: Amount left + Add button */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold tracking-[-0.5px] text-primary">
            {isUnfunded ? 'Unfunded' : isDepleted ? 'Budget depleted' : `${formatCurrency(budgetRemaining)} left`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-7 text-xs font-inter tracking-[-0.5px] text-muted-foreground hover:text-foreground"
            onClick={onTopUp}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {/* Continuous progress bar */}
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${budgetPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}