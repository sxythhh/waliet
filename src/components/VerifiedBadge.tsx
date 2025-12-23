import verifiedBadgeIcon from "@/assets/verified-badge.svg";

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
    <img 
      src={verifiedBadgeIcon} 
      alt="Verified" 
      className={`inline-block flex-shrink-0 ${sizeClasses[size]} ${className}`}
      title="Verified Brand"
    />
  );
}
