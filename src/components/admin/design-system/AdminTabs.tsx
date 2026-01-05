import * as React from "react";
import { cn } from "@/lib/utils";
import { TYPOGRAPHY, TRANSITIONS, RADII, BORDERS, BACKGROUNDS } from "@/lib/admin-tokens";

// =============================================================================
// ADMIN TABS (Simple tab navigation)
// =============================================================================

export interface AdminTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface AdminTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tab definitions */
  tabs: AdminTab[];
  /** Active tab ID */
  activeTab: string;
  /** Tab change handler */
  onTabChange: (tabId: string) => void;
  /** Tab style variant */
  variant?: "pills" | "underline" | "bordered";
  /** Size variant */
  size?: "sm" | "default";
  /** Full width tabs */
  fullWidth?: boolean;
}

export const AdminTabs = React.forwardRef<HTMLDivElement, AdminTabsProps>(
  (
    {
      className,
      tabs,
      activeTab,
      onTabChange,
      variant = "pills",
      size = "default",
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "text-xs h-8 px-3",
      default: "text-sm h-9 px-4",
    };

    const getTabClasses = (tab: AdminTab) => {
      const isActive = tab.id === activeTab;
      const base = cn(
        "inline-flex items-center justify-center gap-2",
        "font-medium font-inter",
        TRANSITIONS.fast,
        "focus:outline-none focus:ring-2 focus:ring-primary/20",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses[size],
        fullWidth && "flex-1"
      );

      switch (variant) {
        case "underline":
          return cn(
            base,
            "relative rounded-none border-b-2 -mb-px",
            isActive
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          );

        case "bordered":
          return cn(
            base,
            RADII.sm,
            "border",
            isActive
              ? cn("bg-background", BORDERS.strong, "text-foreground shadow-sm")
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
          );

        case "pills":
        default:
          return cn(
            base,
            RADII.sm,
            isActive
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          );
      }
    };

    const wrapperClasses = cn(
      "inline-flex",
      variant === "underline" && cn("border-b", BORDERS.subtle),
      variant === "bordered" && cn("p-1 rounded-lg", BACKGROUNDS.muted),
      variant === "pills" && "gap-1",
      fullWidth && "w-full"
    );

    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(wrapperClasses, className)}
        {...props}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={tab.id === activeTab}
            disabled={tab.disabled}
            onClick={() => onTabChange(tab.id)}
            className={getTabClasses(tab)}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={cn(
                  "ml-1 min-w-[18px] h-[18px] px-1.5",
                  "inline-flex items-center justify-center",
                  RADII.full,
                  "text-[10px] font-semibold tabular-nums",
                  tab.id === activeTab
                    ? "bg-foreground/10 text-foreground"
                    : "bg-muted-foreground/10 text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }
);
AdminTabs.displayName = "AdminTabs";

// =============================================================================
// ADMIN TAB CONTENT (for lazy-loaded content)
// =============================================================================

export interface AdminTabContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tab ID this content belongs to */
  tabId: string;
  /** Currently active tab */
  activeTab: string;
  /** Keep mounted when inactive (for preserving state) */
  keepMounted?: boolean;
}

export const AdminTabContent = React.forwardRef<HTMLDivElement, AdminTabContentProps>(
  ({ className, tabId, activeTab, keepMounted = false, children, ...props }, ref) => {
    const isActive = tabId === activeTab;

    if (!isActive && !keepMounted) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="tabpanel"
        hidden={!isActive}
        className={cn(
          !isActive && "hidden",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AdminTabContent.displayName = "AdminTabContent";

// =============================================================================
// ADMIN FILTER TABS (Quick filter as tabs)
// =============================================================================

export interface AdminFilterOption {
  id: string;
  label: string;
  count?: number;
}

export interface AdminFilterTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Filter options */
  options: AdminFilterOption[];
  /** Active filter ID (null = show all) */
  activeFilter: string | null;
  /** Filter change handler */
  onFilterChange: (filterId: string | null) => void;
  /** "All" option label */
  allLabel?: string;
  /** "All" option count */
  allCount?: number;
}

export const AdminFilterTabs = React.forwardRef<HTMLDivElement, AdminFilterTabsProps>(
  (
    {
      className,
      options,
      activeFilter,
      onFilterChange,
      allLabel = "All",
      allCount,
      ...props
    },
    ref
  ) => {
    const getButtonClasses = (isActive: boolean) =>
      cn(
        "inline-flex items-center gap-1.5",
        "h-8 px-3",
        "text-xs font-medium font-inter",
        RADII.full,
        TRANSITIONS.fast,
        isActive
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      );

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2 flex-wrap", className)}
        {...props}
      >
        <button
          type="button"
          onClick={() => onFilterChange(null)}
          className={getButtonClasses(activeFilter === null)}
        >
          {allLabel}
          {allCount !== undefined && (
            <span className="opacity-70 tabular-nums">{allCount}</span>
          )}
        </button>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onFilterChange(option.id)}
            className={getButtonClasses(activeFilter === option.id)}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="opacity-70 tabular-nums">{option.count}</span>
            )}
          </button>
        ))}
      </div>
    );
  }
);
AdminFilterTabs.displayName = "AdminFilterTabs";
