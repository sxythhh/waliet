import * as React from "react";
import { cn } from "@/lib/utils";
import { SIZES, RADII, BACKGROUNDS, TRANSITIONS, TYPOGRAPHY } from "@/lib/admin-tokens";

// =============================================================================
// ADMIN INPUT
// =============================================================================

export interface AdminInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Left icon */
  leftIcon?: React.ReactNode;
  /** Right icon/element */
  rightElement?: React.ReactNode;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Input size variant */
  inputSize?: "sm" | "default";
}

export const AdminInput = React.forwardRef<HTMLInputElement, AdminInputProps>(
  (
    {
      className,
      type = "text",
      leftIcon,
      rightElement,
      error,
      errorMessage,
      inputSize = "default",
      ...props
    },
    ref
  ) => {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            "flex w-full",
            inputSize === "sm" ? "h-9" : "h-10",
            "rounded-lg",
            "bg-muted/50 dark:bg-[#0f0f0f]",
            "border-0",
            leftIcon ? "pl-9" : "px-4",
            rightElement ? "pr-9" : "px-4",
            "text-sm font-inter tracking-[-0.3px]",
            "placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-1",
            error
              ? "ring-1 ring-red-500/30 focus:ring-red-500/50"
              : "focus:ring-primary/30",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
        {error && errorMessage && (
          <p className="mt-1.5 text-xs text-red-500 font-inter">{errorMessage}</p>
        )}
      </div>
    );
  }
);
AdminInput.displayName = "AdminInput";

// =============================================================================
// ADMIN TEXTAREA
// =============================================================================

export interface AdminTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  errorMessage?: string;
}

export const AdminTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AdminTextareaProps
>(({ className, error, errorMessage, ...props }, ref) => {
  return (
    <div>
      <textarea
        ref={ref}
        className={cn(
          "flex w-full min-h-[80px]",
          "rounded-lg",
          "bg-muted/50 dark:bg-[#0f0f0f]",
          "border-0",
          "px-4 py-3",
          "text-sm font-inter tracking-[-0.3px]",
          "placeholder:text-muted-foreground/60",
          "focus:outline-none focus:ring-1",
          error
            ? "ring-1 ring-red-500/30 focus:ring-red-500/50"
            : "focus:ring-primary/30",
          "transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "resize-none",
          className
        )}
        {...props}
      />
      {error && errorMessage && (
        <p className="mt-1.5 text-xs text-red-500 font-inter">{errorMessage}</p>
      )}
    </div>
  );
});
AdminTextarea.displayName = "AdminTextarea";

// =============================================================================
// ADMIN LABEL
// =============================================================================

export interface AdminLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Use inline style (not uppercase) */
  inline?: boolean;
  /** Required indicator */
  required?: boolean;
}

export const AdminLabel = React.forwardRef<HTMLLabelElement, AdminLabelProps>(
  ({ className, children, inline, required, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          inline ? TYPOGRAPHY.inlineLabel : TYPOGRAPHY.label,
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    );
  }
);
AdminLabel.displayName = "AdminLabel";

// =============================================================================
// ADMIN FIELD (Input with label)
// =============================================================================

export interface AdminFieldProps extends AdminInputProps {
  /** Field label */
  label: string;
  /** Use inline label style */
  inlineLabel?: boolean;
  /** Required indicator */
  required?: boolean;
  /** Helper text */
  helperText?: string;
}

export const AdminField = React.forwardRef<HTMLInputElement, AdminFieldProps>(
  (
    { label, inlineLabel, required, helperText, className, ...inputProps },
    ref
  ) => {
    return (
      <div className={cn("space-y-1.5", className)}>
        <AdminLabel inline={inlineLabel} required={required}>
          {label}
        </AdminLabel>
        <AdminInput ref={ref} {...inputProps} />
        {helperText && !inputProps.error && (
          <p className="text-xs text-muted-foreground/70 font-inter">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
AdminField.displayName = "AdminField";

// =============================================================================
// ADMIN SELECT
// =============================================================================

export interface AdminSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  errorMessage?: string;
}

export const AdminSelect = React.forwardRef<HTMLSelectElement, AdminSelectProps>(
  ({ className, error, errorMessage, children, ...props }, ref) => {
    return (
      <div>
        <select
          ref={ref}
          className={cn(
            "flex w-full",
            "h-10",
            "rounded-lg",
            "bg-muted/50 dark:bg-[#0f0f0f]",
            "border-0",
            "px-4",
            "text-sm font-inter tracking-[-0.3px]",
            "focus:outline-none focus:ring-1",
            error
              ? "ring-1 ring-red-500/30 focus:ring-red-500/50"
              : "focus:ring-primary/30",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "cursor-pointer",
            "appearance-none",
            // Arrow indicator
            "bg-[length:16px_16px] bg-no-repeat bg-[right_12px_center]",
            "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
            "pr-10",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && errorMessage && (
          <p className="mt-1.5 text-xs text-red-500 font-inter">{errorMessage}</p>
        )}
      </div>
    );
  }
);
AdminSelect.displayName = "AdminSelect";

// =============================================================================
// ADMIN SEARCH INPUT
// =============================================================================

import { Search, X } from "lucide-react";

export interface AdminSearchInputProps extends Omit<AdminInputProps, "leftIcon"> {
  /** Show clear button when value exists */
  onClear?: () => void;
}

export const AdminSearchInput = React.forwardRef<
  HTMLInputElement,
  AdminSearchInputProps
>(({ onClear, value, ...props }, ref) => {
  return (
    <AdminInput
      ref={ref}
      value={value}
      leftIcon={<Search className="h-4 w-4" />}
      rightElement={
        value && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </button>
        ) : undefined
      }
      placeholder="Search..."
      {...props}
    />
  );
});
AdminSearchInput.displayName = "AdminSearchInput";
