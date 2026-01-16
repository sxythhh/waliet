// UI Components - React Native equivalents of shadcn/ui
// Following the same patterns as the web app

// Button
export { Button } from './button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './button';

// Card
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';
export type {
  CardProps,
  CardVariant,
  CardHeaderProps,
  CardHeaderSpacing,
  CardHeaderPadding,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardContentPadding,
  CardFooterProps,
  CardFooterJustify,
} from './card';

// Badge
export { Badge } from './badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './badge';

// Input
export { Input, TextArea } from './input';
export type { InputProps, TextAreaProps } from './input';

// Avatar
export { Avatar, AvatarGroup } from './avatar';
export type { AvatarProps, AvatarSize, AvatarGroupProps } from './avatar';

// Skeleton
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
} from './skeleton';
export type {
  SkeletonProps,
  SkeletonTextProps,
  SkeletonCardProps,
  SkeletonAvatarProps,
} from './skeleton';

// Separator
export { Separator } from './separator';
export type { SeparatorProps, SeparatorOrientation } from './separator';

// Progress
export { Progress, CircularProgress } from './progress';
export type { ProgressProps, ProgressVariant, CircularProgressProps } from './progress';

// Switch
export { Switch } from './switch';
export type { SwitchProps } from './switch';

// Empty State
export { EmptyState } from './empty-state';
export type { EmptyStateProps } from './empty-state';
