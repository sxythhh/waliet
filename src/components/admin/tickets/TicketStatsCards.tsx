import { TicketStats, TicketStatus } from "@/types/tickets";
import { cn } from "@/lib/utils";
import { CircleDot, Clock, MessageSquare, CheckCircle, XCircle } from "lucide-react";

interface TicketStatsCardsProps {
  stats: TicketStats;
  activeStatus: TicketStatus | "all";
  onStatusClick: (status: TicketStatus | "all") => void;
}

interface StatCard {
  id: TicketStatus | "all";
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const statCards: StatCard[] = [
  {
    id: "open",
    label: "Open",
    icon: <CircleDot className="h-4 w-4" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "in_progress",
    label: "In Progress",
    icon: <Clock className="h-4 w-4" />,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "awaiting_reply",
    label: "Awaiting Reply",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "resolved",
    label: "Resolved",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "closed",
    label: "Closed",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
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
    <div className="flex items-center gap-1.5 flex-wrap">
      {statCards.map((card) => {
        const count = getCount(card.id);
        const isActive = activeStatus === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onStatusClick(card.id as TicketStatus)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-150 text-sm",
              "hover:ring-1 hover:ring-primary/20",
              isActive
                ? "ring-1 ring-primary bg-background shadow-sm"
                : "bg-muted/30 hover:bg-muted/50"
            )}
          >
            <div className={cn("flex items-center justify-center", card.color)}>
              {card.icon}
            </div>
            <span className="font-semibold tabular-nums">{count}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">{card.label}</span>
          </button>
        );
      })}
    </div>
  );
}
