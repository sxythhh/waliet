import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
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
  const [uploading, setUploading] = useState(false);
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

      // Insert social account
      const { error: insertError } = await supabase
        .from('social_accounts')
        .insert({
          user_id: session.user.id,
          platform: selectedPlatform,
          username: validation.data.username,
          account_link: validation.data.accountLink,
          is_verified: true,
        });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Success",
        description: "Social account connected successfully",
      });

      // Reset form
      setUsername("");
      setAccountLink("");
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

  const getPlatformIcon = (platform: Platform) => {
    const iconClass = "h-5 w-5";
    switch (platform) {
      case "tiktok":
        return <img src={tiktokLogo} alt="TikTok" className={iconClass} />;
      case "instagram":
        return <img src={instagramLogo} alt="Instagram" className={iconClass} />;
      case "youtube":
        return <img src={youtubeLogo} alt="YouTube" className={iconClass} />;
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
                  className="flex-1 gap-2"
                >
                  {getPlatformIcon(platform)}
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

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading ? "Submitting..." : "Submit Account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
