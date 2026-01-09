import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Play,
  ExternalLink,
  Pencil,
  Trash2,
  GripVertical,
  Plus,
  Check,
  X,
  Image,
  Link2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApprovedVideos } from "@/hooks/usePortfolio";
import { cn } from "@/lib/utils";
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
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [expandedShowcaseId, setExpandedShowcaseId] = useState<string | null>(null);
  const [addingVideo, setAddingVideo] = useState(false);
  const [addingShowcase, setAddingShowcase] = useState(false);

  const { data: approvedVideos } = useApprovedVideos();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Video handlers
  const handleSelectVideo = (video: NonNullable<typeof approvedVideos>[number]) => {
    const campaignTitle = (video.campaigns as any)?.title || "Untitled";
    const featured: FeaturedVideo = {
      id: crypto.randomUUID(),
      submissionId: video.id,
      title: video.title || campaignTitle,
      thumbnailUrl: video.thumbnail_url || undefined,
      views: video.views || 0,
      platform: video.platform || undefined,
    };
    onFeaturedVideosChange([...featuredVideos, featured]);
    setShowVideoSelector(false);
  };

  const handleUpdateVideo = (video: FeaturedVideo) => {
    onFeaturedVideosChange(featuredVideos.map((v) => (v.id === video.id ? video : v)));
    setExpandedVideoId(null);
  };

  const handleAddExternalVideo = (video: FeaturedVideo) => {
    onFeaturedVideosChange([...featuredVideos, video]);
    setAddingVideo(false);
  };

  const handleDeleteVideo = (id: string) => {
    onFeaturedVideosChange(featuredVideos.filter((v) => v.id !== id));
    setExpandedVideoId(null);
  };

  const handleVideoDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = featuredVideos.findIndex((v) => v.id === active.id);
      const newIndex = featuredVideos.findIndex((v) => v.id === over.id);
      onFeaturedVideosChange(arrayMove(featuredVideos, oldIndex, newIndex));
    }
  };

  // Showcase handlers
  const handleUpdateShowcase = (item: ShowcaseItem) => {
    onShowcaseItemsChange(showcaseItems.map((i) => (i.id === item.id ? item : i)));
    setExpandedShowcaseId(null);
  };

  const handleAddShowcase = (item: ShowcaseItem) => {
    onShowcaseItemsChange([...showcaseItems, item]);
    setAddingShowcase(false);
  };

  const handleDeleteShowcase = (id: string) => {
    onShowcaseItemsChange(showcaseItems.filter((i) => i.id !== id));
    setExpandedShowcaseId(null);
  };

  const handleShowcaseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = showcaseItems.findIndex((i) => i.id === active.id);
      const newIndex = showcaseItems.findIndex((i) => i.id === over.id);
      onShowcaseItemsChange(arrayMove(showcaseItems, oldIndex, newIndex));
    }
  };

  const availableVideos =
    approvedVideos?.filter((v) => !featuredVideos.some((f) => f.submissionId === v.id)) || [];

  return (
    <div className="space-y-6">
      {/* Featured Videos Section */}
      <div className="space-y-3">
        <button
          onClick={() => setVideosOpen(!videosOpen)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-sm tracking-[-0.5px]">Featured Videos</span>
            {featuredVideos.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
                {featuredVideos.length}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{videosOpen ? "Hide" : "Show"}</span>
        </button>

        {videosOpen && (
          <div className="space-y-3 pl-8">
            {featuredVideos.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleVideoDragEnd}
              >
                <SortableContext
                  items={featuredVideos.map((v) => v.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {featuredVideos.map((video) => (
                      <SortableVideoCard
                        key={video.id}
                        video={video}
                        isExpanded={expandedVideoId === video.id}
                        onToggle={() =>
                          setExpandedVideoId(expandedVideoId === video.id ? null : video.id)
                        }
                        onSave={handleUpdateVideo}
                        onDelete={() => handleDeleteVideo(video.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Add Video Inline Form */}
            {addingVideo ? (
              <AddVideoForm
                onSave={handleAddExternalVideo}
                onCancel={() => setAddingVideo(false)}
              />
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setAddingVideo(true)}
                  className={cn(
                    "flex-1 p-3 rounded-xl border-2 border-dashed border-border/60",
                    "flex items-center justify-center gap-2",
                    "text-sm text-muted-foreground font-medium",
                    "hover:border-primary/40 hover:text-foreground hover:bg-muted/30",
                    "transition-all duration-200"
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Add External Video
                </button>
                {availableVideos.length > 0 && (
                  <button
                    onClick={() => setShowVideoSelector(true)}
                    className={cn(
                      "px-4 py-3 rounded-xl border-2 border-dashed border-border/60",
                      "flex items-center justify-center gap-2",
                      "text-sm text-muted-foreground font-medium",
                      "hover:border-primary/40 hover:text-foreground hover:bg-muted/30",
                      "transition-all duration-200"
                    )}
                  >
                    <Play className="h-4 w-4" />
                    From Submissions
                  </button>
                )}
              </div>
            )}

            {featuredVideos.length === 0 && !addingVideo && (
              <div className="text-center py-6 text-muted-foreground text-sm tracking-[-0.5px]">
                <p>No featured videos yet</p>
                <p className="text-xs mt-1">Add videos from your submissions or external links</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Portfolio Items Section */}
      <div className="space-y-3">
        <button
          onClick={() => setShowcaseOpen(!showcaseOpen)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-sm tracking-[-0.5px]">Portfolio Items</span>
            {showcaseItems.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
                {showcaseItems.length}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{showcaseOpen ? "Hide" : "Show"}</span>
        </button>

        {showcaseOpen && (
          <div className="space-y-3 pl-8">
            {showcaseItems.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleShowcaseDragEnd}
              >
                <SortableContext
                  items={showcaseItems.map((i) => i.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {showcaseItems.map((item) => (
                      <SortableShowcaseCard
                        key={item.id}
                        item={item}
                        isExpanded={expandedShowcaseId === item.id}
                        onToggle={() =>
                          setExpandedShowcaseId(expandedShowcaseId === item.id ? null : item.id)
                        }
                        onSave={handleUpdateShowcase}
                        onDelete={() => handleDeleteShowcase(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Add Showcase Item Inline Form */}
            {addingShowcase ? (
              <AddShowcaseForm
                onSave={handleAddShowcase}
                onCancel={() => setAddingShowcase(false)}
              />
            ) : (
              <button
                onClick={() => setAddingShowcase(true)}
                className={cn(
                  "w-full p-3 rounded-xl border-2 border-dashed border-border/60",
                  "flex items-center justify-center gap-2",
                  "text-sm text-muted-foreground font-medium",
                  "hover:border-primary/40 hover:text-foreground hover:bg-muted/30",
                  "transition-all duration-200"
                )}
              >
                <Plus className="h-4 w-4" />
                Add Portfolio Item
              </button>
            )}

            {showcaseItems.length === 0 && !addingShowcase && (
              <div className="text-center py-6 text-muted-foreground text-sm tracking-[-0.5px]">
                <p>No portfolio items yet</p>
                <p className="text-xs mt-1">Add images, links, or documents to showcase your work</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Selector Dialog */}
      <Dialog open={showVideoSelector} onOpenChange={setShowVideoSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select from Approved Videos</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
            {availableVideos.map((video) => (
              <button
                key={video.id}
                className="text-left group rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
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
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-xs mt-1.5 truncate font-medium">
                  {video.title || (video.campaigns as any)?.title || "Untitled"}
                </p>
                {video.views && (
                  <p className="text-xs text-muted-foreground">
                    {video.views.toLocaleString()} views
                  </p>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sortable Video Card
function SortableVideoCard({
  video,
  isExpanded,
  onToggle,
  onSave,
  onDelete,
}: {
  video: FeaturedVideo;
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (video: FeaturedVideo) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: video.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [form, setForm] = useState(video);

  const handleSave = () => {
    onSave(form);
  };

  if (isExpanded) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "col-span-full p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4",
          isDragging && "opacity-60"
        )}
      >
        <div className="flex items-start gap-3">
          <button
            className="mt-0.5 p-1 rounded cursor-grab active:cursor-grabbing hover:bg-muted/50"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/60" />
          </button>
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Video title"
              />
            </div>
            {form.externalUrl !== undefined && (
              <div className="space-y-2">
                <Label className="text-xs">Video URL</Label>
                <Input
                  type="url"
                  value={form.externalUrl || ""}
                  onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Thumbnail URL</Label>
              <Input
                type="url"
                value={form.thumbnailUrl || ""}
                onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
          <div className="flex-1" />
          <Button type="button" variant="ghost" size="sm" onClick={onToggle}>
            <X className="h-4 w-4 mr-1.5" />
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            <Check className="h-4 w-4 mr-1.5" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group relative", isDragging && "opacity-60 z-50")}
    >
      <div className="relative aspect-video bg-muted rounded-xl overflow-hidden border border-border/50 shadow-sm">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Play className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {video.externalUrl && (
              <a
                href={video.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={onDelete}
              className="p-2 rounded-lg bg-white/20 hover:bg-red-500/80 text-white transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drag handle */}
        <button
          className={cn(
            "absolute top-2 left-2 p-1.5 rounded-lg bg-black/40 text-white/80",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "cursor-grab active:cursor-grabbing hover:bg-black/60"
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Play icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
          <div className="p-3 rounded-full bg-black/40">
            <Play className="h-5 w-5 text-white fill-white" />
          </div>
        </div>
      </div>

      <div className="mt-2 px-0.5">
        <p className="text-sm font-medium truncate">{video.title}</p>
        {video.views !== undefined && video.views > 0 && (
          <p className="text-xs text-muted-foreground">
            {video.views.toLocaleString()} views
          </p>
        )}
      </div>
    </div>
  );
}

// Sortable Showcase Card
function SortableShowcaseCard({
  item,
  isExpanded,
  onToggle,
  onSave,
  onDelete,
}: {
  item: ShowcaseItem;
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (item: ShowcaseItem) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [form, setForm] = useState(item);

  const handleSave = () => {
    onSave(form);
  };

  const TypeIcon = item.type === "image" ? Image : item.type === "link" ? Link2 : FileText;

  if (isExpanded) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "col-span-full p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4",
          isDragging && "opacity-60"
        )}
      >
        <div className="flex items-start gap-3">
          <button
            className="mt-0.5 p-1 rounded cursor-grab active:cursor-grabbing hover:bg-muted/50"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/60" />
          </button>
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm({ ...form, type: value as ShowcaseItem["type"] })}
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
              <Label className="text-xs">URL</Label>
              <Input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Item title"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description"
                rows={2}
              />
            </div>
            {form.type !== "image" && (
              <div className="space-y-2">
                <Label className="text-xs">Thumbnail URL</Label>
                <Input
                  type="url"
                  value={form.thumbnailUrl || ""}
                  onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
          <div className="flex-1" />
          <Button type="button" variant="ghost" size="sm" onClick={onToggle}>
            <X className="h-4 w-4 mr-1.5" />
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            <Check className="h-4 w-4 mr-1.5" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group relative", isDragging && "opacity-60 z-50")}
    >
      <div className="relative aspect-square bg-muted rounded-xl overflow-hidden border border-border/50 shadow-sm">
        {item.thumbnailUrl || item.type === "image" ? (
          <img
            src={item.thumbnailUrl || item.url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <TypeIcon className="h-8 w-8 text-muted-foreground/40 mb-1" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {item.type}
            </span>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg bg-white/20 hover:bg-red-500/80 text-white transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drag handle */}
        <button
          className={cn(
            "absolute top-2 left-2 p-1.5 rounded-lg bg-black/40 text-white/80",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "cursor-grab active:cursor-grabbing hover:bg-black/60"
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Type badge */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/40 text-white text-[10px] uppercase tracking-wide">
          {item.type}
        </div>
      </div>

      <div className="mt-2 px-0.5">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        )}
      </div>
    </div>
  );
}

// Add Video Form (inline)
function AddVideoForm({
  onSave,
  onCancel,
}: {
  onSave: (video: FeaturedVideo) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FeaturedVideo>({
    id: crypto.randomUUID(),
    title: "",
    externalUrl: "",
  });

  const handleSave = () => {
    if (form.title && form.externalUrl) {
      onSave(form);
    }
  };

  return (
    <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Plus className="h-4 w-4" />
        Add External Video
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Video URL</Label>
          <Input
            type="url"
            value={form.externalUrl || ""}
            onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Title</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Video title"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Description (optional)</Label>
          <Textarea
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Thumbnail URL (optional)</Label>
          <Input
            type="url"
            value={form.thumbnailUrl || ""}
            onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-1.5" />
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!form.title || !form.externalUrl}
        >
          <Check className="h-4 w-4 mr-1.5" />
          Add Video
        </Button>
      </div>
    </div>
  );
}

// Add Showcase Form (inline)
function AddShowcaseForm({
  onSave,
  onCancel,
}: {
  onSave: (item: ShowcaseItem) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ShowcaseItem>({
    id: crypto.randomUUID(),
    type: "link",
    url: "",
    title: "",
  });

  const handleSave = () => {
    if (form.title && form.url) {
      onSave(form);
    }
  };

  return (
    <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Plus className="h-4 w-4" />
        Add Portfolio Item
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Type</Label>
          <Select
            value={form.type}
            onValueChange={(value) => setForm({ ...form, type: value as ShowcaseItem["type"] })}
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
          <Label className="text-xs">URL</Label>
          <Input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Title</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Item title"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Description (optional)</Label>
          <Textarea
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description"
            rows={2}
          />
        </div>
        {form.type !== "image" && (
          <div className="space-y-2">
            <Label className="text-xs">Thumbnail URL (optional)</Label>
            <Input
              type="url"
              value={form.thumbnailUrl || ""}
              onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-1.5" />
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!form.title || !form.url}
        >
          <Check className="h-4 w-4 mr-1.5" />
          Add Item
        </Button>
      </div>
    </div>
  );
}
