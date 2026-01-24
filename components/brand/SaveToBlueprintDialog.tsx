import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookmarkPlus, Loader2 } from "lucide-react";

interface Blueprint {
  id: string;
  title: string;
  example_videos: any;
}

interface VideoData {
  video_url: string;
  thumbnail_url?: string | null;
  platform?: string;
  title?: string;
  description?: string;
  views?: number;
  author_username?: string;
}

interface SaveToBlueprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  video: VideoData;
  onSuccess?: () => void;
}

export function SaveToBlueprintDialog({
  open,
  onOpenChange,
  brandId,
  video,
  onSuccess
}: SaveToBlueprintDialogProps) {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && brandId) {
      fetchBlueprints();
    }
  }, [open, brandId]);

  const fetchBlueprints = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blueprints")
      .select("id, title, example_videos")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching blueprints:", error);
      toast.error("Failed to load blueprints");
    } else {
      setBlueprints(data || []);
      if (data && data.length > 0) {
        setSelectedBlueprintId(data[0].id);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedBlueprintId) {
      toast.error("Please select a blueprint");
      return;
    }

    setSaving(true);
    try {
      // Get current blueprint data
      const selectedBlueprint = blueprints.find(bp => bp.id === selectedBlueprintId);
      const existingVideos = selectedBlueprint?.example_videos || [];

      // Check if video already exists
      const videoExists = existingVideos.some(
        (v: any) => v.video_url === video.video_url
      );

      if (videoExists) {
        toast.error("This video is already saved to this blueprint");
        setSaving(false);
        return;
      }

      // Add new video to the array
      const newVideo = {
        video_url: video.video_url,
        thumbnail_url: video.thumbnail_url || null,
        platform: video.platform || "unknown",
        title: video.title || "",
        description: video.description || "",
        views: video.views || 0,
        author: video.author_username || "",
        note: note || "",
        added_at: new Date().toISOString(),
        source: "submission"
      };

      const updatedVideos = [...existingVideos, newVideo];

      // Update blueprint
      const { error } = await supabase
        .from("blueprints")
        .update({ example_videos: updatedVideos })
        .eq("id", selectedBlueprintId);

      if (error) throw error;

      toast.success("Video saved to blueprint");
      onSuccess?.();
      onOpenChange(false);
      setNote("");
    } catch (error: any) {
      console.error("Error saving video to blueprint:", error);
      toast.error(error.message || "Failed to save video");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-inter tracking-[-0.5px]">
            <BookmarkPlus className="h-5 w-5 text-primary" />
            Save to Blueprint
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.5px] text-sm">
            Add this video as an example to one of your blueprints
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Video Preview */}
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt=""
                className="w-20 h-14 object-cover rounded"
              />
            ) : (
              <div className="w-20 h-14 bg-muted rounded flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No preview</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {video.title || "Untitled Video"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {video.author_username ? `@${video.author_username}` : video.platform || "Unknown"}
              </p>
              {video.views !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {video.views.toLocaleString()} views
                </p>
              )}
            </div>
          </div>

          {/* Blueprint Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
              Select Blueprint
            </Label>
            {loading ? (
              <div className="h-10 bg-muted/40 rounded-lg animate-pulse" />
            ) : blueprints.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                No blueprints found. Create a blueprint first.
              </p>
            ) : (
              <Select value={selectedBlueprintId} onValueChange={setSelectedBlueprintId}>
                <SelectTrigger className="h-10 bg-muted/40 border-0 font-inter tracking-[-0.5px]">
                  <SelectValue placeholder="Select a blueprint" />
                </SelectTrigger>
                <SelectContent>
                  {blueprints.map(bp => (
                    <SelectItem key={bp.id} value={bp.id}>
                      {bp.title}
                      {bp.example_videos && bp.example_videos.length > 0 && (
                        <span className="ml-2 text-muted-foreground">
                          ({bp.example_videos.length} videos)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
              Note (optional)
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why is this a good example?"
              className="min-h-[80px] bg-muted/40 border-0 font-inter tracking-[-0.5px] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-inter tracking-[-0.5px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !selectedBlueprintId || blueprints.length === 0}
            className="font-inter tracking-[-0.5px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <BookmarkPlus className="h-4 w-4 mr-2" />
                Save to Blueprint
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
