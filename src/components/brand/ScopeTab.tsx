import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Filter, ChevronDown, Link2, ExternalLink, Play, VolumeX, Volume2, Eye, ChevronUp, X, Plus, ChevronRight, MonitorPlay, PlaySquare, Globe, Sparkles, Users, ArrowLeft, Trash2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import tiktokLogo from "@/assets/tiktok-logo-black-new.png";
import xLogoLight from "@/assets/x-logo-light.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import stickyNoteGrey from "@/assets/sticky-note-grey.svg";
import stickyNoteWhite from "@/assets/sticky-note-white.svg";
import { useTheme } from "@/components/ThemeProvider";

interface ScopeVideo {
  id: string;
  brand_id: string;
  platform: string;
  username: string | null;
  avatar_url: string | null;
  video_url: string;
  file_url: string | null;
  thumbnail_url: string | null;
  views: number;
  caption: string | null;
  tags: string[];
  is_example: boolean;
  created_at: string;
}

interface Blueprint {
  id: string;
  title: string;
}

interface ScopeTabProps {
  brandId: string;
}

export function ScopeTab({ brandId }: ScopeTabProps) {
  const { theme } = useTheme();
  const [videos, setVideos] = useState<ScopeVideo[]>([]);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"examples" | "recent" | "views">("examples");
  const [selectedVideo, setSelectedVideo] = useState<ScopeVideo | null>(null);
  const [savingToBlueprint, setSavingToBlueprint] = useState<string | null>(null);
  const [savedVideoBlueprints, setSavedVideoBlueprints] = useState<Record<string, string[]>>({});
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<{ category: string; value: string }[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cta': return MonitorPlay;
      case 'format': return PlaySquare;
      case 'platform': return Globe;
      case 'style': return Sparkles;
      case 'audience': return Users;
      default: return Filter;
    }
  };

  const addFilter = (category: string, value: string) => {
    // Check if this category already has a filter, replace it
    const existingIndex = activeFilters.findIndex(f => f.category === category);
    if (existingIndex >= 0) {
      const newFilters = [...activeFilters];
      newFilters[existingIndex] = { category, value };
      setActiveFilters(newFilters);
    } else {
      setActiveFilters([...activeFilters, { category, value }]);
    }
    setSortMenuOpen(false);
    setExpandedCategory(null);
  };

  const removeFilter = (index: number) => {
    setActiveFilters(activeFilters.filter((_, i) => i !== index));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  useEffect(() => {
    fetchVideos();
    fetchBlueprints();
    fetchSubscriptionStatus();
  }, [brandId]);

  const fetchSubscriptionStatus = async () => {
    const { data } = await supabase
      .from("brands")
      .select("subscription_status")
      .eq("id", brandId)
      .single();
    if (data) {
      setSubscriptionStatus(data.subscription_status);
    }
  };

  useEffect(() => {
    if (videos.length > 0) {
      fetchSavedVideos();
    }
  }, [videos]);

  const fetchVideos = async () => {
    try {
      // Fetch both brand-specific videos AND global videos (brand_id is null)
      const { data, error } = await supabase
        .from('scope_videos')
        .select('*')
        .or(`brand_id.eq.${brandId},brand_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching scope videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlueprints = async () => {
    try {
      const { data, error } = await supabase
        .from('blueprints')
        .select('id, title')
        .eq('brand_id', brandId)
        .order('title');

      if (error) throw error;
      setBlueprints(data || []);
    } catch (error) {
      console.error('Error fetching blueprints:', error);
    }
  };

  const fetchSavedVideos = async () => {
    try {
      const videoIds = videos.map(v => v.id);
      const { data, error } = await supabase
        .from('scope_video_saves')
        .select('scope_video_id, blueprint_id')
        .in('scope_video_id', videoIds);

      if (error) throw error;

      // Group by video_id
      const grouped: Record<string, string[]> = {};
      data?.forEach(save => {
        if (!grouped[save.scope_video_id]) {
          grouped[save.scope_video_id] = [];
        }
        grouped[save.scope_video_id].push(save.blueprint_id);
      });
      setSavedVideoBlueprints(grouped);
    } catch (error) {
      console.error('Error fetching saved videos:', error);
    }
  };

  const handleSaveToBlueprint = async (videoId: string, blueprintId: string) => {
    setSavingToBlueprint(videoId);
    try {
      const isAlreadySaved = savedVideoBlueprints[videoId]?.includes(blueprintId);

      if (isAlreadySaved) {
        // Remove from blueprint
        const { error } = await supabase
          .from('scope_video_saves')
          .delete()
          .eq('scope_video_id', videoId)
          .eq('blueprint_id', blueprintId);

        if (error) throw error;

        setSavedVideoBlueprints(prev => ({
          ...prev,
          [videoId]: prev[videoId]?.filter(id => id !== blueprintId) || []
        }));
        toast.success('Removed from blueprint');
      } else {
        // Save to blueprint
        const { error } = await supabase
          .from('scope_video_saves')
          .insert({
            scope_video_id: videoId,
            blueprint_id: blueprintId
          });

        if (error) throw error;

        setSavedVideoBlueprints(prev => ({
          ...prev,
          [videoId]: [...(prev[videoId] || []), blueprintId]
        }));
        toast.success('Saved to blueprint');
      }
    } catch (error) {
      console.error('Error saving to blueprint:', error);
      toast.error('Failed to save to blueprint');
    } finally {
      setSavingToBlueprint(null);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('scope_videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
      
      toast.success('Video removed');
      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'tiktok':
        return <img src={tiktokLogo} alt="TikTok" className="w-4 h-4" />;
      case 'instagram':
        return <img src={instagramLogo} alt="Instagram" className="w-4 h-4" />;
      case 'youtube':
        return <img src={youtubeLogo} alt="YouTube" className="w-4 h-4" />;
      case 'x':
      case 'twitter':
        return <img src={xLogoLight} alt="X" className="w-4 h-4" />;
      default:
        return <img src={tiktokLogo} alt="TikTok" className="w-4 h-4" />;
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }
    return views.toLocaleString();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const filteredVideos = videos
    .filter(video => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        video.username?.toLowerCase().includes(query) ||
        video.caption?.toLowerCase().includes(query) ||
        video.platform?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "examples":
          return (b.is_example ? 1 : 0) - (a.is_example ? 1 : 0);
        case "views":
          return (b.views || 0) - (a.views || 0);
        case "recent":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // Show subscription gate if not subscribed
  if (!loading && subscriptionStatus !== "active") {
    return (
      <div className="h-full w-full">
        <iframe 
          src="https://join.virality.gg/page-2" 
          className="w-full h-full border-0"
          title="Upgrade Plan"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 flex-1 max-w-md" />
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-[420px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Sort & Filters Group */}
          <div className={`flex items-center bg-[#0d0d0d] rounded-xl font-['Inter'] tracking-[-0.5px] transition-colors ${
            activeFilters.length > 0 ? 'hover:bg-[#141414]' : ''
          }`}>
            {/* Sort Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setSortMenuOpen(!sortMenuOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[13px] text-white rounded-xl transition-colors ${
                  activeFilters.length === 0 ? 'hover:bg-[#141414]' : ''
                }`}
              >
                <Filter className="w-4 h-4 text-neutral-500" />
                <span className="text-neutral-500">Sort by</span>
                <span className="font-semibold capitalize">{sortBy}</span>
              </button>
              
              {sortMenuOpen && (
                <div 
                  className={`absolute top-full left-0 mt-2 bg-[#0d0d0d] rounded-xl shadow-2xl z-50 overflow-hidden font-['Inter'] tracking-[-0.5px] transition-all duration-200 ease-out ${
                    expandedCategory ? 'w-48' : 'w-64'
                  }`}
                >
                  {!expandedCategory ? (
                    <div className="animate-fade-in">
                      {/* Main Categories */}
                      <button 
                        onClick={() => setExpandedCategory('cta')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#161616] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <MonitorPlay className="w-[18px] h-[18px] text-neutral-500" />
                          <span className="text-white text-[13px] font-medium">CTA Outcome</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-500" />
                      </button>

                      <button 
                        onClick={() => setExpandedCategory('format')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#161616] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <PlaySquare className="w-[18px] h-[18px] text-neutral-500" />
                          <span className="text-white text-[13px] font-medium">Format</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-500" />
                      </button>

                      <button 
                        onClick={() => setExpandedCategory('platform')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#161616] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="w-[18px] h-[18px] text-neutral-500" />
                          <span className="text-white text-[13px] font-medium">Platform</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-500" />
                      </button>

                      <button 
                        onClick={() => setExpandedCategory('style')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#161616] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-[18px] h-[18px] text-neutral-500" />
                          <span className="text-white text-[13px] font-medium">Content Style</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-500" />
                      </button>

                      <button 
                        onClick={() => setExpandedCategory('audience')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#161616] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-[18px] h-[18px] text-neutral-500" />
                          <span className="text-white text-[13px] font-medium">Target Audience</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-500" />
                      </button>
                    </div>
                  ) : (
                    <div className="animate-fade-in">
                      {/* Sub-menu with back button */}
                      <button 
                        onClick={() => setExpandedCategory(null)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#161616] transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-400 text-[13px]">Back</span>
                      </button>

                      {/* Category-specific filters */}
                      {expandedCategory === 'cta' && (
                        <>
                          {['Sign Up', 'Download App', 'Visit Website', 'Purchase', 'Follow'].map((option) => (
                            <button 
                              key={option}
                              onClick={() => addFilter('cta', option)}
                              className="w-full text-left px-4 py-3 text-[13px] text-white hover:bg-[#161616] transition-colors"
                            >
                              {option}
                            </button>
                          ))}
                        </>
                      )}

                      {expandedCategory === 'format' && (
                        <>
                          {['Talking Head', 'Voiceover', 'Skit', 'Tutorial', 'Review', 'Unboxing'].map((option) => (
                            <button 
                              key={option}
                              onClick={() => addFilter('format', option)}
                              className="w-full text-left px-4 py-3 text-[13px] text-white hover:bg-[#161616] transition-colors"
                            >
                              {option}
                            </button>
                          ))}
                        </>
                      )}

                      {expandedCategory === 'platform' && (
                        <>
                          {['TikTok', 'Instagram', 'YouTube', 'X'].map((option) => (
                            <button 
                              key={option}
                              onClick={() => addFilter('platform', option)}
                              className="w-full text-left px-4 py-3 text-[13px] text-white hover:bg-[#161616] transition-colors"
                            >
                              {option}
                            </button>
                          ))}
                        </>
                      )}

                      {expandedCategory === 'style' && (
                        <>
                          {['Comedic', 'Educational', 'Lifestyle', 'Professional', 'Casual'].map((option) => (
                            <button 
                              key={option}
                              onClick={() => addFilter('style', option)}
                              className="w-full text-left px-4 py-3 text-[13px] text-white hover:bg-[#161616] transition-colors"
                            >
                              {option}
                            </button>
                          ))}
                        </>
                      )}

                      {expandedCategory === 'audience' && (
                        <>
                          {['Gen Z', 'Millennials', 'Parents', 'Professionals', 'Students'].map((option) => (
                            <button 
                              key={option}
                              onClick={() => addFilter('audience', option)}
                              className="w-full text-left px-4 py-3 text-[13px] text-white hover:bg-[#161616] transition-colors"
                            >
                              {option}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Active Filter Chips - Inside the group */}
            {activeFilters.map((filter, index) => {
              const IconComponent = getCategoryIcon(filter.category);
              return (
                <div 
                  key={`${filter.category}-${filter.value}`}
                  className="flex items-center gap-2 px-3 py-2 bg-[#2060df] rounded-lg text-[13px] text-white mr-1"
                >
                  <IconComponent className="w-4 h-4 text-white/70" />
                  <span className="border-l border-white/20 pl-2">{filter.value}</span>
                  <button 
                    onClick={() => removeFilter(index)}
                    className="ml-1 hover:bg-white/10 rounded p-0.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Clear All Filters Button - Inside the group */}
            {activeFilters.length > 0 && (
              <button
                onClick={clearAllFilters}
                className="p-2 hover:bg-[#161616] rounded-lg transition-colors mr-1"
                title="Clear all filters"
              >
                <Trash2 className="w-4 h-4 text-neutral-500 hover:text-white transition-colors" />
              </button>
            )}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Scope the algorithm.."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#141414] border-[#252525] text-white placeholder:text-neutral-500 h-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">/</div>
          </div>

        </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-[#141414] flex items-center justify-center mb-4">
              <Play className="w-8 h-8 text-neutral-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No videos yet</h3>
            <p className="text-neutral-500 text-sm">Videos will appear here once added by an admin</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
            {filteredVideos.map(video => (
              <ScopeVideoCard
                key={video.id}
                video={video}
                blueprints={blueprints}
                savedBlueprints={savedVideoBlueprints[video.id] || []}
                onSaveToBlueprint={(blueprintId) => handleSaveToBlueprint(video.id, blueprintId)}
                onDelete={() => handleDeleteVideo(video.id)}
                getPlatformIcon={getPlatformIcon}
                formatViews={formatViews}
                copyToClipboard={copyToClipboard}
                savingToBlueprint={savingToBlueprint === video.id}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// Video Card Component
interface ScopeVideoCardProps {
  video: ScopeVideo;
  blueprints: Blueprint[];
  savedBlueprints: string[];
  onSaveToBlueprint: (blueprintId: string) => void;
  onDelete: () => void;
  getPlatformIcon: (platform: string) => JSX.Element;
  formatViews: (views: number) => string;
  copyToClipboard: (text: string) => void;
  savingToBlueprint: boolean;
}

function ScopeVideoCard({
  video,
  blueprints,
  savedBlueprints,
  onSaveToBlueprint,
  onDelete,
  getPlatformIcon,
  formatViews,
  copyToClipboard,
  savingToBlueprint
}: ScopeVideoCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const hasSavedBlueprints = savedBlueprints.length > 0;
  const hasPlayableVideo = !!video.file_url;

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
          <button
            onClick={() => copyToClipboard(video.video_url)}
            className="p-1.5 rounded-md hover:bg-[#1f1f1f] transition-colors"
          >
            <Link2 className="w-4 h-4 text-neutral-500" />
          </button>
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
        </div>
      </div>

      {/* Video/Thumbnail */}
      <div className="relative aspect-[9/16] bg-[#141414]">
        {hasPlayableVideo ? (
          <>
            <video
              src={video.file_url!}
              className="w-full h-full object-cover"
              muted={isMuted}
              loop
              playsInline
              autoPlay={isPlaying}
              onMouseEnter={(e) => {
                setIsPlaying(true);
                (e.target as HTMLVideoElement).play();
              }}
              onMouseLeave={(e) => {
                setIsPlaying(false);
                (e.target as HTMLVideoElement).pause();
                (e.target as HTMLVideoElement).currentTime = 0;
              }}
            />
            {/* Play overlay when not playing */}
            {!isPlaying && (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
                onClick={() => {
                  setIsPlaying(true);
                  const videoEl = document.querySelector(`video[src="${video.file_url}"]`) as HTMLVideoElement;
                  if (videoEl) videoEl.play();
                }}
              >
                <div className="w-14 h-14 rounded-full bg-[#2060df] flex items-center justify-center">
                  <Play className="w-6 h-6 text-white fill-white ml-1" />
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
        {video.views > 0 && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
            <Eye className="w-3.5 h-3.5 text-white" />
            <span className="text-[11px] font-medium text-white">{formatViews(video.views)}</span>
          </div>
        )}

        {/* Play button overlay for URL-only videos */}
        {!hasPlayableVideo && (
          <a 
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30"
          >
            <div className="w-14 h-14 rounded-full bg-[#2060df] flex items-center justify-center">
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>
          </a>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          {/* Progress indicator */}
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#2060df]" />
            <div className="w-8 h-0.5 bg-neutral-600 rounded-full overflow-hidden">
              <div className="w-1/3 h-full bg-neutral-400" />
            </div>
            <div className="w-2 h-2 rounded-full bg-[#2060df]" />
          </div>
          {/* Mute button */}
          {hasPlayableVideo && (
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-md bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>
          )}
          {!hasPlayableVideo && (
            <button className="p-1.5 rounded-md bg-black/40 backdrop-blur-sm">
              <VolumeX className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Save to Blueprint Button */}
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

      {/* Blueprint Sheet */}
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
                        onSaveToBlueprint(blueprint.id);
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
                {blueprints.slice(0, 3).map((blueprint, index) => (
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
          </div>
        </SheetContent>
      </Sheet>

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
