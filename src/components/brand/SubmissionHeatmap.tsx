import { useMemo, useState } from "react";
import { format, startOfWeek, addDays, subDays, subWeeks, subMonths, isSameDay, isAfter, isBefore, endOfWeek } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface SubmissionDay {
  date: Date;
  approved: number;
  pending: number;
  rejected: number;
  total: number;
}

interface SubmissionHeatmapProps {
  submissions: Array<{
    submitted_at: string;
    status: string;
  }>;
}

type TimeRange = "week" | "month" | "3months";

export function SubmissionHeatmap({ submissions }: SubmissionHeatmapProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const endDate = endOfWeek(addDays(today, 14), { weekStartsOn: 0 }); // Show 2 weeks ahead
    
    let startDate: Date;
    switch (timeRange) {
      case "week":
        startDate = startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
        break;
      case "month":
        startDate = startOfWeek(subMonths(today, 1), { weekStartsOn: 0 });
        break;
      case "3months":
        startDate = startOfWeek(subMonths(today, 3), { weekStartsOn: 0 });
        break;
    }
    
    // Create a map of dates to submission counts
    const submissionMap = new Map<string, SubmissionDay>();
    
    submissions.forEach((sub) => {
      const date = new Date(sub.submitted_at);
      const dateKey = format(date, "yyyy-MM-dd");
      
      if (!submissionMap.has(dateKey)) {
        submissionMap.set(dateKey, {
          date,
          approved: 0,
          pending: 0,
          rejected: 0,
          total: 0,
        });
      }
      
      const day = submissionMap.get(dateKey)!;
      day.total++;
      if (sub.status === "approved") day.approved++;
      else if (sub.status === "pending") day.pending++;
      else if (sub.status === "rejected") day.rejected++;
    });
    
    // Generate weeks array
    const weeks: SubmissionDay[][] = [];
    const monthLabels: { label: string; weekIndex: number }[] = [];
    let currentDate = startDate;
    let currentWeek: SubmissionDay[] = [];
    let lastMonth = -1;
    
    while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
      const dayOfWeek = currentDate.getDay();
      const dateKey = format(currentDate, "yyyy-MM-dd");
      const currentMonth = currentDate.getMonth();
      
      // Track month changes for labels
      if (currentMonth !== lastMonth && dayOfWeek === 0) {
        monthLabels.push({
          label: format(currentDate, "MMM"),
          weekIndex: weeks.length,
        });
        lastMonth = currentMonth;
      }
      
      const existing = submissionMap.get(dateKey);
      currentWeek.push(
        existing || {
          date: new Date(currentDate),
          approved: 0,
          pending: 0,
          rejected: 0,
          total: 0,
        }
      );
      
      if (dayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentDate = addDays(currentDate, 1);
    }
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return { weeks, monthLabels };
  }, [submissions, timeRange]);
  
  const getColorClass = (day: SubmissionDay, isFuture: boolean, isToday: boolean) => {
    if (isFuture) return "bg-muted/20 border border-dashed border-muted-foreground/20";
    if (isToday) return day.total === 0 
      ? "bg-primary/20 ring-1 ring-primary/40" 
      : day.approved > 0 
        ? "bg-emerald-500/80 ring-1 ring-emerald-400" 
        : day.pending > 0 
          ? "bg-amber-500/70 ring-1 ring-amber-400" 
          : "bg-primary/20 ring-1 ring-primary/40";
    if (day.total === 0) return "bg-muted/30";
    if (day.pending > 0 && day.approved === 0) return "bg-amber-500/60";
    if (day.rejected > 0 && day.approved === 0 && day.pending === 0) return "bg-red-500/50";
    if (day.approved > 0) return "bg-emerald-500/70";
    return "bg-muted/30";
  };
  
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date();
  
  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-full">
        {/* Time Range Filter */}
        <div className="flex items-center gap-1 mb-3">
          {(["week", "month", "3months"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant="ghost"
              size="sm"
              onClick={() => setTimeRange(range)}
              className={`h-6 px-2 text-[10px] font-inter tracking-[-0.5px] ${
                timeRange === range 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {range === "week" ? "1W" : range === "month" ? "1M" : "3M"}
            </Button>
          ))}
        </div>
        
        {/* Month labels */}
        <div className="flex mb-1.5 pl-6">
          {monthLabels.map((month, idx) => {
            const cellWidth = 14; // Cell width + gap
            const offset = idx === 0 
              ? month.weekIndex * cellWidth 
              : (month.weekIndex - (monthLabels[idx - 1]?.weekIndex || 0)) * cellWidth;
            return (
              <div
                key={idx}
                className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]"
                style={{ marginLeft: idx === 0 ? offset : offset - 20 }}
              >
                {month.label}
              </div>
            );
          })}
        </div>
        
        {/* Grid */}
        <div className="flex gap-[2px]">
          {/* Day labels */}
          <div className="flex flex-col gap-[2px] pr-1">
            {dayLabels.map((label, idx) => (
              <div
                key={idx}
                className="h-[12px] w-4 text-[9px] text-muted-foreground font-inter tracking-[-0.5px] flex items-center justify-end pr-0.5"
              >
                {idx % 2 === 0 ? label : ""}
              </div>
            ))}
          </div>
          
          {/* Weeks */}
          <div className="flex gap-[2px] flex-1">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[2px]">
                {week.map((day, dayIdx) => {
                  const isFuture = isAfter(day.date, today);
                  const isToday = isSameDay(day.date, today);
                  return (
                    <Tooltip key={dayIdx}>
                      <TooltipTrigger asChild>
                        <div
                          className={`h-[12px] w-[12px] rounded-[3px] transition-all hover:scale-110 cursor-pointer ${getColorClass(day, isFuture, isToday)}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="bg-popover border border-border/60 shadow-lg px-3 py-2"
                      >
                        <div className="font-geist tracking-[-0.5px]">
                          <p className="text-xs text-muted-foreground mb-0.5">
                            {format(day.date, "EEE, MMM d")}
                          </p>
                          {isFuture ? (
                            <p className="text-sm font-medium text-foreground/60">Upcoming</p>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-foreground">
                                {day.total} {day.total === 1 ? "video" : "videos"}
                              </p>
                              {day.total > 0 && (
                                <div className="flex gap-2 mt-1 text-[10px]">
                                  {day.approved > 0 && (
                                    <span className="text-emerald-500">{day.approved} approved</span>
                                  )}
                                  {day.pending > 0 && (
                                    <span className="text-amber-500">{day.pending} pending</span>
                                  )}
                                  {day.rejected > 0 && (
                                    <span className="text-red-400">{day.rejected} rejected</span>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-3 mt-2.5 text-[10px] font-inter tracking-[-0.5px]">
          <div className="flex items-center gap-1">
            <div className="h-[10px] w-[10px] rounded-[2px] bg-muted/30" />
            <span className="text-muted-foreground">None</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-[10px] w-[10px] rounded-[2px] bg-amber-500/60" />
            <span className="text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-500/70" />
            <span className="text-muted-foreground">Approved</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-[10px] w-[10px] rounded-[2px] bg-muted/20 border border-dashed border-muted-foreground/30" />
            <span className="text-muted-foreground">Upcoming</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
