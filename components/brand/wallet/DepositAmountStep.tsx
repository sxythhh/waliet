import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PaymentMethod } from "./types";

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500];

interface DepositAmountStepProps {
  method: PaymentMethod;
  amount: number;
  onAmountChange: (amount: number) => void;
  personalBalance?: number;
  onContinue?: () => void;
  actionLabel?: string;
  isLoading?: boolean;
}

export function DepositAmountStep({
  method,
  amount,
  onAmountChange,
  personalBalance = 0,
  onContinue,
  actionLabel = "Continue",
  isLoading = false,
}: DepositAmountStepProps) {
  const [inputValue, setInputValue] = useState(amount > 0 ? amount.toString() : "");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setInputValue(value);
    const numValue = parseFloat(value) || 0;
    onAmountChange(numValue);
  };

  const handlePresetClick = (preset: number) => {
    setInputValue(preset.toString());
    onAmountChange(preset);
  };

  const isPersonal = method === "personal";
  const maxAmount = isPersonal ? personalBalance : Infinity;
  const isValid = amount > 0 && amount <= maxAmount;

  return (
    <div className="space-y-5">
      {/* Amount Input */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
          Amount
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground font-inter">
            $
          </span>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={inputValue}
            onChange={handleInputChange}
            className="pl-8 pr-28 text-xl font-semibold h-14 bg-muted/30 border-0 font-inter tracking-[-0.5px]"
          />
          {onContinue && (
            <Button
              onClick={onContinue}
              disabled={!isValid || isLoading}
              className="absolute right-2 h-10 px-4 font-inter tracking-[-0.3px]"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                actionLabel
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Personal Balance Info */}
      {isPersonal && (
        <div className="flex items-center gap-1 py-2">
          <span className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
            Available: <span className="text-foreground font-medium">${personalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </span>
          {personalBalance > 0 && (
            <>
              <span className="text-sm text-muted-foreground">·</span>
              <button
                className="text-sm text-primary hover:underline font-inter tracking-[-0.3px]"
                onClick={() => handlePresetClick(personalBalance)}
              >
                Use max
              </button>
            </>
          )}
        </div>
      )}

      {/* Preset Amounts */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
          Quick amounts
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              disabled={isPersonal && preset > personalBalance}
              className={cn(
                "h-9 px-4 text-sm font-medium font-inter tracking-[-0.3px] rounded-lg transition-colors",
                "bg-muted/50 hover:bg-muted text-foreground",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                amount === preset && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              onClick={() => handlePresetClick(preset)}
            >
              ${preset.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {isPersonal && amount > personalBalance && (
        <p className="text-sm text-destructive font-inter tracking-[-0.3px]">
          Amount exceeds your available balance
        </p>
      )}
    </div>
  );
}
