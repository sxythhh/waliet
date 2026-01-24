import { TicketStats, TicketStatus } from "@/types/tickets";
import { cn } from "@/lib/utils";

interface TicketStatsCardsProps {
  stats: TicketStats;
  activeStatus: TicketStatus | "all";
  onStatusClick: (status: TicketStatus | "all") => void;
}

interface StatCard {
  id: TicketStatus | "all";
  label: string;
}

const statCards: StatCard[] = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "awaiting_reply", label: "Awaiting" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
];

export function TicketStatsCards({
  stats,
  activeStatus,
  onStatusClick,
}: TicketStatsCardsProps) {
  const getCount = (id: TicketStatus | "all"): number => {
    if (id === "all") return stats.total;
    return stats[id as keyof TicketStats] as number;
  };

  return (
    <div className="flex items-center gap-px border border-border rounded-md overflow-hidden">
      {statCards.map((card, index) => {
        const count = getCount(card.id);
        const isActive = activeStatus === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onStatusClick(card.id as TicketStatus)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 transition-colors text-sm",
              index !== statCards.length - 1 && "border-r border-border",
              isActive
                ? "bg-foreground text-background"
                : "bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="font-medium tabular-nums">{count}</span>
            <span className="text-xs hidden sm:inline">{card.label}</span>
          </button>
        );
      })}
    </div>
  );
}
