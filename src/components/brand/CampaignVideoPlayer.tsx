import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Maximize, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import tiktokLogo from "@/assets/tiktok-logo.svg";
interface CampaignVideoPlayerProps {
  videoUrl: string;
  creator: {
    username: string;
    avatar_url: string | null;
  };
  campaign: {
    title: string;
    rpm_rate: number;
    budget: number;
  };
  videoData: {
    id: string;
    submission_text: string | null;
    bot_score: number | null;
    estimated_payout: number | null;
    flag_deadline: string | null;
    is_flagged: boolean;
  };
  isAdmin: boolean;
  onFlagUpdate: () => void;
}
export function CampaignVideoPlayer({
  videoUrl,
  creator,
  campaign,
  videoData,
  isAdmin,
  onFlagUpdate
}: CampaignVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };
  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };
  const handleFlagSubmission = async () => {
    try {
      const {
        error
      } = await supabase.from('campaign_videos').update({
        is_flagged: !videoData.is_flagged
      }).eq('id', videoData.id);
      if (error) throw error;
      toast.success(videoData.is_flagged ? 'Flag removed' : 'Video flagged');
      onFlagUpdate();
    } catch (error) {
      console.error('Error flagging video:', error);
      toast.error('Failed to flag video');
    }
  };
  const getDaysUntilDeadline = () => {
    if (!videoData.flag_deadline) return null;
    const deadline = new Date(videoData.flag_deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  const daysUntilDeadline = getDaysUntilDeadline();
  return <div className="bg-[#0C0C0C] rounded-2xl overflow-hidden">
      {/* Video Player */}
      <div ref={containerRef} className="relative bg-black aspect-[9/16] max-w-[350px] mx-auto">
        <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" loop playsInline muted={isMuted} onClick={togglePlay} />
        
        {/* Play Button Overlay */}
        {!isPlaying && <div className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30" onClick={togglePlay}>
            <div className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-2xl">
              <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-black border-b-[12px] border-b-transparent ml-1"></div>
            </div>
          </div>}

        {/* TikTok Logo */}
        <div className="absolute top-4 left-4">
          <img src={tiktokLogo} alt="TikTok" className="w-8 h-8" />
        </div>

        {/* Controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={toggleMute} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors">
            {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
          </button>
          <button onClick={toggleFullscreen} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors">
            <Maximize className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Creator Info */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {creator.avatar_url ? <img src={creator.avatar_url} alt={creator.username} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {creator.username.charAt(0).toUpperCase()}
                </span>
              </div>}
            <div>
              <p className="font-semibold text-white text-sm">{creator.username}</p>
              <p className="text-xs text-white/60">@{creator.username.toLowerCase()}</p>
            </div>
          </div>
          {videoData.bot_score !== null && <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-base px-2.5 py-0.5">
              {videoData.bot_score}
            </Badge>}
        </div>

        {/* Campaign Info */}
        

        {/* Submission Info */}
        {videoData.submission_text}

        {/* Deadline */}
        {daysUntilDeadline !== null && <div className="flex justify-between items-center pt-3 border-t border-white/5">
            <p className="font-semibold text-white text-sm">{daysUntilDeadline} days</p>
          </div>}

        {/* Flag Button (Admin Only) */}
        {isAdmin}
      </div>
    </div>;
}