import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";

export interface TextareaWithCountProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Maximum character count */
  maxLength?: number;
  /** Show character count indicator */
  showCount?: boolean;
  /** Warn when approaching limit (percentage, default 0.9 = 90%) */
  warnThreshold?: number;
}

/**
 * Textarea with character count indicator.
 * Shows remaining characters and changes color when approaching/exceeding limit.
 * 
 * @example
 * ```tsx
 * <TextareaWithCount
 *   maxLength={280}
 *   value={bio}
 *   onChange={(e) => setBio(e.target.value)}
 *   placeholder="Write your bio..."
 * />
 * ```
 */
const TextareaWithCount = React.forwardRef<
  HTMLTextAreaElement,
  TextareaWithCountProps
>(
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

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
        <Textarea
          ref={ref}
          value={currentValue}
          onChange={handleChange}
          maxLength={maxLength}
          className={cn(
            // Add padding for count indicator
            showCount && maxLength && "pb-7",
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
              "absolute bottom-2 right-3 text-xs tabular-nums transition-colors",
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

TextareaWithCount.displayName = "TextareaWithCount";

export { TextareaWithCount };
