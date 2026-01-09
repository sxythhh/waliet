import { useState, useEffect } from "react";
import { ChevronDown, Wallet, Clock, Shield, CheckCircle, X, Zap, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PayoutFlowExplainerProps {
  className?: string;
}

export function PayoutFlowExplainer({ className }: PayoutFlowExplainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('payout-explainer-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('payout-explainer-dismissed', 'true');
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <div className={`bg-card border border-border/50 rounded-xl overflow-hidden ${className}`}>
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-foreground">How Payouts Work</h3>
            <p className="text-xs text-muted-foreground">Learn about the payout process</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Flow Diagram */}
          <div className="grid grid-cols-4 gap-2">
            {/* Step 1: Accruing */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Accruing</p>
                <p className="text-[10px] text-muted-foreground">Earnings ready</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div className="w-full h-[2px] bg-border relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-border" />
              </div>
            </div>

            {/* Step 2: Clearing */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Clearing</p>
                <p className="text-[10px] text-muted-foreground">7-day review</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div className="w-full h-[2px] bg-border relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-border" />
              </div>
            </div>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            {/* Step 3: Paid */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Paid</p>
                <p className="text-[10px] text-muted-foreground">Transferred to wallet</p>
              </div>
            </div>

            {/* Flag Window Info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Flag Window</p>
                <p className="text-[10px] text-muted-foreground">First 4 days of clearing</p>
              </div>
            </div>
          </div>

          {/* Boost vs Campaign Difference */}
          <div className="pt-2 border-t border-border/50 space-y-3">
            <p className="text-xs font-medium text-foreground">Boost vs Campaign Payouts</p>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Campaign */}
              <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-xs font-medium text-foreground">Campaigns</span>
                </div>
                <ul className="text-[10px] text-muted-foreground space-y-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-muted-foreground/50">•</span>
                    <span>RPM-based earnings</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-muted-foreground/50">•</span>
                    <span>Manual payout request</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-muted-foreground/50">•</span>
                    <span>Request anytime after $1 min</span>
                  </li>
                </ul>
              </div>

              {/* Boost */}
              <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-foreground">Boosts</span>
                </div>
                <ul className="text-[10px] text-muted-foreground space-y-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-muted-foreground/50">•</span>
                    <span>Flat rate per video</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-muted-foreground/50">•</span>
                    <span>Auto-payout at term end</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-muted-foreground/50">•</span>
                    <span>Or request early manually</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Minimum Threshold Notice */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              <span className="font-medium text-foreground">Minimum payout:</span> $1.00 required to request a payout
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
