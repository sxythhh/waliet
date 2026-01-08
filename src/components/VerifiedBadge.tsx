import verifiedBadgeIcon from "@/assets/verified-badge.svg";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function VerifiedBadge({ className = "", size = "sm" }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <img 
            src={verifiedBadgeIcon} 
            alt="Verified" 
            className={`inline-block flex-shrink-0 cursor-pointer ${sizeClasses[size]} ${className}`}
          />
        </TooltipTrigger>
        <TooltipContent 
          className="bg-[#0a0a0a] text-white px-3 py-1.5 text-xs font-medium tracking-[-0.5px] font-inter rounded-md shadow-lg border-0"
          sideOffset={4}
        >
          Verified Brand
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
