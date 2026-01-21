import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Clock, Bookmark, BookmarkCheck, Building2 } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatDistanceToNow } from "date-fns";
import type { TaskWithBusiness } from "@/hooks/useTasks";

interface TaskCardProps {
  task: TaskWithBusiness;
  isBookmarked?: boolean;
  hasApplied?: boolean;
  onClick?: () => void;
  onBookmarkClick?: (e: React.MouseEvent) => void;
}

export function TaskCard({
  task,
  isBookmarked = false,
  hasApplied = false,
  onClick,
  onBookmarkClick,
}: TaskCardProps) {
  const isEnded = task.status === "completed" || task.status === "cancelled";
  const isFull = task.max_participants > 0 && task.current_participants >= task.max_participants;
  const spotsRemaining = task.max_participants > 0
    ? task.max_participants - (task.current_participants || 0)
    : null;

  const formatReward = (amount: number | null) => {
    if (!amount) return "Negotiable";
    return `$${amount.toLocaleString()}`;
  };

  return (
    <Card
      className={`
        group cursor-pointer transition-all duration-200 hover:shadow-md
        ${isEnded ? "opacity-60" : ""}
        ${hasApplied ? "ring-2 ring-primary/20" : ""}
      `}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Business info */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {task.businesses?.logo_url ? (
              <OptimizedImage
                src={task.businesses.logo_url}
                alt={task.businesses.name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium truncate">
                  {task.businesses?.name || "Unknown"}
                </span>
                {task.businesses?.is_verified && (
                  <VerifiedBadge size="sm" />
                )}
              </div>
            </div>
          </div>

          {/* Bookmark button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onBookmarkClick?.(e);
            }}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Task title and description */}
        <div>
          <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {task.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{task.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {/* Reward */}
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="font-medium text-foreground">
              {formatReward(task.reward_amount)}
            </span>
          </div>

          {/* Spots */}
          {spotsRemaining !== null && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{spotsRemaining} spots left</span>
            </div>
          )}

          {/* Time */}
          {task.created_at && (
            <div className="flex items-center gap-1 ml-auto">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">
                {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          {hasApplied && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Applied
            </Badge>
          )}
          {isEnded && (
            <Badge variant="secondary" className="text-xs">
              {task.status === "completed" ? "Completed" : "Cancelled"}
            </Badge>
          )}
          {isFull && !isEnded && (
            <Badge variant="secondary" className="text-xs">
              Full
            </Badge>
          )}
          {task.task_type && task.task_type !== "one_time" && (
            <Badge variant="outline" className="text-xs capitalize">
              {task.task_type.replace("_", " ")}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
