import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone, Lock } from "lucide-react";

const ADMIN_PASSWORD = "Ivelin2474.";

export function SendAnnouncementDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [sending, setSending] = useState(false);

  const handlePrepareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setShowPasswordConfirm(true);
  };

  const handleConfirmSend = async () => {
    if (password !== ADMIN_PASSWORD) {
      toast.error("Incorrect password");
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("announcements").insert({
        title: title.trim(),
        content: content.trim(),
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Announcement sent successfully!");
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error sending announcement:", error);
      toast.error("Failed to send announcement");
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setPassword("");
    setShowPasswordConfirm(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Megaphone className="h-4 w-4" />
          Send Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">
            {showPasswordConfirm ? "Confirm Announcement" : "Send Global Announcement"}
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.5px]">
            {showPasswordConfirm 
              ? "Enter your admin password to confirm sending this announcement to all creators."
              : "This announcement will appear in all creators' message widgets."
            }
          </DialogDescription>
        </DialogHeader>

        {!showPasswordConfirm ? (
          <form onSubmit={handlePrepareSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-inter tracking-[-0.5px]">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title..."
                className="font-inter tracking-[-0.5px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content" className="font-inter tracking-[-0.5px]">Message</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your announcement message..."
                className="min-h-[120px] font-inter tracking-[-0.5px]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || !content.trim()}>
                Continue
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium font-inter tracking-[-0.5px]">{title}</p>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] whitespace-pre-wrap">{content}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-inter tracking-[-0.5px] flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" />
                Admin Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                className="font-inter tracking-[-0.5px]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPasswordConfirm(false)}>
                Back
              </Button>
              <Button onClick={handleConfirmSend} disabled={sending || !password}>
                {sending ? "Sending..." : "Confirm & Send"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
