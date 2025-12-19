import { useState, useRef } from "react";
import { Link2, ExternalLink, Play, VolumeX, Volume2, Eye, X, Download, Trash2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import tiktokLogo from "@/assets/tiktok-logo-black-new.png";
import xLogoLight from "@/assets/x-logo-light.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import stickyNoteGrey from "@/assets/sticky-note-grey.svg";
import stickyNoteWhite from "@/assets/sticky-note-white.svg";

export interface ScopeVideoData {
  id: string;
  platform: string;
  username: string | null;
  video_url: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  views?: number;
  caption: string | null;
}

interface Blueprint {
  id: string;
  title: string;
}

interface ScopeVideoCardProps {
  video: ScopeVideoData;
  mode?: "scope" | "blueprint";
  // Scope mode props
  blueprints?: Blueprint[];
  savedBlueprints?: string[];
  onSaveToBlueprint?: (blueprintId: string) => void;
  onDelete?: () => void;
  savingToBlueprint?: boolean;
  // Blueprint mode props
  onRemove?: () => void;
  // Common
  copyToClipboard?: (text: string) => void;
}

const getPlatformIcon = (platform: string) => {
  const iconClass = "w-5 h-5 object-contain";
  switch (platform.toLowerCase()) {
    case "tiktok":
      return <img src={tiktokLogo} alt="TikTok" className={iconClass} />;
    case "instagram":
      return <img src={instagramLogo} alt="Instagram" className={iconClass} />;
    case "youtube":
      return <img src={youtubeLogo} alt="YouTube" className={iconClass} />;
    case "x":
    case "twitter":
      return <img src={xLogoLight} alt="X" className={iconClass} />;
    default:
      return <div className="w-5 h-5 rounded-full bg-neutral-700" />;
  }
};

const formatViews = (views: number): string => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
};

export function ScopeVideoCard({
  video,
  mode = "scope",
  blueprints = [],
  savedBlueprints = [],
  onSaveToBlueprint,
  onDelete,
  savingToBlueprint = false,
  onRemove,
  copyToClipboard
}: ScopeVideoCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasSavedBlueprints = savedBlueprints.length > 0;
  const hasPlayableVideo = !!video.file_url;

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const percentage = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(percentage || 0);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      videoRef.current.currentTime = percentage * videoRef.current.duration;
    }
  };

  const handleCopy = () => {
    if (copyToClipboard && video.video_url) {
      copyToClipboard(video.video_url);
    }
  };

  return (
    <div className="bg-[#0a0a0a] rounded-xl overflow-hidden border border-[#1a1a1a] flex flex-col font-['Inter'] tracking-[-0.5px] min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          {getPlatformIcon(video.platform)}
          {video.username ? (
            <span className="text-[12px] sm:text-[13px] font-medium text-white truncate max-w-[80px] sm:max-w-[100px]">{video.username}</span>
          ) : (
            <span className="text-[13px] text-neutral-500">Unavailable</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {copyToClipboard && video.video_url && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md hover:bg-[#1f1f1f] transition-colors"
            >
              <Link2 className="w-4 h-4 text-neutral-500" />
            </button>
          )}
          {video.video_url && (
            <a
              href={video.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-[#1f1f1f] transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-neutral-500" />
            </a>
          )}
          {mode === "blueprint" && onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 rounded-md hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-neutral-500 hover:text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Video/Thumbnail */}
      <div 
        className="relative aspect-[9/16] bg-[#141414]"
        onMouseEnter={() => {
          if (hasPlayableVideo) {
            setIsPlaying(true);
            videoRef.current?.play();
          }
        }}
        onMouseLeave={() => {
          // Don't pause video - keep it playing
        }}
      >
        {hasPlayableVideo ? (
          <>
            <video
              ref={videoRef}
              src={video.file_url!}
              className="w-full h-full object-cover"
              muted={isMuted}
              loop
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onClick={() => {
                if (isPlaying) {
                  videoRef.current?.pause();
                  setIsPlaying(false);
                } else {
                  videoRef.current?.play();
                  setIsPlaying(true);
                }
              }}
            />
            {/* Play overlay when not playing */}
            {!isPlaying && (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
                onClick={() => {
                  setIsPlaying(true);
                  videoRef.current?.play();
                }}
              >
                <div className="w-10 h-10 rounded-full bg-[#2060df] flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </div>
              </div>
            )}
          </>
        ) : video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-12 h-12 text-neutral-600" />
          </div>
        )}
        
        {/* Views overlay */}
        {video.views && video.views > 0 && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
            <Eye className="w-3.5 h-3.5 text-white" />
            <span className="text-[11px] font-medium text-white">{formatViews(video.views)}</span>
          </div>
        )}

        {/* Play button overlay for URL-only videos */}
        {!hasPlayableVideo && video.video_url && (
          <a 
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30"
          >
            <div className="w-10 h-10 rounded-full bg-[#2060df] flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </a>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
          {/* Controls row with mute button */}
          <div className="flex items-center justify-end mb-1.5">
            {hasPlayableVideo && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const newMuted = !isMuted;
                  setIsMuted(newMuted);
                  if (videoRef.current) {
                    videoRef.current.muted = newMuted;
                  }
                }}
                className="p-1.5 rounded-md bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            )}
            {!hasPlayableVideo && (
              <button className="p-1.5 rounded-md bg-black/50 backdrop-blur-sm">
                <VolumeX className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
          {/* Progress bar */}
          {hasPlayableVideo && (
            <div 
              className="w-full h-1 bg-white/20 rounded-full cursor-pointer overflow-hidden"
              onClick={(e) => {
                e.stopPropagation();
                handleProgressClick(e);
              }}
            >
              <div 
                className="h-full bg-[#2060df] rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Save to Blueprint Button - Only in scope mode */}
      {mode === "scope" && onSaveToBlueprint && (
        <div className="px-3 py-2.5">
          <button
            onClick={() => setSheetOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
              hasSavedBlueprints || isHovered
                ? "bg-[#2060df] text-white"
                : "bg-[#141414] text-neutral-400"
            }`}
          >
            <img 
              src={hasSavedBlueprints || isHovered ? stickyNoteWhite : stickyNoteGrey} 
              alt="" 
              className="w-4 h-4"
            />
            <span>Save to Blueprint</span>
          </button>
        </div>
      )}

      {/* Blueprint Sheet */}
      {mode === "scope" && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent 
            side="bottom" 
            className="p-0 border-0 bg-transparent max-h-[60vh] font-['Inter'] tracking-[-0.5px]"
          >
            {/* Blue Header Bar */}
            <div className="bg-[#2060df] rounded-t-3xl px-6 py-4">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2 text-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                  </svg>
                  <span className="text-[14px] font-medium">Adding Scope Content</span>
                </div>
                <div className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white text-[13px] font-medium">
                  Your Blueprints
                </div>
                <Download className="w-5 h-5 text-white cursor-pointer hover:opacity-80 transition-opacity" />
              </div>
            </div>

            {/* Dark Content Area */}
            <div className="bg-[#0f0f0f] px-6 py-6 max-h-[calc(60vh-80px)] overflow-y-auto">
              <h3 className="text-center text-white text-[15px] font-semibold mb-5">Available Blueprints</h3>
              
              {blueprints.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 text-[14px]">
                  No blueprints yet
                </div>
              ) : (
                <div className="space-y-3 max-w-2xl mx-auto">
                  {blueprints.map(blueprint => {
                    const isSaved = savedBlueprints.includes(blueprint.id);
                    return (
                      <button
                        key={blueprint.id}
                        onClick={() => {
                          onSaveToBlueprint?.(blueprint.id);
                        }}
                        disabled={savingToBlueprint}
                        className={`w-full p-4 rounded-xl transition-all text-left ${
                          isSaved 
                            ? "bg-[#1a1a1a] border-l-4 border-l-[#2060df]" 
                            : "bg-[#1a1a1a] border-l-4 border-l-transparent hover:border-l-[#2060df]/50"
                        }`}
                      >
                        <p className="text-[13px] text-neutral-300 leading-relaxed">
                          {blueprint.title || `Untitled Blueprint`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* New Blueprint Section */}
              <div className="mt-8 max-w-2xl mx-auto">
                <h4 className="text-white text-[14px] font-semibold mb-4">New Blueprint</h4>
                <div className="flex items-center gap-2">
                  {blueprints.slice(0, 3).map((blueprint) => (
                    <div 
                      key={blueprint.id}
                      className="w-8 h-8 rounded-lg bg-[#252525] flex items-center justify-center text-[12px] font-medium text-white"
                    >
                      {(blueprint.title || 'U').charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {blueprints.length === 0 && (
                    <div className="w-8 h-8 rounded-lg bg-[#252525] flex items-center justify-center text-[12px] font-medium text-neutral-400">
                      +
                    </div>
                  )}
                  <span className="text-[13px] text-neutral-400 ml-2">
                    {blueprints.length > 0 ? blueprints[0]?.title || 'Untitled' : 'Create new'}
                  </span>
                </div>
              </div>

              {/* Delete option */}
              {onDelete && (
                <div className="mt-8 pt-4 border-t border-[#252525] max-w-2xl mx-auto">
                  <button
                    onClick={() => {
                      setSheetOpen(false);
                      onDelete();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 text-red-400 hover:text-red-300 transition-colors text-[13px]"
                  >
                    <X className="w-4 h-4" />
                    <span>Remove from library</span>
                  </button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Caption */}
      {video.caption && (
        <div className="px-3 pb-3">
          <p className="text-[13px] text-neutral-400 line-clamp-4 leading-relaxed">
            {video.caption}
          </p>
        </div>
      )}
    </div>
  );
}
