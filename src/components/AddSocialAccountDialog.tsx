import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";
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
      <DialogContent className="sm:max-w-[700px] bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Add Social Account
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground/80">
            Connect your social media account for verification
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground/90">Platform</Label>
            <div className="grid grid-cols-3 gap-3">
              {(["tiktok", "instagram", "youtube"] as Platform[]).map((platform) => (
                <Button
                  key={platform}
                  type="button"
                  variant={selectedPlatform === platform ? "default" : "outline"}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`h-auto py-4 flex-col gap-3 transition-all duration-300 ${
                    selectedPlatform === platform
                      ? "bg-primary hover:bg-primary/90 border-primary shadow-lg shadow-primary/20"
                      : "bg-muted/30 hover:bg-muted/50 border-border/40"
                  }`}
                >
                  <div className={`transition-transform duration-300 ${selectedPlatform === platform ? "scale-110" : ""}`}>
                    {getPlatformIcon(platform)}
                  </div>
                  <span className="text-sm font-medium">{getPlatformLabel(platform)}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Username */}
          <div className="space-y-3">
            <Label htmlFor="username" className="text-sm font-semibold text-foreground/90">
              Account Username <span className="text-muted-foreground font-normal">(don't include the @)</span>
            </Label>
            <Input
              id="username"
              placeholder="Example: mrbeast"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="h-12 bg-muted/30 border-border/40 focus-visible:border-primary/50 focus-visible:bg-muted/40"
            />
          </div>

          {/* Account Link */}
          <div className="space-y-3">
            <Label htmlFor="accountLink" className="text-sm font-semibold text-foreground/90">Account Link</Label>
            <Input
              id="accountLink"
              type="url"
              placeholder={`https://${selectedPlatform}.com/@${username || "username"}`}
              value={accountLink}
              onChange={(e) => setAccountLink(e.target.value)}
              required
              className="h-12 bg-muted/30 border-border/40 focus-visible:border-primary/50 focus-visible:bg-muted/40"
            />
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground/90">
              Screenshot Proof <span className="text-muted-foreground font-normal">(edit profile screen)</span>
            </Label>
            <div
              className="relative group border-2 border-dashed border-border/40 rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-all duration-300 bg-muted/20 hover:bg-muted/30"
              onClick={() => fileInputRef.current?.click()}
            >
              {screenshot ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{screenshot.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Click to change image</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted/40 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Upload className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Upload Screenshot</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG or WEBP (max 10MB)</p>
                  </div>
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
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all" 
            disabled={uploading}
          >
            {uploading ? "Submitting..." : "Submit Account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
