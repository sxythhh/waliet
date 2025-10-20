import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Video } from "lucide-react";
import { UploadCampaignVideoDialog } from "./UploadCampaignVideoDialog";
import { CampaignVideoPlayer } from "./CampaignVideoPlayer";
import { Skeleton } from "@/components/ui/skeleton";

interface VideosTabProps {
  campaignId: string;
  isAdmin: boolean;
  approvedCreators: Array<{
    id: string;
    creator_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
    };
  }>;
}

interface CampaignVideo {
  id: string;
  campaign_id: string;
  creator_id: string;
  video_url: string;
  submission_text: string | null;
  bot_score: number | null;
  estimated_payout: number | null;
  flag_deadline: string | null;
  is_flagged: boolean;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  campaigns: {
    title: string;
    rpm_rate: number;
    budget: number;
  };
}

export function VideosTab({ campaignId, isAdmin, approvedCreators }: VideosTabProps) {
  const [videos, setVideos] = useState<CampaignVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);


  useEffect(() => {
    fetchVideos();
  }, [campaignId]);

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('campaign_videos')
        .select(`
          *,
          campaigns!campaign_videos_campaign_id_fkey (title, rpm_rate, budget)
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately for each video
      const videosWithProfiles = await Promise.all(
        (data || []).map(async (video) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', video.creator_id)
            .single();

          return {
            ...video,
            profiles: profile || { username: 'Unknown', avatar_url: null }
          };
        })
      );

      setVideos(videosWithProfiles as CampaignVideo[]);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      <Card className="bg-card border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Campaign Videos
            </div>
            {isAdmin && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Video
              </Button>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-[#0C0C0C] border-white/5">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="aspect-[9/16] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : videos.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <CampaignVideoPlayer
              key={video.id}
              videoUrl={video.video_url}
              creator={{
                username: video.profiles.username,
                avatar_url: video.profiles.avatar_url
              }}
              campaign={{
                title: video.campaigns.title,
                rpm_rate: video.campaigns.rpm_rate,
                budget: video.campaigns.budget
              }}
              videoData={{
                id: video.id,
                submission_text: video.submission_text,
                bot_score: video.bot_score,
                estimated_payout: video.estimated_payout,
                flag_deadline: video.flag_deadline,
                is_flagged: video.is_flagged
              }}
              isAdmin={isAdmin}
              onFlagUpdate={fetchVideos}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No videos uploaded yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              {isAdmin
                ? 'Upload videos and link them to creators to showcase campaign content'
                : 'Videos will appear here once uploaded by the campaign manager'}
            </p>
            {isAdmin && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Video
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <UploadCampaignVideoDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          campaignId={campaignId}
          approvedCreators={approvedCreators}
          onSuccess={fetchVideos}
        />
      )}
    </div>
  );
}
