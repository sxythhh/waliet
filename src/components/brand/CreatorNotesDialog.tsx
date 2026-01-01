import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Plus, StickyNote, Tag } from "lucide-react";

interface CreatorNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatarUrl?: string | null;
  onSuccess?: () => void;
}

interface CreatorNote {
  id: string;
  brand_id: string;
  creator_id: string;
  note_content: string | null;
  tags: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const MAX_CHARS = 1000;

export function CreatorNotesDialog({
  open,
  onOpenChange,
  brandId,
  creatorId,
  creatorName,
  creatorUsername,
  creatorAvatarUrl,
  onSuccess
}: CreatorNotesDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [existingNote, setExistingNote] = useState<CreatorNote | null>(null);

  useEffect(() => {
    if (open && brandId && creatorId) {
      fetchNote();
    }
  }, [open, brandId, creatorId]);

  const fetchNote = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brand_creator_notes')
        .select('*')
        .eq('brand_id', brandId)
        .eq('creator_id', creatorId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingNote(data);
        setNoteContent(data.note_content || "");
        setTags(data.tags || []);
      } else {
        setExistingNote(null);
        setNoteContent("");
        setTags([]);
      }
    } catch (error) {
      console.error("Error fetching note:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const noteData = {
        brand_id: brandId,
        creator_id: creatorId,
        note_content: noteContent.trim() || null,
        tags: tags.length > 0 ? tags : null,
        created_by: user.id,
        updated_at: new Date().toISOString()
      };

      if (existingNote) {
        // Update existing note
        const { error } = await supabase
          .from('brand_creator_notes')
          .update(noteData)
          .eq('id', existingNote.id);

        if (error) throw error;
      } else {
        // Create new note
        const { error } = await supabase
          .from('brand_creator_notes')
          .insert(noteData);

        if (error) throw error;
      }

      toast.success("Note saved successfully");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving note:", error);
      toast.error(error.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const charsRemaining = MAX_CHARS - noteContent.length;
  const isOverLimit = charsRemaining < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={creatorAvatarUrl || ""} />
              <AvatarFallback>{creatorName[0]?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{creatorName}</div>
              <div className="text-sm text-muted-foreground font-normal">@{creatorUsername}</div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Add private notes and tags for this creator. Notes are visible to all team members.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Note Content */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Note
              </Label>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add notes about this creator..."
                className={`min-h-[120px] resize-none ${isOverLimit ? 'border-destructive' : ''}`}
              />
              <div className={`text-xs text-right ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                {charsRemaining} characters remaining
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag and press Enter"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="pl-2 pr-1 py-1 gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Tags help you organize and filter creators
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || isOverLimit}
              >
                {saving ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
