import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { Camera, Upload, Pencil, Users, Grid3X3, Eye, FileText, X, Plus, ExternalLink, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  total_earnings: number;
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  account_link: string | null;
  follower_count: number | null;
  is_verified: boolean;
}

interface ProfileHeaderProps {
  totalViews?: number;
  totalPosts?: number;
}

export function ProfileHeader({ totalViews = 0, totalPosts = 0 }: ProfileHeaderProps) {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
    fetchSocialAccounts();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    setLoading(true);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, username, full_name, bio, avatar_url, banner_url, total_earnings")
      .eq("id", session.user.id)
      .single();
    
    if (profileData) {
      setProfile(profileData);
    }
    setLoading(false);
  };

  const fetchSocialAccounts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("social_accounts")
      .select("id, platform, username, account_link, follower_count, is_verified")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true });

    if (data) {
      setSocialAccounts(data);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      toast({ title: "Avatar updated successfully" });
    } catch (error: any) {
      toast({ title: "Error uploading avatar", description: error.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, banner_url: publicUrl });
      toast({ title: "Banner updated successfully" });
    } catch (error: any) {
      toast({ title: "Error uploading banner", description: error.message, variant: "destructive" });
    } finally {
      setUploadingBanner(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const isLightMode = resolvedTheme === "light";
    switch (platform.toLowerCase()) {
      case "tiktok":
        return isLightMode ? tiktokLogoBlack : tiktokLogo;
      case "instagram":
        return isLightMode ? instagramLogoBlack : instagramLogo;
      case "youtube":
        return isLightMode ? youtubeLogoBlack : youtubeLogo;
      default:
        return null;
    }
  };

  const formatFollowerCount = (count: number | null) => {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const totalFollowers = socialAccounts.reduce((sum, acc) => sum + (acc.follower_count || 0), 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-32 rounded-xl" />
        <div className="flex items-start gap-4">
          <Skeleton className="w-20 h-20 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative">
        <div 
          className="w-full h-32 md:h-40 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 overflow-hidden relative group cursor-pointer"
          onClick={() => bannerInputRef.current?.click()}
        >
          {profile?.banner_url ? (
            <img 
              src={profile.banner_url} 
              alt="Profile banner" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900" />
          )}
          
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
      </div>

      {/* Profile Card Section */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Avatar + Info */}
        <div className="flex items-start gap-4 flex-1">
          {/* Avatar */}
          <div 
            className="relative group cursor-pointer shrink-0"
            onClick={() => avatarInputRef.current?.click()}
          >
            <Avatar className="w-20 h-20 md:w-24 md:h-24 rounded-xl border-4 border-background shadow-lg">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.username} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold rounded-xl">
                {profile?.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            
            {/* Upload overlay */}
            <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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

          {/* Name + Edit */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl md:text-2xl font-bold text-foreground truncate font-inter tracking-[-0.5px]">
                {profile?.username || "Username"}
              </h2>
              <Button 
                size="sm" 
                variant="outline"
                className="h-7 px-2.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 border-0"
                onClick={() => navigate('/dashboard?tab=profile')}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit Profile
              </Button>
            </div>
            
            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Total Followers</span>
                <span className="font-semibold text-primary">{formatFollowerCount(totalFollowers)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Total Pages</span>
                <span className="font-semibold">{socialAccounts.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Stats Cards */}
        <div className="flex gap-3">
          <div className="bg-muted/50 dark:bg-[#141414] rounded-xl px-4 py-3 min-w-[100px]">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Total Views</span>
            </div>
            <p className="text-xl font-bold font-inter tracking-[-0.5px]">{formatFollowerCount(totalViews)}</p>
          </div>
          <div className="bg-muted/50 dark:bg-[#141414] rounded-xl px-4 py-3 min-w-[100px]">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Total Posts</span>
            </div>
            <p className="text-xl font-bold font-inter tracking-[-0.5px]">{totalPosts}</p>
          </div>
        </div>
      </div>

      <AddSocialAccountDialog 
        open={showAddAccountDialog} 
        onOpenChange={setShowAddAccountDialog}
        onSuccess={fetchSocialAccounts}
      />
    </div>
  );
}
