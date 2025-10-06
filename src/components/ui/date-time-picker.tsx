import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
}

export function DateTimePicker({ date, onDateChange, placeholder = "Pick a date and time" }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date);
  const [time, setTime] = React.useState<string>(
    date ? format(date, "HH:mm") : "12:00"
  );

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date);
      setTime(format(date, "HH:mm"));
    }
  }, [date]);

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setSelectedDate(undefined);
      onDateChange(undefined);
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    newDate.setHours(hours, minutes, 0, 0);
    setSelectedDate(newDate);
    onDateChange(newDate);
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (selectedDate) {
      const [hours, minutes] = newTime.split(":").map(Number);
      const newDate = new Date(selectedDate);
      newDate.setHours(hours, minutes, 0, 0);
      setSelectedDate(newDate);
      onDateChange(newDate);
    }
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    setTime("12:00");
    onDateChange(undefined);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, "PPP 'at' HH:mm")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            className="pointer-events-auto"
          />
          <div className="border-t pt-3 space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              Time
            </Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full"
            />
          </div>
          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="w-full"
            >
              Clear reminder
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
