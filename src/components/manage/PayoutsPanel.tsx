import { DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PayoutsPanelProps {
  transactions: any[];
  loading: boolean;
}

export function PayoutsPanel({ transactions, loading }: PayoutsPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-3" />
        <p className="text-muted-foreground text-sm">Loading transactions...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/10 rounded-xl">
        <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
          <DollarSign className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground text-sm">No transactions found</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Payments will appear here when made
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <DollarSign className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">Campaign Payouts</h3>
          <p className="text-xs text-muted-foreground">{transactions.length} transactions</p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {transactions.map((txn) => (
          <div 
            key={txn.id}
            className="flex items-center justify-between p-3 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors"
          >
            {/* User & Account Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                {txn.profiles?.avatar_url ? (
                  <img 
                    src={txn.profiles.avatar_url} 
                    alt={txn.profiles.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {txn.profiles?.username || 'Unknown'}
                  </span>
                  <Badge 
                    variant={txn.status === 'completed' ? 'default' : 'secondary'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {txn.status}
                  </Badge>
                </div>
                {txn.shortimize_account && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      @{txn.shortimize_account.account_username}
                    </span>
                    <span className="text-xs text-muted-foreground/60 capitalize">
                      {txn.shortimize_account.platform}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Amount & Budget Change */}
            <div className="flex items-center gap-6 flex-shrink-0">
              <div className="text-right">
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  ${Number(txn.amount).toFixed(2)}
                </span>
                <p className="text-[10px] text-muted-foreground capitalize">{txn.type}</p>
              </div>
              
              {txn.metadata?.campaign_budget_before !== undefined && (
                <div className="text-right min-w-[140px]">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    ${Number(txn.metadata.campaign_budget_before).toLocaleString()} → ${Number(txn.metadata.campaign_budget_after).toLocaleString()}
                  </span>
                </div>
              )}
              
              <div className="text-right min-w-[70px]">
                <span className="text-xs text-muted-foreground">
                  {new Date(txn.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
