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
  const budgetPercentage = budgetTotal > 0 ? budgetUsed / budgetTotal * 100 : 0;
  const creatorPercentage = maxCreators > 0 ? acceptedCreators / maxCreators * 100 : 0;
  return <div className="rounded-xl p-6 bg-muted/30 dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-inter tracking-[-0.5px] border-border/50 dark:hover:bg-muted/50 hover:bg-transparent" onClick={onTopUp}>
          <Plus className="h-3.5 w-3.5" />
          Add Funds
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Budget Usage Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            
          </div>
          
          {/* Semi-circle progress gauge */}
          <div className="flex flex-col items-center">
            <div className="relative" style={{
            width: 180,
            height: 100
          }}>
              <svg width="180" height="100" viewBox="0 0 180 100" className="overflow-visible">
                {/* Background arc */}
                <path d="M 15 90 A 75 75 0 0 1 165 90" fill="none" className="stroke-border dark:stroke-muted/30" strokeWidth="14" strokeLinecap="round" />
                
                {/* Progress arc */}
                <path d="M 15 90 A 75 75 0 0 1 165 90" fill="none" stroke="url(#budgetGradient)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${budgetPercentage / 100 * (Math.PI * 75)} ${Math.PI * 75}`} className="transition-all duration-700" />
                
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="budgetGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(160 84% 39%)" />
                    <stop offset="100%" stopColor="hsl(142 71% 45%)" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                <div className="flex items-baseline gap-0.5">
                  <span className="font-bold tracking-[-1px] text-foreground text-lg">{budgetPercentage.toFixed(0)}%</span>
                  <span className="text-sm text-muted-foreground font-medium">used</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Budget info */}
          <div className="flex justify-center gap-4 mt-2 font-inter tracking-[-0.5px]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
              <span className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{formatCurrency(budgetUsed)}</span> spent
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-muted/50" />
              <span className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{formatCurrency(budgetRemaining)}</span> left
              </span>
            </div>
          </div>
        </div>

        {/* Creators Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            
          </div>
          
          {/* Semi-circle progress gauge */}
          <div className="flex flex-col items-center">
            <div className="relative" style={{
            width: 180,
            height: 100
          }}>
              <svg width="180" height="100" viewBox="0 0 180 100" className="overflow-visible">
                {/* Background arc */}
                <path d="M 15 90 A 75 75 0 0 1 165 90" fill="none" className="stroke-border dark:stroke-muted/30" strokeWidth="14" strokeLinecap="round" />
                
                {/* Progress arc */}
                <path d="M 15 90 A 75 75 0 0 1 165 90" fill="none" stroke="url(#creatorGradient)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${creatorPercentage / 100 * (Math.PI * 75)} ${Math.PI * 75}`} className="transition-all duration-700" />
                
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
                  <span className="font-bold tracking-[-1px] text-foreground text-lg">{acceptedCreators}</span>
                  <span className="text-lg text-muted-foreground font-medium">/{maxCreators}</span>
                </div>
                
              </div>
            </div>
          </div>
          
          {/* Slots info */}
          <div className="flex justify-center gap-4 mt-2 font-inter tracking-[-0.5px]">
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
    </div>;
}