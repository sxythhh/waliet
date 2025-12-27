import { cn } from "@/lib/utils";
import { Crown, Shield, Star, Award, Zap } from "lucide-react";
export type RankType = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Elite';
interface RankBadgeProps {
  rank: RankType;
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
  className?: string;
}
const rankConfig: Record<RankType, {
  icon: React.ComponentType<{
    className?: string;
  }>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  glowClass?: string;
}> = {
  Bronze: {
    icon: Shield,
    colorClass: "text-[hsl(var(--rank-bronze))]",
    bgClass: "bg-[hsl(var(--rank-bronze)/0.1)]",
    borderClass: "border-[hsl(var(--rank-bronze)/0.3)]"
  },
  Silver: {
    icon: Star,
    colorClass: "text-[hsl(var(--rank-silver))]",
    bgClass: "bg-[hsl(var(--rank-silver)/0.1)]",
    borderClass: "border-[hsl(var(--rank-silver)/0.3)]"
  },
  Gold: {
    icon: Award,
    colorClass: "text-[hsl(var(--rank-gold))]",
    bgClass: "bg-[hsl(var(--rank-gold)/0.1)]",
    borderClass: "border-[hsl(var(--rank-gold)/0.3)]"
  },
  Platinum: {
    icon: Zap,
    colorClass: "text-[hsl(var(--rank-platinum))]",
    bgClass: "bg-[hsl(var(--rank-platinum)/0.1)]",
    borderClass: "border-[hsl(var(--rank-platinum)/0.3)]"
  },
  Elite: {
    icon: Crown,
    colorClass: "text-[hsl(var(--rank-elite))]",
    bgClass: "bg-[hsl(var(--rank-elite)/0.15)]",
    borderClass: "border-[hsl(var(--rank-elite)/0.4)]",
    glowClass: "shadow-[0_0_12px_hsl(var(--rank-elite)/0.3)]"
  }
};
const sizeConfig = {
  sm: {
    container: "h-5 px-1.5 gap-1 text-xs",
    icon: "h-3 w-3"
  },
  md: {
    container: "h-6 px-2 gap-1.5 text-sm",
    icon: "h-3.5 w-3.5"
  },
  lg: {
    container: "h-8 px-3 gap-2 text-base",
    icon: "h-4 w-4"
  }
};
export function RankBadge({
  rank,
  level,
  size = 'md',
  showLevel = true,
  className
}: RankBadgeProps) {
  const config = rankConfig[rank];
  const sizeStyles = sizeConfig[size];
  return <div className={cn("inline-flex items-center rounded-full font-semibold", config.bgClass, config.colorClass, config.glowClass, sizeStyles.container, className)}>
      <span>{rank}</span>
    </div>;
}

// Progress bar component for XP
interface XPProgressBarProps {
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  rank: RankType;
  level: number;
  className?: string;
}
export function XPProgressBar({
  currentXP,
  xpForCurrentLevel,
  xpForNextLevel,
  rank,
  level,
  className
}: XPProgressBarProps) {
  const xpIntoLevel = currentXP - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progress = Math.min(xpIntoLevel / xpNeeded * 100, 100);
  const config = rankConfig[rank];
  return <div className={cn("w-full", className)}>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span style={{
        color: `hsl(var(--rank-${rank.toLowerCase()}))`
      }} className="font-medium text-primary-foreground">
          Level {level}
        </span>
        <span>{currentXP.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", config.bgClass.replace('/0.1', ''))} style={{
        width: `${progress}%`,
        backgroundColor: `hsl(var(--rank-${rank.toLowerCase()}))`
      }} />
      </div>
    </div>;
}

// Helper to format XP
export function formatXP(xp: number): string {
  if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`;
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
  return xp.toString();
}