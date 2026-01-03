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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone, ImageIcon, Link, Loader2, X, Upload } from "lucide-react";

export function SendAnnouncementDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [showAsPopup, setShowAsPopup] = useState(true);
  const [targetAudience, setTargetAudience] = useState("all");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePrepareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setShowConfirm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `announcement-${Date.now()}.${fileExt}`;
      const filePath = `announcements/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("public-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("public-assets")
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      toast.success("Image uploaded!");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmSend = async () => {
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("announcements").insert({
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl || null,
        cta_text: ctaText.trim() || null,
        cta_link: ctaLink.trim() || null,
        show_as_popup: showAsPopup,
        target_audience: targetAudience,
        created_by: user?.id,
      });

      if (error) {
        if (error.code === '42501' || error.message?.includes('policy')) {
          toast.error("You don't have permission to send announcements");
        } else {
          throw error;
        }
        return;
      }

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
    setImageUrl("");
    setCtaText("");
    setCtaLink("");
    setShowAsPopup(true);
    setTargetAudience("all");
    setShowConfirm(false);
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
            {showConfirm ? "Confirm Announcement" : "Send Global Announcement"}
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.5px]">
            {showConfirm 
              ? "Are you sure you want to send this announcement to all creators?"
              : "This announcement will appear in all creators' message widgets."
            }
          </DialogDescription>
        </DialogHeader>

        {!showConfirm ? (
          <form onSubmit={handlePrepareSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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
                className="min-h-[100px] font-inter tracking-[-0.5px]"
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="font-inter tracking-[-0.5px] flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Image <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              {imageUrl ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={imageUrl} alt="Preview" className="w-full h-32 object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-20 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                        Click to upload image
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            {/* CTA Section */}
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
              <Label className="font-inter tracking-[-0.5px] flex items-center gap-2">
                <Link className="h-4 w-4" />
                Call-to-Action <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Button text"
                  className="font-inter tracking-[-0.5px]"
                />
                <Input
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                  placeholder="Link URL"
                  className="font-inter tracking-[-0.5px]"
                />
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-inter tracking-[-0.5px]">Show as Popup</Label>
                  <p className="text-xs text-muted-foreground">Display as a modal on next login</p>
                </div>
                <Switch
                  checked={showAsPopup}
                  onCheckedChange={setShowAsPopup}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Target Audience</Label>
                <Select value={targetAudience} onValueChange={setTargetAudience}>
                  <SelectTrigger className="font-inter tracking-[-0.5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="creators">Creators Only</SelectItem>
                    <SelectItem value="brands">Brands Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
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
            <div className="rounded-lg border overflow-hidden">
              {imageUrl && (
                <img src={imageUrl} alt="Preview" className="w-full h-32 object-cover" />
              )}
              <div className="p-4 space-y-2">
                <p className="text-sm font-medium font-inter tracking-[-0.5px]">{title}</p>
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] whitespace-pre-wrap">{content}</p>
                {ctaText && ctaLink && (
                  <div className="pt-2">
                    <Button size="sm" className="w-full font-inter tracking-[-0.3px]">
                      {ctaText}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-0.5 bg-muted rounded-full capitalize">{targetAudience}</span>
              <span>{showAsPopup ? "Popup enabled" : "In-feed only"}</span>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowConfirm(false)}>
                Back
              </Button>
              <Button onClick={handleConfirmSend} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  "Confirm & Send"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
