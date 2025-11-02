import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.png";
import youtubeLogo from "@/assets/youtube-logo.svg";

interface UploadCampaignVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  approvedCreators: Array<{
    id: string;
    creator_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
    };
  }>;
  onSuccess: () => void;
}

export function UploadCampaignVideoDialog({
  open,
  onOpenChange,
  campaignId,
  approvedCreators,
  onSuccess
}: UploadCampaignVideoDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if it's a video file
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }
      setVideoFile(file);
    }
  };

  const handleUpload = async () => {
    if (!videoFile || !selectedCreatorId || !selectedPlatform) {
      toast.error('Please select a video file, creator, and platform');
      return;
    }

    setUploading(true);
    try {
      // Upload video to storage
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${campaignId}/${crypto.randomUUID()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('campaign-videos')
        .upload(fileName, videoFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-videos')
        .getPublicUrl(fileName);

      // Insert video record
      const { error: insertError } = await supabase
        .from('campaign_videos')
        .insert({
          campaign_id: campaignId,
          creator_id: selectedCreatorId,
          video_url: publicUrl,
          platform: selectedPlatform
        });

      if (insertError) throw insertError;

      toast.success('Video uploaded successfully');
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setSelectedCreatorId("");
      setSelectedPlatform("");
      setVideoFile(null);
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Upload Campaign Video</DialogTitle>
          <DialogDescription className="text-white/60">
            Upload a video and link it to a creator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="creator" className="text-white">Creator</Label>
            <Select value={selectedCreatorId} onValueChange={setSelectedCreatorId}>
              <SelectTrigger className="bg-[#0C0C0C] border-white/10 text-white">
                <SelectValue placeholder="Select a creator" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                {approvedCreators.map((creator) => (
                  <SelectItem
                    key={creator.creator_id}
                    value={creator.creator_id}
                    className="text-white hover:bg-white/5"
                  >
                    {creator.profiles.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video" className="text-white">Video File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="video"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="bg-[#0C0C0C] border-white/10 text-white file:bg-primary file:text-white file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
              />
            </div>
            {videoFile && (
              <p className="text-sm text-white/60">
                Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)}MB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform" className="text-white">Platform</Label>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="bg-[#0C0C0C] border-white/10 text-white">
                <SelectValue placeholder="Select a platform" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="tiktok" className="text-white hover:bg-white/5">
                  <div className="flex items-center gap-2">
                    <img src={tiktokLogo} alt="TikTok" className="w-4 h-4" />
                    <span>TikTok</span>
                  </div>
                </SelectItem>
                <SelectItem value="instagram" className="text-white hover:bg-white/5">
                  <div className="flex items-center gap-2">
                    <img src={instagramLogo} alt="Instagram" className="w-4 h-4" />
                    <span>Instagram</span>
                  </div>
                </SelectItem>
                <SelectItem value="youtube" className="text-white hover:bg-white/5">
                  <div className="flex items-center gap-2">
                    <img src={youtubeLogo} alt="YouTube" className="w-4 h-4" />
                    <span>YouTube</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
            className="bg-transparent border-white/10 text-white hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || !videoFile || !selectedCreatorId || !selectedPlatform}
            className="bg-primary hover:bg-primary/90"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Video
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}