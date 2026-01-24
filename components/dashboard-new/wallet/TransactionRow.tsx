"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WalletTransaction } from "./types";
import { formatDistanceToNow } from "date-fns";

// Transaction type display configs
const typeConfigs: Record<
  string,
  { label: string; icon: typeof ArrowDownLeft; isDeposit: boolean }
> = {
  deposit: { label: "Deposit", icon: ArrowDownLeft, isDeposit: true },
  topup: { label: "Card Deposit", icon: ArrowDownLeft, isDeposit: true },
  crypto_deposit: { label: "Crypto Deposit", icon: ArrowDownLeft, isDeposit: true },
  wire_deposit: { label: "Wire Deposit", icon: ArrowDownLeft, isDeposit: true },
  personal_transfer: { label: "From Personal", icon: ArrowDownLeft, isDeposit: true },
  transfer_in: { label: "Transfer In", icon: ArrowDownLeft, isDeposit: true },
  transfer_out: { label: "Transfer Out", icon: ArrowUpRight, isDeposit: false },
  payout: { label: "Payout", icon: ArrowUpRight, isDeposit: false },
  withdrawal: { label: "Withdrawal", icon: ArrowUpRight, isDeposit: false },
  refund: { label: "Refund", icon: ArrowDownLeft, isDeposit: true },
};

// Status badge styles
const statusStyles = {
  pending: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    icon: Clock,
  },
  completed: {
    bg: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
    icon: CheckCircle2,
  },
  failed: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    icon: XCircle,
  },
};

interface TransactionRowProps {
  transaction: WalletTransaction;
  onClick?: () => void;
}

export function TransactionRow({ transaction, onClick }: TransactionRowProps) {
  const config = typeConfigs[transaction.type] || {
    label: transaction.type,
    icon: ArrowDownLeft,
    isDeposit: transaction.amount > 0,
  };

  const statusStyle = statusStyles[transaction.status];
  const StatusIcon = statusStyle.icon;
  const TypeIcon = config.icon;

  // Format the amount
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(transaction.amount));

  // Format relative time
  const timeAgo = formatDistanceToNow(new Date(transaction.created_at), {
    addSuffix: true,
  });

  // Check for external link (tx signature or checkout URL)
  const externalLink =
    transaction.metadata?.tx_signature ||
    transaction.metadata?.checkout_url;

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-xl",
        "transition-colors duration-150",
        onClick && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
          config.isDeposit ? "bg-green-500/10" : "bg-muted"
        )}
      >
        <TypeIcon
          className={cn(
            "h-4 w-4",
            config.isDeposit ? "text-green-600" : "text-muted-foreground"
          )}
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium tracking-[-0.3px] text-foreground truncate">
            {config.label}
          </p>
          {transaction.status === "pending" && (
            <Badge
              variant="secondary"
              className={cn("text-[10px] border-0", statusStyle.bg, statusStyle.text)}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground tracking-[-0.3px] mt-0.5">
          {transaction.description || timeAgo}
        </p>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-2">
        <p
          className={cn(
            "text-sm font-medium tracking-[-0.3px] tabular-nums",
            config.isDeposit ? "text-green-600" : "text-foreground"
          )}
        >
          {config.isDeposit ? "+" : "-"}
          {formattedAmount}
        </p>

        {/* External link indicator */}
        {externalLink && transaction.status === "completed" && (
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
