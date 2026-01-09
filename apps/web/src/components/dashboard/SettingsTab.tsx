import { useEffect, useState, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, DollarSign, TrendingUp, Eye, Upload, Plus, Instagram, Youtube, CheckCircle2, Copy, Link2, X, Calendar, LogOut, Settings, ArrowUpRight, Globe, Video, Type, ChevronDown, Unlink, Trash2, MapPin, Languages, Mail, RefreshCw, AtSign, ChevronsUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { SubmitAudienceInsightsDialog } from "@/components/SubmitAudienceInsightsDialog";
import { AudienceInsightsStatusCard } from "@/components/AudienceInsightsStatusCard";
import { PendingInsightsRequestsBanner } from "@/components/dashboard/PendingInsightsRequestsBanner";
import { ZkTLSVerificationDialog } from "@/components/ZkTLSVerificationDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PhoneInput } from "@/components/PhoneInput";
import { DiscordLinkDialog } from "@/components/DiscordLinkDialog";
import { VerifyAccountDialog } from "@/components/VerifyAccountDialog";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { PaymentMethodsSection } from "@/components/dashboard/PaymentMethodsSection";
import { SecuritySection } from "@/components/dashboard/SecuritySection";
import { PortfolioSection, PortfolioItem } from "@/components/dashboard/PortfolioSection";
import { SettingsCard, UsernameSettingsCard, EmailSettingsCard, CurrencySettingsCard, NotificationSettingsCard, DataExportDialog, AccountDeletionDialog } from "@/components/dashboard/settings";
import { SocialAccountsTable } from "@/components/dashboard/SocialAccountsTable";
import { ManageAccountDialog } from "@/components/ManageAccountDialog";
import { useTheme } from "@/components/ThemeProvider";
import { TaxFormNotificationBanner } from "@/components/tax";
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
  // zkTLS verification fields
  zktls_verified?: boolean;
  zktls_verified_at?: string | null;
  zktls_expires_at?: string | null;
  zktls_engagement_rate?: number | null;
  zktls_avg_views?: number | null;
  zktls_demographics?: Record<string, any> | null;
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
export function SettingsTab() {
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
  const [showManageAccountDialog, setShowManageAccountDialog] = useState(false);
  const [selectedAccountForManage, setSelectedAccountForManage] = useState<SocialAccount | null>(null);
  const [showZkTLSDialog, setShowZkTLSDialog] = useState(false);
  const [selectedAccountForZkTLS, setSelectedAccountForZkTLS] = useState<{
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
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [authIdentities, setAuthIdentities] = useState<Array<{ provider: string; identity_id: string; created_at: string }>>([]);
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

    // Get auth provider info from user object
    const user = session.user;
    const provider = user.app_metadata?.provider || 'email';
    setAuthProvider(provider);

    // Get all linked identities
    if (user.identities && user.identities.length > 0) {
      setAuthIdentities(user.identities.map(id => ({
        provider: id.provider,
        identity_id: id.identity_id || id.id,
        created_at: id.created_at || ''
      })));
    }

    const {
      data: profileData
    } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (profileData) {
      setProfile(profileData as unknown as Profile);
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
          screenshot_url,
          admin_notes
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
      // Account is already linked - this is the desired state, so show success and refresh UI
      toast({
        title: "Account linked",
        description: "This account is connected to the campaign"
      });
      fetchSocialAccounts();
      setShowLinkCampaignDialog(false);
      setSelectedAccountForLinking(null);
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
    return null;
  }
  return <div className="pt-6 space-y-2 sm:space-y-4 max-w-4xl mx-auto pb-8 bg-background">
      {/* Tax Form Notification Banner - TEMPORARILY HIDDEN */}
      {/* <TaxFormNotificationBanner className="pb-2" /> */}

      {/* Pending Audience Insights Requests Banner */}
      {profile && (
        <PendingInsightsRequestsBanner
          creatorId={profile.id}
          socialAccounts={socialAccounts}
          onSubmitInsights={(account) => {
            setSelectedAccountForDemographics(account);
            setShowDemographicsDialog(true);
          }}
        />
      )}

      {/* Connected Accounts */}
      <Card ref={connectedAccountsRef} className="bg-background border-0">
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
            </div> : <SocialAccountsTable
              accounts={socialAccounts}
              onRefresh={fetchSocialAccounts}
              onManageAccount={account => {
                setSelectedAccountForManage(account);
                setShowManageAccountDialog(true);
              }}
              onUnlinkCampaign={handleUnlinkCampaign}
              onVerifyAccount={account => {
                setSelectedAccountForVerification(account);
                setShowVerifyAccountDialog(true);
              }}
              onSubmitDemographics={account => {
                setSelectedAccountForDemographics(account);
                setShowDemographicsDialog(true);
              }}
              // zkTLS verification disabled - TikTok blocks attestor IPs
              // onVerifyZkTLS={account => {
              //   setSelectedAccountForZkTLS(account);
              //   setShowZkTLSDialog(true);
              // }}
            />}
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

        {/* Login Method Card */}
        {authProvider && (
          <SettingsCard
            title="Login Method"
            description="How you signed up and log into your account"
            footerHint={`You're signed in with ${authProvider === 'google' ? 'Google' : authProvider === 'discord' ? 'Discord' : authProvider === 'email' ? 'email and password' : authProvider}.`}
          >
            <div className="flex items-center gap-3 max-w-md h-11 px-3 bg-background border border-border rounded-md">
              {authProvider === 'google' && (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                    Google
                  </span>
                </>
              )}
              {authProvider === 'discord' && (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#5865F2">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span className="text-sm" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                    Discord
                  </span>
                </>
              )}
              {authProvider === 'email' && (
                <>
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                    Email & Password
                  </span>
                </>
              )}
              {authProvider !== 'google' && authProvider !== 'discord' && authProvider !== 'email' && (
                <>
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm capitalize" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                    {authProvider}
                  </span>
                </>
              )}
            </div>
          </SettingsCard>
        )}

        {/* Currency Card */}
        <CurrencySettingsCard />

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

        {/* Notification Settings */}
        <NotificationSettingsCard />

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

      {/* Privacy & Data Section */}
      <SettingsCard
        title="Privacy & Data"
        description="Manage your data and account"
        footerHint="Export your data or permanently delete your account."
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <DataExportDialog />
          <AccountDeletionDialog />
        </div>
      </SettingsCard>

      {/* Portfolio Section - Hidden for now */}
      {/* {profile && (
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
      )} */}

      <CreateBrandDialog open={showCreateBrandDialog} onOpenChange={setShowCreateBrandDialog} />

      <AddSocialAccountDialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog} onSuccess={fetchSocialAccounts} />

      {/* Audience Insights Dialog */}
      {selectedAccountForDemographics && <SubmitAudienceInsightsDialog open={showDemographicsDialog} onOpenChange={setShowDemographicsDialog} onSuccess={fetchSocialAccounts} socialAccountId={selectedAccountForDemographics.id} platform={selectedAccountForDemographics.platform} username={selectedAccountForDemographics.username} />}

      {/* Verify Account Dialog */}
      {selectedAccountForVerification && <VerifyAccountDialog open={showVerifyAccountDialog} onOpenChange={open => {
      setShowVerifyAccountDialog(open);
      if (!open) setSelectedAccountForVerification(null);
    }} onSuccess={fetchSocialAccounts} accountId={selectedAccountForVerification.id} platform={selectedAccountForVerification.platform} username={selectedAccountForVerification.username} />}

      {/* zkTLS Verification Dialog - Disabled (TikTok blocks attestor IPs) */}
      {/* {selectedAccountForZkTLS && (
        <ZkTLSVerificationDialog
          open={showZkTLSDialog}
          onOpenChange={open => {
            setShowZkTLSDialog(open);
            if (!open) setSelectedAccountForZkTLS(null);
          }}
          onSuccess={fetchSocialAccounts}
          socialAccountId={selectedAccountForZkTLS.id}
          platform={selectedAccountForZkTLS.platform}
          username={selectedAccountForZkTLS.username}
        />
      )} */}

      {/* Manage Account Dialog */}
      {selectedAccountForManage && (
        <ManageAccountDialog
          open={showManageAccountDialog}
          onOpenChange={open => {
            setShowManageAccountDialog(open);
            if (!open) setSelectedAccountForManage(null);
          }}
          account={{
            id: selectedAccountForManage.id,
            username: selectedAccountForManage.username,
            platform: selectedAccountForManage.platform,
            account_link: selectedAccountForManage.account_link,
            follower_count: selectedAccountForManage.follower_count,
            is_verified: selectedAccountForManage.is_verified,
            hidden_from_public: selectedAccountForManage.hidden_from_public,
          }}
          demographicStatus={
            selectedAccountForManage.demographic_submissions?.length
              ? (selectedAccountForManage.demographic_submissions.sort(
                  (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
                )[0]?.status as 'approved' | 'pending' | 'rejected')
              : null
          }
          daysUntilNext={null}
          lastSubmissionDate={
            selectedAccountForManage.demographic_submissions?.length
              ? selectedAccountForManage.demographic_submissions.sort(
                  (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
                )[0]?.submitted_at
              : null
          }
          nextSubmissionDate={null}
          onUpdate={fetchSocialAccounts}
          onSubmitDemographics={() => {
            setSelectedAccountForDemographics({
              id: selectedAccountForManage.id,
              platform: selectedAccountForManage.platform,
              username: selectedAccountForManage.username
            });
            setShowDemographicsDialog(true);
          }}
          onReconnect={() => {
            setSelectedAccountForVerification({
              id: selectedAccountForManage.id,
              platform: selectedAccountForManage.platform,
              username: selectedAccountForManage.username
            });
            setShowVerifyAccountDialog(true);
          }}
        />
      )}

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