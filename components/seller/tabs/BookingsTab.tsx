"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  Clock,
  Video,
  MessageSquare,
  Check,
  X,
  MoreVertical,
  Filter,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isToday, isTomorrow, addDays } from "date-fns";

type BookingStatus = "upcoming" | "completed" | "cancelled" | "pending";

interface Booking {
  id: string;
  clientName: string;
  clientAvatar?: string;
  serviceName: string;
  date: Date;
  duration: number; // in minutes
  price: number;
  status: BookingStatus;
  meetingLink?: string;
}

// Default empty bookings - replace with real API data
const defaultBookings: Booking[] = [];

const statusConfig: Record<BookingStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  upcoming: { label: "Upcoming", variant: "default", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  completed: { label: "Completed", variant: "secondary", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  cancelled: { label: "Cancelled", variant: "destructive", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  pending: { label: "Pending", variant: "outline", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
};

export function BookingsTab() {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [bookings] = useState(defaultBookings);

  const filteredBookings = bookings.filter(
    (booking) => filter === "all" || booking.status === filter
  );

  const formatBookingDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d, yyyy");
  };

  const upcomingCount = bookings.filter((b) => b.status === "upcoming").length;
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Bookings</h2>
          <p className="text-sm text-muted-foreground">
            {upcomingCount} upcoming · {pendingCount} pending approval
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                {filter === "all" ? "All" : statusConfig[filter].label}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter("all")}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("upcoming")}>Upcoming</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("pending")}>Pending</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("completed")}>Completed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("cancelled")}>Cancelled</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {filteredBookings.map((booking) => {
          const status = statusConfig[booking.status];
          return (
            <Card key={booking.id} className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={booking.clientAvatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {booking.clientName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground truncate">
                        {booking.clientName}
                      </h3>
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {booking.serviceName}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatBookingDate(booking.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(booking.date, "h:mm a")} · {booking.duration} min
                      </span>
                      <span className="font-medium text-foreground">
                        ${booking.price}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {booking.status === "upcoming" && booking.meetingLink && (
                      <Button size="sm" className="gap-1.5">
                        <Video className="w-3.5 h-3.5" />
                        Join
                      </Button>
                    )}
                    {booking.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1">
                          <X className="w-3.5 h-3.5" />
                          Decline
                        </Button>
                        <Button size="sm" className="gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Accept
                        </Button>
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message Client
                        </DropdownMenuItem>
                        {booking.status === "upcoming" && (
                          <DropdownMenuItem className="text-destructive">
                            <X className="w-4 h-4 mr-2" />
                            Cancel Booking
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredBookings.length === 0 && (
          <Card className="bg-card border-border/50 border-dashed">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-1">No bookings found</h3>
              <p className="text-sm text-muted-foreground">
                {filter === "all"
                  ? "You don't have any bookings yet"
                  : `No ${filter} bookings`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
