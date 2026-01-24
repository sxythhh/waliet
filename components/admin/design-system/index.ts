/**
 * Admin Design System
 *
 * Enterprise-grade admin UI components with consistent
 * spacing, typography, and visual hierarchy.
 *
 * Inspired by Salesforce Lightning, Stripe Dashboard, and Linear.
 */

// =============================================================================
// DESIGN TOKENS
// =============================================================================

export {
  SPACING,
  PADDING,
  TYPOGRAPHY,
  BORDERS,
  BACKGROUNDS,
  STATUS,
  SIZES,
  RADII,
  SHADOWS,
  TRANSITIONS,
  TABLE,
  OVERLAY,
  inputClasses,
  adminButtonClasses,
  badgeClasses,
} from "@/lib/admin-tokens";

// =============================================================================
// LAYOUT COMPONENTS
// =============================================================================

export {
  AdminPageHeader,
  AdminSection,
  AdminContent,
  AdminToolbar,
  AdminEmptyState,
  AdminLoading,
  AdminGrid,
  AdminDivider,
  AdminStatRow,
} from "./AdminLayout";

export type {
  AdminPageHeaderProps,
  AdminSectionProps,
  AdminToolbarProps,
  AdminEmptyStateProps,
  AdminLoadingProps,
  AdminGridProps,
  AdminDividerProps,
  AdminStatRowProps,
} from "./AdminLayout";

// =============================================================================
// TABLE COMPONENTS
// =============================================================================

export { AdminTable, useAdminTable } from "./AdminTable";
export type { AdminTableColumn, AdminTableProps } from "./AdminTable";

// =============================================================================
// INPUT COMPONENTS
// =============================================================================

export {
  AdminInput,
  AdminTextarea,
  AdminLabel,
  AdminField,
  AdminSelect,
  AdminSearchInput,
} from "./AdminInput";

export type {
  AdminInputProps,
  AdminTextareaProps,
  AdminLabelProps,
  AdminFieldProps,
  AdminSelectProps,
  AdminSearchInputProps,
} from "./AdminInput";

// =============================================================================
// BUTTON COMPONENTS
// =============================================================================

export {
  AdminButton,
  AdminIconButton,
  AdminButtonGroup,
  AdminToggleButton,
} from "./AdminButton";

export type {
  AdminButtonProps,
  AdminIconButtonProps,
  AdminButtonGroupProps,
  AdminToggleButtonProps,
} from "./AdminButton";

// =============================================================================
// BADGE COMPONENTS
// =============================================================================

export {
  AdminBadge,
  AdminStatusBadge,
  AdminCountBadge,
  AdminPlatformBadge,
} from "./AdminBadge";

export type {
  AdminBadgeProps,
  AdminStatusBadgeProps,
  AdminCountBadgeProps,
  AdminPlatformBadgeProps,
} from "./AdminBadge";

// =============================================================================
// TAB COMPONENTS
// =============================================================================

export {
  AdminTabs,
  AdminTabContent,
  AdminFilterTabs,
} from "./AdminTabs";

export type {
  AdminTab,
  AdminTabsProps,
  AdminTabContentProps,
  AdminFilterOption,
  AdminFilterTabsProps,
} from "./AdminTabs";

// =============================================================================
// SHEET COMPONENTS
// =============================================================================

export {
  AdminSheet,
  AdminSheetTrigger,
  AdminSheetClose,
  AdminSheetPortal,
  AdminSheetOverlay,
  AdminSheetContent,
  AdminSheetHeader,
  AdminSheetBody,
  AdminSheetFooter,
  AdminSheetTitle,
  AdminSheetDescription,
  AdminSheetSection,
} from "./AdminSheet";

// =============================================================================
// DIALOG COMPONENTS
// =============================================================================

export {
  AdminDialog,
  AdminDialogTrigger,
  AdminDialogClose,
  AdminDialogPortal,
  AdminDialogOverlay,
  AdminDialogContent,
  AdminDialogHeader,
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogTitle,
  AdminDialogDescription,
  AdminConfirmDialog,
} from "./AdminDialog";

// =============================================================================
// CARD COMPONENTS (existing)
// =============================================================================

export { AdminCard, AdminStatCard, AdminMiniStatCard } from "./AdminCard";
export { AdminMetric, AdminAlertMetric } from "./AdminMetric";
