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
import { ExternalLink, DollarSign, TrendingUp, Eye, Upload, Plus, Instagram, Youtube, CheckCircle2, Copy, Link2, X, Calendar, LogOut, Settings, ArrowUpRight, Globe, Video, Type, ChevronDown, Unlink, Trash2, Check, Pencil, MapPin, Languages, Mail, RefreshCw, AtSign, ChevronsUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { SubmitDemographicsDialog } from "@/components/SubmitDemographicsDialog";
import { DemographicStatusCard } from "@/components/DemographicStatusCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PhoneInput } from "@/components/PhoneInput";
import { DiscordLinkDialog } from "@/components/DiscordLinkDialog";
import { VerifyAccountDialog } from "@/components/VerifyAccountDialog";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { ProfileOnboardingChecklist } from "@/components/dashboard/ProfileOnboardingChecklist";
import { PaymentMethodsSection } from "@/components/dashboard/PaymentMethodsSection";
import { SecuritySection } from "@/components/dashboard/SecuritySection";
import { PortfolioSection, PortfolioItem } from "@/components/dashboard/PortfolioSection";
import { SettingsCard, UsernameSettingsCard, EmailSettingsCard } from "@/components/dashboard/settings";
import { SocialAccountsTable } from "@/components/dashboard/SocialAccountsTable";
import { useTheme } from "@/components/ThemeProvider";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import emptyAccountsImage from "@/assets/empty-accounts.png";
import demographicsIcon from "@/assets/demographics-icon.svg";
import noAccountsIcon from "@/assets/no-accounts-icon.svg";
import noAccountsIconBlack from "@/assets/no-accounts-icon-black.svg";
interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  email: string | null;
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
  is_private: boolean;
  subscribed_to_updates: boolean;
  resume_url: string | null;
  portfolio_items: any[] | null;
}
interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  account_link: string | null;
  follower_count: number | null;
  is_verified: boolean;
  connected_at: string;
  bio: string | null;
  avatar_url: string | null;
  hidden_from_public: boolean;
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
    resolvedTheme
  } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [joinedCampaigns, setJoinedCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showDemographicsDialog, setShowDemographicsDialog] = useState(false);
  const [selectedAccountForDemographics, setSelectedAccountForDemographics] = useState<{
    id: string;
    platform: string;
    username: string;
  } | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [showLinkCampaignDialog, setShowLinkCampaignDialog] = useState(false);
  const [selectedAccountForLinking, setSelectedAccountForLinking] = useState<SocialAccount | null>(null);
  const [linkingCampaign, setLinkingCampaign] = useState(false);
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);
  const [showVerifyAccountDialog, setShowVerifyAccountDialog] = useState(false);
  const [selectedAccountForVerification, setSelectedAccountForVerification] = useState<{
    id: string;
    platform: string;
    username: string;
  } | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [originalUsername, setOriginalUsername] = useState('');
  const [originalSubscribedToUpdates, setOriginalSubscribedToUpdates] = useState(true);
  const [savingSubscription, setSavingSubscription] = useState(false);
  const [expandedCampaignAccounts, setExpandedCampaignAccounts] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInfoRef = useRef<HTMLDivElement>(null);
  const connectedAccountsRef = useRef<HTMLDivElement>(null);
  const {
    toast
  } = useToast();
  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === profile?.email) return;
    setUpdatingEmail(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        email: newEmail
      });
      if (error) throw error;
      toast({
        title: "Confirmation email sent",
        description: "Please check your new email address to confirm the change."
      });
    } catch (error: any) {
      toast({
        title: "Error updating email",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUpdatingEmail(false);
    }
  };
  const handleSaveSubscription = async () => {
    if (!profile) return;
    setSavingSubscription(true);
    try {
      const {
        error
      } = await supabase.from("profiles").update({
        subscribed_to_updates: profile.subscribed_to_updates
      }).eq("id", profile.id);
      if (error) throw error;
      setOriginalSubscribedToUpdates(profile.subscribed_to_updates);
      toast({
        title: "Preferences saved",
        description: "Your email preferences have been updated."
      });
    } catch (error: any) {
      toast({
        title: "Error saving preferences",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingSubscription(false);
    }
  };
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
      setNewEmail(profileData.email || '');
      setOriginalUsername(profileData.username || '');
      setOriginalSubscribedToUpdates(profileData.subscribed_to_updates ?? true);
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
      data: accounts,
      error
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
      `).eq("user_id", session.user.id).order("connected_at", {
      ascending: false
    });
    if (error) {
      console.error('Error fetching social accounts:', error);
      return;
    }
    if (accounts) {
      console.log('Fetched social accounts:', accounts.length, 'accounts');
      // Log demographic submissions for debugging
      accounts.forEach(acc => {
        if (acc.demographic_submissions?.length) {
          console.log(`Account ${acc.username}: ${acc.demographic_submissions.length} demographic submissions`);
        }
      });

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
    } = await supabase.from("campaign_submissions").select("campaign_id, campaigns(id, title, brand_name, brand_logo_url, brands(logo_url))").eq("creator_id", session.user.id).eq("status", "approved");
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
  const handleDeleteAccount = async (accountId: string) => {
    const {
      error
    } = await supabase.from("social_accounts").delete().eq("id", accountId);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete account"
      });
    } else {
      toast({
        title: "Account deleted",
        description: "Social account has been removed"
      });
      fetchSocialAccounts();
    }
  };
  const handleLinkCampaign = async (campaignId: string) => {
    if (!selectedAccountForLinking) return;
    setLinkingCampaign(true);
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      setLinkingCampaign(false);
      return;
    }

    // Check if a record already exists (active or disconnected)
    const {
      data: existingRecord,
      error: existingError
    } = await supabase.from("social_account_campaigns").select("id, status").eq("social_account_id", selectedAccountForLinking.id).eq("campaign_id", campaignId).maybeSingle();
    if (existingError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check existing link"
      });
      setLinkingCampaign(false);
      return;
    }
    if (existingRecord?.status === "active") {
      toast({
        variant: "destructive",
        title: "Already linked",
        description: "This account is already linked to this campaign"
      });
      setLinkingCampaign(false);
      return;
    }
    const {
      error
    } = existingRecord ? await supabase.from("social_account_campaigns").update({
      status: "active",
      disconnected_at: null
    }).eq("id", existingRecord.id) : await supabase.from("social_account_campaigns").insert({
      social_account_id: selectedAccountForLinking.id,
      campaign_id: campaignId,
      user_id: session.user.id,
      status: "active"
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to link account to campaign"
      });
    } else {
      toast({
        title: "Account linked",
        description: "Successfully linked to campaign"
      });
      fetchSocialAccounts();
      setShowLinkCampaignDialog(false);
      setSelectedAccountForLinking(null);
    }
    setLinkingCampaign(false);
  };
  const handleUnlinkCampaign = async (connectionId: string, campaignTitle: string) => {
    const {
      error
    } = await supabase.from("social_account_campaigns").update({
      status: "disconnected",
      disconnected_at: new Date().toISOString()
    }).eq("id", connectionId);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unlink account from campaign"
      });
    } else {
      toast({
        title: "Account unlinked",
        description: `Successfully unlinked from ${campaignTitle}`
      });
      fetchSocialAccounts();
    }
  };
  const handleLeaveCampaign = async (campaignId: string, campaignTitle: string) => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;

    // Update campaign submission status to withdrawn
    const {
      error: submissionError
    } = await supabase.from("campaign_submissions").update({
      status: "withdrawn"
    }).eq("campaign_id", campaignId).eq("creator_id", session.user.id);

    // Also disconnect all social accounts from this campaign
    const {
      error: disconnectError
    } = await supabase.from("social_account_campaigns").update({
      status: "disconnected",
      disconnected_at: new Date().toISOString()
    }).eq("campaign_id", campaignId).eq("user_id", session.user.id);
    if (submissionError || disconnectError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to leave campaign"
      });
    } else {
      toast({
        title: "Left campaign",
        description: `You have left ${campaignTitle}`
      });
      fetchJoinedCampaigns();
      fetchSocialAccounts();
    }
  };

  // Remove the old delete and link/unlink functions - now handled by ManageAccountDialog
  const getLinkedCampaign = (campaignId: string | null) => {
    if (!campaignId) return null;
    return joinedCampaigns.find(c => c.id === campaignId);
  };
  const getPlatformIcon = (platform: string) => {
    const iconClass = "w-full h-full object-contain opacity-100";
    const isLightMode = resolvedTheme === "light";
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

    // Update profile with new avatar URL (including timestamp for cache-busting)
    const {
      error: updateError
    } = await supabase.from('profiles').update({
      avatar_url: publicUrlWithTimestamp
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

      // Check for duplicate username if username changed (case-insensitive)
      if (profile.username) {
        const normalizedUsername = profile.username.toLowerCase().trim();
        const {
          data: existingProfile
        } = await supabase.from("profiles").select("id").ilike("username", normalizedUsername).neq("id", session.user.id).maybeSingle();
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
        username: profile.username?.toLowerCase().trim(),
        full_name: profile.full_name,
        bio: profile.bio,
        country: profile.country,
        city: profile.city,
        phone_number: profile.phone_number,
        avatar_url: cleanAvatarUrl,
        content_languages: profile.content_languages,
        content_styles: profile.content_styles,
        content_niches: profile.content_niches,
        hide_from_leaderboard: profile.hide_from_leaderboard,
        is_private: profile.is_private
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
    return <div className="space-y-6 max-w-4xl mx-auto px-6 pt-8 pb-8">
        {/* Profile Header Skeleton */}
        <Card className="bg-card border overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-7 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Avatar */}
              <div className="relative">
                <Skeleton className="w-24 h-24 rounded-full" />
                <Skeleton className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full" />
              </div>
              {/* Form Fields */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-10 w-28 rounded-md" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Accounts Skeleton */}
        <Card className="bg-card border overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-1">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
            <div className="grid gap-3">
              {[...Array(2)].map((_, i) => <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Card key={i} className="bg-card border overflow-hidden">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>)}
        </div>

        {/* Connected Integrations Skeleton */}
        <Card className="border overflow-hidden bg-neutral-100/0 border-black/0">
          <CardContent className="p-6">
            <div className="space-y-1 mb-5">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(2)].map((_, i) => <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>)}
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  // Generate onboarding tasks based on profile completion
  const onboardingTasks = [{
    id: 'profile_info',
    label: 'Add basic profile info',
    completed: !!(profile?.full_name && profile?.username),
    onClick: () => profileInfoRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }, {
    id: 'content_preferences',
    label: 'Choose content preferences',
    completed: !!(profile?.content_styles && profile.content_styles.length > 0),
    onClick: () => profileInfoRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }, {
    id: 'location',
    label: 'Add your location',
    completed: !!profile?.country,
    onClick: () => profileInfoRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }, {
    id: 'phone',
    label: 'Add phone number',
    completed: !!profile?.phone_number,
    onClick: () => profileInfoRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }, {
    id: 'social_account',
    label: 'Connect a social account',
    completed: socialAccounts.length > 0,
    onClick: () => setShowAddAccountDialog(true)
  }, {
    id: 'demographics',
    label: 'Submit demographics',
    completed: socialAccounts.some(a => a.demographic_submissions?.some(d => d.status === 'approved')),
    onClick: () => {
      if (socialAccounts.length > 0) {
        const account = socialAccounts[0];
        setSelectedAccountForDemographics({
          id: account.id,
          platform: account.platform,
          username: account.username
        });
        setShowDemographicsDialog(true);
      } else {
        setShowAddAccountDialog(true);
      }
    }
  }, {
    id: 'join_campaign',
    label: 'Join your first campaign',
    completed: joinedCampaigns.length > 0,
    onClick: () => navigate('/dashboard?tab=discover')
  }, {
    id: 'earn_first',
    label: 'Earn your first payout',
    completed: (profile?.total_earnings || 0) > 0,
    onClick: () => navigate('/dashboard?tab=discover')
  }];
  return <div className="pt-6 space-y-2 sm:space-y-4 max-w-4xl mx-auto pb-8">
      {/* Onboarding Checklist */}
      <ProfileOnboardingChecklist tasks={onboardingTasks} />

      {/* Profile Header */}
      <Card className="bg-card border-0">
        
      </Card>

      {/* Connected Accounts */}
      <Card ref={connectedAccountsRef} className="bg-transparent border-0">
        <CardHeader className="py-0 my-0 px-0">
          <div className="flex items-center justify-between py-[5px]">
            <CardTitle className="text-lg">Connected Accounts</CardTitle>
            <Button onClick={() => setShowAddAccountDialog(true)} size="sm" className="font-inter font-medium tracking-[-0.5px] bg-[#1e60db] hover:bg-[#1e60db]/90 border-t border-t-[#4b85f7] rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-3">
          {socialAccounts.length === 0 ? <div className="flex flex-col items-center justify-center py-8 border border-border rounded-xl">
              <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <img alt="" className="w-7 h-7" src={resolvedTheme === 'dark' ? noAccountsIcon : noAccountsIconBlack} />
              </div>
              <p className="font-geist tracking-[-0.5px] text-base font-medium text-foreground mb-1">No connected accounts yet</p>
              <p className="font-inter tracking-[-0.5px] text-sm text-muted-foreground">Manage your connected social media accounts</p>
            </div> : <SocialAccountsTable accounts={socialAccounts} onRefresh={fetchSocialAccounts} onDeleteAccount={handleDeleteAccount} onLinkCampaign={account => {
          setSelectedAccountForLinking(account);
          setShowLinkCampaignDialog(true);
        }} onUnlinkCampaign={handleUnlinkCampaign} onVerifyAccount={account => {
          setSelectedAccountForVerification(account);
          setShowVerifyAccountDialog(true);
        }} onSubmitDemographics={account => {
          setSelectedAccountForDemographics(account);
          setShowDemographicsDialog(true);
        }} />}
        </CardContent>
      </Card>

      {/* Public Profile Link */}
      

      {/* Stats Overview */}
      

      {/* Content Preferences */}
      <Collapsible open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        
      </Collapsible>

      {/* User Settings - Redesigned */}
      <div ref={profileInfoRef} className="space-y-6">
        {/* Username Card */}
        <UsernameSettingsCard username={profile.username} onChange={username => setProfile({
        ...profile,
        username
      })} onSave={() => handleSaveProfile({
        preventDefault: () => {}
      } as React.FormEvent)} saving={saving} hasChanges={profile.username !== originalUsername} originalUsername={originalUsername} />

        {/* Email Card */}
        <EmailSettingsCard email={newEmail} onChange={setNewEmail} onSave={handleUpdateEmail} saving={updatingEmail} hasChanges={newEmail !== profile.email} subscribeToUpdates={profile.subscribed_to_updates} onSubscribeChange={checked => setProfile({
        ...profile,
        subscribed_to_updates: checked
      })} subscriptionHasChanges={profile.subscribed_to_updates !== originalSubscribedToUpdates} onSaveSubscription={handleSaveSubscription} savingSubscription={savingSubscription} />

        {/* Discord Card */}
        <SettingsCard title="Discord" description="Connect your Discord account to join our community and receive updates directly" footerHint={profile.discord_username ? "Your Discord account is connected." : "Connect to unlock community features."}>
          {profile.discord_username ? <div className="flex items-center justify-between max-w-md h-11 px-3 bg-background border border-border rounded-md">
              <div className="flex items-center gap-2">
                <img src={profile.discord_avatar || "/lovable-uploads/174e0985-7b27-4c11-ba67-ffb21fb24b3c.webp"} alt="Discord" className="w-5 h-5 rounded-full" />
                <span className="text-sm" style={{
              fontFamily: "Inter",
              letterSpacing: "-0.3px"
            }}>
                  {profile.discord_username}
                </span>
              </div>
              <DiscordLinkDialog userId={profile.id} discordUsername={profile.discord_username} discordAvatar={profile.discord_avatar || undefined} onSuccess={fetchProfile} />
            </div> : <DiscordLinkDialog userId={profile.id} onSuccess={fetchProfile} />}
        </SettingsCard>

        {/* Private Profile Card */}
        <SettingsCard title="Private Profile" description="When enabled, your public profile page will show 'This profile is private' to other users" footerHint={profile.is_private ? "Your profile is currently hidden from other users." : "Your profile is publicly visible."} saveButton={{
        disabled: saving,
        loading: saving,
        onClick: () => handleSaveProfile({
          preventDefault: () => {}
        } as React.FormEvent)
      }}>
          <div className="flex items-center gap-3">
            <Switch checked={profile.is_private} onCheckedChange={checked => setProfile({
            ...profile,
            is_private: checked
          })} />
            <span className="text-sm text-muted-foreground" style={{
            fontFamily: "Inter",
            letterSpacing: "-0.3px"
          }}>
              {profile.is_private ? "Private mode enabled" : "Profile is public"}
            </span>
          </div>
        </SettingsCard>
      </div>

      {/* Security Section */}
      <SecuritySection />

      {/* Portfolio Section */}
      {profile && (
        <PortfolioSection
          userId={profile.id}
          portfolioItems={(profile.portfolio_items || []) as PortfolioItem[]}
          resumeUrl={profile.resume_url}
          onUpdate={(items, resumeUrl) => {
            setProfile({
              ...profile,
              portfolio_items: items,
              resume_url: resumeUrl,
            });
          }}
        />
      )}

      <CreateBrandDialog open={showCreateBrandDialog} onOpenChange={setShowCreateBrandDialog} />

      <AddSocialAccountDialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog} onSuccess={fetchSocialAccounts} />

      {/* Demographics Dialog */}
      {selectedAccountForDemographics && <SubmitDemographicsDialog open={showDemographicsDialog} onOpenChange={setShowDemographicsDialog} onSuccess={fetchSocialAccounts} socialAccountId={selectedAccountForDemographics.id} platform={selectedAccountForDemographics.platform} username={selectedAccountForDemographics.username} />}

      {/* Verify Account Dialog */}
      {selectedAccountForVerification && <VerifyAccountDialog open={showVerifyAccountDialog} onOpenChange={open => {
      setShowVerifyAccountDialog(open);
      if (!open) setSelectedAccountForVerification(null);
    }} onSuccess={fetchSocialAccounts} accountId={selectedAccountForVerification.id} platform={selectedAccountForVerification.platform} username={selectedAccountForVerification.username} />}

      {/* Link Campaign Dialog */}
      <Dialog open={showLinkCampaignDialog} onOpenChange={open => {
      setShowLinkCampaignDialog(open);
      if (!open) setSelectedAccountForLinking(null);
    }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="py-[10px]">
            <DialogTitle style={{
            fontFamily: 'Geist',
            letterSpacing: '-0.5px'
          }}>Manage Account</DialogTitle>
            <DialogDescription style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }}>
              Link or unlink {selectedAccountForLinking?.username} from campaigns
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {joinedCampaigns.length === 0 ? <div className="text-center py-8">
                <p className="text-sm text-muted-foreground" style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.3px'
            }}>
                  No campaigns available to link
                </p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => {
              setShowLinkCampaignDialog(false);
              navigate('/dashboard?tab=discover');
            }}>
                  Browse Campaigns
                </Button>
              </div> : joinedCampaigns.map(campaign => {
            const linkedConnection = selectedAccountForLinking?.connected_campaigns?.find(c => c.campaign.id === campaign.id);
            const isLinked = !!linkedConnection;
            return <div key={campaign.id} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${isLinked ? 'bg-primary/10' : 'bg-muted/30'}`} style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.3px'
            }}>
                    {campaign.brand_logo_url || campaign.brands?.logo_url ? <img src={campaign.brand_logo_url || campaign.brands?.logo_url} alt={campaign.brand_name} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium text-muted-foreground">
                          {campaign.brand_name?.[0]?.toUpperCase()}
                        </span>
                      </div>}
                    <div className="flex-1 flex items-center">
                      <p className="font-medium text-sm" style={{
                  fontFamily: 'Geist',
                  letterSpacing: '-0.5px'
                }}>{campaign.title}</p>
                    </div>
                    {isLinked ? <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" style={{
                fontFamily: 'Geist',
                letterSpacing: '-0.5px'
              }} onClick={() => handleUnlinkCampaign(linkedConnection.connection_id, campaign.title)}>
                        <Unlink className="w-3.5 h-3.5 mr-1" />
                        Unlink
                      </Button> : <Button variant="ghost" size="sm" disabled={linkingCampaign} onClick={() => handleLinkCampaign(campaign.id)} className="text-primary hover:text-primary hover:bg-primary/10" style={{
                fontFamily: 'Geist',
                letterSpacing: '-0.5px'
              }}>
                        <Link2 className="w-3.5 h-3.5 mr-1" />
                        Link
                      </Button>}
                  </div>;
          })}
          </div>
          
          {/* Leave Campaign Section */}
          {joinedCampaigns.length > 0}
        </DialogContent>
      </Dialog>

    </div>;
}