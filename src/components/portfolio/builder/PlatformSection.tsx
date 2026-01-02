import { useState } from "react";
import { Plus, Trash2, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AVAILABLE_PLATFORMS } from "@/types/portfolio";
import type { PlatformInfo } from "@/types/portfolio";

interface PlatformSectionProps {
  platforms: PlatformInfo[];
  onChange: (platforms: PlatformInfo[]) => void;
}

// Platform icons using simple text/emoji for now
const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case "tiktok": return "TikTok";
    case "youtube": return "YouTube";
    case "instagram": return "Instagram";
    case "twitter": return "X";
    case "twitch": return "Twitch";
    case "linkedin": return "LinkedIn";
    case "facebook": return "Facebook";
    case "snapchat": return "Snapchat";
    case "pinterest": return "Pinterest";
    case "threads": return "Threads";
    default: return platform;
  }
};

const getPlatformColor = (platform: string) => {
  switch (platform.toLowerCase()) {
    case "tiktok": return "bg-black text-white";
    case "youtube": return "bg-red-600 text-white";
    case "instagram": return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
    case "twitter": return "bg-black text-white";
    case "twitch": return "bg-purple-600 text-white";
    case "linkedin": return "bg-blue-600 text-white";
    case "facebook": return "bg-blue-500 text-white";
    case "snapchat": return "bg-yellow-400 text-black";
    case "pinterest": return "bg-red-500 text-white";
    case "threads": return "bg-black text-white";
    default: return "bg-muted text-foreground";
  }
};

export function PlatformSection({ platforms, onChange }: PlatformSectionProps) {
  const [editingPlatform, setEditingPlatform] = useState<PlatformInfo | null>(null);

  const handleSave = (platform: PlatformInfo) => {
    const existing = platforms.find((p) => p.platform === platform.platform);
    if (existing) {
      onChange(platforms.map((p) => (p.platform === platform.platform ? platform : p)));
    } else {
      onChange([...platforms, platform]);
    }
    setEditingPlatform(null);
  };

  const handleDelete = (platformId: string) => {
    onChange(platforms.filter((p) => p.platform !== platformId));
  };

  const usedPlatforms = platforms.map((p) => p.platform);
  const availablePlatforms = AVAILABLE_PLATFORMS.filter((p) => !usedPlatforms.includes(p.id));

  const formatFollowers = (count: number | undefined) => {
    if (!count) return null;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="space-y-4">
      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {platforms.map((platform) => (
          <div
            key={platform.platform}
            className="flex items-center justify-between p-3 border border-border rounded-lg bg-background"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${getPlatformColor(platform.platform)}`}>
                {getPlatformIcon(platform.platform).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm">@{platform.handle}</span>
                  {platform.verified && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {getPlatformIcon(platform.platform)}
                  {platform.followers && ` \u2022 ${formatFollowers(platform.followers)} followers`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {platform.url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(platform.url, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setEditingPlatform(platform)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => handleDelete(platform.platform)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Platform Button */}
      {availablePlatforms.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setEditingPlatform({
            platform: availablePlatforms[0].id,
            handle: "",
            url: "",
          })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Platform
        </Button>
      )}

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Connect your social platforms to show your reach and help brands find you.
      </p>

      {/* Platform Dialog */}
      <PlatformDialog
        item={editingPlatform}
        availablePlatforms={availablePlatforms}
        currentPlatforms={platforms}
        onSave={handleSave}
        onClose={() => setEditingPlatform(null)}
      />
    </div>
  );
}

// Platform Dialog
function PlatformDialog({
  item,
  availablePlatforms,
  currentPlatforms,
  onSave,
  onClose,
}: {
  item: PlatformInfo | null;
  availablePlatforms: typeof AVAILABLE_PLATFORMS;
  currentPlatforms: PlatformInfo[];
  onSave: (item: PlatformInfo) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PlatformInfo | null>(null);

  const isEditing = item && currentPlatforms.some((p) => p.platform === item.platform);

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

  const allPlatforms = isEditing
    ? [AVAILABLE_PLATFORMS.find((p) => p.id === item?.platform)!]
    : availablePlatforms;

  return (
    <Dialog open={!!item} onOpenChange={() => { setForm(null); onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Add"} Platform</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select
              value={form?.platform || ""}
              onValueChange={(value) => setForm((prev) => prev ? { ...prev, platform: value } : null)}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {allPlatforms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Username/Handle</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              <Input
                value={form?.handle || ""}
                onChange={(e) => setForm((prev) => prev ? { ...prev, handle: e.target.value } : null)}
                placeholder="username"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Profile URL</Label>
            <Input
              type="url"
              value={form?.url || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, url: e.target.value } : null)}
              placeholder="https://..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Follower Count (optional)</Label>
            <Input
              type="number"
              value={form?.followers || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, followers: parseInt(e.target.value) || undefined } : null)}
              placeholder="e.g., 50000"
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
