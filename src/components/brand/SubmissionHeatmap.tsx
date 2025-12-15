import { useMemo } from "react";
import { format, startOfWeek, addDays, subMonths, isSameDay, isAfter, isBefore } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  months?: number;
}

export function SubmissionHeatmap({ submissions, months = 6 }: SubmissionHeatmapProps) {
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(subMonths(today, months), { weekStartsOn: 0 });
    const endDate = today;
    
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
  }, [submissions, months]);
  
  const getColorClass = (day: SubmissionDay, isFuture: boolean) => {
    if (isFuture) return "bg-muted/20";
    if (day.total === 0) return "bg-muted/40";
    if (day.pending > 0 && day.approved === 0) return "bg-amber-500/60";
    if (day.rejected > 0 && day.approved === 0 && day.pending === 0) return "bg-red-500/50";
    if (day.approved > 0) return "bg-emerald-500/70";
    return "bg-muted/40";
  };
  
  const dayLabels = ["Sun", "", "Tue", "", "Thu", "", "Sat"];
  
  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-full">
        {/* Month labels */}
        <div className="flex mb-1.5 pl-8">
          {monthLabels.map((month, idx) => (
            <div
              key={idx}
              className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]"
              style={{
                marginLeft: idx === 0 ? 0 : `${(month.weekIndex - (monthLabels[idx - 1]?.weekIndex || 0)) * 12 - 24}px`,
              }}
            >
              {month.label}
            </div>
          ))}
        </div>
        
        {/* Grid */}
        <div className="flex gap-0.5">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 pr-1.5">
            {dayLabels.map((label, idx) => (
              <div
                key={idx}
                className="h-[10px] text-[9px] text-muted-foreground font-inter tracking-[-0.5px] flex items-center"
              >
                {label}
              </div>
            ))}
          </div>
          
          {/* Weeks */}
          <div className="flex gap-0.5 flex-1 overflow-hidden">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-0.5">
                {week.map((day, dayIdx) => {
                  const isFuture = isAfter(day.date, new Date());
                  return (
                    <Tooltip key={dayIdx}>
                      <TooltipTrigger asChild>
                        <div
                          className={`h-[10px] w-[10px] rounded-[2px] transition-all hover:ring-1 hover:ring-foreground/30 cursor-pointer ${getColorClass(day, isFuture)}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="bg-popover border border-border/60 shadow-lg px-3 py-2"
                      >
                        <div className="font-geist tracking-[-0.5px]">
                          <p className="text-sm font-medium text-foreground">
                            {day.total} {day.total === 1 ? "video" : "videos"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(day.date, "EEE, MMM d")}
                          </p>
                          {day.total > 0 && (
                            <div className="flex gap-2 mt-1.5 text-[10px]">
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
        <div className="flex items-center justify-end gap-1.5 mt-2">
          <span className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">Less</span>
          <div className="h-[10px] w-[10px] rounded-[2px] bg-muted/40" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-500/30" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-500/50" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-500/70" />
          <span className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">More</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
