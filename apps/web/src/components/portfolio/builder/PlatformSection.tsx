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
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  GripVertical,
  ExternalLink,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AVAILABLE_PLATFORMS } from "@/types/portfolio";
import type { PlatformInfo } from "@/types/portfolio";

interface PlatformSectionProps {
  platforms: PlatformInfo[];
  onChange: (platforms: PlatformInfo[]) => void;
}

// Platform styling config
const getPlatformColor = (platform: string) => {
  switch (platform.toLowerCase()) {
    case "tiktok":
      return "bg-black text-white";
    case "youtube":
      return "bg-red-600 text-white";
    case "instagram":
      return "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white";
    case "twitter":
      return "bg-black text-white";
    case "twitch":
      return "bg-purple-600 text-white";
    case "linkedin":
      return "bg-blue-700 text-white";
    case "facebook":
      return "bg-blue-600 text-white";
    case "snapchat":
      return "bg-yellow-400 text-black";
    case "pinterest":
      return "bg-red-600 text-white";
    case "threads":
      return "bg-black text-white";
    default:
      return "bg-muted text-foreground";
  }
};

const getPlatformLabel = (platform: string) => {
  return AVAILABLE_PLATFORMS.find((p) => p.id === platform)?.name || platform;
};

const formatFollowers = (count: number | undefined) => {
  if (!count) return null;
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export function PlatformSection({ platforms, onChange }: PlatformSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingPlatform, setAddingPlatform] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = platforms.findIndex((p) => p.platform === active.id);
      const newIndex = platforms.findIndex((p) => p.platform === over.id);
      onChange(arrayMove(platforms, oldIndex, newIndex));
    }
  };

  const handleUpdate = (platform: PlatformInfo) => {
    onChange(platforms.map((p) => (p.platform === platform.platform ? platform : p)));
    setExpandedId(null);
  };

  const handleAdd = (platform: PlatformInfo) => {
    onChange([...platforms, platform]);
    setAddingPlatform(false);
  };

  const handleDelete = (platformId: string) => {
    onChange(platforms.filter((p) => p.platform !== platformId));
    setExpandedId(null);
  };

  const usedPlatforms = platforms.map((p) => p.platform);
  const availablePlatforms = AVAILABLE_PLATFORMS.filter((p) => !usedPlatforms.includes(p.id));

  return (
    <div className="space-y-4">
      {platforms.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={platforms.map((p) => p.platform)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {platforms.map((platform) => (
                <SortablePlatformCard
                  key={platform.platform}
                  platform={platform}
                  isExpanded={expandedId === platform.platform}
                  onToggle={() =>
                    setExpandedId(expandedId === platform.platform ? null : platform.platform)
                  }
                  onSave={handleUpdate}
                  onDelete={() => handleDelete(platform.platform)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Platform Form */}
      {addingPlatform ? (
        <AddPlatformForm
          availablePlatforms={availablePlatforms}
          onSave={handleAdd}
          onCancel={() => setAddingPlatform(false)}
        />
      ) : availablePlatforms.length > 0 ? (
        <button
          onClick={() => setAddingPlatform(true)}
          className={cn(
            "w-full p-3 rounded-xl border-2 border-dashed border-border/60",
            "flex items-center justify-center gap-2",
            "text-sm text-muted-foreground font-medium",
            "hover:border-primary/40 hover:text-foreground hover:bg-muted/30",
            "transition-all duration-200"
          )}
        >
          <Plus className="h-4 w-4" />
          Add Platform
        </button>
      ) : null}

      {platforms.length === 0 && !addingPlatform && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No platforms connected yet</p>
          <p className="text-xs mt-1">Add your social platforms to show brands your reach</p>
        </div>
      )}
    </div>
  );
}

// Sortable Platform Card
function SortablePlatformCard({
  platform,
  isExpanded,
  onToggle,
  onSave,
  onDelete,
}: {
  platform: PlatformInfo;
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (platform: PlatformInfo) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: platform.platform,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [form, setForm] = useState(platform);

  const handleSave = () => {
    onSave(form);
  };

  if (isExpanded) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4",
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
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold",
                  getPlatformColor(platform.platform)
                )}
              >
                {getPlatformLabel(platform.platform).slice(0, 2).toUpperCase()}
              </div>
              <span className="font-medium">{getPlatformLabel(platform.platform)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Username</Label>
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-1">@</span>
                  <Input
                    value={form.handle}
                    onChange={(e) => setForm({ ...form, handle: e.target.value })}
                    placeholder="username"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Followers</Label>
                <Input
                  type="number"
                  value={form.followers || ""}
                  onChange={(e) =>
                    setForm({ ...form, followers: parseInt(e.target.value, 10) || undefined })
                  }
                  placeholder="50000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Profile URL</Label>
              <Input
                type="url"
                value={form.url || ""}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
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
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-white dark:bg-card/60",
        "hover:border-border hover:shadow-sm transition-all",
        isDragging && "opacity-60 shadow-lg"
      )}
    >
      {/* Drag Handle */}
      <button
        className={cn(
          "p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
          "cursor-grab active:cursor-grabbing hover:bg-muted"
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/60" />
      </button>

      {/* Platform Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
          getPlatformColor(platform.platform)
        )}
      >
        {getPlatformLabel(platform.platform).slice(0, 2).toUpperCase()}
      </div>

      {/* Platform Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm">@{platform.handle}</span>
          {platform.verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />}
        </div>
        <p className="text-xs text-muted-foreground">
          {getPlatformLabel(platform.platform)}
          {platform.followers && ` · ${formatFollowers(platform.followers)} followers`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {platform.url && (
          <a
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// Add Platform Form
function AddPlatformForm({
  availablePlatforms,
  onSave,
  onCancel,
}: {
  availablePlatforms: typeof AVAILABLE_PLATFORMS;
  onSave: (platform: PlatformInfo) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PlatformInfo>({
    platform: availablePlatforms[0]?.id || "",
    handle: "",
    url: "",
  });

  const handleSave = () => {
    if (form.platform && form.handle) {
      onSave(form);
    }
  };

  return (
    <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Plus className="h-4 w-4" />
        Add Platform
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Platform</Label>
          <Select
            value={form.platform}
            onValueChange={(value) => setForm({ ...form, platform: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {availablePlatforms.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Username</Label>
            <div className="flex items-center">
              <span className="text-muted-foreground mr-1">@</span>
              <Input
                value={form.handle}
                onChange={(e) => setForm({ ...form, handle: e.target.value })}
                placeholder="username"
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Followers (optional)</Label>
            <Input
              type="number"
              value={form.followers || ""}
              onChange={(e) =>
                setForm({ ...form, followers: parseInt(e.target.value, 10) || undefined })
              }
              placeholder="50000"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Profile URL</Label>
          <Input
            type="url"
            value={form.url || ""}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
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
          disabled={!form.platform || !form.handle}
        >
          <Check className="h-4 w-4 mr-1.5" />
          Add Platform
        </Button>
      </div>
    </div>
  );
}
