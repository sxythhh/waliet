import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Filter, ChevronDown, Link2, ExternalLink, Play, VolumeX, Eye, ChevronUp, X, Plus, ChevronRight, MonitorPlay, PlaySquare, Globe, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import tiktokLogo from "@/assets/tiktok-logo-black-new.png";
import xLogoLight from "@/assets/x-logo-light.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import { useTheme } from "@/components/ThemeProvider";

interface ScopeVideo {
  id: string;
  brand_id: string;
  platform: string;
  username: string | null;
  avatar_url: string | null;
  video_url: string;
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
  const [addVideoOpen, setAddVideoOpen] = useState(false);
  const [newVideo, setNewVideo] = useState({
    video_url: "",
    platform: "tiktok",
    username: "",
    caption: "",
    thumbnail_url: "",
    views: 0
  });
  const [addingVideo, setAddingVideo] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
    fetchBlueprints();
  }, [brandId]);

  useEffect(() => {
    if (videos.length > 0) {
      fetchSavedVideos();
    }
  }, [videos]);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('scope_videos')
        .select('*')
        .eq('brand_id', brandId)
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

  const handleAddVideo = async () => {
    if (!newVideo.video_url) {
      toast.error('Please enter a video URL');
      return;
    }

    setAddingVideo(true);
    try {
      const { error } = await supabase
        .from('scope_videos')
        .insert({
          brand_id: brandId,
          video_url: newVideo.video_url,
          platform: newVideo.platform,
          username: newVideo.username || null,
          caption: newVideo.caption || null,
          thumbnail_url: newVideo.thumbnail_url || null,
          views: newVideo.views || 0
        });

      if (error) throw error;

      toast.success('Video added to library');
      setAddVideoOpen(false);
      setNewVideo({
        video_url: "",
        platform: "tiktok",
        username: "",
        caption: "",
        thumbnail_url: "",
        views: 0
      });
      fetchVideos();
    } catch (error) {
      console.error('Error adding video:', error);
      toast.error('Failed to add video');
    } finally {
      setAddingVideo(false);
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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 flex-1 max-w-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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
      <div className="px-6 py-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          {/* Sort Dropdown - Expandable Menu Style */}
          <div className="relative">
            <button 
              onClick={() => setSortMenuOpen(!sortMenuOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#141414] border border-[#252525] rounded-xl text-sm text-white hover:bg-[#1a1a1a] transition-colors"
            >
              <Filter className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-400">Sort by</span>
              <span className="font-semibold capitalize">{sortBy}</span>
            </button>
            
            {sortMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-[#141414] border border-[#252525] rounded-xl shadow-xl z-50 overflow-hidden">
                {/* CTA Outcome */}
                <button 
                  onClick={() => setExpandedCategory(expandedCategory === 'cta' ? null : 'cta')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1f1f1f] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MonitorPlay className="w-5 h-5 text-neutral-400" />
                    <span className="text-white font-medium">CTA Outcome</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-neutral-400 transition-transform ${expandedCategory === 'cta' ? 'rotate-90' : ''}`} />
                </button>
                {expandedCategory === 'cta' && (
                  <div className="bg-[#0f0f0f] border-t border-[#252525]">
                    {['Examples', 'Recent', 'Views'].map(option => (
                      <button 
                        key={option}
                        onClick={() => {
                          setSortBy(option.toLowerCase() as any);
                          setSortMenuOpen(false);
                          setExpandedCategory(null);
                        }}
                        className="w-full text-left px-10 py-2.5 text-sm text-neutral-300 hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {/* Format */}
                <button 
                  onClick={() => setExpandedCategory(expandedCategory === 'format' ? null : 'format')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1f1f1f] transition-colors border-t border-[#1f1f1f]"
                >
                  <div className="flex items-center gap-3">
                    <PlaySquare className="w-5 h-5 text-neutral-400" />
                    <span className="text-white font-medium">Format</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-neutral-400 transition-transform ${expandedCategory === 'format' ? 'rotate-90' : ''}`} />
                </button>
                {expandedCategory === 'format' && (
                  <div className="bg-[#0f0f0f] border-t border-[#252525]">
                    {['Examples', 'Recent', 'Views'].map(option => (
                      <button 
                        key={option}
                        onClick={() => {
                          setSortBy(option.toLowerCase() as any);
                          setSortMenuOpen(false);
                          setExpandedCategory(null);
                        }}
                        className="w-full text-left px-10 py-2.5 text-sm text-neutral-300 hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {/* Platform */}
                <button 
                  onClick={() => setExpandedCategory(expandedCategory === 'platform' ? null : 'platform')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1f1f1f] transition-colors border-t border-[#1f1f1f]"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-neutral-400" />
                    <span className="text-white font-medium">Platform</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-neutral-400 transition-transform ${expandedCategory === 'platform' ? 'rotate-90' : ''}`} />
                </button>
                {expandedCategory === 'platform' && (
                  <div className="bg-[#0f0f0f] border-t border-[#252525]">
                    {['Examples', 'Recent', 'Views'].map(option => (
                      <button 
                        key={option}
                        onClick={() => {
                          setSortBy(option.toLowerCase() as any);
                          setSortMenuOpen(false);
                          setExpandedCategory(null);
                        }}
                        className="w-full text-left px-10 py-2.5 text-sm text-neutral-300 hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {/* Content Style */}
                <button 
                  onClick={() => setExpandedCategory(expandedCategory === 'style' ? null : 'style')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1f1f1f] transition-colors border-t border-[#1f1f1f]"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-neutral-400" />
                    <span className="text-white font-medium">Content Style</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-neutral-400 transition-transform ${expandedCategory === 'style' ? 'rotate-90' : ''}`} />
                </button>
                {expandedCategory === 'style' && (
                  <div className="bg-[#0f0f0f] border-t border-[#252525]">
                    {['Examples', 'Recent', 'Views'].map(option => (
                      <button 
                        key={option}
                        onClick={() => {
                          setSortBy(option.toLowerCase() as any);
                          setSortMenuOpen(false);
                          setExpandedCategory(null);
                        }}
                        className="w-full text-left px-10 py-2.5 text-sm text-neutral-300 hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {/* Target Audience */}
                <button 
                  onClick={() => setExpandedCategory(expandedCategory === 'audience' ? null : 'audience')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1f1f1f] transition-colors border-t border-[#1f1f1f]"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-neutral-400" />
                    <span className="text-white font-medium">Target Audience</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-neutral-400 transition-transform ${expandedCategory === 'audience' ? 'rotate-90' : ''}`} />
                </button>
                {expandedCategory === 'audience' && (
                  <div className="bg-[#0f0f0f] border-t border-[#252525]">
                    {['Examples', 'Recent', 'Views'].map(option => (
                      <button 
                        key={option}
                        onClick={() => {
                          setSortBy(option.toLowerCase() as any);
                          setSortMenuOpen(false);
                          setExpandedCategory(null);
                        }}
                        className="w-full text-left px-10 py-2.5 text-sm text-neutral-300 hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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

          {/* Add Video Button */}
          <Button 
            onClick={() => setAddVideoOpen(true)}
            variant="outline" 
            size="sm" 
            className="bg-[#141414] border-[#252525] text-white hover:bg-[#1f1f1f]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Video
          </Button>
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
            <p className="text-neutral-500 text-sm mb-4">Add videos to your scope library to use as references</p>
            <Button onClick={() => setAddVideoOpen(true)} className="bg-[#2060df] hover:bg-[#1a50c8]">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Video
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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

      {/* Add Video Dialog */}
      <Dialog open={addVideoOpen} onOpenChange={setAddVideoOpen}>
        <DialogContent className="bg-[#0a0a0a] border-[#252525] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add Video to Library</DialogTitle>
            <DialogDescription className="text-neutral-500">
              Add a video reference to your scope library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-white">Video URL *</Label>
              <Input
                placeholder="https://tiktok.com/@user/video/..."
                value={newVideo.video_url}
                onChange={e => setNewVideo(prev => ({ ...prev, video_url: e.target.value }))}
                className="bg-[#141414] border-[#252525] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Platform</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center justify-between px-3 py-2 bg-[#141414] border border-[#252525] rounded-md text-white">
                    <span className="capitalize">{newVideo.platform}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#141414] border-[#252525]">
                  {['tiktok', 'instagram', 'youtube', 'x'].map(platform => (
                    <DropdownMenuItem
                      key={platform}
                      onClick={() => setNewVideo(prev => ({ ...prev, platform }))}
                      className="text-white hover:bg-[#1f1f1f] capitalize"
                    >
                      {platform}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Username</Label>
              <Input
                placeholder="@username"
                value={newVideo.username}
                onChange={e => setNewVideo(prev => ({ ...prev, username: e.target.value }))}
                className="bg-[#141414] border-[#252525] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Thumbnail URL</Label>
              <Input
                placeholder="https://..."
                value={newVideo.thumbnail_url}
                onChange={e => setNewVideo(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                className="bg-[#141414] border-[#252525] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Views</Label>
              <Input
                type="number"
                placeholder="0"
                value={newVideo.views}
                onChange={e => setNewVideo(prev => ({ ...prev, views: parseInt(e.target.value) || 0 }))}
                className="bg-[#141414] border-[#252525] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Caption</Label>
              <Textarea
                placeholder="Video caption or description..."
                value={newVideo.caption}
                onChange={e => setNewVideo(prev => ({ ...prev, caption: e.target.value }))}
                className="bg-[#141414] border-[#252525] text-white resize-none"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAddVideoOpen(false)} className="border-[#252525] text-white hover:bg-[#1f1f1f]">
                Cancel
              </Button>
              <Button onClick={handleAddVideo} disabled={addingVideo} className="bg-[#2060df] hover:bg-[#1a50c8]">
                {addingVideo ? 'Adding...' : 'Add Video'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const hasSavedBlueprints = savedBlueprints.length > 0;

  return (
    <div className="bg-[#0a0a0a] rounded-xl overflow-hidden border border-[#1a1a1a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          {getPlatformIcon(video.platform)}
          {video.username ? (
            <span className="text-sm font-medium text-white truncate max-w-[100px]">{video.username}</span>
          ) : (
            <span className="text-sm text-neutral-500">Unavailable</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => copyToClipboard(video.video_url)}
            className="p-1.5 rounded-md hover:bg-[#1f1f1f] transition-colors"
          >
            <Link2 className="w-4 h-4 text-neutral-500" />
          </button>
          <a
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-[#1f1f1f] transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-neutral-500" />
          </a>
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-[9/16] bg-[#141414]">
        {video.thumbnail_url ? (
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
            <span className="text-xs font-medium text-white">{formatViews(video.views)}</span>
          </div>
        )}

        {/* Play button overlay */}
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

        {/* Bottom controls */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#2060df]" />
            <div className="w-8 h-0.5 bg-neutral-600 rounded-full overflow-hidden">
              <div className="w-1/3 h-full bg-neutral-400" />
            </div>
            <div className="w-2 h-2 rounded-full bg-[#2060df]" />
          </div>
          {/* Mute button */}
          <button className="p-1.5 rounded-md bg-black/40 backdrop-blur-sm">
            <VolumeX className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Save to Blueprint Button */}
      <div className="px-3 py-2.5 border-t border-[#1a1a1a]">
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                hasSavedBlueprints
                  ? "bg-[#2060df] text-white hover:bg-[#1a50c8]"
                  : "bg-[#141414] text-neutral-400 border border-[#252525] hover:bg-[#1a1a1a] hover:text-white"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
              <span>Save to Blueprint</span>
              {dropdownOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-[200px] bg-[#141414] border-[#252525]">
            {blueprints.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-neutral-500">
                No blueprints yet
              </div>
            ) : (
              blueprints.map(blueprint => {
                const isSaved = savedBlueprints.includes(blueprint.id);
                return (
                  <DropdownMenuItem
                    key={blueprint.id}
                    onClick={() => onSaveToBlueprint(blueprint.id)}
                    disabled={savingToBlueprint}
                    className={`flex items-center justify-between text-white hover:bg-[#1f1f1f] ${
                      isSaved ? "bg-[#1a1a1a]" : ""
                    }`}
                  >
                    <span className="truncate">{blueprint.title || 'Untitled'}</span>
                    {isSaved && (
                      <div className="w-4 h-4 rounded bg-[#2060df] flex items-center justify-center ml-2">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </DropdownMenuItem>
                );
              })
            )}
            <DropdownMenuSeparator className="bg-[#252525]" />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
            >
              <X className="w-4 h-4 mr-2" />
              Remove from library
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Caption */}
      {video.caption && (
        <div className="px-3 pb-3">
          <p className="text-sm text-neutral-400 line-clamp-4 leading-relaxed">
            {video.caption}
          </p>
        </div>
      )}
    </div>
  );
}
