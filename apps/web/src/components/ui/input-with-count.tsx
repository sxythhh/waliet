import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export interface InputWithCountProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Maximum character count */
  maxLength?: number;
  /** Show character count indicator */
  showCount?: boolean;
  /** Warn when approaching limit (percentage, default 0.9 = 90%) */
  warnThreshold?: number;
}

/**
 * Input with character count indicator.
 * Shows remaining characters and changes color when approaching/exceeding limit.
 * 
 * @example
 * ```tsx
 * <InputWithCount
 *   maxLength={50}
 *   value={title}
 *   onChange={(e) => setTitle(e.target.value)}
 *   placeholder="Enter title..."
 * />
 * ```
 */
const InputWithCount = React.forwardRef<HTMLInputElement, InputWithCountProps>(
  (
    {
      maxLength,
      showCount = true,
      warnThreshold = 0.9,
      value,
      className,
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState("");
    
    // Use controlled or uncontrolled value
    const currentValue = value !== undefined ? String(value) : internalValue;
    const length = currentValue.length;
    
    const isNearLimit = maxLength ? length >= maxLength * warnThreshold : false;
    const isAtLimit = maxLength ? length >= maxLength : false;
    const isOverLimit = maxLength ? length > maxLength : false;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (value === undefined) {
        setInternalValue(e.target.value);
      }
      onChange?.(e);
    };

    const getCountColor = () => {
      if (isOverLimit) return "text-destructive";
      if (isAtLimit) return "text-amber-500";
      if (isNearLimit) return "text-amber-500/80";
      return "text-muted-foreground";
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          value={currentValue}
          onChange={handleChange}
          maxLength={maxLength}
          className={cn(
            // Add padding for count indicator
            showCount && maxLength && "pr-16",
            // Error state when over limit
            isOverLimit && "border-destructive focus-visible:ring-destructive",
            className
          )}
          aria-describedby={showCount && maxLength ? "char-count" : undefined}
          {...props}
        />
        
        {showCount && maxLength && (
          <span
            id="char-count"
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums transition-colors pointer-events-none",
              getCountColor()
            )}
            aria-live="polite"
          >
            {length}/{maxLength}
          </span>
        )}
      </div>
    );
  }
);

InputWithCount.displayName = "InputWithCount";

export { InputWithCount };
