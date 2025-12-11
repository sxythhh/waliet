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
  
  const handleDeleteAccount = async (accountId: string) => {
    const { error } = await supabase
      .from("social_accounts")
      .delete()
      .eq("id", accountId);
    
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLinkingCampaign(false);
      return;
    }

    // Check if already linked
    const { data: existing } = await supabase
      .from("social_account_campaigns")
      .select("id")
      .eq("social_account_id", selectedAccountForLinking.id)
      .eq("campaign_id", campaignId)
      .eq("status", "active")
      .single();

    if (existing) {
      toast({
        variant: "destructive",
        title: "Already linked",
        description: "This account is already linked to this campaign"
      });
      setLinkingCampaign(false);
      return;
    }

    const { error } = await supabase
      .from("social_account_campaigns")
      .insert({
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
    const { error } = await supabase
      .from("social_account_campaigns")
      .update({ status: "disconnected", disconnected_at: new Date().toISOString() })
      .eq("id", connectionId);

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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Update campaign submission status to withdrawn
    const { error: submissionError } = await supabase
      .from("campaign_submissions")
      .update({ status: "withdrawn" })
      .eq("campaign_id", campaignId)
      .eq("creator_id", session.user.id);

    // Also disconnect all social accounts from this campaign
    const { error: disconnectError } = await supabase
      .from("social_account_campaigns")
      .update({ status: "disconnected", disconnected_at: new Date().toISOString() })
      .eq("campaign_id", campaignId)
      .eq("user_id", session.user.id);

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
    const iconClass = "w-full h-full object-contain";
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
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Username Row with Platform Icon */}
                        <div 
                          onClick={() => account.account_link && window.open(account.account_link, '_blank')} 
                          className="cursor-pointer group/link inline-flex items-center gap-2"
                        >
                          <div className="w-5 h-5 flex-shrink-0">
                            {getPlatformIcon(account.platform)}
                          </div>
                          <span className="font-semibold text-base text-foreground group-hover/link:underline" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
                            {account.username}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </div>
                        
                        {/* Linked Campaigns Row */}
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          {connectedCampaigns.length > 0 ? (
                            <>
                              {connectedCampaigns.slice(0, 3).map(({ campaign }) => (
                                <div 
                                  key={campaign.id} 
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 dark:bg-muted/30 text-[11px]"
                                  style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                                >
                                  {campaign.brand_logo_url && (
                                    <img 
                                      src={campaign.brand_logo_url} 
                                      alt={campaign.brand_name} 
                                      className="w-3.5 h-3.5 rounded object-cover" 
                                    />
                                  )}
                                  <span className="font-medium text-muted-foreground">{campaign.title}</span>
                                </div>
                              ))}
                              {connectedCampaigns.length > 3 && (
                                <span className="text-[10px] text-muted-foreground/70" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>+{connectedCampaigns.length - 3}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                              No campaigns linked
                            </span>
                          )}
                          <button
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAccountForLinking(account);
                              setShowLinkCampaignDialog(true);
                            }}
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Link</span>
                          </button>
                          <button
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 hover:bg-destructive/20 text-[11px] text-destructive transition-colors"
                            style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAccount(account.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
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
                            <div className="flex-1 min-w-0 flex flex-col">
                              <span className="text-[11px] font-medium text-destructive truncate leading-none" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                                {demographicStatus === 'rejected' ? 'Resubmit' : 'Required'}
                              </span>
                              <span className="text-[10px] text-destructive/70 leading-none mt-0.5" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>Tap to submit</span>
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

      {/* Personal Info */}
      <Card className="bg-card border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>Personal info</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Profile Picture */}
            <div>
              <p className="text-sm text-muted-foreground mb-3" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Profile picture</p>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={uploading} 
                className="gap-2 bg-muted/40 hover:bg-muted/60 rounded-full px-4"
                style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
              >
                <RefreshCw className="h-4 w-4" />
                {uploading ? "Uploading..." : "Replace picture"}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>

            {/* First name / Last name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>First name</p>
                <Input 
                  value={profile.full_name?.split(' ')[0] || ""} 
                  onChange={e => {
                    const lastName = profile.full_name?.split(' ').slice(1).join(' ') || '';
                    setProfile({ ...profile, full_name: `${e.target.value}${lastName ? ' ' + lastName : ''}` });
                  }} 
                  placeholder="First name" 
                  className="h-10 bg-muted/30 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Last name</p>
                <Input 
                  value={profile.full_name?.split(' ').slice(1).join(' ') || ""} 
                  onChange={e => {
                    const firstName = profile.full_name?.split(' ')[0] || '';
                    setProfile({ ...profile, full_name: `${firstName}${e.target.value ? ' ' + e.target.value : ''}` });
                  }} 
                  placeholder="Last name" 
                  className="h-10 bg-muted/30 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <p className="text-sm text-muted-foreground mb-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Username</p>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={profile.username} 
                  onChange={e => setProfile({ ...profile, username: e.target.value })} 
                  placeholder="username" 
                  className="h-10 pl-9 bg-muted/30 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <p className="text-sm text-muted-foreground mb-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Location</p>
              <Select value={profile.country || ""} onValueChange={value => setProfile({ ...profile, country: value })}>
                <SelectTrigger className="h-10 bg-muted/30 border-0 focus:ring-0 focus:ring-offset-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select country" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-popover max-h-[300px]">
                  {["United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Spain", "Italy", "Netherlands", "Brazil", "Mexico", "Argentina", "India", "Japan", "South Korea", "China", "Singapore", "Indonesia", "Philippines", "Thailand", "Vietnam", "Malaysia", "Nigeria", "South Africa", "Kenya", "Egypt", "UAE", "Saudi Arabia", "Turkey", "Poland", "Sweden", "Norway", "Denmark", "Finland", "Ireland", "Portugal", "Belgium", "Austria", "Switzerland", "New Zealand", "Russia", "Ukraine", "Czech Republic", "Romania", "Hungary", "Greece", "Israel", "Pakistan", "Bangladesh", "Colombia", "Chile", "Peru", "Venezuela"].map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Languages */}
            <div>
              <p className="text-sm text-muted-foreground mb-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Languages you post in</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-auto min-h-10 justify-between bg-muted/30 border-0 hover:bg-muted/40" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
                    <div className="flex flex-wrap gap-1.5 py-1">
                      {profile.content_languages?.length ? (
                        profile.content_languages.map(lang => (
                          <Badge key={lang} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
                            {lang}
                            <X 
                              className="ml-1 h-3 w-3 cursor-pointer" 
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setProfile({ 
                                  ...profile, 
                                  content_languages: profile.content_languages?.filter(l => l !== lang) || [] 
                                });
                              }} 
                            />
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>Select languages</span>
                      )}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-popover" align="start">
                  <Command>
                    <CommandInput placeholder="Search languages..." style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }} />
                    <CommandList>
                      <CommandEmpty style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>No language found.</CommandEmpty>
                      <CommandGroup>
                        {["English", "Spanish", "Portuguese", "French", "German", "Italian", "Dutch", "Russian", "Japanese", "Korean", "Chinese", "Hindi", "Arabic", "Turkish", "Polish", "Vietnamese", "Thai", "Indonesian", "Tagalog", "Swedish", "Norwegian", "Danish", "Finnish", "Greek", "Hebrew", "Czech", "Romanian", "Hungarian", "Ukrainian"].map(lang => (
                          <CommandItem 
                            key={lang} 
                            onSelect={() => {
                              const current = profile.content_languages || [];
                              if (current.includes(lang)) {
                                setProfile({ ...profile, content_languages: current.filter(l => l !== lang) });
                              } else {
                                setProfile({ ...profile, content_languages: [...current, lang] });
                              }
                            }}
                            style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${profile.content_languages?.includes(lang) ? "opacity-100" : "opacity-0"}`} />
                            {lang}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Content Style */}
            <div>
              <p className="text-sm text-muted-foreground mb-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Preferred content style</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-auto min-h-10 justify-between bg-muted/30 border-0 hover:bg-muted/40" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
                    <div className="flex flex-wrap gap-1.5 py-1">
                      {profile.content_styles?.length ? (
                        profile.content_styles.map(style => (
                          <Badge key={style} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
                            {style}
                            <X 
                              className="ml-1 h-3 w-3 cursor-pointer" 
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setProfile({ 
                                  ...profile, 
                                  content_styles: profile.content_styles?.filter(s => s !== style) || [] 
                                });
                              }} 
                            />
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>Select content styles</span>
                      )}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-popover" align="start">
                  <Command>
                    <CommandInput placeholder="Search styles..." style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }} />
                    <CommandList>
                      <CommandEmpty style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>No style found.</CommandEmpty>
                      <CommandGroup>
                        {["UGC", "Faceless UGC", "Clipping", "Edits", "Music", "Memes", "Slideshows", "AI", "POV"].map(style => (
                          <CommandItem 
                            key={style} 
                            onSelect={() => {
                              const current = profile.content_styles || [];
                              if (current.includes(style)) {
                                setProfile({ ...profile, content_styles: current.filter(s => s !== style) });
                              } else {
                                setProfile({ ...profile, content_styles: [...current, style] });
                              }
                            }}
                            style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${profile.content_styles?.includes(style) ? "opacity-100" : "opacity-0"}`} />
                            {style}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Email (read-only) */}
            <div>
              <p className="text-sm text-muted-foreground mb-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Email</p>
              <div className="flex items-center gap-2 h-10 px-3 bg-muted/30 rounded-md">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                  {profile.email || 'Not set'}
                </span>
              </div>
            </div>

            {/* Phone */}
            <div>
              <p className="text-sm text-muted-foreground mb-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Phone number</p>
              <PhoneInput 
                value={profile.phone_number || ""} 
                onChange={value => setProfile({ ...profile, phone_number: value })} 
                placeholder="Enter phone number"
              />
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AddSocialAccountDialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog} onSuccess={fetchSocialAccounts} />

      {/* Demographics Dialog */}
      {selectedAccountForDemographics && <SubmitDemographicsDialog open={showDemographicsDialog} onOpenChange={setShowDemographicsDialog} onSuccess={fetchSocialAccounts} socialAccountId={selectedAccountForDemographics.id} platform={selectedAccountForDemographics.platform} username={selectedAccountForDemographics.username} />}

      {/* Link Campaign Dialog */}
      <Dialog open={showLinkCampaignDialog} onOpenChange={(open) => {
        setShowLinkCampaignDialog(open);
        if (!open) setSelectedAccountForLinking(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>Manage Campaign Links</DialogTitle>
            <DialogDescription style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
              Link or unlink {selectedAccountForLinking?.username} from campaigns
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {joinedCampaigns.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                  No campaigns available to link
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    setShowLinkCampaignDialog(false);
                    navigate('/dashboard?tab=discover');
                  }}
                >
                  Browse Campaigns
                </Button>
              </div>
            ) : (
              joinedCampaigns.map((campaign) => {
                const linkedConnection = selectedAccountForLinking?.connected_campaigns?.find(
                  c => c.campaign.id === campaign.id
                );
                const isLinked = !!linkedConnection;
                return (
                  <div
                    key={campaign.id}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                      isLinked ? 'bg-primary/10' : 'bg-muted/30'
                    }`}
                    style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                  >
                    {campaign.brand_logo_url || campaign.brands?.logo_url ? (
                      <img 
                        src={campaign.brand_logo_url || campaign.brands?.logo_url} 
                        alt={campaign.brand_name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium text-muted-foreground">
                          {campaign.brand_name?.[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{campaign.title}</p>
                      <p className="text-xs text-muted-foreground">{campaign.brand_name}</p>
                    </div>
                    {isLinked ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleUnlinkCampaign(linkedConnection.connection_id, campaign.title)}
                      >
                        <Unlink className="w-3.5 h-3.5 mr-1" />
                        Unlink
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={linkingCampaign}
                        onClick={() => handleLinkCampaign(campaign.id)}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Link2 className="w-3.5 h-3.5 mr-1" />
                        Link
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          {/* Leave Campaign Section */}
          {joinedCampaigns.length > 0 && (
            <div className="border-t border-border/50 pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-3" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                Leave a campaign
              </p>
              <div className="space-y-2">
                {joinedCampaigns.map((campaign) => (
                  <div
                    key={`leave-${campaign.id}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/20"
                  >
                    <span className="text-sm" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>{campaign.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                      onClick={() => handleLeaveCampaign(campaign.id, campaign.title)}
                    >
                      <LogOut className="w-3 h-3 mr-1" />
                      Leave
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>;
}