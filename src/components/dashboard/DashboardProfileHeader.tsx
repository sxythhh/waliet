import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Camera, Plus, Link2, Check } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";
import xLogoDark from "@/assets/x-logo.png";
import xLogoLight from "@/assets/x-logo-light.png";
import defaultProfileBanner from "@/assets/default-profile-banner.png";

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  is_verified: boolean;
  account_link: string | null;
}

interface DashboardProfileHeaderProps {
  profile: {
    id: string;
    username: string | null;
    full_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    banner_url?: string | null;
    created_at: string;
  };
  socialAccounts: SocialAccount[];
  onEditProfile: () => void;
  onAddAccount: () => void;
  onAvatarUpdated: () => void;
}

export function DashboardProfileHeader({
  profile,
  socialAccounts,
  onEditProfile,
  onAddAccount,
  onAvatarUpdated,
}: DashboardProfileHeaderProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();

  const handleCopyProfileUrl = async () => {
    const profileUrl = `${window.location.origin}/@${profile.username}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Profile URL copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const getPlatformIcon = (platform: string) => {
    const iconClass = "h-5 w-5";
    const isDark = resolvedTheme === "dark";
    switch (platform) {
      case "instagram":
        return <img src={isDark ? instagramLogoWhite : instagramLogoBlack} alt="Instagram" className={iconClass} />;
      case "youtube":
        return <img src={isDark ? youtubeLogoWhite : youtubeLogoBlack} alt="YouTube" className={iconClass} />;
      case "tiktok":
        return <img src={isDark ? tiktokLogoWhite : tiktokLogoBlack} alt="TikTok" className={iconClass} />;
      case "x":
        return <img src={isDark ? xLogoDark : xLogoLight} alt="X" className={iconClass} />;
      default:
        return null;
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCacheBuster })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      toast.success("Avatar updated");
      onAvatarUpdated();
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ banner_url: urlWithCacheBuster })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      toast.success("Banner updated");
      onAvatarUpdated();
    } catch (error: any) {
      console.error("Error uploading banner:", error);
      toast.error("Failed to upload banner");
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = "";
      }
    }
  };

  const displayName = profile.full_name || profile.username || "Creator";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-8">
      {/* Banner with Avatar Overlap */}
      <div className="relative mb-16">
        {/* Banner */}
        <div
          className="w-full h-40 md:h-52 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 overflow-hidden relative group cursor-pointer"
          onClick={() => bannerInputRef.current?.click()}
        >
          <img
            src={profile.banner_url || defaultProfileBanner}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />

          {/* Upload overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex items-center gap-2 text-white text-sm font-medium">
              {uploadingBanner ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  <span>Change Banner</span>
                </>
              )}
            </div>
          </div>
        </div>

        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBannerUpload}
        />

        {/* Avatar - overlapping banner */}
        <div
          className="absolute -bottom-12 left-6 group cursor-pointer z-[5]"
          onClick={(e) => {
            e.stopPropagation();
            avatarInputRef.current?.click();
          }}
        >
          <Avatar className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-4 border-background shadow-xl">
            <AvatarImage src={profile.avatar_url || ""} className="object-cover rounded-2xl" />
            <AvatarFallback className="text-white text-2xl font-bold rounded-2xl bg-[#143fd4]">
              {displayName[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Upload overlay */}
          <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploadingAvatar ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </div>

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
      </div>

      {/* Profile Info */}
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold font-['Inter'] tracking-[-0.5px]">
                {displayName}
              </h1>
              <p className="text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                @{profile.username}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyProfileUrl}
                className="h-9 w-9 bg-muted/50 hover:bg-muted border-0"
                title="Copy profile URL"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={onEditProfile}
                className="font-['Inter'] tracking-[-0.5px] bg-muted/50 hover:bg-muted border-0"
              >
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Bio */}
          {profile.bio ? (
            <p className="mt-4 text-foreground/80 font-['Inter'] tracking-[-0.3px] leading-relaxed max-w-xl">
              {profile.bio}
            </p>
          ) : (
            <p className="mt-4 text-muted-foreground font-['Inter'] tracking-[-0.3px] italic">
              No bio yet. Click "Edit Profile" to add one.
            </p>
          )}

          {/* Connected Accounts */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {socialAccounts.map((account) => (
              <button
                key={account.id}
                onClick={() => account.account_link && window.open(account.account_link, "_blank")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 dark:bg-muted/40 hover:bg-muted transition-colors"
              >
                {getPlatformIcon(account.platform)}
                <span className="text-sm font-medium font-['Inter'] tracking-[-0.3px] text-foreground">
                  {account.username}
                </span>
              </button>
            ))}
            <button
              onClick={onAddAccount}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/60 dark:bg-muted/40 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium font-['Inter'] tracking-[-0.3px]">Add</span>
            </button>
          </div>

          {/* Join Date */}
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="font-['Inter'] tracking-[-0.5px]">
              Joined {format(new Date(profile.created_at), "MMMM yyyy")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
