"use client";

import { cn } from "@/lib/utils";
import { PaymentMethodConfig } from "./types";

interface PaymentMethodCardProps {
  config: PaymentMethodConfig;
  onClick: () => void;
  disabled?: boolean;
}

export function PaymentMethodCard({
  config,
  onClick,
  disabled = false,
}: PaymentMethodCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-3 rounded-lg border border-border/50 bg-card text-left w-full",
        "transition-colors duration-150",
        "hover:bg-muted/50",
        "focus:outline-none",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card"
      )}
    >
      {/* Icon */}
      <div className="w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center mb-2">
        <span
          className="material-symbols-rounded text-[18px] text-foreground"
          style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}
        >
          {config.materialIcon}
        </span>
      </div>

      {/* Title & Description */}
      <p className="text-xs font-medium tracking-[-0.3px] text-foreground">
        {config.title}
      </p>
      <p className="text-[11px] text-muted-foreground tracking-[-0.3px] mt-0.5 line-clamp-1">
        {config.description}
      </p>
    </button>
  );
}
