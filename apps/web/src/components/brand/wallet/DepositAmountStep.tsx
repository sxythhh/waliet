import { useState } from "react";
import { DollarSign, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PaymentMethod } from "./types";

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500];

interface DepositAmountStepProps {
  method: PaymentMethod;
  amount: number;
  onAmountChange: (amount: number) => void;
  onContinue: () => void;
  personalBalance?: number;
}

export function DepositAmountStep({
  method,
  amount,
  onAmountChange,
  onContinue,
  personalBalance = 0,
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
    <div className="space-y-6">
      {/* Amount Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium font-inter tracking-[-0.3px] text-foreground">
          Amount
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={inputValue}
            onChange={handleInputChange}
            className="pl-9 text-lg font-medium h-12"
          />
        </div>
      </div>

      {/* Personal Balance Info */}
      {isPersonal && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
          <Wallet className="h-4 w-4 text-emerald-500" />
          <span className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
            Available balance:
          </span>
          <span className="text-sm font-medium text-foreground">
            ${personalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          {personalBalance > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={() => handlePresetClick(personalBalance)}
            >
              Max
            </Button>
          )}
        </div>
      )}

      {/* Preset Amounts */}
      <div className="space-y-2">
        <label className="text-sm font-medium font-inter tracking-[-0.3px] text-muted-foreground">
          Quick amounts
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <Button
              key={preset}
              variant="ghost"
              size="sm"
              disabled={isPersonal && preset > personalBalance}
              className={cn(
                "h-9 px-4 font-inter bg-muted hover:bg-muted/80",
                amount === preset && "bg-primary/10 text-primary hover:bg-primary/15"
              )}
              onClick={() => handlePresetClick(preset)}
            >
              ${preset.toLocaleString()}
            </Button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {isPersonal && amount > personalBalance && (
        <p className="text-sm text-destructive">
          Amount exceeds your available balance
        </p>
      )}

      {/* Continue Button */}
      <Button
        className="w-full h-11 font-medium"
        disabled={!isValid}
        onClick={onContinue}
      >
        Continue
      </Button>
    </div>
  );
}
