/**
 * Admin Design System Tokens
 *
 * Aligned with Virality Dashboard Design System.
 * Uses Inter font with tight tracking, rounded-lg defaults, and proper dark mode support.
 */

// =============================================================================
// SPACING
// =============================================================================

export const SPACING = {
  /** 4px - Tight gaps, icon padding */
  xs: "gap-1",
  /** 8px - Standard spacing (most common) */
  sm: "gap-2",
  /** 12px - Relaxed spacing */
  md: "gap-3",
  /** 16px - Spacious */
  lg: "gap-4",
  /** 20px - Section spacing */
  xl: "gap-5",
  /** 24px - Major section separation */
  "2xl": "gap-6",
} as const;

export const PADDING = {
  /** Cell/compact padding */
  cell: "px-4 py-2.5",
  /** Card content padding */
  card: "p-4",
  /** Section padding */
  section: "p-5",
  /** Page padding - responsive */
  page: "px-4 sm:px-6 md:px-8 py-6",
  /** Sheet/dialog header */
  sheetHeader: "px-5 py-4",
  /** Sheet/dialog content */
  sheetContent: "px-5 py-5",
  /** Sheet/dialog footer */
  sheetFooter: "px-5 py-3",
} as const;

// =============================================================================
// TYPOGRAPHY - Using Virality tracking standards
// =============================================================================

export const TYPOGRAPHY = {
  /** Page titles - xl with tight tracking */
  pageTitle: "text-xl font-semibold font-inter tracking-[-0.5px] text-foreground",
  /** Section headers */
  sectionTitle: "text-lg font-semibold font-inter tracking-[-0.5px] text-foreground",
  /** Subsection headers */
  subsectionTitle: "text-sm font-semibold font-inter tracking-[-0.5px] text-foreground",
  /** Form/field labels */
  label: "text-xs font-medium font-inter tracking-[-0.3px] text-muted-foreground",
  /** Inline labels - not uppercase */
  inlineLabel: "text-xs font-medium font-inter tracking-[-0.3px] text-muted-foreground",
  /** Body text */
  body: "text-sm font-inter tracking-[-0.3px] text-foreground",
  /** Data values - tabular for alignment */
  value: "text-sm font-medium font-inter tracking-[-0.5px] tabular-nums text-foreground",
  /** Large metric values */
  metric: "text-2xl font-semibold font-inter tracking-[-0.5px] tabular-nums text-foreground",
  /** Small/secondary text */
  caption: "text-xs font-inter tracking-[-0.3px] text-muted-foreground",
} as const;

// =============================================================================
// BORDERS - Using border-border/50 as default
// =============================================================================

export const BORDERS = {
  /** Very subtle dividers */
  subtle: "border-border/30",
  /** Default borders */
  default: "border-border/50",
  /** Stronger separation */
  strong: "border-border/70",
  /** Full opacity */
  solid: "border-border",
} as const;

// =============================================================================
// BACKGROUNDS - With dark mode support
// =============================================================================

export const BACKGROUNDS = {
  /** Page background */
  page: "bg-background",
  /** Card/panel background */
  card: "bg-card dark:bg-[#0e0e0e]",
  /** Input background */
  input: "bg-muted/50 dark:bg-[#0f0f0f]",
  /** Hover state */
  hover: "hover:bg-muted/30 dark:hover:bg-muted/20",
  /** Active/selected state */
  active: "bg-primary/10",
  /** Muted sections */
  muted: "bg-muted/30 dark:bg-muted/20",
  /** Footer/header accent */
  accent: "bg-muted/40 dark:bg-muted/30",
} as const;

// =============================================================================
// STATUS COLORS - Aligned with Virality patterns
// =============================================================================

export const STATUS = {
  success: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
  },
  error: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/20",
    dot: "bg-red-500",
  },
  info: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    dot: "bg-blue-500",
  },
  neutral: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground",
  },
} as const;

// =============================================================================
// COMPONENT SIZES
// =============================================================================

export const SIZES = {
  /** Standard input height - 40px (touch friendly) */
  input: "h-10",
  /** Button height - 40px */
  button: "h-10",
  /** Small button - 36px */
  buttonSm: "h-9",
  /** Large button - 44px */
  buttonLg: "h-11",
  /** Icon button - 36px */
  iconButton: "h-9 w-9",
  /** Small icon button - 32px */
  iconButtonSm: "h-8 w-8",
  /** Avatar small - 32px */
  avatarSm: "h-8 w-8",
  /** Avatar medium - 40px */
  avatarMd: "h-10 w-10",
  /** Avatar large - 48px */
  avatarLg: "h-12 w-12",
} as const;

// =============================================================================
// RADII - Using rounded-lg as default
// =============================================================================

export const RADII = {
  /** Small elements */
  sm: "rounded-md",
  /** Default - cards, buttons, inputs */
  default: "rounded-lg",
  /** Large - dialogs, sheets */
  lg: "rounded-xl",
  /** Extra large */
  xl: "rounded-2xl",
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
// TRANSITIONS - Standard 200ms
// =============================================================================

export const TRANSITIONS = {
  /** Fast micro-interactions */
  fast: "transition-all duration-150",
  /** Default transitions */
  default: "transition-all duration-200",
  /** Smooth animations */
  smooth: "transition-all duration-200 ease-out",
  /** Slow/deliberate */
  slow: "transition-all duration-300",
} as const;

// =============================================================================
// TABLE STYLES
// =============================================================================

export const TABLE = {
  /** Header cell styles */
  headerCell: "px-4 py-3 text-xs font-medium font-inter tracking-[-0.3px] text-muted-foreground whitespace-nowrap bg-muted/30 dark:bg-muted/20",
  /** Body cell styles */
  bodyCell: "px-4 py-3 text-sm font-inter tracking-[-0.3px]",
  /** Row styles */
  row: "border-b border-border/30 transition-colors duration-200",
  /** Row hover */
  rowHover: "hover:bg-muted/30 dark:hover:bg-muted/20",
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
    RADII.default,
    BACKGROUNDS.input,
    "border-0",
    "px-4",
    "text-sm font-inter tracking-[-0.3px]",
    "placeholder:text-muted-foreground/60",
    "focus:outline-none focus:ring-1",
    error ? "ring-1 ring-red-500/30 focus:ring-red-500/50" : "focus:ring-primary/30",
    TRANSITIONS.default,
  ].join(" ");
}

/** Build button classes for admin - primary uses Discord Blurple style */
export function adminButtonClasses(variant: "primary" | "secondary" | "ghost" = "secondary"): string {
  const base = [
    SIZES.button,
    RADII.default,
    "text-sm font-medium font-inter tracking-[-0.5px]",
    TRANSITIONS.default,
  ].join(" ");

  switch (variant) {
    case "primary":
      return `${base} bg-primary text-primary-foreground hover:bg-primary/90 border-t border-primary/70`;
    case "ghost":
      return `${base} hover:bg-muted/30 dark:hover:bg-muted/20`;
    case "secondary":
    default:
      return `${base} bg-muted/30 dark:bg-muted/20 hover:bg-muted/50 dark:hover:bg-muted/30`;
  }
}

/** Build badge classes */
export function badgeClasses(status: keyof typeof STATUS = "neutral"): string {
  const s = STATUS[status];
  return [
    "inline-flex items-center",
    "px-2 py-0.5",
    RADII.full,
    "text-xs font-medium font-inter tracking-[-0.3px]",
    s.bg,
    s.text,
  ].join(" ");
}
