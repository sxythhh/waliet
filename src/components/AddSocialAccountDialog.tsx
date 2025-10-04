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
      <DialogContent className="sm:max-w-[500px] bg-card backdrop-blur-xl border-0">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold text-white">
            Connect Your Account
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose your platform and link your social media account
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Platform Selection - Card Style */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Platform</Label>
            <div className="grid grid-cols-3 gap-3">
              {(["tiktok", "instagram", "youtube"] as Platform[]).map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setSelectedPlatform(platform)}
                  className={`
                    relative flex flex-col items-center gap-3 p-4 rounded-xl
                    transition-all duration-300 hover:scale-105
                    ${selectedPlatform === platform 
                      ? 'bg-primary/10 ring-2 ring-primary' 
                      : 'bg-muted/30 hover:bg-muted/50'
                    }
                  `}
                >
                  <div className={`p-2 rounded-lg ${selectedPlatform === platform ? 'bg-primary/20' : 'bg-background/50'}`}>
                    {getPlatformIcon(platform)}
                  </div>
                  <span className={`text-xs font-medium ${selectedPlatform === platform ? 'text-primary' : 'text-foreground/70'}`}>
                    {getPlatformLabel(platform)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Username Input */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              Username
            </Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="mrbeast"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary pl-4"
              />
            </div>
            <p className="text-xs text-muted-foreground">Don't include the @ symbol</p>
          </div>

          {/* Account Link Input */}
          <div className="space-y-2">
            <Label htmlFor="accountLink" className="text-sm font-medium">
              Profile Link
            </Label>
            <div className="relative">
              <Input
                id="accountLink"
                type="url"
                placeholder={`https://${selectedPlatform}.com/@${username || "username"}`}
                value={accountLink}
                onChange={(e) => setAccountLink(e.target.value)}
                required
                className="bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full h-11 bg-primary hover:bg-primary/90 transition-colors" 
            disabled={uploading}
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting...
              </span>
            ) : (
              "Connect Account"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
