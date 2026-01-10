/**
 * Virality Design System - Color Palette
 * Matches the web app's dark mode theme
 * All colors derived from the web app's CSS variables
 */

export const colors = {
  // Core backgrounds
  background: '#080808',      // hsl(0, 0%, 3%)
  card: '#0a0a0a',           // hsl(0, 0%, 4%)
  elevated: '#0e0e0e',       // hsl(0, 0%, 6%)

  // Text colors
  foreground: '#fafafa',     // hsl(0, 0%, 98%)
  mutedForeground: '#696969', // hsl(0, 0%, 41%)

  // Primary - Discord Blurple
  primary: '#5865F2',        // hsl(235, 86%, 65%)
  primaryGlow: '#7983F5',    // hsl(235, 86%, 75%)
  primaryMuted: 'rgba(88, 101, 242, 0.15)',

  // Secondary
  secondary: '#292929',      // hsl(0, 0%, 16%)
  muted: '#1f1f1f',         // hsl(0, 0%, 12%)

  // Semantic colors
  success: '#22c55e',        // Tailwind green-500
  successMuted: 'rgba(34, 197, 94, 0.15)',

  warning: '#f59e0b',        // Tailwind amber-500
  warningMuted: 'rgba(245, 158, 11, 0.15)',

  destructive: '#ef4444',    // Tailwind red-500
  destructiveMuted: 'rgba(239, 68, 68, 0.15)',

  // Borders
  border: '#141414',         // hsl(0, 0%, 8%)
  borderLight: '#1f1f1f',    // hsl(0, 0%, 12%)

  // Transparent overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  glassBg: 'rgba(88, 101, 242, 0.3)',

  // Rank colors
  rank: {
    bronze: '#cd7f32',       // hsl(30, 60%, 50%)
    silver: '#a0aec0',       // hsl(220, 10%, 70%)
    gold: '#f5c518',         // hsl(45, 93%, 55%)
    platinum: '#00b8d4',     // hsl(190, 80%, 55%)
    elite: '#9f7aea',        // hsl(280, 70%, 60%)
  },

  // Status colors for payments/campaigns
  status: {
    live: '#22c55e',
    pending: '#f59e0b',
    clearing: '#5865F2',
    paid: '#22c55e',
    clawedBack: '#ef4444',
    draft: '#696969',
    completed: '#22c55e',
  },
} as const;

// Typography scale matching web app
export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.5,
  },
} as const;

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

// Border radius scale
export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;
