import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Phone, Mail, StickyNote, Calendar } from "lucide-react";

import { useLogActivity } from "@/hooks/useCloseActivities";

interface ActivityLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName: string;
}

type ActivityType = "call" | "email" | "note" | "meeting";

export function ActivityLogDialog({
  open,
  onOpenChange,
  brandId,
  brandName,
}: ActivityLogDialogProps) {
  const [activityType, setActivityType] = useState<ActivityType>("note");
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [direction, setDirection] = useState<"inbound" | "outbound">("outbound");
  const [durationMinutes, setDurationMinutes] = useState("");

  const logActivity = useLogActivity();
  const isSubmitting = logActivity.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!note.trim()) return;

    logActivity.mutate(
      {
        brand_id: brandId,
        activity_type: activityType,
        note: note.trim(),
        subject: subject.trim() || undefined,
        direction: activityType === "note" ? undefined : direction,
        duration_seconds: durationMinutes ? parseInt(durationMinutes) * 60 : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          // Reset form
          setActivityType("note");
          setSubject("");
          setNote("");
          setDirection("outbound");
          setDurationMinutes("");
        },
      }
    );
  };

  const activityTypes: { type: ActivityType; icon: React.ReactNode; label: string }[] = [
    { type: "note", icon: <StickyNote className="h-4 w-4" />, label: "Note" },
    { type: "call", icon: <Phone className="h-4 w-4" />, label: "Call" },
    { type: "email", icon: <Mail className="h-4 w-4" />, label: "Email" },
    { type: "meeting", icon: <Calendar className="h-4 w-4" />, label: "Meeting" },
  ];

  const showDirection = activityType === "call" || activityType === "email";
  const showDuration = activityType === "call" || activityType === "meeting";
  const showSubject = activityType === "email" || activityType === "meeting";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">
            Log Activity
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground font-inter tracking-[-0.5px] mb-2">
          {brandName}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Activity Type */}
          <div className="grid grid-cols-4 gap-2">
            {activityTypes.map(({ type, icon, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => setActivityType(type)}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 rounded-lg transition-colors font-inter tracking-[-0.5px]",
                  activityType === type
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {icon}
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>

          {/* Direction (for calls and emails) */}
          {showDirection && (
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Direction</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={direction === "outbound" ? "default" : "outline"}
                  className="flex-1 h-10 font-inter tracking-[-0.5px]"
                  onClick={() => setDirection("outbound")}
                >
                  Outbound
                </Button>
                <Button
                  type="button"
                  variant={direction === "inbound" ? "default" : "outline"}
                  className="flex-1 h-10 font-inter tracking-[-0.5px]"
                  onClick={() => setDirection("inbound")}
                >
                  Inbound
                </Button>
              </div>
            </div>
          )}

          {/* Subject (for emails and meetings) */}
          {showSubject && (
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">
                {activityType === "email" ? "Subject" : "Title"}
              </Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={activityType === "email" ? "Email subject..." : "Meeting title..."}
                className="h-10 font-inter tracking-[-0.5px]"
              />
            </div>
          )}

          {/* Duration (for calls and meetings) */}
          {showDuration && (
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px]">Duration (minutes)</Label>
              <Input
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="0"
                className="h-10 font-inter tracking-[-0.5px]"
              />
            </div>
          )}

          {/* Note / Body */}
          <div className="space-y-2">
            <Label className="font-inter tracking-[-0.5px]">
              {activityType === "email" ? "Body" : activityType === "note" ? "Note" : "Notes"}
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                activityType === "email"
                  ? "Email content..."
                  : activityType === "call"
                  ? "Call summary..."
                  : activityType === "meeting"
                  ? "Meeting notes..."
                  : "Write a note..."
              }
              rows={4}
              className="font-inter tracking-[-0.5px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !note.trim()}>
              {isSubmitting ? "Logging..." : "Log Activity"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
