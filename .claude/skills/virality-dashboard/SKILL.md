# Virality Dashboard Design System

This skill defines the design patterns, tokens, and component styles used in the Virality dashboard for both creator and brand interfaces.

## Color Palette

### Light Mode
| Token | Value | Usage |
|-------|-------|-------|
| Background | `hsl(210 14% 97%)` | Page background |
| Foreground | `hsl(224 71% 4%)` | Primary text |
| Card | `hsl(0 0% 100%)` | Card backgrounds |
| Muted | `hsl(220 14% 96%)` | Subtle backgrounds |
| Muted Foreground | `hsl(220 9% 46%)` | Secondary text |
| Border | `hsl(220 13% 87%)` | Borders |

### Dark Mode
| Token | Value | Usage |
|-------|-------|-------|
| Background | `hsl(0 0% 3%)` | Page background |
| Foreground | `hsl(210 40% 98%)` | Primary text |
| Card | `hsl(0 0% 3%)` | Card backgrounds |
| Muted | `hsl(0 0% 12%)` | Subtle backgrounds |
| Muted Foreground | `hsl(0 0% 41%)` | Secondary text |
| Border | `hsl(0 0% 8%)` | Borders |

### Accent Colors
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `hsl(235 86% 65%)` | Discord Blurple - buttons, links |
| Primary Glow | `hsl(235 86% 75%)` | Hover states, glows |
| Success | `hsl(145 63% 49%)` | Approved, live status |
| Warning | `hsl(45 93% 58%)` | Pending, caution |
| Destructive | `hsl(0 72% 59%)` | Errors, rejected |

### Status Colors Pattern
```tsx
// Success/Approved
className="text-green-500" // icon
className="bg-green-500/10 text-green-600 dark:text-green-400" // badge

// Warning/Pending
className="text-yellow-500" // icon
className="bg-orange-500/10 text-orange-600 dark:text-orange-400" // badge

// Error/Rejected
className="text-red-500" // icon
className="bg-red-500/10 text-red-600 dark:text-red-400" // badge

// Info
className="bg-blue-500/10 text-blue-600 dark:text-blue-400" // badge
```

## Typography

### Font Families
- **Primary UI**: `font-inter` - All body text, labels, buttons
- **Headings**: `font-geist` - h1, h2, h3, stat values

### Font Sizes
| Class | Size | Usage |
|-------|------|-------|
| `text-2xs` | 10px | Tiny labels |
| `text-xs` | 12px | Labels, badges, small text |
| `text-sm` | 14px | Body text, buttons |
| `text-base` | 16px | Standard text |
| `text-lg` | 18px | Section headers |
| `text-xl` | 20px | Page headers |
| `text-2xl` | 24px | Main headings |

### Letter Spacing (Critical)
Always use negative tracking for sharp, modern look:
```tsx
// Standard body text and labels
className="font-inter tracking-[-0.5px]"

// Secondary/smaller text
className="font-inter tracking-[-0.3px]"

// Headings
className="font-semibold tracking-[-0.5px]"
```

### Font Weight Patterns
```tsx
// Headings
className="text-xl font-semibold font-inter tracking-[-0.5px]"

// Section headers
className="text-lg font-semibold font-inter tracking-[-0.5px]"

// Labels
className="text-sm font-medium font-inter tracking-[-0.5px]"

// Body text
className="text-sm text-muted-foreground font-inter tracking-[-0.3px]"

// Small labels
className="text-xs font-medium text-muted-foreground tracking-[-0.3px]"
```

## Border Radius

| Class | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Small elements |
| `rounded-md` | 6px | Inputs |
| `rounded-lg` | 10px | **Most common** - cards, buttons |
| `rounded-xl` | 14px | Card containers |
| `rounded-2xl` | 18px | Large cards, avatars |
| `rounded-full` | 9999px | Pills, badges, avatars |

## Spacing

### Page Layout Padding
```tsx
className="px-4 sm:px-6 md:px-8 py-6"
```

### Card Padding
```tsx
className="p-3"  // Compact
className="p-4"  // Standard
className="p-5"  // Spacious
```

### Gap Patterns
```tsx
className="gap-1"   // 4px - tight
className="gap-2"   // 8px - standard (most common)
className="gap-3"   // 12px - relaxed
className="gap-4"   // 16px - spacious
```

### Vertical Spacing
```tsx
className="space-y-2"  // 8px between items
className="space-y-3"  // 12px between items
className="space-y-4"  // 16px between sections
className="space-y-6"  // 24px major separation
```

## Component Patterns

### Cards
```tsx
// Standard card
className="rounded-xl border border-border/50 bg-card"

// Hoverable card
className="rounded-xl border border-border/50 bg-card hover:border-border transition-all duration-200"

// Card with dark mode specific
className="bg-card dark:bg-[#0e0e0e] border border-border/50 rounded-xl"

// Subtle background card
className="bg-muted/30 dark:bg-muted/20 rounded-xl p-4"
```

### Buttons
```tsx
// Primary button
className="bg-primary text-primary-foreground hover:bg-primary/90 border-t border-primary/70 rounded-lg font-inter text-sm font-medium tracking-[-0.5px]"

// With icon
className="gap-2 px-4 py-2"

// Ghost button
className="hover:bg-accent hover:text-accent-foreground"

// Icon button
className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all"
```

### Badges
```tsx
// Standard badge
className="px-2 py-0.5 rounded-full text-xs font-medium"

// Status badge with color
className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full tracking-[-0.3px]"

// Tiny badge
className="px-2 py-1 rounded-full text-[10px] font-medium"
```

### Inputs
```tsx
className="flex h-12 w-full rounded-lg bg-muted/50 dark:bg-[#0f0f0f] px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none"
```

### Empty States
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
    <Icon className="h-6 w-6 text-muted-foreground/60" />
  </div>
  <h3 className="font-inter tracking-[-0.5px] font-medium text-foreground">
    No items yet
  </h3>
  <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1">
    Description text here
  </p>
</div>
```

### Loading Skeletons
```tsx
className="rounded-md skeleton-shimmer"
// or
className="animate-pulse bg-muted rounded"
```

## Layout Patterns

### Grid Systems
```tsx
// 3-column responsive grid
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"

// 2-column grid
className="grid grid-cols-1 md:grid-cols-2 gap-4"

// 4-column stats
className="grid grid-cols-2 sm:grid-cols-4 gap-3"
```

### Flex Layouts
```tsx
// Row to column on mobile
className="flex flex-col sm:flex-row gap-3"

// Centered content
className="flex items-center justify-center"

// Space between
className="flex items-center justify-between"
```

### Responsive Visibility
```tsx
className="hidden sm:flex"      // Hide on mobile
className="sm:hidden"           // Show only on mobile
className="hidden md:block"     // Show on desktop only
```

## Transitions & Animations

### Standard Transitions
```tsx
className="transition-all duration-200 ease-out"
className="transition-colors duration-200"
className="transition-opacity duration-300"
```

### Hover States
```tsx
className="hover:bg-muted/30 dark:hover:bg-muted/70"
className="group-hover:opacity-100"
className="hover:border-border"
```

## Shadows
```tsx
// Card shadow
className="shadow-sm"

// Elevated
className="shadow-md"

// Primary glow (dark mode)
style={{ boxShadow: '0 0 40px hsl(235 86% 65% / 0.2)' }}
```

## Dark Mode Patterns

Always use Tailwind's `dark:` prefix for dark mode variants:
```tsx
className="bg-white dark:bg-[#0e0e0e]"
className="bg-muted/30 dark:bg-muted/20"
className="text-gray-600 dark:text-gray-400"
className="border-border dark:border-transparent"
```

### Dark Mode Detection
```tsx
import { useTheme } from "@/components/ThemeProvider";

const { resolvedTheme } = useTheme();
const isDarkMode = resolvedTheme === "dark";
```

## Icons

Use Lucide React icons with consistent sizing:
```tsx
<Icon className="h-4 w-4" />   // Small
<Icon className="h-5 w-5" />   // Standard
<Icon className="h-6 w-6" />   // Large
```

## Best Practices

1. **Always use `font-inter tracking-[-0.5px]`** for body text
2. **Use `rounded-lg`** as the default border radius
3. **Use `border-border/50`** for subtle borders
4. **Use `bg-muted/30 dark:bg-muted/20`** for subtle backgrounds
5. **Use `gap-2` or `gap-3`** for flex/grid spacing
6. **Use `space-y-3` or `space-y-4`** for vertical content spacing
7. **Always include dark mode variants** with `dark:` prefix
8. **Use `transition-all duration-200`** for smooth interactions
