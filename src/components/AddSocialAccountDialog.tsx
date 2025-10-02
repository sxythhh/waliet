import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";
import { z } from "zod";

const socialAccountSchema = z.object({
  platform: z.enum(["tiktok", "instagram", "youtube"], {
    required_error: "Please select a platform",
  }),
  username: z.string().trim().min(1, "Username is required").max(100, "Username must be less than 100 characters"),
  accountLink: z.string().trim().url("Please enter a valid URL").max(500, "URL must be less than 500 characters"),
});

interface AddSocialAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Platform = "tiktok" | "instagram" | "youtube";

export function AddSocialAccountDialog({ open, onOpenChange, onSuccess }: AddSocialAccountDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("tiktok");
  const [username, setUsername] = useState("");
  const [accountLink, setAccountLink] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const validation = socialAccountSchema.safeParse({
      platform: selectedPlatform,
      username,
      accountLink,
    });

    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validation.error.errors[0].message,
      });
      return;
    }

    if (!screenshot) {
      toast({
        variant: "destructive",
        title: "Screenshot Required",
        description: "Please upload a screenshot proving your ownership",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to add a social account",
        });
        return;
      }

      // Upload screenshot
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${session.user.id}/${selectedPlatform}_${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('verification-screenshots')
        .upload(fileName, screenshot);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-screenshots')
        .getPublicUrl(fileName);

      // Insert social account
      const { error: insertError } = await supabase
        .from('social_accounts')
        .insert({
          user_id: session.user.id,
          platform: selectedPlatform,
          username: validation.data.username,
          account_link: validation.data.accountLink,
          verification_screenshot_url: publicUrl,
          is_verified: false,
        });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Success",
        description: "Social account submitted for verification",
      });

      // Reset form
      setUsername("");
      setAccountLink("");
      setScreenshot(null);
      setSelectedPlatform("tiktok");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add social account",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload an image file",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Image must be less than 10MB",
      });
      return;
    }

    setScreenshot(file);
  };

  const getPlatformLabel = (platform: Platform) => {
    switch (platform) {
      case "tiktok":
        return "TikTok";
      case "instagram":
        return "Instagram";
      case "youtube":
        return "YouTube";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card">
        <DialogHeader>
          <DialogTitle>Add Social Account</DialogTitle>
          <DialogDescription>
            Connect your social media account for verification
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Platform</Label>
            <div className="flex gap-2">
              {(["tiktok", "instagram", "youtube"] as Platform[]).map((platform) => (
                <Button
                  key={platform}
                  type="button"
                  variant={selectedPlatform === platform ? "default" : "outline"}
                  onClick={() => setSelectedPlatform(platform)}
                  className="flex-1"
                >
                  {getPlatformLabel(platform)}
                </Button>
              ))}
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Account Username (don't include the @)</Label>
            <Input
              id="username"
              placeholder="Example: mrbeast"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Account Link */}
          <div className="space-y-2">
            <Label htmlFor="accountLink">Account Link</Label>
            <Input
              id="accountLink"
              type="url"
              placeholder={`https://${selectedPlatform}.com/@${username || "username"}`}
              value={accountLink}
              onChange={(e) => setAccountLink(e.target.value)}
              required
            />
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <Label>Please attach a screenshot proving your ownership (edit profile screen)</Label>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {screenshot ? (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-sm font-medium">{screenshot.name}</p>
                  <p className="text-xs text-muted-foreground">Click to change</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Upload Image</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              required
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading ? "Submitting..." : "Submit Account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
