import * as React from "react";
import { cn } from "@/lib/utils";
import { SIZES, RADII, TRANSITIONS } from "@/lib/admin-tokens";

// =============================================================================
// ADMIN BUTTON
// =============================================================================

export interface AdminButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  /** Button size */
  size?: "sm" | "default" | "lg" | "icon";
  /** Loading state */
  loading?: boolean;
  /** Left icon */
  leftIcon?: React.ReactNode;
  /** Right icon */
  rightIcon?: React.ReactNode;
}

export const AdminButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "default",
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 border-t border-primary/70",
      secondary: "bg-muted/30 dark:bg-muted/20 text-foreground hover:bg-muted/50 dark:hover:bg-muted/30",
      ghost: "text-foreground hover:bg-muted/30 dark:hover:bg-muted/20",
      destructive: "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20",
      outline: "border border-border/50 text-foreground hover:bg-muted/30 dark:hover:bg-muted/20",
    };

    const sizeClasses = {
      sm: "h-9 px-3 text-xs gap-1.5",
      default: "h-10 px-4 text-sm gap-2",
      lg: "h-11 px-5 text-sm gap-2",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center",
          "font-medium font-inter tracking-[-0.5px]",
          "rounded-lg",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);
AdminButton.displayName = "AdminButton";

// =============================================================================
// ADMIN ICON BUTTON
// =============================================================================

export interface AdminIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  /** Button size */
  size?: "sm" | "default" | "lg";
  /** Loading state */
  loading?: boolean;
  /** Icon to display */
  icon: React.ReactNode;
  /** Accessible label */
  label: string;
}

export const AdminIconButton = React.forwardRef<
  HTMLButtonElement,
  AdminIconButtonProps
>(
  (
    {
      className,
      variant = "ghost",
      size = "default",
      loading = false,
      icon,
      label,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      secondary: "bg-muted/30 dark:bg-muted/20 text-foreground hover:bg-muted/50 dark:hover:bg-muted/30",
      ghost: "text-muted-foreground hover:text-foreground hover:bg-muted/30 dark:hover:bg-muted/20",
      destructive: "text-red-600 dark:text-red-400 hover:bg-red-500/10",
    };

    const sizeClasses = {
      sm: "h-8 w-8",
      default: "h-9 w-9",
      lg: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center",
          "rounded-lg",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          icon
        )}
      </button>
    );
  }
);
AdminIconButton.displayName = "AdminIconButton";

// =============================================================================
// ADMIN BUTTON GROUP
// =============================================================================

export interface AdminButtonGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Attached style (no gaps, connected borders) */
  attached?: boolean;
}

export const AdminButtonGroup = React.forwardRef<
  HTMLDivElement,
  AdminButtonGroupProps
>(({ className, attached, children, ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    className={cn(
      "inline-flex",
      attached
        ? "[&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:last-child)]:border-r-0"
        : "gap-2",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
AdminButtonGroup.displayName = "AdminButtonGroup";

// =============================================================================
// ADMIN TOGGLE BUTTON
// =============================================================================

export interface AdminToggleButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  /** Whether the button is pressed/active */
  pressed: boolean;
  /** Change handler */
  onPressedChange: (pressed: boolean) => void;
  /** Size variant */
  size?: "sm" | "default";
}

export const AdminToggleButton = React.forwardRef<
  HTMLButtonElement,
  AdminToggleButtonProps
>(
  (
    {
      className,
      pressed,
      onPressedChange,
      size = "default",
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-9 px-3 text-xs",
      default: "h-10 px-4 text-sm",
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-pressed={pressed}
        onClick={() => onPressedChange(!pressed)}
        className={cn(
          "inline-flex items-center justify-center gap-2",
          "font-medium font-inter tracking-[-0.5px]",
          "rounded-lg",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          pressed
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/30 dark:hover:bg-muted/20",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
AdminToggleButton.displayName = "AdminToggleButton";
