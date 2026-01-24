"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PeakTimeData {
  peakHours: { hour: number; count: number }[];
  peakDays: { day: number; count: number }[];
  heatmap: { day: number; hour: number; count: number }[];
}

interface PeakTimesHeatmapProps {
  data: PeakTimeData;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function PeakTimesHeatmap({ data }: PeakTimesHeatmapProps) {
  // Create a map for quick lookup
  const heatmapMap = new Map<string, number>();
  let maxCount = 0;

  for (const item of data.heatmap) {
    heatmapMap.set(`${item.day}-${item.hour}`, item.count);
    if (item.count > maxCount) maxCount = item.count;
  }

  const getIntensity = (day: number, hour: number): string => {
    const count = heatmapMap.get(`${day}-${hour}`) || 0;
    if (count === 0) return "bg-muted/30";

    const intensity = count / maxCount;
    if (intensity > 0.75) return "bg-primary";
    if (intensity > 0.5) return "bg-primary/70";
    if (intensity > 0.25) return "bg-primary/40";
    return "bg-primary/20";
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return "12am";
    if (hour === 12) return "12pm";
    return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
  };

  // Get top peak times
  const topHours = [...data.peakHours].sort((a, b) => b.count - a.count).slice(0, 3);
  const topDays = [...data.peakDays].sort((a, b) => b.count - a.count).slice(0, 3);

  if (data.heatmap.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Peak Booking Times</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Not enough data yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Peak times will appear as you complete more sessions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Peak Booking Times</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Top Hours</h4>
            <div className="space-y-1">
              {topHours.map((h, i) => (
                <div key={h.hour} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">#{i + 1} {formatHour(h.hour)}</span>
                  <span className="font-medium">{h.count} sessions</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Top Days</h4>
            <div className="space-y-1">
              {topDays.map((d, i) => (
                <div key={d.day} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">#{i + 1} {DAYS[d.day]}</span>
                  <span className="font-medium">{d.count} sessions</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex mb-1">
              <div className="w-12" />
              {HOURS.filter((_, i) => i % 3 === 0).map((hour) => (
                <div key={hour} className="w-4 text-[10px] text-muted-foreground" style={{ marginLeft: hour === 0 ? 0 : '8px' }}>
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            {DAYS.map((day, dayIndex) => (
              <div key={day} className="flex items-center gap-1 mb-1">
                <div className="w-10 text-xs text-muted-foreground">{day}</div>
                {HOURS.map((hour) => (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className={cn(
                      "w-4 h-4 rounded-sm transition-colors",
                      getIntensity(dayIndex, hour)
                    )}
                    title={`${day} ${formatHour(hour)}: ${heatmapMap.get(`${dayIndex}-${hour}`) || 0} sessions`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <span className="text-xs text-muted-foreground">Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted/30" />
            <div className="w-3 h-3 rounded-sm bg-primary/20" />
            <div className="w-3 h-3 rounded-sm bg-primary/40" />
            <div className="w-3 h-3 rounded-sm bg-primary/70" />
            <div className="w-3 h-3 rounded-sm bg-primary" />
          </div>
          <span className="text-xs text-muted-foreground">More</span>
        </div>
      </CardContent>
    </Card>
  );
}
