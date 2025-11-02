import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Maximize, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Diamond } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo.png";
import youtubeLogo from "@/assets/youtube-logo.png";

const getTrustScoreDiamonds = (score: number) => {
  if (score < 20) {
    return { count: 1, color: 'fill-red-500 text-red-500' };
  } else if (score < 40) {
    return { count: 2, color: 'fill-red-500 text-red-500' };
  } else if (score < 60) {
    return { count: 3, color: 'fill-yellow-500 text-yellow-500' };
  } else if (score < 80) {
    return { count: 4, color: 'fill-yellow-500 text-yellow-500' };
  } else if (score < 100) {
    return { count: 4, color: 'fill-emerald-500 text-emerald-500' };
  } else {
    return { count: 5, color: 'fill-emerald-500 text-emerald-500' };
  }
};

interface CampaignVideoPlayerProps {
  videoUrl: string;
  creatorId: string;
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
    platform?: string;
  };
  isAdmin: boolean;
  onFlagUpdate: () => void;
}
export function CampaignVideoPlayer({
  videoUrl,
  creatorId,
  creator,
  campaign,
  videoData,
  isAdmin,
  onFlagUpdate
}: CampaignVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleUserClick = async () => {
    try {
      // Fetch full user data with social accounts
      const {
        data: profile,
        error
      } = await supabase.from('profiles').select(`
          *,
          social_accounts (*)
        `).eq('id', creatorId).single();
      if (error) throw error;

      // Fetch submission data for this campaign if needed
      const {
        data: submission
      } = await supabase.from('campaign_submissions').select('status, submitted_at').eq('creator_id', creatorId).eq('campaign_id', videoData.id).single();
      setSelectedUser({
        ...profile,
        status: submission?.status,
        submitted_at: submission?.submitted_at,
        total_paid: 0,
        // We can calculate this if needed
        video_count: 1 // We can fetch this if needed
      });
      setIsUserDialogOpen(true);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user details');
    }
  };
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
      <div ref={containerRef} className="relative bg-black aspect-[9/16] max-w-[280px] max-h-[400px] mx-auto">
        <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" loop playsInline muted={isMuted} onClick={togglePlay} />
        
        {/* Play Button Overlay */}
        {!isPlaying && <div className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30" onClick={togglePlay}>
            <div className="w-14 h-14 rounded-full bg-primary backdrop-blur-sm flex items-center justify-center hover:bg-primary/90 transition-colors shadow-2xl">
              <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white border-b-[10px] border-b-transparent ml-1"></div>
            </div>
          </div>}

        {/* Platform Logo */}
        <div className="absolute top-4 left-4">
          {(() => {
          switch (videoData.platform?.toLowerCase()) {
            case 'tiktok':
              return <img src={tiktokLogo} alt="TikTok" className="w-8 h-8" />;
            case 'instagram':
              return <img src={instagramLogo} alt="Instagram" className="w-8 h-8" />;
            case 'youtube':
              return <img src={youtubeLogo} alt="YouTube" className="w-8 h-8" />;
            default:
              return <img src={tiktokLogo} alt="Platform" className="w-8 h-8" />;
          }
        })()}
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
      <div className="py-4 space-y-3">
        <div onClick={handleUserClick} className="flex items-center justify-between cursor-pointer group px-[13px]">
          <div className="flex items-center gap-3">
            {creator.avatar_url ? <img src={creator.avatar_url} alt={creator.username} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {creator.username.charAt(0).toUpperCase()}
                </span>
              </div>}
            <div>
              <p className="font-semibold text-white text-sm group-hover:underline transition-all">{creator.username}</p>
              <p className="text-xs text-white/60">@{creator.username.toLowerCase()}</p>
            </div>
          </div>
          {videoData.bot_score !== null && <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-base px-2.5 py-0.5">
              {videoData.bot_score}
            </Badge>}
        </div>

        {/* Deadline */}
        {daysUntilDeadline !== null && <div className="flex justify-between items-center pt-3 border-t border-white/5">
            <p className="font-semibold text-white text-sm">{daysUntilDeadline} days</p>
          </div>}

        {/* Flag Button (Admin Only) */}
        {isAdmin}
      </div>

      {/* User Details Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="bg-[#0a0a0a] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Creator Details</DialogTitle>
          </DialogHeader>
          
          {selectedUser && <div className="space-y-6 mt-4">
              {/* User Profile Section */}
              <div className="flex items-center gap-4 pb-6">
                {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt={selectedUser.username} className="w-20 h-20 rounded-full object-cover ring-2 ring-primary" /> : <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary">
                    <span className="text-primary font-semibold text-3xl">
                      {selectedUser.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>}
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {selectedUser.username || "Unknown User"}
                  </h3>
                  {selectedUser.email && <p className="text-sm text-muted-foreground">{selectedUser.email}</p>}
                  
                  {/* Trust Score */}
                  {selectedUser.trust_score && selectedUser.trust_score > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-muted-foreground tracking-[-0.5px]">Trust Score:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white tracking-[-0.5px]">
                          {selectedUser.trust_score}%
                        </span>
                        <div className="flex items-center gap-0.5">
                          {(() => {
                            const { count, color } = getTrustScoreDiamonds(selectedUser.trust_score);
                            return [...Array(count)].map((_, i) => (
                              <Diamond key={i} className={`w-3 h-3 ${color}`} />
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Social Accounts Section */}
              {selectedUser.social_accounts && selectedUser.social_accounts.length > 0 && <div>
                  <h4 className="text-sm font-semibold text-white mb-3">Connected Accounts</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedUser.social_accounts.map((account: any) => <a key={account.id} href={account.account_link || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg bg-[#111111] hover:bg-[#1a1a1a] transition-colors group">
                        <div className="flex items-center gap-3">
                          {(() => {
                    switch (account.platform.toLowerCase()) {
                      case 'tiktok':
                        return <img src={tiktokLogo} alt="TikTok" className="w-5 h-5" />;
                      case 'instagram':
                        return <img src={instagramLogo} alt="Instagram" className="w-5 h-5" />;
                      case 'youtube':
                        return <img src={youtubeLogo} alt="YouTube" className="w-5 h-5" />;
                      default:
                        return null;
                    }
                  })()}
                          <div>
                            <p className="font-medium text-white group-hover:underline">
                              @{account.username}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                          </div>
                        </div>
                        {account.follower_count > 0 && <span className="text-sm font-semibold text-white">
                            {account.follower_count.toLocaleString()} followers
                          </span>}
                      </a>)}
                  </div>
                </div>}

              {/* Campaign Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#111111]">
                  <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                  <p className="text-xl font-bold text-white">
                    ${selectedUser.total_paid?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[#111111]">
                  <p className="text-xs text-muted-foreground mb-1">Videos Submitted</p>
                  <p className="text-xl font-bold text-white">
                    {selectedUser.video_count || 0}
                  </p>
                </div>
              </div>

              {/* Application Status */}
              {selectedUser.status && <div className="p-4 rounded-lg bg-[#111111]">
                  <p className="text-xs text-muted-foreground mb-2">Application Status</p>
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize" style={{
                backgroundColor: selectedUser.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : selectedUser.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                color: selectedUser.status === 'approved' ? 'rgb(34, 197, 94)' : selectedUser.status === 'rejected' ? 'rgb(239, 68, 68)' : 'rgb(234, 179, 8)'
              }}>
                      {selectedUser.status}
                    </div>
                    {selectedUser.status === 'approved' && selectedUser.submitted_at && <div className="text-xs text-muted-foreground">
                        {format(new Date(selectedUser.submitted_at), 'MMM d, yyyy')}
                      </div>}
                  </div>
                </div>}
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
}