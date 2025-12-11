import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManualMetricsDialogProps {
  campaignId: string;
  brandId: string;
  onSuccess?: () => void;
}

export function ManualMetricsDialog({ campaignId, brandId, onSuccess }: ManualMetricsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState("12:00");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [shares, setShares] = useState("");
  const [bookmarks, setBookmarks] = useState("");
  const [comments, setComments] = useState("");

  const handleSubmit = async () => {
    if (!views && !likes && !shares && !bookmarks && !comments) {
      toast.error("Please enter at least one metric");
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine date and time
      const [hours, minutes] = time.split(":").map(Number);
      const recordedAt = new Date(date);
      recordedAt.setHours(hours, minutes, 0, 0);

      const { error } = await supabase
        .from("campaign_video_metrics")
        .insert({
          campaign_id: campaignId,
          brand_id: brandId,
          total_views: parseInt(views) || 0,
          total_likes: parseInt(likes) || 0,
          total_shares: parseInt(shares) || 0,
          total_bookmarks: parseInt(bookmarks) || 0,
          total_comments: parseInt(comments) || 0,
          total_videos: 0,
          recorded_at: recordedAt.toISOString(),
        });

      if (error) throw error;

      toast.success("Metrics added successfully");
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error("Error adding metrics:", error);
      toast.error("Failed to add metrics");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDate(new Date());
    setTime("12:00");
    setViews("");
    setLikes("");
    setShares("");
    setBookmarks("");
    setComments("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="text-xs">Add Metrics</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="tracking-[-0.5px]">Add Manual Metrics</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Views</Label>
              <Input
                type="number"
                placeholder="0"
                value={views}
                onChange={(e) => setViews(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Likes</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={likes}
                  onChange={(e) => setLikes(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Comments</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Shares</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Bookmarks/Saves</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={bookmarks}
                  onChange={(e) => setBookmarks(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Adding..." : "Add Metrics"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
