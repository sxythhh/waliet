"use client";

import {
  MdCalendarToday,
  MdSchedule,
  MdVideocam,
  MdCheckCircle,
  MdCancel,
  MdError,
  MdHourglassEmpty,
} from "react-icons/md";
import { cn, formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export type SessionStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "AWAITING_CONFIRMATION"
  | "PAID_OUT"
  | "RATED"
  | "NO_SHOW_BUYER"
  | "NO_SHOW_SELLER"
  | "DISPUTED";

export interface SessionData {
  id: string;
  units: number;
  topic: string;
  scheduledAt: string | null;
  status: SessionStatus;
  meetingUrl: string | null;
  buyer: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  seller: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

const statusConfig: Record<
  SessionStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "success-subtle" | "warning-subtle" | "destructive-subtle";
    icon: typeof MdCheckCircle;
  }
> = {
  REQUESTED: { label: "Pending", variant: "warning-subtle", icon: MdHourglassEmpty },
  ACCEPTED: { label: "Scheduled", variant: "success-subtle", icon: MdCalendarToday },
  DECLINED: { label: "Declined", variant: "destructive-subtle", icon: MdCancel },
  CANCELLED: { label: "Cancelled", variant: "outline", icon: MdCancel },
  IN_PROGRESS: { label: "In Progress", variant: "success", icon: MdVideocam },
  COMPLETED: { label: "Completed", variant: "secondary", icon: MdCheckCircle },
  AWAITING_CONFIRMATION: { label: "Awaiting Confirmation", variant: "warning-subtle", icon: MdSchedule },
  PAID_OUT: { label: "Paid Out", variant: "secondary", icon: MdCheckCircle },
  RATED: { label: "Completed", variant: "secondary", icon: MdCheckCircle },
  NO_SHOW_BUYER: { label: "No Show", variant: "destructive-subtle", icon: MdError },
  NO_SHOW_SELLER: { label: "No Show", variant: "destructive-subtle", icon: MdError },
  DISPUTED: { label: "Disputed", variant: "destructive", icon: MdError },
};

interface SessionCardProps {
  session: SessionData;
  experienceId?: string;
  userId: string;
  onAccept?: () => void;
  onDecline?: () => void;
  onLeaveReview?: () => void;
  className?: string;
  standalone?: boolean; // When true, uses /app paths instead of /experiences
}

export function SessionCard({
  session,
  experienceId,
  userId,
  onAccept,
  onDecline,
  onLeaveReview,
  className,
  standalone,
}: SessionCardProps) {
  const isBuyer = session.buyer.id === userId;
  const otherPerson = isBuyer ? session.seller : session.buyer;
  const config = statusConfig[session.status];
  const StatusIcon = config.icon;

  const hours = session.units / 2;

  return (
    <Card
      variant="interactive"
      className={cn("overflow-hidden", className)}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={otherPerson.avatar || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {otherPerson.name?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Header row with name, role badge, and status */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate">
                    {otherPerson.name || "Anonymous"}
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    {isBuyer ? "You're buying" : "You're selling"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                  {session.topic}
                </p>
              </div>
              {/* Status badge */}
              <Badge variant={config.variant} className="flex items-center gap-1 flex-shrink-0">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>

            {/* Duration and scheduled time */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MdSchedule className="h-4 w-4" />
                {hours} {hours === 1 ? "hour" : "hours"}
              </div>
              {session.scheduledAt && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MdCalendarToday className="h-4 w-4" />
                  {formatDateTime(session.scheduledAt)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Context-aware action buttons */}
        {session.status === "ACCEPTED" && session.meetingUrl && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                <MdVideocam className="h-4 w-4" />
                Join Meeting
              </Button>
            </a>
          </div>
        )}

        {session.status === "REQUESTED" && !isBuyer && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <Button onClick={onAccept}>Accept</Button>
            <Button variant="outline" onClick={onDecline}>
              Decline
            </Button>
          </div>
        )}

        {session.status === "COMPLETED" && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={onLeaveReview}>
              Leave Review
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
