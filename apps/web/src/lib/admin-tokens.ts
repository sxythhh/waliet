/**
 * Admin Design System Tokens
 *
 * Centralized design constants for consistent admin UI.
 * Inspired by Salesforce Lightning, Stripe Dashboard, and Linear.
 */

// =============================================================================
// SPACING
// =============================================================================

export const SPACING = {
  /** 4px - Tight gaps, icon padding */
  xs: "gap-1",
  /** 8px - Small gaps between related items */
  sm: "gap-2",
  /** 12px - Default gap between list items */
  md: "gap-3",
  /** 16px - Cell padding, card content */
  lg: "gap-4",
  /** 20px - Section padding */
  xl: "gap-5",
  /** 24px - Page padding, major sections */
  "2xl": "gap-6",
} as const;

export const PADDING = {
  /** Cell/compact padding: 10px vertical, 16px horizontal */
  cell: "px-4 py-2.5",
  /** Card content padding: 16px */
  card: "p-4",
  /** Section padding: 20px */
  section: "p-5",
  /** Page padding: 24px */
  page: "p-6",
  /** Sheet/dialog header: 20px horizontal, 16px vertical */
  sheetHeader: "px-5 py-4",
  /** Sheet/dialog content: 20px */
  sheetContent: "px-5 py-5",
  /** Sheet/dialog footer: 20px horizontal, 12px vertical */
  sheetFooter: "px-5 py-3",
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const TYPOGRAPHY = {
  /** Page titles - largest, bold */
  pageTitle: "text-lg font-semibold tracking-tight font-inter",
  /** Section headers - medium weight, smaller */
  sectionTitle: "text-sm font-semibold tracking-tight font-inter",
  /** Form/field labels - uppercase, muted */
  label: "text-xs font-medium uppercase tracking-wide text-muted-foreground font-inter",
  /** Inline labels - not uppercase */
  inlineLabel: "text-xs font-medium text-muted-foreground font-inter tracking-tight",
  /** Body text */
  body: "text-sm font-inter",
  /** Data values - tabular for alignment */
  value: "text-sm font-medium tabular-nums font-inter",
  /** Large metric values */
  metric: "text-2xl font-semibold tracking-tight tabular-nums font-inter",
  /** Small/secondary text */
  caption: "text-xs text-muted-foreground font-inter",
} as const;

// =============================================================================
// BORDERS
// =============================================================================

export const BORDERS = {
  /** Inner dividers - very subtle */
  subtle: "border-border/20",
  /** Section borders - visible but soft */
  default: "border-border/40",
  /** Component boundaries - clear separation */
  strong: "border-border/60",
  /** Full opacity - rare, high emphasis */
  solid: "border-border",
} as const;

// =============================================================================
// BACKGROUNDS
// =============================================================================

export const BACKGROUNDS = {
  /** Page background */
  page: "bg-background",
  /** Card/panel background */
  card: "bg-card",
  /** Input background */
  input: "bg-muted/40",
  /** Hover state */
  hover: "hover:bg-muted/30",
  /** Active/selected state */
  active: "bg-primary/10",
  /** Muted sections */
  muted: "bg-muted/20",
  /** Footer/header accent */
  accent: "bg-muted/30",
} as const;

// =============================================================================
// STATUS COLORS
// =============================================================================

export const STATUS = {
  success: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
  },
  error: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
  },
  info: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
  },
  neutral: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  },
} as const;

// =============================================================================
// COMPONENT SIZES
// =============================================================================

export const SIZES = {
  /** Standard input height - 36px */
  input: "h-9",
  /** Button height - 36px */
  button: "h-9",
  /** Small button - 32px */
  buttonSm: "h-8",
  /** Icon button - 32px */
  iconButton: "h-8 w-8",
  /** Avatar small - 32px */
  avatarSm: "h-8 w-8",
  /** Avatar medium - 40px */
  avatarMd: "h-10 w-10",
  /** Avatar large - 48px */
  avatarLg: "h-12 w-12",
} as const;

// =============================================================================
// RADII
// =============================================================================

export const RADII = {
  /** Small elements - buttons, inputs */
  sm: "rounded-md",
  /** Default - cards, panels */
  default: "rounded-lg",
  /** Large - dialogs, sheets */
  lg: "rounded-xl",
  /** Full - badges, avatars */
  full: "rounded-full",
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const SHADOWS = {
  /** Subtle elevation */
  sm: "shadow-sm",
  /** Default card shadow */
  default: "shadow",
  /** Dialogs/modals */
  lg: "shadow-lg",
  /** Overlay shadow */
  overlay: "shadow-2xl shadow-black/40",
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

export const TRANSITIONS = {
  /** Fast micro-interactions */
  fast: "transition-all duration-100",
  /** Default transitions */
  default: "transition-all duration-150",
  /** Smooth animations */
  smooth: "transition-all duration-200",
  /** Slow/deliberate */
  slow: "transition-all duration-300",
} as const;

// =============================================================================
// TABLE STYLES
// =============================================================================

export const TABLE = {
  /** Header cell styles */
  headerCell: "px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap bg-muted/30",
  /** Body cell styles */
  bodyCell: "px-4 py-2.5 text-sm",
  /** Row styles */
  row: "border-b border-border/30 transition-colors",
  /** Row hover */
  rowHover: "hover:bg-muted/30",
  /** Row selected */
  rowSelected: "bg-primary/5 hover:bg-primary/10",
} as const;

// =============================================================================
// SHEET/DIALOG OVERLAY
// =============================================================================

export const OVERLAY = {
  /** Unified overlay for sheets and dialogs */
  background: "bg-black/60",
  /** Backdrop blur */
  blur: "backdrop-blur-sm",
} as const;

// =============================================================================
// COMPONENT CLASS BUILDERS
// =============================================================================

/** Build input classes */
export function inputClasses(error?: boolean): string {
  return [
    SIZES.input,
    RADII.sm,
    BACKGROUNDS.input,
    "border-0",
    "px-3",
    "text-sm font-inter",
    "placeholder:text-muted-foreground/60",
    "focus:ring-1",
    error ? "ring-1 ring-red-500/30 focus:ring-red-500/50" : "focus:ring-primary/30",
    TRANSITIONS.fast,
  ].join(" ");
}

/** Build button classes for admin */
export function adminButtonClasses(variant: "primary" | "secondary" | "ghost" = "secondary"): string {
  const base = [SIZES.button, RADII.sm, "text-sm font-medium font-inter", TRANSITIONS.fast].join(" ");

  switch (variant) {
    case "primary":
      return `${base} bg-foreground text-background hover:bg-foreground/90`;
    case "ghost":
      return `${base} hover:bg-muted/50`;
    case "secondary":
    default:
      return `${base} bg-muted/50 hover:bg-muted`;
  }
}

/** Build badge classes */
export function badgeClasses(status: keyof typeof STATUS = "neutral"): string {
  const s = STATUS[status];
  return [
    "inline-flex items-center",
    "px-2 py-0.5",
    RADII.full,
    "text-xs font-medium font-inter",
    s.bg,
    s.text,
  ].join(" ");
}
