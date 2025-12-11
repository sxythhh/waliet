import { useEffect, useState, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, DollarSign, TrendingUp, Eye, Upload, Plus, Instagram, Youtube, CheckCircle2, Copy, Link2, X, Calendar, LogOut, Settings, ArrowUpRight, Globe, Video, Type, ChevronDown, Unlink } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { SubmitDemographicsDialog } from "@/components/SubmitDemographicsDialog";
import { DemographicStatusCard } from "@/components/DemographicStatusCard";
import { ManageAccountDialog } from "@/components/ManageAccountDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PhoneInput } from "@/components/PhoneInput";
import { DiscordLinkDialog } from "@/components/DiscordLinkDialog";
import { useTheme } from "next-themes";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoBlack from "@/assets/instagram-logo-new.png";
import youtubeLogoBlack from "@/assets/youtube-logo-new.png";
import emptyAccountsImage from "@/assets/empty-accounts.png";
import demographicsIcon from "@/assets/demographics-icon.svg";
interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  total_earnings: number;
  trust_score: number;
  demographics_score: number;
  views_score: number;
  country: string | null;
  city: string | null;
  phone_number: string | null;
  discord_id: string | null;
  discord_username: string | null;
  discord_discriminator: string | null;
  discord_avatar: string | null;
  discord_email: string | null;
  discord_connected_at: string | null;
  twitter_id: string | null;
  twitter_username: string | null;
  twitter_name: string | null;
  twitter_avatar: string | null;
  twitter_connected_at: string | null;
  referral_code: string | null;
  content_languages: string[] | null;
  content_styles: string[] | null;
  content_niches: string[] | null;
  hide_from_leaderboard: boolean;
}
interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  account_link: string | null;
  follower_count: number;
  is_verified: boolean;
  connected_at: string;
  connected_campaigns?: Array<{
    connection_id: string;
    campaign: {
      id: string;
      title: string;
      brand_name: string;
      brand_logo_url: string | null;
    };
  }>;
  demographic_submissions?: Array<{
    id: string;
    tier1_percentage: number;
    status: string;
    score: number | null;
    submitted_at: string;
    reviewed_at: string | null;
    screenshot_url: string | null;
  }>;
}
interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  brands?: {
    logo_url: string;
  } | null;
}
export function ProfileTab() {
  const navigate = useNavigate();
  const {
    theme
  } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [joinedCampaigns, setJoinedCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showManageAccountDialog, setShowManageAccountDialog] = useState(false);
  const [selectedAccountForManaging, setSelectedAccountForManaging] = useState<{
    id: string;
    username: string;
    platform: string;
    account_link?: string | null;
  } | null>(null);
  const [showDemographicsDialog, setShowDemographicsDialog] = useState(false);
  const [selectedAccountForDemographics, setSelectedAccountForDemographics] = useState<{
    id: string;
    platform: string;
    username: string;
  } | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchProfile();
    fetchSocialAccounts();
    fetchJoinedCampaigns();
  }, []);
  const fetchProfile = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    setLoading(true);
    const {
      data: profileData
    } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (profileData) {
      setProfile(profileData);
    }
    setLoading(false);
  };
  const fetchSocialAccounts = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch social accounts with their connected campaigns through the junction table
    const {
      data: accounts
    } = await supabase.from("social_accounts").select(`
        *,
        demographic_submissions(
          id,
          tier1_percentage,
          status,
          score,
          submitted_at,
          reviewed_at,
          screenshot_url
        )
      `).eq("user_id", session.user.id).eq("is_verified", true).order("connected_at", {
      ascending: false
    });
    if (accounts) {
      // Fetch connected campaigns for each account
      const accountsWithCampaigns = await Promise.all(accounts.map(async account => {
        const {
          data: connections
        } = await supabase.from("social_account_campaigns").select(`
              id,
              campaigns(
                id,
                title,
                brand_name,
                brand_logo_url,
                brands(logo_url)
              )
            `).eq("social_account_id", account.id).eq("status", "active");
        return {
          ...account,
          connected_campaigns: connections?.map(conn => ({
            connection_id: conn.id,
            campaign: {
              id: conn.campaigns.id,
              title: conn.campaigns.title,
              brand_name: conn.campaigns.brand_name,
              brand_logo_url: conn.campaigns.brand_logo_url || conn.campaigns.brands?.logo_url
            }
          })) || []
        };
      }));
      setSocialAccounts(accountsWithCampaigns);
    }
  };
  const fetchJoinedCampaigns = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const {
      data
    } = await supabase.from("campaign_submissions").select("campaign_id, campaigns(id, title, brand_name, brand_logo_url, brands(logo_url))").eq("creator_id", session.user.id);
    if (data) {
      // Deduplicate campaigns by ID
      const uniqueCampaignsMap = new Map();
      data.filter(item => item.campaigns).forEach(item => {
        if (!uniqueCampaignsMap.has(item.campaigns.id)) {
          uniqueCampaignsMap.set(item.campaigns.id, {
            id: item.campaigns.id,
            title: item.campaigns.title,
            brand_name: item.campaigns.brand_name,
            brand_logo_url: item.campaigns.brand_logo_url,
            brands: item.campaigns.brands
          });
        }
      });
      setJoinedCampaigns(Array.from(uniqueCampaignsMap.values()));
    }
  };
  // Remove the old delete and link/unlink functions - now handled by ManageAccountDialog
  const getLinkedCampaign = (campaignId: string | null) => {
    if (!campaignId) return null;
    return joinedCampaigns.find(c => c.id === campaignId);
  };
  const getPlatformIcon = (platform: string) => {
    const iconClass = "h-4 w-4";
    const systemIsLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const isLightMode = theme === "light" || theme === "system" && systemIsLight;
    switch (platform.toLowerCase()) {
      case "tiktok":
        return <img src={isLightMode ? tiktokLogoBlack : tiktokLogo} alt="TikTok" className={iconClass} />;
      case "instagram":
        return <img src={isLightMode ? instagramLogoBlack : instagramLogo} alt="Instagram" className={iconClass} />;
      case "youtube":
        return <img src={isLightMode ? youtubeLogoBlack : youtubeLogo} alt="YouTube" className={iconClass} />;
      default:
        return null;
    }
  };
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload an image file"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Image must be less than 5MB"
      });
      return;
    }
    setUploading(true);
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}/avatar.${fileExt}`;

    // Upload new avatar with upsert to overwrite existing file
    const {
      error: uploadError,
      data
    } = await supabase.storage.from('avatars').upload(fileName, file, {
      upsert: true
    });
    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: uploadError.message
      });
      setUploading(false);
      return;
    }

    // Get public URL with cache-busting timestamp
    const {
      data: {
        publicUrl
      }
    } = supabase.storage.from('avatars').getPublicUrl(fileName);

    // Add timestamp to prevent browser caching
    const publicUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

    // Update profile with new avatar URL
    const {
      error: updateError
    } = await supabase.from('profiles').update({
      avatar_url: publicUrl // Store without timestamp in DB
    }).eq('id', session.user.id);
    setUploading(false);
    if (updateError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile picture"
      });
    } else {
      // Update local state with timestamp for immediate display
      setProfile({
        ...profile,
        avatar_url: publicUrlWithTimestamp
      });
      toast({
        title: "Success",
        description: "Profile picture updated successfully"
      });
    }
  };
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
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
          description: "You must be logged in to update your profile"
        });
        setSaving(false);
        return;
      }

      // Check for duplicate username if username changed
      if (profile.username) {
        const {
          data: existingProfile
        } = await supabase.from("profiles").select("id").eq("username", profile.username).neq("id", session.user.id).maybeSingle();
        if (existingProfile) {
          setSaving(false);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Username already taken"
          });
          return;
        }
      }

      // Clean avatar URL (remove timestamp parameter if exists)
      const cleanAvatarUrl = profile.avatar_url?.split('?')[0] || profile.avatar_url;
      const {
        error
      } = await supabase.from("profiles").update({
        username: profile.username,
        full_name: profile.full_name,
        bio: profile.bio,
        country: profile.country,
        city: profile.city,
        phone_number: profile.phone_number,
        avatar_url: cleanAvatarUrl,
        content_languages: profile.content_languages,
        content_styles: profile.content_styles,
        content_niches: profile.content_niches,
        hide_from_leaderboard: profile.hide_from_leaderboard
      }).eq("id", session.user.id);
      if (error) {
        console.error('Profile update error:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update profile"
        });
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully"
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred"
      });
    } finally {
      setSaving(false);
    }
  };
  const profileUrl = `${window.location.origin}/${profile?.username}`;
  const handleCopyProfileUrl = () => {
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "Copied!",
      description: "Profile URL copied to clipboard"
    });
  };
  const handleOpenProfile = () => {
    window.open(`/${profile?.username}`, '_blank');
  };
  const handleCopyReferralCode = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard"
    });
  };
  const handleSavePreferences = async () => {
    if (!profile) return;
    setSavingPreferences(true);
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
          description: "You must be logged in to save preferences"
        });
        setSavingPreferences(false);
        return;
      }
      const {
        error
      } = await supabase.from("profiles").update({
        content_languages: profile.content_languages,
        content_styles: profile.content_styles,
        content_niches: profile.content_niches
      }).eq("id", session.user.id);
      if (error) {
        console.error('Preferences update error:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save preferences"
        });
      } else {
        toast({
          title: "Success",
          description: "Content preferences saved successfully"
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred"
      });
    } finally {
      setSavingPreferences(false);
    }
  };
  if (loading || !profile) {
    return <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        {/* Profile Header Skeleton */}
        <Card className="bg-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-7 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-6">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Accounts Skeleton */}
        <Card className="bg-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>

        {/* Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>;
  }
  return <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Profile Header */}
      <Card className="bg-card border-0">
        
      </Card>

      {/* Connected Accounts */}
      <Card className="bg-card border-0">
        <CardHeader className="py-0 my-0 px-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6">
            <div>
              <CardTitle className="text-lg">Connected Accounts</CardTitle>
              
            </div>
            <Button onClick={() => setShowAddAccountDialog(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
            {socialAccounts.length === 0 ? <div className="text-center py-12">
              <img src={emptyAccountsImage} alt="No accounts" className="w-24 h-24 mx-auto mb-4 opacity-80 object-cover" />
              <p className="text-base font-medium text-foreground">No connected accounts yet</p>
              <p className="text-sm mt-2 text-muted-foreground">Add your accounts to link them to a campaign</p>
            </div> : <div className="space-y-3">
              {socialAccounts.map(account => {
            const connectedCampaigns = account.connected_campaigns || [];
            const demographicSubmissions = account.demographic_submissions || [];
            const latestDemographicSubmission = demographicSubmissions[0];
            const demographicStatus = latestDemographicSubmission?.status;

            return <div key={account.id} className="group relative p-4 rounded-xl bg-muted/30 dark:bg-muted/10 hover:bg-muted/50 dark:hover:bg-muted/20 transition-all duration-300">
                    {/* Main Layout */}
                    <div className="flex items-start gap-4">
                      {/* Platform Icon - Large & Centered */}
                      <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-muted/50 dark:bg-muted/30 flex-shrink-0">
                        <div className="w-8 h-8">
                          {getPlatformIcon(account.platform)}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Username Row */}
                        <div 
                          onClick={() => account.account_link && window.open(account.account_link, '_blank')} 
                          className="cursor-pointer group/link inline-flex items-center gap-2"
                        >
                          <span className="font-semibold text-base text-foreground group-hover/link:underline" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
                            {account.username}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </div>
                        
                        {/* Linked Campaigns Row */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {connectedCampaigns.length > 0 ? (
                            <>
                              {connectedCampaigns.slice(0, 3).map(({ campaign }) => (
                                <div 
                                  key={campaign.id} 
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-[11px]"
                                  style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                                >
                                  {campaign.brand_logo_url && (
                                    <img 
                                      src={campaign.brand_logo_url} 
                                      alt={campaign.brand_name} 
                                      className="w-4 h-4 rounded-full object-cover" 
                                    />
                                  )}
                                  <span className="font-medium text-foreground">{campaign.title}</span>
                                </div>
                              ))}
                              {connectedCampaigns.length > 3 && (
                                <span className="text-[11px] text-muted-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>+{connectedCampaigns.length - 3} more</span>
                              )}
                              <button
                                className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
                                style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                                onClick={() => {
                                  setSelectedAccountForManaging({
                                    id: account.id,
                                    username: account.username,
                                    platform: account.platform,
                                    account_link: account.account_link
                                  });
                                  setShowManageAccountDialog(true);
                                }}
                              >
                                Manage
                              </button>
                            </>
                          ) : (
                            <button
                              className="group/link flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 transition-all"
                              style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                              onClick={() => {
                                setSelectedAccountForManaging({
                                  id: account.id,
                                  username: account.username,
                                  platform: account.platform,
                                  account_link: account.account_link
                                });
                                setShowManageAccountDialog(true);
                              }}
                            >
                              <Link2 className="w-3.5 h-3.5 text-muted-foreground group-hover/link:text-primary transition-colors" />
                              <span className="text-[11px] text-muted-foreground group-hover/link:text-primary transition-colors">Link to campaign</span>
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Demographics Section - Right Side */}
                      <div className="flex-shrink-0 w-40">
                        {!demographicStatus || demographicStatus === 'rejected' ? (
                          // Required/Rejected State - Compact Alert
                          <div 
                            className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 cursor-pointer hover:bg-destructive/15 transition-colors"
                            onClick={() => {
                              setSelectedAccountForDemographics({
                                id: account.id,
                                platform: account.platform,
                                username: account.username
                              });
                              setShowDemographicsDialog(true);
                            }}
                          >
                            <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center flex-shrink-0">
                              <img src={demographicsIcon} alt="" className="w-4 h-4 opacity-80" style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(89%) saturate(2615%) hue-rotate(344deg) brightness(87%) contrast(93%)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-medium text-destructive block truncate" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                                {demographicStatus === 'rejected' ? 'Resubmit' : 'Required'}
                              </span>
                              <span className="text-[10px] text-destructive/70">Tap to submit</span>
                            </div>
                          </div>
                        ) : (
                          // Has Submission - Show Status Card
                          <DemographicStatusCard
                            accountId={account.id}
                            platform={account.platform}
                            username={account.username}
                            submissions={demographicSubmissions}
                            onSubmitNew={() => {
                              setSelectedAccountForDemographics({
                                id: account.id,
                                platform: account.platform,
                                username: account.username
                              });
                              setShowDemographicsDialog(true);
                            }}
                            onRefresh={fetchSocialAccounts}
                          />
                        )}
                      </div>
                    </div>
                  </div>;
          })}
            </div>}
        </CardContent>
      </Card>

      {/* Public Profile Link */}
      

      {/* Stats Overview */}
      

      {/* Content Preferences */}
      <Collapsible open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        
      </Collapsible>

      {/* Edit Profile */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Edit Profile</CardTitle>
          <CardDescription>Update your public profile information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Discord Integration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Discord Account</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect your Discord account to access community features
                  </p>
                </div>
                <DiscordLinkDialog userId={profile.id} discordUsername={profile.discord_username || undefined} discordAvatar={profile.discord_avatar || undefined} onSuccess={fetchProfile} />
              </div>
              {profile.discord_username && <div className="p-3 rounded-lg bg-muted/20 border border-border flex items-center gap-3">
                  {profile.discord_avatar && <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.discord_avatar} />
                      <AvatarFallback>
                        {profile.discord_username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{profile.discord_username}</div>
                    <div className="text-xs text-muted-foreground">
                      Connected {profile.discord_connected_at && formatDistanceToNow(new Date(profile.discord_connected_at), {
                    addSuffix: true
                  })}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={async () => {
                try {
                  const {
                    error
                  } = await supabase.functions.invoke('discord-oauth', {
                    body: {
                      action: 'disconnect',
                      userId: profile.id
                    }
                  });
                  if (error) throw error;
                  toast({
                    title: "Success!",
                    description: "Discord account unlinked successfully."
                  });
                  fetchProfile();
                } catch (error: any) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message || "Failed to unlink Discord account."
                  });
                }
              }} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>}
            </div>

            {/* Privacy Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="hide-leaderboard" className="text-sm font-medium">Hide from Leaderboard</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, your name will not appear on the public leaderboard
                  </p>
                </div>
                <Switch id="hide-leaderboard" checked={profile.hide_from_leaderboard} onCheckedChange={checked => setProfile({
                ...profile,
                hide_from_leaderboard: checked
              })} />
              </div>
            </div>

            {/* Avatar Upload Section */}
            <div className="space-y-3">
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="text-2xl bg-muted font-semibold">
                    {profile.full_name?.[0] || profile.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">Profile Picture</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a professional photo. JPG, PNG or GIF. Max 5MB.
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2 bg-muted/50 hover:bg-muted/70 hover:text-foreground border-0">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Change Photo"}
                  </Button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-3">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                  <Input id="username" value={profile.username} onChange={e => setProfile({
                  ...profile,
                  username: e.target.value
                })} placeholder="username" className="bg-background focus-visible:ring-0 focus-visible:ring-offset-0 text-sm" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">Display Name</Label>
                  <Input id="fullName" value={profile.full_name || ""} onChange={e => setProfile({
                  ...profile,
                  full_name: e.target.value
                })} placeholder="John Doe" className="bg-background focus-visible:ring-0 focus-visible:ring-offset-0 text-sm" />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                  <PhoneInput value={profile.phone_number || ""} onChange={value => setProfile({
                  ...profile,
                  phone_number: value
                })} placeholder="Enter phone number" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium">Country</Label>
                  <Input id="country" value={profile.country || ""} onChange={e => setProfile({
                  ...profile,
                  country: e.target.value
                })} placeholder="United States" className="bg-background focus-visible:ring-0 focus-visible:ring-offset-0 text-sm" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium">City</Label>
                  <Input id="city" value={profile.city || ""} onChange={e => setProfile({
                  ...profile,
                  city: e.target.value
                })} placeholder="New York" className="bg-background focus-visible:ring-0 focus-visible:ring-offset-0 text-sm" />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                <Textarea id="bio" value={profile.bio || ""} onChange={e => setProfile({
                ...profile,
                bio: e.target.value
              })} placeholder="Tell us about yourself..." className="bg-background focus-visible:bg-background border-2 border-transparent focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none text-sm min-h-[100px] resize-none" maxLength={500} />
                <p className="text-xs text-muted-foreground">
                  {profile.bio?.length || 0}/500 characters
                </p>
              </div>
            </div>


            {/* Save Button */}
            <div className="flex items-center justify-between pt-4">

              
              <Button type="submit" disabled={saving} size="lg" className="gap-2 min-w-[140px]">
                {saving ? <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving...
                  </> : <>
                    Save Changes
                  </>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AddSocialAccountDialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog} onSuccess={fetchSocialAccounts} />

      {/* Demographics Dialog */}
      {selectedAccountForDemographics && <SubmitDemographicsDialog open={showDemographicsDialog} onOpenChange={setShowDemographicsDialog} onSuccess={fetchSocialAccounts} socialAccountId={selectedAccountForDemographics.id} platform={selectedAccountForDemographics.platform} username={selectedAccountForDemographics.username} />}

      {/* Manage Account Dialog */}
      {selectedAccountForManaging && <ManageAccountDialog open={showManageAccountDialog} onOpenChange={setShowManageAccountDialog} account={selectedAccountForManaging} demographicStatus={socialAccounts.find(acc => acc.id === selectedAccountForManaging.id)?.demographic_submissions?.[0]?.status as 'approved' | 'pending' | 'rejected' | null || null} daysUntilNext={(() => {
      const account = socialAccounts.find(acc => acc.id === selectedAccountForManaging.id);
      const latestSubmission = account?.demographic_submissions?.[0];
      if (latestSubmission?.status === 'approved' && latestSubmission.submitted_at) {
        const submittedDate = new Date(latestSubmission.submitted_at);
        const nextSubmissionDate = new Date(submittedDate);
        nextSubmissionDate.setDate(submittedDate.getDate() + 7);
        const daysLeft = Math.ceil((nextSubmissionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return daysLeft > 0 ? daysLeft : null;
      }
      return null;
    })()} lastSubmissionDate={(() => {
      const account = socialAccounts.find(acc => acc.id === selectedAccountForManaging.id);
      return account?.demographic_submissions?.[0]?.submitted_at || null;
    })()} nextSubmissionDate={(() => {
      const account = socialAccounts.find(acc => acc.id === selectedAccountForManaging.id);
      const latestSubmission = account?.demographic_submissions?.[0];
      if (latestSubmission?.status === 'approved' && latestSubmission.submitted_at) {
        const submittedDate = new Date(latestSubmission.submitted_at);
        const nextSubmissionDate = new Date(submittedDate);
        nextSubmissionDate.setDate(submittedDate.getDate() + 7);
        return nextSubmissionDate;
      }
      return null;
    })()} onUpdate={() => {
      fetchSocialAccounts();
    }} onSubmitDemographics={() => {
      setSelectedAccountForDemographics({
        id: selectedAccountForManaging.id,
        platform: selectedAccountForManaging.platform,
        username: selectedAccountForManaging.username
      });
      setShowDemographicsDialog(true);
    }} platformIcon={getPlatformIcon(selectedAccountForManaging.platform)} />}
    </div>;
}