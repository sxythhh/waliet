# UI/UX Implementation Plan - Virality Nexus

**Created:** January 2026
**Total Issues Identified:** 150+
**Estimated Total Effort:** 8-12 weeks
**Priority Levels:** P0 (Critical), P1 (High), P2 (Medium), P3 (Low)

---

## Table of Contents

1. [Phase 1: Critical Accessibility & Mobile Fixes](#phase-1-critical-accessibility--mobile-fixes)
2. [Phase 2: Design System Consolidation](#phase-2-design-system-consolidation)
3. [Phase 3: Component Standardization](#phase-3-component-standardization)
4. [Phase 4: Navigation & Wayfinding](#phase-4-navigation--wayfinding)
5. [Phase 5: Form UX Improvements](#phase-5-form-ux-improvements)
6. [Phase 6: Tables & Data Display](#phase-6-tables--data-display)
7. [Phase 7: Code Quality & Cleanup](#phase-7-code-quality--cleanup)
8. [Testing & Validation Checklist](#testing--validation-checklist)

---

## Phase 1: Critical Accessibility & Mobile Fixes

**Priority:** P0 (Critical)
**Timeline:** Week 1-2
**Dependencies:** None

### 1.1 Fix Modal Keyboard Trap

**File:** `src/components/OnboardingDialog.tsx`
**Line:** 294
**Issue:** `onEscapeKeyDown={(e) => e.preventDefault()}` prevents keyboard escape

**Implementation:**
```tsx
// BEFORE (line 294)
<DialogContent
  className="sm:max-w-[420px] border-0 bg-[#0a0a0a] p-0 [&>button]:hidden"
  onInteractOutside={e => e.preventDefault()}
  onEscapeKeyDown={e => e.preventDefault()}
>

// AFTER
<DialogContent
  className="sm:max-w-[420px] border-0 bg-background dark:bg-[#0a0a0a] p-0 [&>button]:hidden"
  onInteractOutside={e => e.preventDefault()}
  // Remove onEscapeKeyDown or provide close mechanism
>
```

**Validation:**
- [ ] Press ESC key to close dialog
- [ ] Tab through all elements
- [ ] Screen reader announces dialog correctly

---

### 1.2 Add ARIA Labels to OTP Input

**File:** `src/components/auth/EmailOTPAuth.tsx`
**Lines:** 334-353

**Implementation:**
```tsx
// BEFORE
<InputOTP maxLength={6} value={otpCode} onChange={...}>
  <InputOTPGroup>
    <InputOTPSlot index={0} className="..." />
    <InputOTPSlot index={1} className="..." />
    // ... more slots
  </InputOTPGroup>
</InputOTP>

// AFTER
<div aria-label="6-digit verification code" role="group">
  <InputOTP
    maxLength={6}
    value={otpCode}
    onChange={...}
    aria-describedby="otp-hint"
  >
    <InputOTPGroup>
      <InputOTPSlot index={0} className="..." aria-label="Digit 1" />
      <InputOTPSlot index={1} className="..." aria-label="Digit 2" />
      <InputOTPSlot index={2} className="..." aria-label="Digit 3" />
      <InputOTPSlot index={3} className="..." aria-label="Digit 4" />
      <InputOTPSlot index={4} className="..." aria-label="Digit 5" />
      <InputOTPSlot index={5} className="..." aria-label="Digit 6" />
    </InputOTPGroup>
  </InputOTP>
  <p id="otp-hint" className="sr-only">Enter the 6-digit code sent to your email</p>
</div>
```

**Validation:**
- [ ] Screen reader announces each digit slot
- [ ] Focus moves correctly between slots
- [ ] Error states announced

---

### 1.3 Add Safe Area Padding to Fixed Elements

**Files to Update:**
- `src/components/ApplyToBountySheet.tsx` (line 242)
- `src/components/portal/BrandPortalMobileNav.tsx` (line 166)
- `src/components/AppSidebar.tsx` (mobile bottom nav)
- `src/components/brand/VideoSubmissionsTab.tsx` (line 2187)
- `src/components/admin/tickets/TicketActionBar.tsx` (line 39)

**Step 1: Create Tailwind utility class**

**File:** `tailwind.config.ts`
```ts
// Add to theme.extend
spacing: {
  'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
  'safe-top': 'env(safe-area-inset-top, 0px)',
},
```

**Step 2: Update fixed bottom elements**

```tsx
// BEFORE
<div className="fixed bottom-0 left-0 right-0 bg-background py-4 px-6">

// AFTER
<div className="fixed bottom-0 left-0 right-0 bg-background py-4 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
```

**Files to update:**
- [ ] `src/components/ApplyToBountySheet.tsx:242`
- [ ] `src/components/portal/BrandPortalMobileNav.tsx:166`
- [ ] `src/components/AppSidebar.tsx` (mobile nav section)
- [ ] `src/components/brand/VideoSubmissionsTab.tsx:2187`
- [ ] `src/components/admin/tickets/TicketActionBar.tsx:39`
- [ ] `src/components/ui/drawer.tsx:34`

**Validation:**
- [ ] Test on iPhone with notch (iPhone X+)
- [ ] Test on Android with gesture navigation
- [ ] Content not hidden under system bars

---

### 1.4 Fix Touch Target Sizes

**Minimum size:** 44x44px (iOS HIG) / 48x48dp (Material Design)

**Files to Update:**

| File | Current | Target |
|------|---------|--------|
| `src/components/ui/input-otp.tsx:35` | `h-10 w-10` (40px) | `h-11 w-11` (44px) |
| `src/components/ui/calendar.tsx:32` | `h-9 w-9` (36px) | `h-10 w-10` (40px) min |
| `src/components/ui/button.tsx:21` | `h-9` (36px for sm) | `h-10` (40px) |
| `src/components/brand/MessageInput.tsx:89` | `h-8` (32px) | `h-10` (40px) |
| `src/components/brand/PayoutRequestsTable.tsx:1113` | `h-8 w-8` (32px) | `h-10 w-10` (40px) |

**Implementation:**

**File:** `src/components/ui/button.tsx`
```tsx
// BEFORE (line 21)
size: {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",  // 36px - too small
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
}

// AFTER
size: {
  default: "h-10 px-4 py-2",
  sm: "h-10 rounded-md px-3",  // 40px - meets minimum
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
}
```

**Validation:**
- [ ] All buttons >= 40px height on mobile
- [ ] Icon buttons have adequate touch area
- [ ] Calendar day cells tappable without mis-taps

---

### 1.5 Make Hover-Only Buttons Always Visible

**File:** `src/components/dashboard/CampaignCard.tsx`
**Line:** 90

**Implementation:**
```tsx
// BEFORE
<div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <Button variant="secondary" size="icon" className="h-7 w-7">
    <Bookmark className="h-4 w-4" />
  </Button>
</div>

// AFTER - Always visible on mobile, hover on desktop
<div className="absolute top-3 right-3 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
  <Button
    variant="secondary"
    size="icon"
    className="h-9 w-9 md:h-7 md:w-7"
    aria-label="Bookmark campaign"
  >
    <Bookmark className="h-4 w-4" />
  </Button>
</div>
```

**Files to update:**
- [ ] `src/components/dashboard/CampaignCard.tsx:90`
- [ ] `src/components/dashboard/BoostDiscoverCard.tsx:56-62`

**Validation:**
- [ ] Buttons visible on touch devices
- [ ] Buttons hidden until hover on desktop
- [ ] Focus-visible states work for keyboard

---

### 1.6 Add Focus-Visible States to All Buttons

**File:** `src/components/ui/button.tsx`

**Implementation:**
```tsx
// Add to buttonVariants base classes
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50",
  // ... rest of variants
)
```

**Validation:**
- [ ] Tab through all buttons
- [ ] Clear focus ring visible
- [ ] Focus ring has adequate contrast

---

### 1.7 Fix Dialog Mobile Sizing

**Issue:** Dialogs use `sm:max-w-*` but no mobile fallback

**Files to Update:** 42+ DialogContent components

**Create base dialog wrapper:**

**File:** `src/components/ui/dialog.tsx`
```tsx
// Update DialogContent default className
const DialogContent = React.forwardRef<...>(
  ({ className, children, ...props }, ref) => (
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Add mobile-first width
        "w-[calc(100vw-2rem)] sm:w-auto",
        "fixed left-[50%] top-[50%] z-50 grid translate-x-[-50%] translate-y-[-50%]",
        "gap-4 border bg-background p-6 shadow-lg duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  )
)
```

**Validation:**
- [ ] Dialogs have 1rem margin on mobile
- [ ] Content doesn't touch screen edges
- [ ] Works on 320px width (iPhone SE)

---

### 1.8 Show Scrollbars on Desktop

**File:** `src/index.css`
**Lines:** 318-325

**Implementation:**
```css
/* BEFORE - Hidden globally */
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
*::-webkit-scrollbar {
  display: none;
}

/* AFTER - Only hidden on Capacitor platforms */
body.capacitor-ios *,
body.capacitor-android * {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

body.capacitor-ios *::-webkit-scrollbar,
body.capacitor-android *::-webkit-scrollbar {
  display: none;
}

/* Desktop: Show thin scrollbar */
@media (min-width: 768px) {
  * {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--border)) transparent;
  }
  *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  *::-webkit-scrollbar-track {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background: hsl(var(--border));
    border-radius: 3px;
  }
}
```

**Validation:**
- [ ] Scrollbars visible on desktop browsers
- [ ] Scrollbars hidden on iOS/Android apps
- [ ] Scroll position indicator works

---

## Phase 2: Design System Consolidation

**Priority:** P0-P1
**Timeline:** Week 2-3
**Dependencies:** Phase 1 complete

### 2.1 Standardize Dialog Size Variants

**File:** `src/components/ui/dialog.tsx`

**Current Problem:** 15+ different max-width values used

**Implementation - Add size prop:**
```tsx
interface DialogContentProps extends DialogPrimitive.DialogContentProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const sizeClasses = {
  sm: 'sm:max-w-sm',      // 384px
  md: 'sm:max-w-md',      // 448px
  lg: 'sm:max-w-lg',      // 512px (default)
  xl: 'sm:max-w-xl',      // 576px
  '2xl': 'sm:max-w-2xl',  // 672px
  'full': 'sm:max-w-[calc(100vw-4rem)]',
};

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, size = 'lg', children, ...props }, ref) => (
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "w-[calc(100vw-2rem)]",
        sizeClasses[size],
        // ... other classes
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  )
)
```

**Migration Tasks:**

| Current Pattern | New Pattern | Files |
|-----------------|-------------|-------|
| `sm:max-w-[380px]` | `size="sm"` | AuthDialog |
| `sm:max-w-[400px]` | `size="md"` | TopUpBalanceDialog |
| `sm:max-w-[420px]` | `size="md"` | ManageAccountDialog, BrandOnboardingDialog |
| `sm:max-w-[480px]` | `size="md"` | PayoutMethodDialog |
| `sm:max-w-[500px]` | `size="lg"` | ApplyToBoostDialog |
| `sm:max-w-[540px]` | `size="xl"` | CreateJobPostDialog |
| `sm:max-w-2xl` | `size="2xl"` | CampaignDetailsDialog |

---

### 2.2 Create Color Token Migration

**Step 1: Identify all hardcoded colors**

Run migration script:
```bash
grep -r "bg-\[#" src/components --include="*.tsx" | wc -l
grep -r "text-\[#" src/components --include="*.tsx" | wc -l
grep -r "border-\[#" src/components --include="*.tsx" | wc -l
```

**Step 2: Create color mapping**

| Hardcoded | Semantic Token | Usage |
|-----------|----------------|-------|
| `bg-[#0a0a0a]` | `bg-background` | Dark backgrounds |
| `bg-[#111111]` | `bg-card` | Card backgrounds |
| `bg-[#1b1b1b]` | `bg-muted` | Muted backgrounds |
| `bg-[#2060de]` | `bg-primary` | Primary buttons |
| `border-[#dedede]` | `border-border` | Default borders |
| `text-[#888]` | `text-muted-foreground` | Secondary text |

**Step 3: Create codemod script**

**File:** `scripts/migrate-colors.ts`
```typescript
const colorMigrations = {
  'bg-[#0a0a0a]': 'bg-background dark:bg-background',
  'bg-[#111111]': 'bg-card',
  'bg-[#1b1b1b]': 'bg-muted',
  'bg-[#2060de]': 'bg-primary',
  'bg-[#1a50c8]': 'bg-primary/90',
  'border-[#dedede]': 'border-border',
  'border-[#0e0e0e]': 'dark:border-border',
  'text-[#888]': 'text-muted-foreground',
};

// Run with: npx ts-node scripts/migrate-colors.ts
```

**Files with highest violation count:**
- [ ] `src/components/OnboardingDialog.tsx` - 5+ instances
- [ ] `src/components/AdminSidebar.tsx` - 4+ instances
- [ ] `src/components/ApplyToBountyDialog.tsx` - 3+ instances
- [ ] `src/components/ui/table.tsx` - 3+ instances
- [ ] `src/components/ui/input.tsx` - 2+ instances

---

### 2.3 Migrate Font Declarations

**Current Problem:** 2,117+ instances of `font-['Inter']` or `font-['Geist']`

**Step 1: Verify Tailwind config**

**File:** `tailwind.config.ts`
```ts
// Ensure these are defined
fontFamily: {
  geist: ['Geist', 'sans-serif'],
  inter: ['Inter', 'sans-serif'],
  clash: ['Clash Grotesk', 'sans-serif'],
},
```

**Step 2: Create search/replace patterns**

| Find | Replace |
|------|---------|
| `font-['Inter']` | `font-inter` |
| `font-['Geist']` | `font-geist` |
| `font-["Inter"]` | `font-inter` |
| `font-["Geist"]` | `font-geist` |

**Step 3: Run codemod**
```bash
# Find all instances
grep -r "font-\['" src/components --include="*.tsx" -l

# Replace (use sed or IDE find/replace)
find src/components -name "*.tsx" -exec sed -i '' "s/font-\['Inter'\]/font-inter/g" {} \;
find src/components -name "*.tsx" -exec sed -i '' "s/font-\['Geist'\]/font-geist/g" {} \;
```

---

### 2.4 Standardize Letter Spacing

**Current Problem:** `tracking-[-0.5px]` used everywhere regardless of text size

**Implementation - Create semantic tracking classes:**

**File:** `tailwind.config.ts`
```ts
letterSpacing: {
  'tighter': '-0.05em',     // -0.8px at 16px - Headlines
  'tight': '-0.025em',      // -0.4px at 16px - Subheadings
  'normal': '0',            // Body text
  'wide': '0.025em',        // Small caps, labels
},
```

**Usage Guidelines:**
- Headlines (h1, h2): `tracking-tighter`
- Subheadings (h3, h4): `tracking-tight`
- Body text: `tracking-normal` (default)
- Labels, badges: `tracking-wide`

**Migration:**
```tsx
// BEFORE
<h2 className="text-2xl font-bold tracking-[-0.5px]">

// AFTER
<h2 className="text-2xl font-bold tracking-tighter">
```

---

### 2.5 Extend Font Size Scale

**File:** `tailwind.config.ts`

**Add missing sizes:**
```ts
fontSize: {
  '2xs': ['0.625rem', { lineHeight: '0.875rem' }],  // 10px
  'xs': ['0.75rem', { lineHeight: '1rem' }],        // 12px (default)
  '2sm': ['0.8125rem', { lineHeight: '1.125rem' }], // 13px
  'sm': ['0.875rem', { lineHeight: '1.25rem' }],    // 14px (default)
  '2base': ['0.9375rem', { lineHeight: '1.375rem' }], // 15px
  'base': ['1rem', { lineHeight: '1.5rem' }],       // 16px (default)
},
```

**Migration:**
| Find | Replace |
|------|---------|
| `text-[10px]` | `text-2xs` |
| `text-[11px]` | `text-2xs` (close enough) |
| `text-[12px]` | `text-xs` |
| `text-[13px]` | `text-2sm` |
| `text-[15px]` | `text-2base` |

---

### 2.6 Standardize Border Radius

**File:** `tailwind.config.ts`

**Current:**
```ts
borderRadius: {
  lg: 'var(--radius)',
  md: 'calc(var(--radius) - 2px)',
  sm: 'calc(var(--radius) - 4px)',
}
```

**Add missing sizes:**
```ts
borderRadius: {
  'xs': 'calc(var(--radius) - 6px)',  // ~4px for checkboxes
  'sm': 'calc(var(--radius) - 4px)',  // ~6px
  'md': 'calc(var(--radius) - 2px)',  // ~8px
  'lg': 'var(--radius)',              // 10px (default)
  'xl': 'calc(var(--radius) + 4px)',  // ~14px
  '2xl': 'calc(var(--radius) + 8px)', // ~18px
},
```

**Migration:**
| Find | Replace |
|------|---------|
| `rounded-[3px]` | `rounded-xs` |
| `rounded-[5px]` | `rounded-sm` |
| `rounded-[7px]` | `rounded-md` |
| `rounded-[8px]` | `rounded-md` |
| `rounded-[10px]` | `rounded-lg` |
| `rounded-[20px]` | `rounded-2xl` |

---

## Phase 3: Component Standardization

**Priority:** P1
**Timeline:** Week 3-4
**Dependencies:** Phase 2 complete

### 3.1 Create Unified Status Badge Component

**File:** `src/components/ui/status-badge.tsx` (new)

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, XCircle, AlertTriangle, Pause } from "lucide-react";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
  {
    variants: {
      status: {
        pending: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
        active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
        live: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
        verified: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
        approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
        rejected: "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400",
        expired: "bg-gray-500/10 text-gray-600 border-gray-500/30 dark:text-gray-400",
        ended: "bg-gray-500/10 text-gray-600 border-gray-500/30 dark:text-gray-400",
        paused: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
        draft: "bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400",
      },
      size: {
        sm: "text-[10px] px-2 py-0",
        default: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      status: "pending",
      size: "default",
    },
  }
);

const statusIcons = {
  pending: Clock,
  active: CheckCircle2,
  live: CheckCircle2,
  verified: CheckCircle2,
  approved: CheckCircle2,
  rejected: XCircle,
  expired: AlertTriangle,
  ended: AlertTriangle,
  paused: Pause,
  draft: Clock,
};

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  showIcon?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function StatusBadge({
  status,
  size,
  showIcon = true,
  className,
  children
}: StatusBadgeProps) {
  const Icon = status ? statusIcons[status] : null;

  return (
    <span className={cn(statusBadgeVariants({ status, size }), className)}>
      {showIcon && Icon && <Icon className="h-3 w-3" />}
      {children || (status && status.charAt(0).toUpperCase() + status.slice(1))}
    </span>
  );
}
```

**Migration tasks:**
- [ ] Replace custom badges in `TaxForms.tsx:205-249`
- [ ] Replace custom badges in `BoostCampaignDetail.tsx:167-187`
- [ ] Replace custom badges in `CampaignCard.tsx:126-135`
- [ ] Replace inline badge styling in admin pages

---

### 3.2 Create Empty State Component

**File:** `src/components/ui/empty-state.tsx` (new)

```tsx
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  className?: string;
  size?: "sm" | "default" | "lg";
}

const sizes = {
  sm: {
    container: "py-8",
    icon: "h-10 w-10",
    title: "text-base",
    description: "text-sm",
  },
  default: {
    container: "py-12",
    icon: "h-12 w-12",
    title: "text-lg",
    description: "text-sm",
  },
  lg: {
    container: "py-16",
    icon: "h-16 w-16",
    title: "text-xl",
    description: "text-base",
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "default"
}: EmptyStateProps) {
  const s = sizes[size];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center px-4",
      s.container,
      className
    )}>
      {Icon && (
        <div className="mb-4 rounded-full bg-muted p-3">
          <Icon className={cn(s.icon, "text-muted-foreground")} />
        </div>
      )}
      <h3 className={cn(s.title, "font-semibold text-foreground mb-2")}>
        {title}
      </h3>
      {description && (
        <p className={cn(s.description, "text-muted-foreground max-w-sm mb-4")}>
          {description}
        </p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || "outline"}
          size="sm"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

**Usage:**
```tsx
<EmptyState
  icon={FileText}
  title="No campaigns yet"
  description="Create your first campaign to start attracting creators"
  action={{
    label: "Create Campaign",
    onClick: () => navigate("/create"),
  }}
/>
```

---

### 3.3 Standardize Button Gap and Sizing

**File:** `src/components/ui/button.tsx`

**Update buttonVariants:**
```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium " +
  "ring-offset-background transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
      // NEW: Standardize gap
      gap: {
        none: "gap-0",
        sm: "gap-1.5",
        default: "gap-2",
        lg: "gap-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      gap: "default",
    },
  }
);
```

---

### 3.4 Create Loading State Components

**File:** `src/components/ui/loading.tsx` (new)

```tsx
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// Spinner
export function Spinner({ className, size = "default" }: {
  className?: string;
  size?: "sm" | "default" | "lg"
}) {
  const sizes = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <Loader2 className={cn("animate-spin text-muted-foreground", sizes[size], className)} />
  );
}

// Loading bar
export function LoadingBar({ className }: { className?: string }) {
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full w-1/3 animate-loading-bar rounded-full bg-primary" />
    </div>
  );
}

// Skeleton
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("skeleton-shimmer rounded-md bg-muted", className)} />
  );
}

// Full page loader
export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Button loading state
export function ButtonLoading({ children }: { children: string }) {
  return (
    <>
      <Spinner size="sm" className="mr-2" />
      {children}
    </>
  );
}
```

---

### 3.5 Standardize Card Padding

**Create card size variants:**

**File:** `src/components/ui/card.tsx`

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const cardContentVariants = cva("", {
  variants: {
    padding: {
      none: "p-0",
      sm: "p-3",
      default: "p-4",
      lg: "p-6",
    },
  },
  defaultVariants: {
    padding: "default",
  },
});

interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardContentVariants> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardContentVariants({ padding }), className)}
      {...props}
    />
  )
);
```

**Usage guidelines:**
- `padding="sm"` (p-3): Compact cards, table cells
- `padding="default"` (p-4): Standard cards
- `padding="lg"` (p-6): Settings cards, dialogs

---

## Phase 4: Navigation & Wayfinding

**Priority:** P1
**Timeline:** Week 4-5
**Dependencies:** Phase 3 complete

### 4.1 Implement Breadcrumb Navigation

**File:** `src/components/ui/page-header.tsx` (new)

```tsx
import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions
}: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-2">
      {breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard">
                  <Home className="h-4 w-4" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
```

**Usage in Dashboard:**
```tsx
<PageHeader
  title="Campaign Details"
  breadcrumbs={[
    { label: "Campaigns", href: "/dashboard?tab=campaigns" },
    { label: campaign.title },
  ]}
  actions={<Button>Edit Campaign</Button>}
/>
```

**Files to update:**
- [ ] `src/pages/Dashboard.tsx` - Add breadcrumbs to nested views
- [ ] `src/components/brand/BrandCampaignDetailView.tsx`
- [ ] `src/components/brand/BoostDetailView.tsx`
- [ ] Settings pages

---

### 4.2 Add Mobile Workspace Indicator

**File:** `src/components/AppSidebar.tsx`

**Add to mobile header (around line 418-437):**
```tsx
// Mobile header
<header className="md:hidden fixed top-0 left-0 right-0 z-10 flex h-14 items-center justify-between bg-background px-4 border-b">
  <div className="flex items-center gap-2">
    {/* Brand logo */}
    {workspaceLogo && (
      <Avatar className="h-6 w-6">
        <AvatarImage src={workspaceLogo} />
        <AvatarFallback>{workspaceName?.charAt(0)}</AvatarFallback>
      </Avatar>
    )}
    <span className="text-sm font-medium truncate max-w-[150px]">
      {workspaceName || (isCreatorMode ? "Creator" : "Brand")}
    </span>
  </div>

  {/* Rest of header */}
</header>
```

---

### 4.3 Fix Tab Naming Inconsistencies

**File:** `src/pages/Dashboard.tsx`

**Current issues:**
- "Profile" tab renders WalletTab
- "Home" and "Campaigns" are separate but confusing

**Implementation:**
```tsx
// Creator mode tabs
const creatorTabs = [
  { id: "campaigns", label: "Campaigns", icon: Briefcase },
  { id: "discover", label: "Discover", icon: Search },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "wallet", label: "Wallet", icon: Wallet }, // Renamed from "Profile"
  { id: "settings", label: "Settings", icon: Settings },
];

// Brand mode tabs
const brandTabs = [
  { id: "overview", label: "Overview", icon: Home }, // Renamed from "Home"
  { id: "campaigns", label: "Campaigns", icon: Briefcase },
  { id: "blueprints", label: "Blueprints", icon: FileText },
  { id: "creators", label: "Creators", icon: Users },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "settings", label: "Settings", icon: Settings },
];
```

---

### 4.4 Add Progress Indicator to Multi-Step Flows

**File:** `src/components/OnboardingDialog.tsx`

**Add step indicator:**
```tsx
// After DialogHeader (around line 295)
<div className="px-6 pt-4">
  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
    <span>Step {step + 1} of {TOTAL_STEPS}</span>
    <span>{STEP_NAMES[step]}</span>
  </div>
  <div className="h-1 bg-muted rounded-full overflow-hidden">
    <div
      className="h-full bg-primary transition-all duration-300"
      style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
    />
  </div>
</div>
```

**Apply to:**
- [ ] `OnboardingDialog.tsx`
- [ ] `BrandOnboarding.tsx`
- [ ] `CreateJobPostDialog.tsx` (multi-step)

---

## Phase 5: Form UX Improvements

**Priority:** P2
**Timeline:** Week 5-6
**Dependencies:** Phase 4 complete

### 5.1 Create Inline Validation Pattern

**File:** `src/components/ui/form-field.tsx` (new)

```tsx
import { cn } from "@/lib/utils";
import { Check, AlertCircle } from "lucide-react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  success?: boolean;
  hint?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  required,
  error,
  success,
  hint,
  children
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
        {success && <Check className="h-4 w-4 text-emerald-500" />}
      </label>

      <div className="relative">
        {children}
        {error && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          {error}
        </p>
      )}

      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
```

**Usage:**
```tsx
<FormField
  label="Email"
  required
  error={errors.email}
  hint="We'll send verification code here"
>
  <Input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className={cn(errors.email && "border-destructive")}
  />
</FormField>
```

---

### 5.2 Add Real-Time Validation

**File:** `src/hooks/useFormValidation.ts` (new)

```tsx
import { useState, useCallback, useEffect } from "react";

interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

interface FieldConfig {
  required?: boolean;
  rules?: ValidationRule[];
}

export function useFormValidation<T extends Record<string, string>>(
  initialValues: T,
  config: Record<keyof T, FieldConfig>
) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = useCallback((name: keyof T, value: string) => {
    const fieldConfig = config[name];

    if (fieldConfig.required && !value.trim()) {
      return "This field is required";
    }

    if (fieldConfig.rules) {
      for (const rule of fieldConfig.rules) {
        if (!rule.validate(value)) {
          return rule.message;
        }
      }
    }

    return undefined;
  }, [config]);

  const handleChange = useCallback((name: keyof T, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [values, validateField]);

  const validateAll = useCallback(() => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const name of Object.keys(config) as (keyof T)[]) {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    setTouched(Object.keys(config).reduce((acc, key) => {
      acc[key as keyof T] = true;
      return acc;
    }, {} as Partial<Record<keyof T, boolean>>));

    return isValid;
  }, [config, values, validateField]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    setValues,
    isValid: Object.keys(errors).length === 0,
  };
}
```

---

### 5.3 Standardize Error Message Display

**Implementation pattern:**

```tsx
// For field-level errors: use FormMessage
<FormField>
  <Input {...field} />
  <FormMessage /> {/* Shows field-specific error */}
</FormField>

// For form-level errors: use Alert
{formError && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{formError}</AlertDescription>
  </Alert>
)}

// For async operations: use toast
toast.error("Failed to save. Please try again.");

// For success: use toast with custom component
toast.custom(() => (
  <div className="flex items-center gap-3 bg-card border border-emerald-500/30 rounded-xl px-4 py-3 shadow-lg">
    <CheckCircle className="h-5 w-5 text-emerald-500" />
    <span className="font-medium">Saved successfully!</span>
  </div>
));
```

---

### 5.4 Reset Form State on Dialog Close

**Pattern to apply:**

```tsx
const [open, setOpen] = useState(false);

const handleOpenChange = (newOpen: boolean) => {
  if (!newOpen) {
    // Reset form when closing
    resetForm();
  }
  setOpen(newOpen);
};

<Dialog open={open} onOpenChange={handleOpenChange}>
  {/* ... */}
</Dialog>
```

**Files to update:**
- [ ] `CreateCampaignLinkDialog.tsx`
- [ ] `TopUpBalanceDialog.tsx`
- [ ] `CreateBountyDialog.tsx`
- [ ] All dialog components with forms

---

### 5.5 Add Character Count to Inputs

**File:** `src/components/ui/textarea-with-count.tsx` (new)

```tsx
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";

interface TextareaWithCountProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxLength?: number;
  showCount?: boolean;
}

export function TextareaWithCount({
  maxLength,
  showCount = true,
  value,
  className,
  ...props
}: TextareaWithCountProps) {
  const length = typeof value === 'string' ? value.length : 0;
  const isNearLimit = maxLength && length > maxLength * 0.9;
  const isOverLimit = maxLength && length > maxLength;

  return (
    <div className="relative">
      <Textarea
        value={value}
        maxLength={maxLength}
        className={cn(
          isOverLimit && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...props}
      />
      {showCount && maxLength && (
        <span className={cn(
          "absolute bottom-2 right-2 text-xs",
          isOverLimit ? "text-destructive" :
          isNearLimit ? "text-amber-500" : "text-muted-foreground"
        )}>
          {length}/{maxLength}
        </span>
      )}
    </div>
  );
}
```

---

## Phase 6: Tables & Data Display

**Priority:** P2
**Timeline:** Week 6-7
**Dependencies:** Phase 5 complete

### 6.1 Create Table Sort Header

**File:** `src/components/ui/table-sort-header.tsx` (new)

```tsx
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "./table";

interface TableSortHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export function TableSortHeader({
  sortable = false,
  sortDirection = null,
  onSort,
  children,
  className,
  ...props
}: TableSortHeaderProps) {
  return (
    <TableHead
      className={cn(
        sortable && "cursor-pointer select-none hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={sortable ? onSort : undefined}
      aria-sort={
        sortDirection === 'asc' ? 'ascending' :
        sortDirection === 'desc' ? 'descending' :
        'none'
      }
      {...props}
    >
      <div className="flex items-center gap-2">
        <span>{children}</span>
        {sortable && (
          <span className="opacity-50">
            {sortDirection === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : sortDirection === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4" />
            )}
          </span>
        )}
      </div>
    </TableHead>
  );
}
```

---

### 6.2 Create Table Pagination Component

**File:** `src/components/ui/table-pagination.tsx` (new)

```tsx
import { Button } from "./button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: TablePaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between py-4">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{startItem}</span> to{" "}
        <span className="font-medium">{endItem}</span> of{" "}
        <span className="font-medium">{totalItems}</span> results
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page = i + 1;
            return (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "ghost"}
                size="sm"
                className="w-8"
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

### 6.3 Standardize Row Hover States

**File:** `src/components/ui/table.tsx`

**Update TableRow:**
```tsx
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & {
    clickable?: boolean;
    selected?: boolean;
  }
>(({ className, clickable, selected, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border/50 transition-colors",
      clickable && "cursor-pointer hover:bg-muted/50",
      selected && "bg-primary/5",
      className
    )}
    {...props}
  />
))
```

---

### 6.4 Create Responsive Table Wrapper

**File:** `src/components/ui/responsive-table.tsx` (new)

```tsx
import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  children: React.ReactNode;
  mobileBreakpoint?: "sm" | "md" | "lg";
  className?: string;
}

export function ResponsiveTable({
  children,
  mobileBreakpoint = "md",
  className
}: ResponsiveTableProps) {
  return (
    <div className={cn(
      "relative overflow-x-auto rounded-lg border",
      className
    )}>
      {/* Scroll indicator gradient */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent opacity-0 transition-opacity peer-hover:opacity-100" />

      {children}
    </div>
  );
}
```

---

## Phase 7: Code Quality & Cleanup

**Priority:** P3
**Timeline:** Week 7-8
**Dependencies:** Phase 6 complete

### 7.1 Consolidate Icon Libraries

**Decision:** Migrate to Lucide React (already used for most icons)

**Step 1: Audit MUI icon usage**
```bash
grep -r "@mui/icons-material" src/components --include="*.tsx" -l
```

**Step 2: Create migration map**

| MUI Icon | Lucide Equivalent |
|----------|-------------------|
| `LocalFireDepartmentIcon` | `Flame` |
| `VerifiedIcon` | `BadgeCheck` |
| `AccessTimeIcon` | `Clock` |
| `NotificationsIcon` | `Bell` |
| `PersonAddIcon` | `UserPlus` |
| `TrendingUpIcon` | `TrendingUp` |
| `EmojiEventsIcon` | `Trophy` |
| `RefreshIcon` | `RefreshCw` |
| `DarkModeIcon` | `Moon` |
| `LightModeIcon` | `Sun` |

**Step 3: Update imports**
```tsx
// BEFORE
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";

// AFTER
import { Flame } from "lucide-react";
```

**Step 4: Update usage**
```tsx
// BEFORE
<LocalFireDepartmentIcon sx={{ fontSize: 12 }} />

// AFTER
<Flame className="h-3 w-3" />
```

---

### 7.2 Migrate Template Literals to cn()

**Pattern to find:**
```tsx
className={`base-class ${conditional && "conditional-class"}`}
```

**Replace with:**
```tsx
className={cn("base-class", conditional && "conditional-class")}
```

**Files to update:**
- [ ] `src/components/countdown-timer.tsx`
- [ ] `src/components/live-indicator.tsx`
- [ ] `src/components/follow-button.tsx`
- [ ] All files using template literals for className

---

### 7.3 Remove Inline Style Objects

**Pattern to find:**
```tsx
style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}
```

**Replace with Tailwind:**
```tsx
className="font-inter tracking-tight"
```

**Files to update:**
- [ ] `src/components/ui/toast.tsx`
- [ ] Various brand components

---

### 7.4 Create ESLint Rules

**File:** `.eslintrc.cjs`

```js
module.exports = {
  // ... existing config
  rules: {
    // Warn on hardcoded colors
    "no-restricted-syntax": [
      "warn",
      {
        selector: "Literal[value=/bg-\\[#|text-\\[#|border-\\[#/]",
        message: "Use design tokens instead of hardcoded colors"
      },
      {
        selector: "Literal[value=/font-\\['/]",
        message: "Use font-inter or font-geist instead of font-['...']"
      },
      {
        selector: "Literal[value=/tracking-\\[-/]",
        message: "Use tracking-tight or tracking-tighter instead of custom values"
      }
    ],
  },
};
```

---

## Testing & Validation Checklist

### Accessibility Testing

- [ ] **Keyboard Navigation**
  - [ ] Tab through all interactive elements
  - [ ] ESC closes modals
  - [ ] Enter activates buttons
  - [ ] Arrow keys work in menus

- [ ] **Screen Reader**
  - [ ] Test with VoiceOver (Mac)
  - [ ] Test with NVDA (Windows)
  - [ ] All images have alt text
  - [ ] All buttons have labels

- [ ] **Color Contrast**
  - [ ] Run axe DevTools audit
  - [ ] Check WCAG AA compliance (4.5:1 for text)
  - [ ] Test with colorblind simulator

### Mobile Testing

- [ ] **Device Testing**
  - [ ] iPhone SE (320px)
  - [ ] iPhone 12/13/14 (390px)
  - [ ] iPhone 12/13/14 Pro Max (428px)
  - [ ] iPad Mini (768px)
  - [ ] Android (various)

- [ ] **Safe Areas**
  - [ ] Content not hidden under notch
  - [ ] Bottom nav not behind home indicator
  - [ ] Landscape mode works

- [ ] **Touch Targets**
  - [ ] All buttons >= 44px
  - [ ] No accidental taps
  - [ ] Adequate spacing between targets

### Visual Regression

- [ ] **Screenshot Comparison**
  - [ ] Homepage
  - [ ] Dashboard (creator mode)
  - [ ] Dashboard (brand mode)
  - [ ] Campaign detail
  - [ ] Settings pages
  - [ ] All dialogs

- [ ] **Dark Mode**
  - [ ] All pages render correctly
  - [ ] No hardcoded light colors
  - [ ] Contrast remains adequate

### Component Testing

- [ ] **Storybook**
  - [ ] All new components documented
  - [ ] All variants shown
  - [ ] Interactive examples work

- [ ] **Unit Tests**
  - [ ] Form validation logic
  - [ ] Utility functions
  - [ ] Custom hooks

---

## Implementation Schedule

| Week | Phase | Focus Area | Deliverables |
|------|-------|------------|--------------|
| 1 | Phase 1.1-1.4 | Critical accessibility | Keyboard trap fix, ARIA labels, safe areas, touch targets |
| 2 | Phase 1.5-1.8 | Mobile fixes | Hover states, focus states, dialog sizing, scrollbars |
| 3 | Phase 2.1-2.3 | Design tokens | Dialog sizes, color migration, font migration |
| 4 | Phase 2.4-2.6 + Phase 3.1-3.2 | Typography + Components | Letter spacing, font sizes, border radius, status badge, empty state |
| 5 | Phase 3.3-3.5 + Phase 4.1-4.2 | Components + Navigation | Button standardization, loading states, breadcrumbs, workspace indicator |
| 6 | Phase 4.3-4.4 + Phase 5.1-5.3 | Navigation + Forms | Tab naming, progress indicators, form validation |
| 7 | Phase 5.4-5.5 + Phase 6.1-6.4 | Forms + Tables | Form reset, character count, table components |
| 8 | Phase 7.1-7.4 | Code quality | Icon consolidation, cn() migration, ESLint rules |

---

## Success Metrics

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Accessibility score (axe) | TBD | 95+ | axe DevTools |
| Lighthouse Performance | TBD | 90+ | Chrome DevTools |
| Lighthouse Accessibility | TBD | 100 | Chrome DevTools |
| Hardcoded colors | 40+ | 0 | grep count |
| Hardcoded fonts | 2,117+ | 0 | grep count |
| Custom border-radius | 18+ | 0 | grep count |
| Dialog size variants | 15+ | 5 | Code audit |
| Touch target violations | 10+ | 0 | Manual testing |

---

## Dependencies & Prerequisites

### Required packages (already installed)
- `class-variance-authority` - For component variants
- `clsx` + `tailwind-merge` - For cn() utility
- `lucide-react` - Icons

### Potential new packages
- `@axe-core/react` - Accessibility testing
- `@storybook/react` - Component documentation (if not installed)

---

## Notes

1. **Incremental deployment**: Each phase can be deployed independently
2. **Feature flags**: Consider using feature flags for major UI changes
3. **A/B testing**: Track user engagement before/after changes
4. **Documentation**: Update CLAUDE.md with new component patterns
5. **Team communication**: Notify team before breaking changes

---

*This plan should be reviewed and updated as implementation progresses.*
