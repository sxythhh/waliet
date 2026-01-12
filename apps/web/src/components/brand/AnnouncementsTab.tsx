import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Pin,
  MoreVertical,
  Pencil,
  Trash2,
  Send,
  Megaphone,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface Announcement {
  id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  created_by: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  reactions: {
    emoji: string;
    count: number;
    hasReacted: boolean;
  }[];
}

interface AnnouncementsTabProps {
  sourceType: "campaign" | "boost";
  sourceId: string;
}

export function AnnouncementsTab({ sourceType, sourceId }: AnnouncementsTabProps) {
  const { session } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editIsPinned, setEditIsPinned] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, [sourceType, sourceId]);

  const fetchAnnouncements = async () => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-announcements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "list",
            source_type: sourceType,
            source_id: sourceId,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setAnnouncements(data.data || []);
      } else {
        console.error("Error fetching announcements:", data.error);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!content.trim() || !session?.access_token) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-announcements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "create",
            source_type: sourceType,
            source_id: sourceId,
            content: content.trim(),
            is_pinned: isPinned,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Announcement posted");
        setContent("");
        setIsPinned(false);
        setCreating(false);
        fetchAnnouncements();
      } else {
        toast.error(data.error || "Failed to post announcement");
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to post announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (announcementId: string) => {
    if (!editContent.trim() || !session?.access_token) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-announcements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "update",
            announcement_id: announcementId,
            content: editContent.trim(),
            is_pinned: editIsPinned,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Announcement updated");
        setEditingId(null);
        fetchAnnouncements();
      } else {
        toast.error(data.error || "Failed to update announcement");
      }
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast.error("Failed to update announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-announcements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "delete",
            announcement_id: announcementId,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Announcement deleted");
        fetchAnnouncements();
      } else {
        toast.error(data.error || "Failed to delete announcement");
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    }
  };

  const startEditing = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setEditContent(announcement.content);
    setEditIsPinned(announcement.is_pinned);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted/30 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Create button / form */}
      {!creating ? (
        <Button
          onClick={() => setCreating(true)}
          className="w-full gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Post Announcement
        </Button>
      ) : (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <span className="font-medium font-inter tracking-[-0.5px]">
                New Announcement
              </span>
            </div>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement..."
              className="min-h-[100px] resize-none"
              autoFocus
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="pin-new"
                  checked={isPinned}
                  onCheckedChange={setIsPinned}
                />
                <Label
                  htmlFor="pin-new"
                  className="text-sm font-inter tracking-[-0.3px] text-muted-foreground cursor-pointer"
                >
                  Pin to top
                </Label>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCreating(false);
                    setContent("");
                    setIsPinned(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={!content.trim() || submitting}
                  className="gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  Post
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {announcements.length === 0 && !creating && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Megaphone className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <h3 className="font-inter tracking-[-0.5px] font-medium text-foreground">
            No announcements yet
          </h3>
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1 max-w-xs">
            Post announcements to keep your creators informed about updates, tips, and
            important news.
          </p>
        </div>
      )}

      {/* Announcements list */}
      <div className="space-y-3">
        {announcements.map((announcement) => (
          <Card
            key={announcement.id}
            className={`${
              announcement.is_pinned
                ? "border-primary/30 bg-primary/5"
                : "border-border/50"
            }`}
          >
            <CardContent className="p-4">
              {editingId === announcement.id ? (
                // Edit mode
                <div className="space-y-4">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[100px] resize-none"
                    autoFocus
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`pin-${announcement.id}`}
                        checked={editIsPinned}
                        onCheckedChange={setEditIsPinned}
                      />
                      <Label
                        htmlFor={`pin-${announcement.id}`}
                        className="text-sm font-inter tracking-[-0.3px] text-muted-foreground cursor-pointer"
                      >
                        Pin to top
                      </Label>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(announcement.id)}
                        disabled={!editContent.trim() || submitting}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {announcement.is_pinned && (
                        <Pin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm font-inter tracking-[-0.3px] whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditing(announcement)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(announcement.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Footer with author and reactions */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      {announcement.created_by && (
                        <>
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={announcement.created_by.avatar_url || ""} />
                            <AvatarFallback className="text-[10px]">
                              {announcement.created_by.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                            {announcement.created_by.username}
                          </span>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground/60">
                        ·
                      </span>
                      <span className="text-xs text-muted-foreground/60 font-inter tracking-[-0.3px]">
                        {formatDistanceToNow(new Date(announcement.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    {/* Reactions display */}
                    {announcement.reactions.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {announcement.reactions.map((reaction) => (
                          <Badge
                            key={reaction.emoji}
                            variant="secondary"
                            className="px-2 py-0.5 text-xs gap-1"
                          >
                            <span>{reaction.emoji}</span>
                            <span>{reaction.count}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
