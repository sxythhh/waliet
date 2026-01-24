"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { WalletTransaction } from "./types";
import { format } from "date-fns";
import { useState } from "react";

// Transaction type display configs
const typeConfigs: Record<
  string,
  { label: string; icon: typeof ArrowDownLeft; isDeposit: boolean; description: string }
> = {
  deposit: {
    label: "Deposit",
    icon: ArrowDownLeft,
    isDeposit: true,
    description: "Funds added to your wallet via card payment"
  },
  topup: {
    label: "Card Deposit",
    icon: ArrowDownLeft,
    isDeposit: true,
    description: "Funds added via credit or debit card"
  },
  crypto_deposit: {
    label: "Crypto Deposit",
    icon: ArrowDownLeft,
    isDeposit: true,
    description: "USDC deposited from external wallet"
  },
  wire_deposit: {
    label: "Wire Deposit",
    icon: ArrowDownLeft,
    isDeposit: true,
    description: "Funds received via bank wire transfer"
  },
  personal_transfer: {
    label: "From Personal",
    icon: ArrowDownLeft,
    isDeposit: true,
    description: "Transfer from your personal wallet"
  },
  transfer_in: {
    label: "Transfer In",
    icon: ArrowDownLeft,
    isDeposit: true,
    description: "Incoming transfer from another account"
  },
  transfer_out: {
    label: "Transfer Out",
    icon: ArrowUpRight,
    isDeposit: false,
    description: "Outgoing transfer to another account"
  },
  payout: {
    label: "Payout",
    icon: ArrowUpRight,
    isDeposit: false,
    description: "Payment for services rendered"
  },
  withdrawal: {
    label: "Withdrawal",
    icon: ArrowUpRight,
    isDeposit: false,
    description: "Funds withdrawn to external account"
  },
  refund: {
    label: "Refund",
    icon: ArrowDownLeft,
    isDeposit: true,
    description: "Refund for cancelled service or transaction"
  },
};

// Status configurations
const statusConfigs = {
  pending: {
    label: "Pending",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    icon: Clock,
    description: "This transaction is being processed",
  },
  completed: {
    label: "Completed",
    bg: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-500/30",
    icon: CheckCircle2,
    description: "This transaction has been completed successfully",
  },
  failed: {
    label: "Failed",
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
    icon: XCircle,
    description: "This transaction failed to process",
  },
};

interface TransactionDetailSheetProps {
  transaction: WalletTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailSheet({
  transaction,
  open,
  onOpenChange,
}: TransactionDetailSheetProps) {
  const [copiedId, setCopiedId] = useState(false);

  if (!transaction) return null;

  const config = typeConfigs[transaction.type] || {
    label: transaction.type,
    icon: ArrowDownLeft,
    isDeposit: transaction.amount > 0,
    description: "Transaction details",
  };

  const statusConfig = statusConfigs[transaction.status];
  const StatusIcon = statusConfig.icon;
  const TypeIcon = config.icon;

  // Format the amount
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(transaction.amount));

  // Format date
  const formattedDate = format(new Date(transaction.created_at), "MMMM d, yyyy");
  const formattedTime = format(new Date(transaction.created_at), "h:mm a");

  // External links
  const txSignature = transaction.metadata?.tx_signature;
  const network = transaction.metadata?.network;
  const checkoutUrl = transaction.metadata?.checkout_url;

  const explorerUrl = txSignature
    ? network === "solana"
      ? `https://solscan.io/tx/${txSignature}`
      : `https://basescan.org/tx/${txSignature}`
    : null;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(transaction.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-lg font-semibold tracking-[-0.5px]">
            Transaction Details
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground tracking-[-0.3px]">
            {config.description}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Amount Display */}
          <div className="text-center py-6 px-4 rounded-xl bg-muted/30 border border-border/50">
            <div
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3",
                config.isDeposit ? "bg-green-500/10" : "bg-muted"
              )}
            >
              <TypeIcon
                className={cn(
                  "h-6 w-6",
                  config.isDeposit ? "text-green-600" : "text-muted-foreground"
                )}
              />
            </div>
            <p
              className={cn(
                "text-3xl font-semibold tracking-[-1px]",
                config.isDeposit ? "text-green-600" : "text-foreground"
              )}
            >
              {config.isDeposit ? "+" : "-"}
              {formattedAmount}
            </p>
            <p className="text-sm text-muted-foreground mt-1 tracking-[-0.3px]">
              {config.label}
            </p>
          </div>

          {/* Status Badge */}
          <div
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border",
              statusConfig.bg,
              statusConfig.border
            )}
          >
            <StatusIcon className={cn("h-5 w-5", statusConfig.text)} />
            <div className="flex-1">
              <p className={cn("text-sm font-medium", statusConfig.text)}>
                {statusConfig.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {statusConfig.description}
              </p>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium tracking-[-0.3px] text-foreground mb-3">
              Details
            </h4>

            <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/50">
              {/* Date */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-sm font-medium text-foreground">
                  {formattedDate}
                </p>
              </div>

              {/* Time */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="text-sm font-medium text-foreground">
                  {formattedTime}
                </p>
              </div>

              {/* Type */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="text-sm font-medium text-foreground">
                  {config.label}
                </p>
              </div>

              {/* Network (if crypto) */}
              {network && (
                <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                  <p className="text-sm text-muted-foreground">Network</p>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {network}
                  </Badge>
                </div>
              )}

              {/* Description */}
              {transaction.description && (
                <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm font-medium text-foreground text-right max-w-[200px] truncate">
                    {transaction.description}
                  </p>
                </div>
              )}

              {/* Transaction ID */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                <p className="text-sm text-muted-foreground">Transaction ID</p>
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-1.5 text-sm font-mono text-foreground hover:text-primary transition-colors"
                >
                  {transaction.id.slice(0, 8)}...
                  {copiedId ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* External Links */}
          {(explorerUrl || checkoutUrl) && (
            <div className="space-y-2">
              {explorerUrl && (
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => window.open(explorerUrl, "_blank")}
                >
                  <span>View on Explorer</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              {checkoutUrl && (
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => window.open(checkoutUrl, "_blank")}
                >
                  <span>View Receipt</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Support Link */}
          <Separator />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Having issues with this transaction?{" "}
              <button className="text-primary hover:underline">
                Contact Support
              </button>
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
