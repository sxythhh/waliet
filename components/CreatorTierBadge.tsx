import { Crown, Star, Trophy, Award, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatorTierBadgeProps {
  tierName: string;
  tierLevel: number;
  tierColor: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function CreatorTierBadge({
  tierName,
  tierLevel,
  tierColor,
  size = "md",
  showLabel = true,
  className,
}: CreatorTierBadgeProps) {
  const getTierIcon = () => {
    const iconClass = cn(
      size === "sm" && "h-3 w-3",
      size === "md" && "h-4 w-4",
      size === "lg" && "h-5 w-5"
    );

    switch (tierLevel) {
      case 1:
        return <Award className={iconClass} />;
      case 2:
        return <Star className={iconClass} />;
      case 3:
        return <Trophy className={iconClass} />;
      case 4:
        return <Crown className={iconClass} />;
      default:
        return <Sparkles className={iconClass} />;
    }
  };

  const sizeClasses = {
    sm: "h-6 px-2 text-[10px] gap-1",
    md: "h-7 px-2.5 text-xs gap-1.5",
    lg: "h-8 px-3 text-sm gap-2",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-medium font-inter tracking-[-0.5px]",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `${tierColor}20`,
        color: tierColor,
      }}
    >
      {getTierIcon()}
      {showLabel && <span>{tierName}</span>}
    </div>
  );
}
