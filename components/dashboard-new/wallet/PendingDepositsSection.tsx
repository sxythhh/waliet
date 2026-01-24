"use client";

import { Clock, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PendingDeposit } from "./types";
import { formatDistanceToNow } from "date-fns";

// Type labels
const typeLabels: Record<string, string> = {
  crypto_deposit: "Crypto",
  deposit: "Card",
  topup: "Card",
  wire_deposit: "Wire",
};

interface PendingDepositsSectionProps {
  deposits: PendingDeposit[];
  isLoading?: boolean;
}

export function PendingDepositsSection({
  deposits,
  isLoading = false,
}: PendingDepositsSectionProps) {
  if (deposits.length === 0 && !isLoading) {
    return null;
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-base font-semibold tracking-[-0.5px]">
            Pending Deposits
          </CardTitle>
          <Badge
            variant="secondary"
            className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0"
          >
            {deposits.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {deposits.map((deposit) => (
              <PendingDepositRow key={deposit.id} deposit={deposit} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PendingDepositRow({ deposit }: { deposit: PendingDeposit }) {
  const typeLabel = typeLabels[deposit.type] || "Deposit";
  const timeAgo = formatDistanceToNow(new Date(deposit.created_at), {
    addSuffix: false,
  });

  // Format amount
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(deposit.amount);

  // Explorer link for crypto
  const explorerUrl = deposit.tx_signature
    ? deposit.network === "solana"
      ? `https://solscan.io/tx/${deposit.tx_signature}`
      : `https://basescan.org/tx/${deposit.tx_signature}`
    : null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
      {/* Spinning indicator */}
      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
        <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium tracking-[-0.3px] text-foreground">
            {typeLabel}
          </p>
          {deposit.network && (
            <Badge
              variant="secondary"
              className="text-[10px] bg-muted text-muted-foreground border-0 capitalize"
            >
              {deposit.network}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground tracking-[-0.3px] mt-0.5">
          {timeAgo} ago
        </p>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium tracking-[-0.3px] text-amber-600 tabular-nums">
          +{formattedAmount}
        </p>

        {explorerUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => window.open(explorerUrl, "_blank")}
          >
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  );
}
