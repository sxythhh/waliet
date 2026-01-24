import { useMemo, useState } from "react";
import { format, startOfWeek, addDays, subDays, subWeeks, subMonths, isSameDay, isAfter, isBefore, endOfWeek } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
interface SubmissionDay {
  date: Date;
  approved: number;
  pending: number;
  rejected: number;
  tracked: number;
  total: number;
}
interface SubmissionHeatmapProps {
  submissions: Array<{
    submitted_at: string;
    status: string;
    source?: "submitted" | "tracked";
  }>;
  onDateClick?: (date: Date) => void;
  selectedDate?: Date | null;
}
type TimeRange = "week" | "month" | "3months";
export function SubmissionHeatmap({
  submissions,
  onDateClick,
  selectedDate
}: SubmissionHeatmapProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const {
    weeks,
    monthLabels
  } = useMemo(() => {
    const today = new Date();
    const endDate = endOfWeek(addDays(today, 14), {
      weekStartsOn: 0
    });
    let startDate: Date;
    switch (timeRange) {
      case "week":
        startDate = startOfWeek(subWeeks(today, 1), {
          weekStartsOn: 0
        });
        break;
      case "month":
        startDate = startOfWeek(subMonths(today, 1), {
          weekStartsOn: 0
        });
        break;
      case "3months":
        startDate = startOfWeek(subMonths(today, 3), {
          weekStartsOn: 0
        });
        break;
    }

    // Create a map of dates to submission counts
    const submissionMap = new Map<string, SubmissionDay>();
    submissions.forEach(sub => {
      const date = new Date(sub.submitted_at);
      const dateKey = format(date, "yyyy-MM-dd");
      if (!submissionMap.has(dateKey)) {
        submissionMap.set(dateKey, {
          date,
          approved: 0,
          pending: 0,
          rejected: 0,
          tracked: 0,
          total: 0
        });
      }
      const day = submissionMap.get(dateKey)!;
      day.total++;

      // Tracked videos count as pending
      if (sub.source === "tracked") {
        day.pending++;
      } else if (sub.status === "approved") {
        day.approved++;
      } else if (sub.status === "pending") {
        day.pending++;
      } else if (sub.status === "rejected") {
        day.rejected++;
      }
    });

    // Generate weeks array
    const weeks: SubmissionDay[][] = [];
    const monthLabels: {
      label: string;
      weekIndex: number;
    }[] = [];
    let currentDate = startDate;
    let currentWeek: SubmissionDay[] = [];
    let lastMonth = -1;
    while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
      const dayOfWeek = currentDate.getDay();
      const dateKey = format(currentDate, "yyyy-MM-dd");
      const currentMonth = currentDate.getMonth();
      if (currentMonth !== lastMonth && dayOfWeek === 0) {
        monthLabels.push({
          label: format(currentDate, "MMM"),
          weekIndex: weeks.length
        });
        lastMonth = currentMonth;
      }
      const existing = submissionMap.get(dateKey);
      currentWeek.push(existing || {
        date: new Date(currentDate),
        approved: 0,
        pending: 0,
        rejected: 0,
        tracked: 0,
        total: 0
      });
      if (dayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentDate = addDays(currentDate, 1);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    return {
      weeks,
      monthLabels
    };
  }, [submissions, timeRange]);
  const getColorClass = (day: SubmissionDay, isFuture: boolean, isToday: boolean) => {
    if (isFuture) return "bg-muted/20 border border-dashed border-muted-foreground/20";
    if (isToday) {
      if (day.total === 0) return "bg-primary/20 ring-1 ring-primary/40";
      if (day.approved > 0) return "bg-emerald-500/80 ring-1 ring-emerald-400";
      if (day.pending > 0) return "bg-amber-500/70 ring-1 ring-amber-400";
      return "bg-primary/20 ring-1 ring-primary/40";
    }
    if (day.total === 0) return "bg-muted/30";

    // Priority: approved > pending > rejected
    if (day.approved > 0) return "bg-emerald-500/70";
    if (day.pending > 0) return "bg-amber-500/60";
    if (day.rejected > 0) return "bg-red-500/50";
    return "bg-muted/30";
  };

  // Generate a gradient for mixed days
  const getGradientStyle = (day: SubmissionDay, isFuture: boolean): React.CSSProperties | undefined => {
    if (isFuture || day.total === 0) return undefined;
    const hasMultipleTypes = (day.approved > 0 ? 1 : 0) + (day.pending > 0 ? 1 : 0) > 1;
    if (!hasMultipleTypes) return undefined;

    // Create a gradient for mixed days
    const colors: string[] = [];
    if (day.approved > 0) colors.push("rgb(16, 185, 129)");
    if (day.pending > 0) colors.push("rgb(245, 158, 11)");
    if (colors.length === 2) {
      return {
        background: `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`
      };
    }
    return undefined;
  };
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date();
  return <TooltipProvider delayDuration={100}>
      <div className="w-full">
        {/* Time Range Filter */}
        <div className="flex items-center gap-1 mb-3">
          {(["week", "month", "3months"] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={(e) => {
                e.stopPropagation();
                setTimeRange(range);
              }}
              className={cn(
                "h-6 px-2.5 text-[10px] font-medium tracking-[-0.3px] rounded-md transition-colors font-inter",
                timeRange === range 
                  ? "bg-muted text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {range === "week" ? "1W" : range === "month" ? "1M" : "3M"}
            </button>
          ))}
        </div>
        
        {/* Grid */}
        <div className="flex gap-[2px]">
          {/* Day labels */}
          <div className="flex flex-col gap-[2px] pr-1">
            {/* Month label spacer */}
            <div className="h-4" />
            {dayLabels.map((label, idx) => (
              <div key={idx} className="h-[12px] w-4 text-[9px] text-muted-foreground font-medium tracking-[-0.3px] flex items-center justify-end pr-0.5">
                {idx % 2 === 0 ? label : ""}
              </div>
            ))}
          </div>
          
          {/* Weeks with month labels */}
          <div className="flex gap-[2px] flex-1">
            {weeks.map((week, weekIdx) => {
              const monthLabel = monthLabels.find(m => m.weekIndex === weekIdx);
              return (
                <div key={weekIdx} className="flex flex-col gap-[2px] flex-1">
                  {/* Month label row */}
                  <div className="h-4 text-[10px] text-muted-foreground font-medium tracking-[-0.3px] font-inter">
                    {monthLabel?.label || ""}
                  </div>
                  {week.map((day, dayIdx) => {
                    const isFuture = isAfter(day.date, today);
                    const isToday = isSameDay(day.date, today);
                    const isSelected = selectedDate && isSameDay(day.date, selectedDate);
                    const gradientStyle = getGradientStyle(day, isFuture);
                    return (
                      <Tooltip key={dayIdx}>
                        <TooltipTrigger asChild>
                          <div 
                            onClick={e => {
                              e.stopPropagation();
                              if (!isFuture) onDateClick?.(day.date);
                            }} 
                            className={cn(
                              "h-[12px] w-full min-w-[8px] rounded-[3px] transition-all hover:scale-110 cursor-pointer", 
                              !gradientStyle && getColorClass(day, isFuture, isToday)
                            )} 
                            style={{
                              ...gradientStyle,
                              ...(isSelected ? {
                                boxShadow: '0 0 0 2px hsl(var(--primary))',
                                position: 'relative',
                                zIndex: 10
                              } : undefined)
                            }} 
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-background border border-border/40 shadow-md px-2 py-1.5">
                          <p className="text-[10px] text-muted-foreground">
                            {format(day.date, "EEE, MMM d")}
                          </p>
                          {isFuture ? (
                            <p className="text-xs text-foreground/50">Upcoming</p>
                          ) : (
                            <>
                              <p className="text-xs font-medium text-foreground">
                                {day.total} {day.total === 1 ? "video" : "videos"}
                              </p>
                              {day.total > 0 && (
                                <div className="flex flex-col gap-0.5 mt-1 text-[10px]">
                                  {day.approved > 0 && (
                                    <span className="text-emerald-500 flex items-center gap-1">
                                      <span className="h-1 w-1 rounded-[2px] bg-emerald-500" />
                                      {day.approved} approved
                                    </span>
                                  )}
                                  {day.tracked > 0 && (
                                    <span className="text-purple-500 flex items-center gap-1">
                                      <span className="h-1 w-1 rounded-[2px] bg-purple-500" />
                                      {day.tracked} tracked
                                    </span>
                                  )}
                                  {day.pending > 0 && (
                                    <span className="text-amber-500 flex items-center gap-1">
                                      <span className="h-1 w-1 rounded-[2px] bg-amber-500" />
                                      {day.pending} pending
                                    </span>
                                  )}
                                  {day.rejected > 0 && (
                                    <span className="text-red-400 flex items-center gap-1">
                                      <span className="h-1 w-1 rounded-[2px] bg-red-400" />
                                      {day.rejected} rejected
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Legend */}
        
      </div>
    </TooltipProvider>;
}