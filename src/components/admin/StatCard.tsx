import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  variant?: "default" | "primary";
}

export function StatCard({ label, value, subtext, icon: Icon, variant = "default" }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 transition-all",
        variant === "primary"
          ? "bg-card border border-border"
          : "bg-card/50 border border-border/50"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {subtext && (
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      )}
    </div>
  );
}
