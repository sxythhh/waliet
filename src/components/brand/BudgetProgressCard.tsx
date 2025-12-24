import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

interface BudgetProgressCardProps {
  budgetUsed: number;
  budgetTotal: number;
  acceptedCreators: number;
  maxCreators: number;
  onTopUp: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export function BudgetProgressCard({
  budgetUsed,
  budgetTotal,
  acceptedCreators,
  maxCreators,
  onTopUp
}: BudgetProgressCardProps) {
  const budgetRemaining = Math.max(0, budgetTotal - budgetUsed);
  const budgetPercentage = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;
  const creatorPercentage = maxCreators > 0 ? (acceptedCreators / maxCreators) * 100 : 0;

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-inter font-semibold tracking-[-0.5px] uppercase text-muted-foreground">
          Balance & Capacity
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs font-inter tracking-[-0.5px] border-border/50 hover:bg-muted/50"
          onClick={onTopUp}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Funds
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Budget Usage Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-sm font-medium text-foreground tracking-[-0.5px]">Budget Usage</span>
          </div>
          
          {/* Progress bar with floating percentage */}
          <div className="relative pt-6">
            {/* Floating percentage badge */}
            <div 
              className="absolute -top-0 transform -translate-x-1/2 transition-all duration-500"
              style={{ left: `${Math.min(Math.max(budgetPercentage, 5), 95)}%` }}
            >
              <div className="bg-emerald-500 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-lg">
                {budgetPercentage.toFixed(0)}%
              </div>
              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-emerald-500 mx-auto" />
            </div>
            
            {/* Progress bar */}
            <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              />
            </div>
          </div>
          
          {/* Budget stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-muted/10 rounded-lg p-3 text-center">
              <p className="text-[10px] font-inter tracking-[-0.5px] text-muted-foreground uppercase mb-1">Spent</p>
              <p className="text-lg font-bold font-inter tracking-[-0.5px] text-amber-500">{formatCurrency(budgetUsed)}</p>
            </div>
            <div className="bg-muted/10 rounded-lg p-3 text-center">
              <p className="text-[10px] font-inter tracking-[-0.5px] text-muted-foreground uppercase mb-1">Total</p>
              <p className="text-lg font-bold font-inter tracking-[-0.5px] text-foreground">{formatCurrency(budgetTotal)}</p>
            </div>
            <div className="bg-muted/10 rounded-lg p-3 text-center">
              <p className="text-[10px] font-inter tracking-[-0.5px] text-muted-foreground uppercase mb-1">Remaining</p>
              <p className="text-lg font-bold font-inter tracking-[-0.5px] text-emerald-500">{formatCurrency(budgetRemaining)}</p>
            </div>
          </div>
        </div>

        {/* Creators Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Users className="w-3 h-3 text-violet-500" />
            </div>
            <span className="text-sm font-medium text-foreground tracking-[-0.5px]">Creators</span>
          </div>
          
          {/* Semi-circle progress gauge */}
          <div className="flex flex-col items-center">
            <div className="relative" style={{ width: 180, height: 100 }}>
              <svg
                width="180"
                height="100"
                viewBox="0 0 180 100"
                className="overflow-visible"
              >
                {/* Background arc */}
                <path
                  d="M 15 90 A 75 75 0 0 1 165 90"
                  fill="none"
                  stroke="hsl(var(--muted) / 0.3)"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                
                {/* Progress arc */}
                <path
                  d="M 15 90 A 75 75 0 0 1 165 90"
                  fill="none"
                  stroke="url(#creatorGradient)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${(creatorPercentage / 100) * (Math.PI * 75)} ${Math.PI * 75}`}
                  className="transition-all duration-700"
                />
                
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="creatorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(263 70% 50%)" />
                    <stop offset="100%" stopColor="hsl(280 80% 60%)" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-3xl font-bold tracking-[-1px] text-foreground">{acceptedCreators}</span>
                  <span className="text-lg text-muted-foreground font-medium">/{maxCreators}</span>
                </div>
                <span className="text-[10px] text-muted-foreground tracking-[-0.3px] uppercase">creators joined</span>
              </div>
            </div>
          </div>
          
          {/* Slots info */}
          <div className="flex justify-center gap-4 mt-2 font-['Inter'] tracking-[-0.5px]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-600 to-violet-400" />
              <span className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{acceptedCreators}</span> joined
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-muted/50" />
              <span className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{maxCreators - acceptedCreators}</span> slots left
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
