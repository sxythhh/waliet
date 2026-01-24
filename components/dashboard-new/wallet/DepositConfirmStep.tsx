"use client";

import { CreditCard, Wallet, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { PaymentMethod, FeeCalculation } from "./types";

interface DepositConfirmStepProps {
  method: PaymentMethod;
  amount: number;
  fees: FeeCalculation;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const methodLabels: Record<PaymentMethod, { label: string; icon: typeof CreditCard }> = {
  card: { label: "Card Payment", icon: CreditCard },
  personal: { label: "Personal Wallet", icon: Wallet },
  crypto: { label: "Crypto Deposit", icon: Wallet },
  wire: { label: "Wire Transfer", icon: Wallet },
};

export function DepositConfirmStep({
  method,
  amount,
  fees,
  isLoading,
  onConfirm,
  onCancel,
}: DepositConfirmStepProps) {
  const { label, icon: Icon } = methodLabels[method];

  return (
    <div className="space-y-6">
      {/* Amount Display */}
      <div className="text-center py-6 px-4 rounded-xl bg-muted/30 border border-border/50">
        <p className="text-3xl font-semibold tracking-[-1px] text-foreground">
          ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground tracking-[-0.3px]">
            via {label}
          </p>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium tracking-[-0.3px] text-foreground">
          Breakdown
        </h4>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Deposit Amount</span>
            <span className="font-medium">
              ${fees.depositAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Processing Fee ({fees.feePercentage})
            </span>
            <span
              className={cn(
                "font-medium",
                fees.processingFee === 0 ? "text-green-600" : "text-foreground"
              )}
            >
              {fees.processingFee === 0
                ? "Free"
                : `$${fees.processingFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            </span>
          </div>

          <Separator className="my-2" />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Charged</span>
            <span className="font-semibold">
              ${fees.totalCharged.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* You Receive */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-green-700 dark:text-green-400 tracking-[-0.3px]">
            You will receive
          </p>
          <p className="text-lg font-semibold text-green-700 dark:text-green-400 tracking-[-0.5px]">
            ${fees.youReceive.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-11"
          disabled={isLoading}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 h-11 font-medium"
          disabled={isLoading}
          onClick={onConfirm}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Confirm Deposit"
          )}
        </Button>
      </div>
    </div>
  );
}
