import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface LocalCurrencyAmountProps {
  /** Amount in USD */
  amount: number;
  /** Show both local currency and USD */
  showBoth?: boolean;
  /** Use compact notation for large numbers */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show currency code */
  showCode?: boolean;
  /** Show as tooltip instead of inline */
  tooltipMode?: boolean;
}

/**
 * Displays an amount in the user's local currency.
 * Automatically detects user's location and converts from USD.
 *
 * @example
 * // Simple usage - shows amount in user's local currency
 * <LocalCurrencyAmount amount={100} />
 *
 * @example
 * // Show both currencies
 * <LocalCurrencyAmount amount={100} showBoth />
 *
 * @example
 * // Compact for large numbers
 * <LocalCurrencyAmount amount={1500000} compact />
 */
export function LocalCurrencyAmount({
  amount,
  showBoth = false,
  compact = false,
  className,
  showCode = false,
  tooltipMode = false,
}: LocalCurrencyAmountProps) {
  const { currencyCode, formatLocal, format, isLoading } = useCurrency();

  // During loading, show USD
  if (isLoading) {
    return <span className={className}>{format(amount, { compact })}</span>;
  }

  const localAmount = formatLocal(amount, { compact, showCode });
  const usdAmount = format(amount, { compact });

  // If user is in USD, just show USD
  if (currencyCode === "USD") {
    return <span className={className}>{usdAmount}</span>;
  }

  // Tooltip mode: show local currency, USD in tooltip
  if (tooltipMode) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("cursor-help", className)}>
            {localAmount}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <span className="text-muted-foreground">{usdAmount} USD</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Show both currencies inline
  if (showBoth) {
    return (
      <span className={className}>
        {localAmount}{" "}
        <span className="text-muted-foreground">({usdAmount})</span>
      </span>
    );
  }

  // Default: just show local currency
  return <span className={className}>{localAmount}</span>;
}

/**
 * Simple inline component that shows USD with local currency in parentheses
 */
export function UsdWithLocal({
  amount,
  className,
  compact = false,
}: {
  amount: number;
  className?: string;
  compact?: boolean;
}) {
  const { currencyCode, formatLocal, format, isLoading } = useCurrency();

  const usdAmount = format(amount, { compact });

  // During loading or if USD, just show USD
  if (isLoading || currencyCode === "USD") {
    return <span className={className}>{usdAmount}</span>;
  }

  const localAmount = formatLocal(amount, { compact });

  return (
    <span className={className}>
      {usdAmount}{" "}
      <span className="text-muted-foreground text-sm">≈ {localAmount}</span>
    </span>
  );
}
