import { useState } from "react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import xLogo from "@/assets/x-logo.png";
import xLogoLight from "@/assets/x-logo-light.png";
import { z } from "zod";

// Helper function to extract username from URL based on platform
const extractUsernameFromUrl = (url: string, platform: Platform): string | null => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Validate domain matches platform
    if (platform === "tiktok" && !hostname.includes("tiktok.com")) {
      return null;
    }
    if (platform === "instagram" && !hostname.includes("instagram.com")) {
      return null;
    }
    if (platform === "youtube" && !hostname.includes("youtube.com")) {
      return null;
    }
    if (platform === "twitter" && !(hostname.includes("twitter.com") || hostname.includes("x.com"))) {
      return null;
    }
    
    // Extract username based on platform
    if (platform === "tiktok" || platform === "youtube") {
      // Format: https://www.tiktok.com/@username or https://www.youtube.com/@username
      // Handle with/without trailing slash and query params
      const match = urlObj.pathname.match(/@([^/?#]+)/);
      return match ? match[1].toLowerCase() : null;
    }
    
    if (platform === "instagram" || platform === "twitter") {
      // Format: https://www.instagram.com/username/ or https://twitter.com/username
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      return pathParts.length > 0 ? pathParts[0].toLowerCase() : null;
    }
    
    return null;
  } catch {
    return null;
  }
};

const socialAccountSchema = z.object({
  platform: z.enum(["tiktok", "instagram", "youtube", "twitter"], {
    required_error: "Please select a platform"
  }),
  username: z.string()
    .trim()
    .min(1, "Username is required")
    .max(100, "Username must be less than 100 characters")
    .refine((val) => !val.includes("@"), {
      message: "Username should not include @ symbol"
    }),
  accountLink: z.string()
    .trim()
    .url("Please enter a valid URL")
    .max(500, "URL must be less than 500 characters")
}).refine((data) => {
  const extractedUsername = extractUsernameFromUrl(data.accountLink, data.platform);
  if (!extractedUsername) {
    return false;
  }
  return extractedUsername === data.username.toLowerCase();
}, {
  message: "Username doesn't match the profile link. Please ensure they match.",
  path: ["accountLink"]
});
interface AddSocialAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
type Platform = "tiktok" | "instagram" | "youtube" | "twitter";
export function AddSocialAccountDialog({
  open,
  onOpenChange,
  onSuccess
}: AddSocialAccountDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("tiktok");
  const [username, setUsername] = useState("");
  const [accountLink, setAccountLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { theme } = useTheme();

  const handleXOAuth = async () => {
    const REDIRECT_URI = `${window.location.origin}/x/callback`;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to connect your X account"
      });
      return;
    }

    const STATE = btoa(JSON.stringify({ userId: session.user.id, returnTo: 'social_accounts' }));
    const codeChallenge = 'challenge';
    
    const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?` +
      `client_id=YXNfUndDN1BXZFZCOVhJMjFQaWQ6MTpjaQ&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=tweet.read%20users.read&` +
      `state=${STATE}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=plain`;

    const popup = window.open(twitterAuthUrl, 'X OAuth', 'width=500,height=700');

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'x-oauth-success') {
        popup?.close();
        toast({
          title: "Success!",
          description: "X account connected successfully."
        });
        setUsername("");
        setAccountLink("");
        setSelectedPlatform("tiktok");
        onOpenChange(false);
        onSuccess();
        window.removeEventListener('message', handleMessage);
      } else if (event.data.type === 'x-oauth-error') {
        popup?.close();
        toast({
          variant: "destructive",
          title: "Error",
          description: event.data.error || "Failed to connect X account."
        });
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const validation = socialAccountSchema.safeParse({
      platform: selectedPlatform,
      username,
      accountLink
    });
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validation.error.errors[0].message
      });
      return;
    }
    setUploading(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to add a social account"
        });
        return;
      }

      // Insert social account
      const {
        error: insertError
      } = await supabase.from('social_accounts').insert({
        user_id: session.user.id,
        platform: selectedPlatform,
        username: validation.data.username,
        account_link: validation.data.accountLink,
        is_verified: true
      });
      if (insertError) {
        throw insertError;
      }
      toast({
        title: "Success",
        description: "Social account connected successfully"
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
        description: error.message || "Failed to add social account"
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
      case "twitter":
        return "X (Twitter)";
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
      case "twitter":
        return <img src={theme === "light" ? xLogoLight : xLogo} alt="X" className={iconClass} />;
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
        <div className="flex flex-col">
          {/* Embed Section */}
          <div className="w-full h-[200px] border-b border-border">
            <iframe 
              src="https://joinvirality.com/accounts" 
              className="w-full h-full"
              title="Connect Accounts"
            />
          </div>
          
          <div className="p-6">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold font-inter tracking-[-0.5px]">
                Connect Your Account
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {/* Platform Selection - Icon Only */}
              <div className="space-y-3">
                <Label className="text-sm font-medium font-inter tracking-[-0.5px]">Select Platform</Label>
                <div className="flex gap-2">
                  {(["tiktok", "instagram", "youtube", "twitter"] as Platform[]).map(platform => (
                    <button 
                      key={platform} 
                      type="button" 
                      onClick={() => setSelectedPlatform(platform)} 
                      className={`
                        relative flex items-center justify-center p-3 rounded-lg
                        transition-all duration-300 hover:scale-105
                        ${selectedPlatform === platform ? 'bg-primary' : 'bg-muted/30 hover:bg-muted/50'}
                      `}
                    >
                      <div className={`p-1 rounded-lg ${selectedPlatform === platform ? '' : 'bg-background/50'}`}>
                        {getPlatformIcon(platform)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Show OAuth button for Twitter, manual input for others */}
              {selectedPlatform === "twitter" ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/20 border">
                    <p className="text-sm text-muted-foreground mb-4 font-inter tracking-[-0.5px]">
                      Connect your X account to automatically link your profile
                    </p>
                    <Button 
                      type="button"
                      onClick={handleXOAuth}
                      className="w-full h-11 bg-primary hover:bg-primary/90 transition-colors font-inter tracking-[-0.5px]"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <span className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Connecting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {getPlatformIcon("twitter")}
                          Connect with X
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Username Input */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium font-inter tracking-[-0.5px] flex items-center gap-2">
                      Username
                    </Label>
                    <div className="relative">
                      <Input 
                        id="username" 
                        placeholder="mrbeast" 
                        value={username} 
                        onChange={e => {
                          const cleanedValue = e.target.value.replace(/@/g, "");
                          setUsername(cleanedValue);
                        }} 
                        required 
                        className="bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary pl-4 font-inter tracking-[-0.5px]" 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Don't include the @ symbol</p>
                  </div>

                  {/* Account Link Input */}
                  <div className="space-y-2">
                    <Label htmlFor="accountLink" className="text-sm font-medium font-inter tracking-[-0.5px]">
                      Profile Link
                    </Label>
                    <div className="relative">
                      <Input 
                        id="accountLink" 
                        type="url" 
                        placeholder={`https://${selectedPlatform}.com/@${username || "username"}`} 
                        value={accountLink} 
                        onChange={e => setAccountLink(e.target.value)} 
                        required 
                        className="bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary font-inter tracking-[-0.5px]" 
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 transition-colors font-inter tracking-[-0.5px]" disabled={uploading}>
                    {uploading ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Connecting...
                      </span>
                    ) : (
                      "Connect Account"
                    )}
                  </Button>
                </>
              )}
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}