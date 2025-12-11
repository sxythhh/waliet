import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ManualMetricsDialogProps {
  campaignId: string;
  brandId: string;
  onSuccess?: () => void;
}

interface MetricEntry {
  id: string;
  recorded_at: string;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_bookmarks: number;
}

export function ManualMetricsDialog({ campaignId, brandId, onSuccess }: ManualMetricsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState("12:00");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [shares, setShares] = useState("");
  const [bookmarks, setBookmarks] = useState("");
  const [comments, setComments] = useState("");
  const [entries, setEntries] = useState<MetricEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEntries();
    }
  }, [open, campaignId]);

  const fetchEntries = async () => {
    setIsLoadingEntries(true);
    try {
      const { data, error } = await supabase
        .from("campaign_video_metrics")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("recorded_at", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching metrics entries:", error);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  const handleSubmit = async () => {
    if (!views && !likes && !shares && !bookmarks && !comments) {
      toast.error("Please enter at least one metric");
      return;
    }

    setIsSubmitting(true);
    try {
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
      resetForm();
      fetchEntries();
      onSuccess?.();
    } catch (error) {
      console.error("Error adding metrics:", error);
      toast.error("Failed to add metrics");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      const { error } = await supabase
        .from("campaign_video_metrics")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Metric entry deleted");
      fetchEntries();
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting metric:", error);
      toast.error("Failed to delete metric");
    } finally {
      setIsDeleting(null);
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="text-xs">Add Metrics</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="tracking-[-0.5px]">Manage Metrics</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="add" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="add" className="text-xs">Add New</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History ({entries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="history" className="space-y-2">
            {isLoadingEntries ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No metric entries yet</div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium tracking-[-0.5px]">
                        {format(new Date(entry.recorded_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatNumber(entry.total_views)} views</span>
                        <span>•</span>
                        <span>{formatNumber(entry.total_likes)} likes</span>
                        <span>•</span>
                        <span>{formatNumber(entry.total_shares)} shares</span>
                        <span>•</span>
                        <span>{formatNumber(entry.total_bookmarks)} saves</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry.id)}
                      disabled={isDeleting === entry.id}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
