import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Minus } from "lucide-react";

interface IndeterminateCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function IndeterminateCheckbox({
  checked,
  indeterminate = false,
  onCheckedChange,
  className,
  disabled,
}: IndeterminateCheckboxProps) {
  if (indeterminate) {
    return (
      <button
        type="button"
        onClick={() => onCheckedChange(true)}
        disabled={disabled}
        className={cn(
          "h-4 w-4 shrink-0 rounded-sm border border-primary bg-primary text-primary-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center",
          className
        )}
      >
        <Minus className="h-3 w-3" />
      </button>
    );
  }

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={className}
      disabled={disabled}
    />
  );
}
