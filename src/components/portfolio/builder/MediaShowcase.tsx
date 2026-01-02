import { useState } from "react";
import { Plus, Video, Image, Link, Trash2, ExternalLink, Play, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApprovedVideos } from "@/hooks/usePortfolio";
import type { FeaturedVideo, ShowcaseItem } from "@/types/portfolio";

interface MediaShowcaseProps {
  featuredVideos: FeaturedVideo[];
  showcaseItems: ShowcaseItem[];
  onFeaturedVideosChange: (videos: FeaturedVideo[]) => void;
  onShowcaseItemsChange: (items: ShowcaseItem[]) => void;
}

export function MediaShowcase({
  featuredVideos,
  showcaseItems,
  onFeaturedVideosChange,
  onShowcaseItemsChange,
}: MediaShowcaseProps) {
  const [videosOpen, setVideosOpen] = useState(true);
  const [showcaseOpen, setShowcaseOpen] = useState(true);
  const [showVideoSelector, setShowVideoSelector] = useState(false);
  const [editingVideo, setEditingVideo] = useState<FeaturedVideo | null>(null);
  const [editingShowcase, setEditingShowcase] = useState<ShowcaseItem | null>(null);

  const { data: approvedVideos } = useApprovedVideos();

  // Add video from approved submissions
  const handleSelectVideo = (video: typeof approvedVideos extends (infer T)[] ? T : never) => {
    const featured: FeaturedVideo = {
      id: crypto.randomUUID(),
      submissionId: video.id,
      title: video.title || video.campaigns?.title || "Untitled",
      thumbnailUrl: video.thumbnail_url || undefined,
      views: video.views || 0,
      platform: video.platform || undefined,
    };
    onFeaturedVideosChange([...featuredVideos, featured]);
    setShowVideoSelector(false);
  };

  // Add external video
  const handleSaveExternalVideo = (video: FeaturedVideo) => {
    const existing = featuredVideos.find((v) => v.id === video.id);
    if (existing) {
      onFeaturedVideosChange(featuredVideos.map((v) => (v.id === video.id ? video : v)));
    } else {
      onFeaturedVideosChange([...featuredVideos, video]);
    }
    setEditingVideo(null);
  };

  const handleDeleteVideo = (id: string) => {
    onFeaturedVideosChange(featuredVideos.filter((v) => v.id !== id));
  };

  // Showcase items
  const handleSaveShowcase = (item: ShowcaseItem) => {
    const existing = showcaseItems.find((i) => i.id === item.id);
    if (existing) {
      onShowcaseItemsChange(showcaseItems.map((i) => (i.id === item.id ? item : i)));
    } else {
      onShowcaseItemsChange([...showcaseItems, item]);
    }
    setEditingShowcase(null);
  };

  const handleDeleteShowcase = (id: string) => {
    onShowcaseItemsChange(showcaseItems.filter((i) => i.id !== id));
  };

  // Filter out already featured videos
  const availableVideos = approvedVideos?.filter(
    (v) => !featuredVideos.some((f) => f.submissionId === v.id)
  ) || [];

  return (
    <div className="space-y-4">
      {/* Featured Videos */}
      <Collapsible open={videosOpen} onOpenChange={setVideosOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Featured Videos</span>
              <span className="text-xs text-muted-foreground">({featuredVideos.length})</span>
            </div>
            {videosOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          {/* Video Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {featuredVideos.map((video) => (
              <div key={video.id} className="relative group">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                    onClick={() => setEditingVideo(video)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:text-destructive hover:bg-white/20"
                    onClick={() => handleDeleteVideo(video.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs mt-1 truncate">{video.title}</p>
                {video.views && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {video.views.toLocaleString()} views
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Add buttons */}
          <div className="flex gap-2">
            {availableVideos.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowVideoSelector(true)}>
                <Video className="h-4 w-4 mr-2" />
                From Submissions
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingVideo({
                id: crypto.randomUUID(),
                title: "",
                externalUrl: "",
              })}
            >
              <Link className="h-4 w-4 mr-2" />
              External Video
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Showcase Items */}
      <Collapsible open={showcaseOpen} onOpenChange={setShowcaseOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Portfolio Items</span>
              <span className="text-xs text-muted-foreground">({showcaseItems.length})</span>
            </div>
            {showcaseOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          {/* Showcase Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {showcaseItems.map((item) => (
              <div key={item.id} className="relative group">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                  {item.thumbnailUrl || item.type === "image" ? (
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.type === "link" ? (
                        <Link className="h-8 w-8 text-muted-foreground" />
                      ) : (
                        <Image className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                    onClick={() => setEditingShowcase(item)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:text-destructive hover:bg-white/20"
                    onClick={() => handleDeleteShowcase(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs mt-1 truncate">{item.title}</p>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingShowcase({
              id: crypto.randomUUID(),
              type: "link",
              url: "",
              title: "",
            })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Portfolio Item
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Video Selector Dialog */}
      <Dialog open={showVideoSelector} onOpenChange={setShowVideoSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select from Approved Videos</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {availableVideos.map((video) => (
              <button
                key={video.id}
                className="text-left group"
                onClick={() => handleSelectVideo(video)}
              >
                <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title || "Video"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs mt-1 truncate">{video.title || video.campaigns?.title || "Untitled"}</p>
                {video.views && (
                  <p className="text-xs text-muted-foreground">{video.views.toLocaleString()} views</p>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* External Video Dialog */}
      <ExternalVideoDialog
        item={editingVideo}
        onSave={handleSaveExternalVideo}
        onClose={() => setEditingVideo(null)}
      />

      {/* Showcase Item Dialog */}
      <ShowcaseItemDialog
        item={editingShowcase}
        onSave={handleSaveShowcase}
        onClose={() => setEditingShowcase(null)}
      />
    </div>
  );
}

// External Video Dialog
function ExternalVideoDialog({
  item,
  onSave,
  onClose,
}: {
  item: FeaturedVideo | null;
  onSave: (item: FeaturedVideo) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FeaturedVideo | null>(null);

  if (item && !form) {
    setForm(item);
  }
  if (!item && form) {
    setForm(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form) {
      onSave(form);
      setForm(null);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={() => { setForm(null); onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item?.externalUrl ? "Edit" : "Add"} External Video</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input
              type="url"
              value={form?.externalUrl || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, externalUrl: e.target.value } : null)}
              placeholder="https://youtube.com/watch?v=..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={form?.title || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, title: e.target.value } : null)}
              placeholder="Video title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={form?.description || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, description: e.target.value } : null)}
              placeholder="Brief description"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Thumbnail URL (optional)</Label>
            <Input
              type="url"
              value={form?.thumbnailUrl || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, thumbnailUrl: e.target.value } : null)}
              placeholder="https://..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setForm(null); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Showcase Item Dialog
function ShowcaseItemDialog({
  item,
  onSave,
  onClose,
}: {
  item: ShowcaseItem | null;
  onSave: (item: ShowcaseItem) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ShowcaseItem | null>(null);

  if (item && !form) {
    setForm(item);
  }
  if (!item && form) {
    setForm(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form) {
      onSave(form);
      setForm(null);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={() => { setForm(null); onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item?.url ? "Edit" : "Add"} Portfolio Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={form?.type || "link"}
              onValueChange={(value) => setForm((prev) => prev ? { ...prev, type: value as ShowcaseItem["type"] } : null)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              type="url"
              value={form?.url || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, url: e.target.value } : null)}
              placeholder="https://..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={form?.title || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, title: e.target.value } : null)}
              placeholder="Item title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={form?.description || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, description: e.target.value } : null)}
              placeholder="Brief description"
              rows={2}
            />
          </div>
          {form?.type !== "image" && (
            <div className="space-y-2">
              <Label>Thumbnail URL (optional)</Label>
              <Input
                type="url"
                value={form?.thumbnailUrl || ""}
                onChange={(e) => setForm((prev) => prev ? { ...prev, thumbnailUrl: e.target.value } : null)}
                placeholder="https://..."
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setForm(null); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
