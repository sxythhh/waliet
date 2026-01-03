import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  variant?: "default" | "primary";
}

export function StatCard({ label, value, subtext, variant = "default" }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 transition-all",
        variant === "primary"
          ? "bg-muted/50"
          : "bg-muted/30"
      )}
    >
      <span className="text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.3px]">{label}</span>
      <p className="text-2xl font-semibold tracking-tight text-foreground mt-2 font-['Inter']">{value}</p>
      {subtext && (
        <p className="text-xs text-muted-foreground mt-1 font-['Inter']">{subtext}</p>
      )}
    </div>
  );
}
