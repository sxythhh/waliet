import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Infinity, Instagram, Video, Youtube, Share2, Plus, Link2, UserPlus, X, AlertTriangle, LogOut, MessageCircle, Users, Sparkles, ChevronRight, Clock, CheckCircle2, Bell, Play, RotateCcw, Copy, Check, Hourglass } from "lucide-react";
import { Icon } from "@iconify/react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "@/components/ThemeProvider";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import emptyCampaignsImage from "@/assets/empty-campaigns.png";
import discordIconNew from "@/assets/discord-icon-new.png";
import privateCampaignIcon from "@/assets/private-campaign-icon.svg";
import discordWhiteIcon from "@/assets/discord-white-icon.webp";
import settingsCinematicIcon from "@/assets/settings-cinematic-icon.svg";
import creditCardIcon from "@/assets/credit-card-icon.svg";
import schoolIcon from "@/assets/school-icon.svg";
import schoolIconBlack from "@/assets/school-icon-black.svg";
import { Button } from "@/components/ui/button";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { format } from "date-fns";
import { ManageAccountDialog } from "@/components/ManageAccountDialog";
import { SubmitAudienceInsightsDialog } from "@/components/SubmitAudienceInsightsDialog";
import { JoinCampaignSheet } from "@/components/JoinCampaignSheet";
import { ApplyToBountySheet } from "@/components/ApplyToBountySheet";

import { OptimizedImage } from "@/components/OptimizedImage";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { BoostCardCompact } from "@/components/dashboard/BoostCardCompact";
import { CreatorPitchesWidget } from "@/components/dashboard/CreatorPitchesWidget";
import { ReceivedPitchesWidget } from "@/components/dashboard/ReceivedPitchesWidget";
import { EarningsChart } from "@/components/dashboard/EarningsChart";
import { TransactionsTable, Transaction } from "@/components/dashboard/TransactionsTable";
import { TransactionFilterDropdown } from "@/components/dashboard/TransactionFilterDropdown";
import { TransactionShareDialog } from "@/components/dashboard/TransactionShareDialog";
interface Campaign {
  id: string;
  title: string;
  description: string;
  brand_name: string;
  brand_logo_url: string;
  brand_is_verified?: boolean;
  brand_slug?: string;
  budget: number;
  budget_used?: number;
  rpm_rate: number;
  status: string;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  banner_url: string | null;
  submission_status?: string;
  is_infinite_budget?: boolean;
  allowed_platforms: string[] | null;
  created_at: string;
  blueprint_id?: string | null;
  connected_accounts?: Array<{
    id: string;
    platform: string;
    username: string;
  }>;
}
interface BlueprintHook {
  text: string;
  description?: string;
}

interface BlueprintTalkingPoint {
  text: string;
  notes?: string;
}

interface BlueprintDosAndDonts {
  dos?: string[];
  donts?: string[];
}

interface Blueprint {
  content: string | null;
  hooks: BlueprintHook[] | null;
  talking_points: BlueprintTalkingPoint[] | null;
  dos_and_donts: BlueprintDosAndDonts | null;
  call_to_action: string | null;
  content_guidelines: string | null;
}

interface BoostApplication {
  id: string;
  video_url: string;
  application_text: string | null;
  status: string;
  applied_at: string;
  boost_campaigns: {
    id: string;
    title: string;
    monthly_retainer: number;
    videos_per_month: number;
    banner_url: string | null;
    blueprint_id?: string | null;
    blueprint_embed_url?: string | null;
    content_style_requirements?: string | null;
    brands?: {
      name: string;
      logo_url: string | null;
    };
    blueprint?: Blueprint | null;
  };
}
interface RecommendedCampaign {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_is_verified?: boolean;
  rpm_rate: number;
  slug: string;
  banner_url: string | null;
  allowed_platforms: string[] | null;
  budget: number;
  budget_used: number | null;
  is_infinite_budget: boolean | null;
  requires_application: boolean | null;
  application_questions: string[] | null;
  description: string | null;
  status: string | null;
  start_date: string | null;
  guidelines: string | null;
  blueprint_id: string | null;
}
interface RecentActivity {
  id: string;
  type: 'earning' | 'account_connected' | 'campaign_joined';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  campaignLogo?: string | null;
  campaignName?: string | null;
}

interface TransactionMetadata {
  campaign_id?: string;
  boost_id?: string;
  period_start?: string;
  period_end?: string;
  recipient_username?: string;
  sender_username?: string;
}

interface CampaignMapEntry {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
}

interface BoostMapEntry {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
}

interface BrandRelation {
  name: string;
  logo_url: string | null;
  is_verified?: boolean;
  slug?: string;
}

interface SocialAccountConnection {
  campaign_id: string;
  social_accounts: {
    id: string;
    platform: string;
    username: string;
  } | null;
}
export interface CampaignsTabProps {
  onOpenPrivateDialog: () => void;
  className?: string;
}
export function CampaignsTab({
  onOpenPrivateDialog,
  className
}: CampaignsTabProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [boostApplications, setBoostApplications] = useState<BoostApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [leaveCampaignDialogOpen, setLeaveCampaignDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [leavingCampaign, setLeavingCampaign] = useState(false);
  const [manageAccountDialogOpen, setManageAccountDialogOpen] = useState(false);
  const [submitDemographicsDialogOpen, setSubmitDemographicsDialogOpen] = useState(false);
    const [joinCampaignSheetOpen, setJoinCampaignSheetOpen] = useState(false);
  const [selectedCampaignForJoin, setSelectedCampaignForJoin] = useState<RecommendedCampaign | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<{
    id: string;
    platform: string;
    username: string;
  } | null>(null);
  const [reapplyDialogOpen, setReapplyDialogOpen] = useState(false);
  const [selectedBoostForReapply, setSelectedBoostForReapply] = useState<BoostApplication | null>(null);

  // New state for dashboard sections
  const [profile, setProfile] = useState<{
    full_name: string | null;
    username: string;
    total_earnings: number | null;
  } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [recommendedCampaigns, setRecommendedCampaigns] = useState<RecommendedCampaign[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [connectedAccountsCount, setConnectedAccountsCount] = useState(0);
  const [isDiscordConnected, setIsDiscordConnected] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState<Transaction[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [homeTypeFilter, setHomeTypeFilter] = useState<string>("all");
  const [homeStatusFilter, setHomeStatusFilter] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionSheetOpen, setTransactionSheetOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username?: string; avatar_url?: string } | null>(null);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    resolvedTheme
  } = useTheme();
  const getPlatformIcon = (platform: string) => {
    const isLightMode = resolvedTheme === "light";
    switch (platform.toLowerCase()) {
      case 'tiktok':
        return isLightMode ? tiktokLogoBlack : tiktokLogo;
      case 'instagram':
        return isLightMode ? instagramLogoBlack : instagramLogo;
      case 'youtube':
        return isLightMode ? youtubeLogoBlack : youtubeLogo;
      default:
        return null;
    }
  };

  const fetchWalletTransactions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch wallet for total earned
    const { data: walletData } = await supabase
      .from("wallets")
      .select("total_earned")
      .eq("user_id", user.id)
      .single();

    if (walletData) {
      setTotalEarned(walletData.total_earned || 0);
    }

    // Fetch transactions (more for the chart to work properly)
    const { data: txns } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!txns) return;

    // Get campaign and boost IDs
    const campaignIds = txns.map(t => (t.metadata as TransactionMetadata | null)?.campaign_id).filter(Boolean) as string[];
    const boostIds = txns.map(t => (t.metadata as TransactionMetadata | null)?.boost_id).filter(Boolean) as string[];

    // Fetch campaign details
    let campaignsMap: Record<string, CampaignMapEntry> = {};
    if (campaignIds.length > 0) {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, title, brand_name, brand_logo_url")
        .in("id", campaignIds);
      campaignsMap = (campaigns || []).reduce((acc, c) => {
        acc[c.id] = c;
        return acc;
      }, {} as Record<string, CampaignMapEntry>);
    }

    // Fetch boost details
    let boostsMap: Record<string, BoostMapEntry> = {};
    if (boostIds.length > 0) {
      const { data: boosts } = await supabase
        .from("bounty_campaigns")
        .select("id, title, brands(name, logo_url)")
        .in("id", boostIds);
      boostsMap = (boosts || []).reduce((acc, b) => {
        const brandData = b.brands as BrandRelation | null;
        acc[b.id] = {
          id: b.id,
          title: b.title,
          brand_name: brandData?.name || '',
          brand_logo_url: brandData?.logo_url || null
        };
        return acc;
      }, {} as Record<string, BoostMapEntry>);
    }

    const transactions: Transaction[] = txns.map(txn => {
      const metadata = txn.metadata as TransactionMetadata | null;
      const isBoostEarning = txn.type === 'earning' && metadata?.boost_id;

      return {
        id: txn.id,
        type: isBoostEarning ? 'boost_earning' : (txn.type as Transaction['type']),
        amount: Number(txn.amount) || 0,
        date: new Date(txn.created_at),
        status: txn.status,
        campaign: metadata?.campaign_id ? campaignsMap[metadata.campaign_id] || null : null,
        boost: metadata?.boost_id ? boostsMap[metadata.boost_id] || null : null,
        recipient: null,
        sender: null
      };
    });

    setWalletTransactions(transactions);
  }, []);
  const fetchDashboardData = useCallback(async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch profile
    const {
      data: profileData
    } = await supabase.from("profiles").select("full_name, username, total_earnings, avatar_url").eq("id", user.id).single();
    if (profileData) {
      setProfile(profileData);
      setUserProfile({ username: profileData.username, avatar_url: profileData.avatar_url });
    }

    // Fetch wallet balance and payment method status
    const {
      data: walletData
    } = await supabase.from("wallets").select("balance, payout_details").eq("user_id", user.id).single();
    if (walletData) {
      setWalletBalance(walletData.balance || 0);
      // Check if user has at least one payment method configured
      const payoutDetails = walletData.payout_details;
      const hasMethod = Array.isArray(payoutDetails) && payoutDetails.length > 0;
      setHasPaymentMethod(hasMethod);
    }

    // Fetch connected accounts count
    const {
      count
    } = await supabase.from("social_accounts").select("*", {
      count: 'exact',
      head: true
    }).eq("user_id", user.id);
    setConnectedAccountsCount(count || 0);

    // Check if Discord is connected
    const { data: discordProfile } = await supabase
      .from("profiles")
      .select("discord_id")
      .eq("id", user.id)
      .single();
    setIsDiscordConnected(!!discordProfile?.discord_id);

    // Fetch recommended campaigns (public campaigns user hasn't joined)
    const {
      data: userSubmissions
    } = await supabase.from("campaign_submissions").select("campaign_id").eq("creator_id", user.id);
    const joinedCampaignIds = userSubmissions?.map(s => s.campaign_id) || [];
    let recommendedQuery = supabase.from("campaigns").select("id, title, brand_name, brand_logo_url, rpm_rate, slug, banner_url, allowed_platforms, budget, budget_used, is_infinite_budget, requires_application, application_questions, description, status, start_date, guidelines, blueprint_id, brands(is_verified)").eq("status", "active").eq("is_private", false).limit(3);
    if (joinedCampaignIds.length > 0) {
      recommendedQuery = recommendedQuery.not("id", "in", `(${joinedCampaignIds.join(",")})`);
    }
    const {
      data: recommendedData
    } = await recommendedQuery;
    setRecommendedCampaigns((recommendedData || []).map(c => ({
      ...c,
      brand_is_verified: (c.brands as BrandRelation | null)?.is_verified || false,
      application_questions: Array.isArray(c.application_questions) ? c.application_questions as string[] : []
    })));

    // Fetch recent activity (recent transactions)
    const {
      data: recentTransactions
    } = await supabase.from("wallet_transactions").select("id, type, amount, description, created_at, metadata").eq("user_id", user.id).order("created_at", {
      ascending: false
    }).limit(5);

    // Extract campaign IDs from metadata and fetch campaign info
    const campaignIds = (recentTransactions || []).map(tx => (tx.metadata as TransactionMetadata | null)?.campaign_id).filter(Boolean) as string[];
    let campaignMap: Record<string, {
      brand_logo_url: string | null;
      brand_name: string;
    }> = {};
    if (campaignIds.length > 0) {
      const {
        data: campaignsData
      } = await supabase.from("campaigns").select("id, brand_logo_url, brand_name").in("id", campaignIds);
      campaignMap = (campaignsData || []).reduce((acc, c) => {
        acc[c.id] = {
          brand_logo_url: c.brand_logo_url,
          brand_name: c.brand_name
        };
        return acc;
      }, {} as Record<string, {
        brand_logo_url: string | null;
        brand_name: string;
      }>);
    }
    const activities: RecentActivity[] = (recentTransactions || []).map(tx => {
      const campaignId = (tx.metadata as TransactionMetadata | null)?.campaign_id;
      const campaign = campaignId ? campaignMap[campaignId] : null;
      return {
        id: tx.id,
        type: 'earning' as const,
        title: tx.type === 'earning' ? 'Payment Received' : tx.type === 'withdrawal' ? 'Withdrawal' : 'Transaction',
        description: tx.description || 'Campaign payout',
        timestamp: tx.created_at,
        amount: tx.amount,
        campaignLogo: campaign?.brand_logo_url,
        campaignName: campaign?.brand_name
      };
    });
    setRecentActivity(activities);
  }, []);
  const fetchBoostApplications = useCallback(async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) return;
      const {
        data,
        error
      } = await supabase.from('bounty_applications').select('*').eq('user_id', session.user.id).order('applied_at', {
        ascending: false
      });
      if (error) throw error;

      // Fetch boost campaign details for each application
      const applicationsWithDetails = await Promise.all((data || []).map(async app => {
        const {
          data: campaign
        } = await supabase.from('bounty_campaigns').select(`
              id,
              title,
              monthly_retainer,
              videos_per_month,
              banner_url,
              brand_id,
              blueprint_id,
              blueprint_embed_url,
              content_style_requirements
            `).eq('id', app.bounty_campaign_id).single();
        let brandData = null;
        let blueprintData = null;
        if (campaign?.brand_id) {
          const {
            data: brand
          } = await supabase.from('brands').select('name, logo_url').eq('id', campaign.brand_id).single();
          brandData = brand;
        }

        // Fetch the specific blueprint linked to this boost
        if (campaign?.blueprint_id) {
          const {
            data: blueprint
          } = await supabase.from('blueprints').select('content, hooks, talking_points, dos_and_donts, call_to_action, content_guidelines').eq('id', campaign.blueprint_id).single();
          blueprintData = blueprint;
        }
        return {
          ...app,
          boost_campaigns: campaign ? {
            ...campaign,
            brands: brandData,
            blueprint: blueprintData
          } : null
        };
      }));
      setBoostApplications(applicationsWithDetails.filter(app => app.boost_campaigns) as BoostApplication[]);
    } catch (error: unknown) {
      console.error("Error fetching boost applications:", error);
    }
  }, []);
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);

    // Get current user
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Get campaign IDs and their submission status - only show approved or pending
    const {
      data: submissions,
      error: submissionsError
    } = await supabase.from("campaign_submissions").select("campaign_id, status").eq("creator_id", user.id).in("status", ["approved", "pending"]);
    console.log("All submissions:", submissions);
    if (submissionsError) {
      console.error("Submissions error:", submissionsError);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch your campaigns"
      });
      setLoading(false);
      return;
    }
    const campaignIds = submissions?.map(s => s.campaign_id) || [];
    const submissionStatusMap = new Map(submissions?.map(s => [s.campaign_id, s.status]) || []);
    console.log("Campaign IDs from submissions:", campaignIds);
    if (campaignIds.length === 0) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    // Fetch campaigns user has joined with brand data (including ended campaigns)
    const {
      data,
      error
    } = await supabase.from("campaigns").select(`
        *,
        brands (
          name,
          logo_url,
          is_verified,
          slug
        )
      `).in("id", campaignIds).order("created_at", {
      ascending: false
    });

    // Fetch user's social accounts connected to these campaigns via junction table
    const {
      data: accountCampaigns
    } = await supabase.from("social_account_campaigns").select(`
        campaign_id,
        social_accounts (
          id,
          platform,
          username
        )
      `).in("campaign_id", campaignIds).eq("user_id", user.id).eq("status", "active");

    // Group social accounts by campaign_id
    const accountsByCampaign = new Map<string, Array<{
      id: string;
      platform: string;
      username: string;
    }>>();
    (accountCampaigns as SocialAccountConnection[] | null)?.forEach((connection) => {
      if (connection.campaign_id && connection.social_accounts) {
        if (!accountsByCampaign.has(connection.campaign_id)) {
          accountsByCampaign.set(connection.campaign_id, []);
        }
        accountsByCampaign.get(connection.campaign_id)?.push(connection.social_accounts);
      }
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch campaigns"
      });
    } else {
      // Add submission status and brand data to each campaign
      const campaignsWithStatus = (data || []).map(campaign => ({
        ...campaign,
        brand_name: (campaign.brands as BrandRelation | null)?.name || campaign.brand_name,
        brand_logo_url: (campaign.brands as BrandRelation | null)?.logo_url || campaign.brand_logo_url,
        brand_is_verified: (campaign.brands as BrandRelation | null)?.is_verified || false,
        brand_slug: (campaign.brands as BrandRelation | null)?.slug,
        submission_status: submissionStatusMap.get(campaign.id),
        connected_accounts: accountsByCampaign.get(campaign.id) || []
      }));
      setCampaigns(campaignsWithStatus);
    }
    setLoading(false);
  }, [toast]);

  // Fetch data on mount
  useEffect(() => {
    fetchCampaigns();
    fetchBoostApplications();
    fetchDashboardData();
    fetchWalletTransactions();
  }, [fetchCampaigns, fetchBoostApplications, fetchDashboardData, fetchWalletTransactions]);

  const handleWithdrawApplication = async () => {
    if (!selectedCampaignId) return;
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Delete submission
      const {
        error
      } = await supabase.from("campaign_submissions").delete().eq("campaign_id", selectedCampaignId).eq("creator_id", user.id).eq("status", "pending");
      if (error) throw error;

      // Get ALL user's social accounts
      const {
        data: userAccounts
      } = await supabase.from("social_accounts").select("id").eq("user_id", user.id);

      // Disconnect ALL social account campaign links for this campaign and user
      if (userAccounts && userAccounts.length > 0) {
        const accountIds = userAccounts.map(acc => acc.id);
        await supabase.from("social_account_campaigns").update({
          status: 'disconnected',
          disconnected_at: new Date().toISOString()
        }).eq("campaign_id", selectedCampaignId).in("social_account_id", accountIds);
      }
      toast({
        title: "Application withdrawn",
        description: "Your application has been successfully withdrawn"
      });

      // Refresh campaigns to remove the withdrawn one
      fetchCampaigns();
    } catch (error) {
      console.error("Error withdrawing application:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to withdraw application"
      });
    } finally {
      setWithdrawDialogOpen(false);
      setSelectedCampaignId(null);
    }
  };
  const handleLeaveCampaign = async () => {
    if (!selectedCampaignId) return;
    setLeavingCampaign(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please sign in to leave campaign"
        });
        return;
      }

      // 1. Delete all campaign submissions
      const {
        error: submissionError
      } = await supabase.from("campaign_submissions").delete().eq("campaign_id", selectedCampaignId).eq("creator_id", user.id);
      if (submissionError) throw submissionError;

      // 2. Get all linked social accounts before unlinking
      const {
        data: linkedAccounts
      } = await supabase.from("social_account_campaigns").select("social_account_id, social_accounts(id)").eq("campaign_id", selectedCampaignId).eq("user_id", user.id);

      // 3. Stop tracking in Shortimize for each linked account
      if (linkedAccounts && linkedAccounts.length > 0) {
        for (const link of linkedAccounts) {
          try {
            console.log('Stopping Shortimize tracking for account...');
            const {
              error: untrackError
            } = await supabase.functions.invoke('untrack-shortimize-account', {
              body: {
                campaignId: selectedCampaignId,
                socialAccountId: link.social_account_id
              }
            });
            if (untrackError) {
              console.error('Error stopping tracking:', untrackError);
            }
          } catch (error) {
            console.error('Error calling untrack function:', error);
          }
        }
      }

      // 4. Disconnect all social accounts from this campaign in junction table
      const {
        error: unlinkError
      } = await supabase.from("social_account_campaigns").update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString()
      }).eq("campaign_id", selectedCampaignId).in("social_account_id", linkedAccounts?.map(l => l.social_account_id) || []);
      if (unlinkError) throw unlinkError;

      toast({
        title: "Left Campaign",
        description: "You have successfully left this campaign"
      });

      // Refresh campaigns list
      fetchCampaigns();
    } catch (error) {
      console.error("Error leaving campaign:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to leave campaign. Please try again."
      });
    } finally {
      setLeavingCampaign(false);
      setLeaveCampaignDialogOpen(false);
      setSelectedCampaignId(null);
    }
  };

  const handleReapply = (application: BoostApplication) => {
    setSelectedBoostForReapply(application);
    setReapplyDialogOpen(true);
  };

  const hasNoCampaigns = campaigns.length === 0;
  const hasJoinedCampaigns = campaigns.length > 0;
  const shouldHideActionCards = hasJoinedCampaigns && hasPaymentMethod;
  return <div className={`space-y-4 pt-6 ${className || ''}`}>
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋
          </h1>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Discord Action - Connect or Discover Campaigns */}
        {!isDiscordConnected ? (
          <button
            onClick={() => navigate('/dashboard?tab=settings')}
            className="group relative flex flex-col p-4 rounded-xl bg-white border border-border dark:border-0 dark:bg-muted/50 hover:bg-muted/30 dark:hover:bg-muted/70 transition-all duration-200 text-left"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-muted dark:bg-muted/80 flex items-center justify-center">
                <img src={discordWhiteIcon} alt="" className="w-5 h-5 invert dark:invert-0" />
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
            <span className="text-sm font-semibold text-foreground font-inter tracking-[-0.3px]">Connect Discord</span>
            <span className="text-xs text-muted-foreground mt-1 font-inter tracking-[-0.2px]">Get notified about opportunities and payments</span>
          </button>
        ) : (
          <button
            onClick={() => navigate('/dashboard?tab=discover')}
            className="group relative flex flex-col p-4 rounded-xl bg-white border border-border dark:border-0 dark:bg-muted/50 hover:bg-muted/30 dark:hover:bg-muted/70 transition-all duration-200 text-left"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-muted dark:bg-muted/80 flex items-center justify-center">
                <Icon icon="material-symbols:search" className="w-5 h-5 text-foreground" />
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
            <span className="text-sm font-semibold text-foreground font-inter tracking-[-0.3px]">Discover Campaigns</span>
            <span className="text-xs text-muted-foreground mt-1 font-inter tracking-[-0.2px]">Find new opportunities to earn</span>
          </button>
        )}

        {/* Learning Action */}
        <button
          onClick={() => navigate('/training')}
          className="group relative flex flex-col p-4 rounded-xl bg-white border border-border dark:border-0 dark:bg-muted/50 hover:bg-muted/30 dark:hover:bg-muted/70 transition-all duration-200 text-left"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-muted dark:bg-muted/80 flex items-center justify-center">
              <Icon icon="material-symbols:school" className="w-5 h-5 text-foreground" />
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-all" />
          </div>
          <span className="text-sm font-semibold text-foreground font-inter tracking-[-0.3px]">Creator Academy</span>
          <span className="text-xs text-muted-foreground mt-1 font-inter tracking-[-0.2px]">Learn tips to grow your earnings</span>
        </button>

        {/* Payouts Action */}
        <button
          onClick={() => navigate('/dashboard?tab=wallet')}
          className="group relative flex flex-col p-4 rounded-xl bg-white border border-border dark:border-0 dark:bg-muted/50 hover:bg-muted/30 dark:hover:bg-muted/70 transition-all duration-200 text-left"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-muted dark:bg-muted/80 flex items-center justify-center">
              <Icon icon="material-symbols:account-balance-wallet" className="w-5 h-5 text-foreground" />
            </div>
            {!hasPaymentMethod ? (
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Setup Required</span>
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-all" />
            )}
          </div>
          <span className="text-sm font-semibold text-foreground font-inter tracking-[-0.3px]">Manage Payouts</span>
          <span className="text-xs text-muted-foreground mt-1 font-inter tracking-[-0.2px]">
            {hasPaymentMethod ? 'View and update payment methods' : 'Add a payout method to get paid'}
          </span>
        </button>
      </div>

      {/* Your Campaigns & Boosts Section - Combined */}
      {(campaigns.length > 0 || boostApplications.filter(app => app.status === 'accepted').length > 0) && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Your Campaigns</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Boosts displayed as cards */}
            {boostApplications.filter(app => app.status === 'accepted').map(application => (
              <BoostCardCompact
                key={`boost-${application.boost_campaigns.id}`}
                id={application.boost_campaigns.id}
                title={application.boost_campaigns.title}
                brand_name={application.boost_campaigns.brands?.name || ''}
                brand_logo_url={application.boost_campaigns.brands?.logo_url || null}
                brand_is_verified={application.boost_campaigns.brands?.is_verified}
                brand_slug={application.boost_campaigns.brands?.slug}
                banner_url={application.boost_campaigns.banner_url || null}
                monthly_retainer={application.boost_campaigns.monthly_retainer}
                videos_per_month={application.boost_campaigns.videos_per_month}
                onClick={() => navigate(`/dashboard/boost/${application.boost_campaigns.id}`, {
                  state: {
                    boost: {
                      ...application.boost_campaigns,
                      brand_name: application.boost_campaigns.brands?.name,
                      brand_logo_url: application.boost_campaigns.brands?.logo_url
                    }
                  }
                })}
              />
            ))}
            {/* Regular campaigns */}
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                id={campaign.id}
                title={campaign.title}
                brand_name={campaign.brand_name}
                brand_logo_url={campaign.brand_logo_url}
                brand_is_verified={campaign.brand_is_verified}
                brand_slug={campaign.brand_slug}
                banner_url={campaign.banner_url}
                budget={campaign.budget}
                budget_used={campaign.budget_used}
                is_infinite_budget={campaign.is_infinite_budget}
                platforms={campaign.allowed_platforms || []}
                isEnded={campaign.status === 'ended'}
                showBookmark={false}
                showFullscreen={false}
                onClick={() => navigate(`/dashboard/campaign/${campaign.id}`, { state: { campaign } })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Received Pitches (Brand Invitations) */}
      <ReceivedPitchesWidget />

      {/* Sent Pitches Widget */}
      <CreatorPitchesWidget />

      {/* Campaigns Content */}
      <>


      {/* Boost Applications Section - Pending/Rejected Only */}
      {boostApplications.filter(app => app.status !== 'accepted').length > 0 && <div className="space-y-3">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {boostApplications.filter(app => app.status !== 'accepted').map(application => <Card key={application.id} className="group bg-card transition-all duration-300 animate-fade-in flex flex-col overflow-hidden border">
                {/* Banner Image */}
                {application.boost_campaigns.banner_url && <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                    <img src={application.boost_campaigns.banner_url} alt={application.boost_campaigns.title} className="w-full h-full object-cover object-center" />
                  </div>}

                <CardContent className="p-4 flex-1 flex flex-col gap-4 font-['Inter'] tracking-[-0.5px]">
                  {/* Brand + Title Row */}
                  <div className="flex items-center gap-3">
                    {application.boost_campaigns.brands?.logo_url && <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                        <img src={application.boost_campaigns.brands.logo_url} alt={application.boost_campaigns.brands.name || ''} className="w-full h-full object-cover" />
                      </div>}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold line-clamp-1 leading-tight">
                        {application.boost_campaigns.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {application.boost_campaigns.brands?.name}
                      </p>
                    </div>
                    <Badge variant={application.status === 'rejected' ? 'destructive' : 'secondary'} className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5">
                      {application.status === 'pending' && 'Pending'}
                      {application.status === 'rejected' && 'Rejected'}
                    </Badge>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-xs border-t border-border/50 pt-3 mt-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Retainer</span>
                      <span className="font-semibold">${application.boost_campaigns.monthly_retainer.toLocaleString()}/mo</span>
                    </div>
                    <div className="w-px h-3 bg-border/50" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Videos</span>
                      <span className="font-semibold">{application.boost_campaigns.videos_per_month}/mo</span>
                    </div>
                  </div>

                  {/* Re-apply Button for Rejected Applications */}
                  {application.status === 'rejected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 border-t border-border/50 rounded-lg text-xs"
                      onClick={() => handleReapply(application)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Re-apply
                    </Button>
                  )}
                </CardContent>
              </Card>)}
          </div>
        </div>}
    </>
    
    {/* Link Account Options Dialog */}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-sm border-0 p-[10px] overflow-hidden bg-background">
        <div className="p-6 pb-4 py-0 px-0">
          <DialogHeader className="space-y-1.5 px-[10px] py-[10px]">
            <DialogTitle className="text-base font-semibold" style={{
                fontFamily: 'Inter',
                letterSpacing: '-0.5px'
              }}>
              Link Your Account
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground" style={{
                fontFamily: 'Inter',
                letterSpacing: '-0.3px'
              }}>
              Connect a social account to this campaign
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="pb-6 space-y-2 px-0">
          <button onClick={() => {
              setDialogOpen(false);
              navigate("/dashboard?tab=profile");
            }} className="w-full group flex items-center justify-between p-3.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all text-left">
            <div>
              <p className="text-sm font-medium" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.3px'
                }}>Link Existing</p>
              <p className="text-[11px] text-muted-foreground mt-0.5" style={{
                  fontFamily: 'Inter'
                }}>From connected accounts</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </button>
          
          <button onClick={() => {
              setDialogOpen(false);
              setAddAccountDialogOpen(true);
            }} className="w-full group flex items-center justify-between p-3.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all text-left">
            <div>
              <p className="text-sm font-medium" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.3px'
                }}>Add New Account</p>
              <p className="text-[11px] text-muted-foreground mt-0.5" style={{
                  fontFamily: 'Inter'
                }}>Connect & verify new account</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Withdraw Application Confirmation Dialog */}
    <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to withdraw your application? You can always reapply later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleWithdrawApplication} className="bg-destructive hover:bg-destructive/90">
            Withdraw
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    
    {/* Leave Campaign Confirmation Dialog */}
    <AlertDialog open={leaveCampaignDialogOpen} onOpenChange={setLeaveCampaignDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave Campaign?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to leave this campaign? This will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Withdraw your application</li>
              <li>Unlink all connected social accounts</li>
              <li>Remove your access to campaign resources</li>
            </ul>
            <p className="mt-2">You can always reapply later if the campaign is still active.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLeaveCampaign} className="bg-destructive hover:bg-destructive/90">
            {leavingCampaign ? "Leaving..." : "Leave Campaign"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    
    <AddSocialAccountDialog open={addAccountDialogOpen} onOpenChange={setAddAccountDialogOpen} onSuccess={fetchCampaigns} />
    
    {selectedAccount && <>
        <ManageAccountDialog open={manageAccountDialogOpen} onOpenChange={setManageAccountDialogOpen} account={{
          id: selectedAccount.id,
          username: selectedAccount.username,
          platform: selectedAccount.platform,
          account_link: null
        }} demographicStatus={null} daysUntilNext={null} lastSubmissionDate={null} nextSubmissionDate={null} onUpdate={fetchCampaigns} onSubmitDemographics={() => setSubmitDemographicsDialogOpen(true)} platformIcon={<div className="w-6 h-6">
              <img src={getPlatformIcon(selectedAccount.platform) || ''} alt={selectedAccount.platform} className="w-full h-full" />
            </div>} />
        
        <SubmitAudienceInsightsDialog open={submitDemographicsDialogOpen} onOpenChange={setSubmitDemographicsDialogOpen} socialAccountId={selectedAccount.id} platform={selectedAccount.platform} username={selectedAccount.username} onSuccess={() => {
          setSubmitDemographicsDialogOpen(false);
          fetchCampaigns();
        }} />
      </>}
    
      <JoinCampaignSheet campaign={selectedCampaignForJoin} open={joinCampaignSheetOpen} onOpenChange={setJoinCampaignSheetOpen} onSuccess={() => {
        // After successful join, navigate to campaign details page
        if (selectedCampaignForJoin) {
          // Small delay to let the sheet close animation complete
          setTimeout(() => {
            navigate(`/dashboard/campaign/${selectedCampaignForJoin.id}`);
          }, 300);
        }
      }} />
      
      {/* Re-apply to Boost Sheet */}
      <ApplyToBountySheet
        open={reapplyDialogOpen}
        onOpenChange={setReapplyDialogOpen}
        bounty={selectedBoostForReapply ? {
          id: selectedBoostForReapply.boost_campaigns.id,
          title: selectedBoostForReapply.boost_campaigns.title,
          description: null,
          monthly_retainer: selectedBoostForReapply.boost_campaigns.monthly_retainer,
          videos_per_month: selectedBoostForReapply.boost_campaigns.videos_per_month,
          content_style_requirements: selectedBoostForReapply.boost_campaigns.content_style_requirements || '',
          max_accepted_creators: 0,
          accepted_creators_count: 0,
          start_date: null,
          end_date: null,
          banner_url: selectedBoostForReapply.boost_campaigns.banner_url,
          status: 'active',
          brands: selectedBoostForReapply.boost_campaigns.brands
        } : null}
        onSuccess={() => {
          setReapplyDialogOpen(false);
          setSelectedBoostForReapply(null);
          fetchBoostApplications();
          toast({
            title: "Application submitted",
            description: "Your re-application has been submitted successfully"
          });
        }}
      />

      {/* Transaction Receipt Sheet */}
      <Sheet open={transactionSheetOpen} onOpenChange={setTransactionSheetOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto border-l-0 font-inter tracking-[-0.3px]">
          {selectedTransaction && <div className="flex flex-col h-full">
              {/* Hero Header with Amount */}
              {selectedTransaction.status && selectedTransaction.status !== 'completed' && <div className="px-6 pt-4 pb-2 text-center relative">
                <button onClick={() => setTransactionSheetOpen(false)} className="absolute top-4 right-4 md:hidden p-2 rounded-full bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <Badge variant={selectedTransaction.status === 'rejected' ? 'destructive' : selectedTransaction.status === 'in_transit' ? 'default' : 'secondary'} className="capitalize">
                    {selectedTransaction.status === 'in_transit' && <Hourglass className="h-3 w-3 mr-1" />}
                    {selectedTransaction.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                    {selectedTransaction.status === 'in_transit' ? 'In Transit' : selectedTransaction.status}
                  </Badge>
              </div>}

              {/* Transaction Details Content */}
              <div className="flex-1 px-6 py-5">
                <div className="space-y-6">
                  {/* Source Section */}
                  <div>
                    <span className="text-[11px] tracking-[-0.5px] text-muted-foreground/60 font-medium font-inter">Source</span>
                    <div className="flex items-center gap-3 mt-2">
                      {selectedTransaction.campaign?.brand_logo_url || selectedTransaction.boost?.brand_logo_url ? <img src={selectedTransaction.campaign?.brand_logo_url || selectedTransaction.boost?.brand_logo_url} alt={selectedTransaction.campaign?.brand_name || selectedTransaction.boost?.brand_name || "Brand"} className="w-10 h-10 rounded-[7px] object-cover" /> : <div className="w-10 h-10 rounded-[7px] bg-muted flex items-center justify-center">
                          <span className="text-base font-semibold text-muted-foreground">
                            {(selectedTransaction.campaign?.brand_name || selectedTransaction.boost?.brand_name || 'N')?.charAt(0).toUpperCase()}
                          </span>
                        </div>}
                      <div>
                        <span className="text-base font-semibold tracking-[-0.5px] block">
                          {selectedTransaction.campaign?.brand_name || selectedTransaction.boost?.brand_name || 'N/A'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {selectedTransaction.campaign?.title || selectedTransaction.boost?.title || ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Section */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="text-[11px] tracking-[-0.5px] text-muted-foreground/60 font-medium font-inter">Initiated</span>
                      <div className="mt-1.5">
                        <span className="text-sm font-medium tracking-[-0.5px] block">
                          {format(selectedTransaction.date, 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(selectedTransaction.date, 'h:mm a')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] tracking-[-0.5px] text-muted-foreground/60 font-medium font-inter">Paid</span>
                      <div className="mt-1.5">
                        {selectedTransaction.status === 'completed' ? <>
                          <span className="text-sm font-medium tracking-[-0.5px] block">
                            {format(selectedTransaction.date, 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(selectedTransaction.date, 'h:mm a')}
                          </span>
                        </> : <span className="text-sm text-muted-foreground">—</span>}
                      </div>
                    </div>
                  </div>

                  {/* Period Section - only show for non-boost transactions */}
                  {selectedTransaction.type !== 'boost_earning' && selectedTransaction.metadata?.period_start && <div>
                    <span className="text-[11px] tracking-[-0.5px] text-muted-foreground/60 font-medium font-inter">Period</span>
                    <span className="text-sm font-medium tracking-[-0.5px] block mt-1.5">
                      {selectedTransaction.metadata?.period_start && selectedTransaction.metadata?.period_end ? `${format(new Date(selectedTransaction.metadata.period_start), 'MMM d')} – ${format(new Date(selectedTransaction.metadata.period_end), 'MMM d, yyyy')}` : format(selectedTransaction.date, 'MMM d, yyyy')}
                    </span>
                  </div>}

                  {/* Amount Section */}
                  <div>
                    <span className="text-[11px] tracking-[-0.5px] text-muted-foreground/60 font-medium font-inter">Amount</span>
                    <span className="text-lg font-bold tracking-[-0.5px] block mt-1">
                      ${Math.abs(selectedTransaction.amount).toFixed(2)}
                    </span>
                  </div>

                  {/* Description Section */}
                  <div>
                    <span className="text-[11px] tracking-[-0.5px] text-muted-foreground/60 font-medium font-inter">Description</span>
                    <span className="text-sm font-medium tracking-[-0.5px] block mt-1.5">
                      {selectedTransaction.source || (selectedTransaction.type === 'earning' || selectedTransaction.type === 'boost_earning' ? `${selectedTransaction.campaign?.brand_name || selectedTransaction.boost?.brand_name || 'Campaign'} payout` : selectedTransaction.type === 'withdrawal' ? 'Withdrawal request' : selectedTransaction.type === 'referral' ? 'Referral bonus' : selectedTransaction.type === 'transfer_sent' ? `Sent to @${selectedTransaction.metadata?.recipient_username || 'user'}` : selectedTransaction.type === 'transfer_received' ? `Received from @${selectedTransaction.metadata?.sender_username || 'user'}` : selectedTransaction.type === 'balance_correction' ? 'Balance correction' : 'Transaction')}
                    </span>
                  </div>

                  {/* Transaction ID */}
                  <div className="pt-4">
                    <span className="text-[11px] tracking-[-0.5px] text-muted-foreground/60 font-medium font-inter">Transaction ID</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-mono text-muted-foreground break-all">
                        {selectedTransaction.id}
                      </span>
                      <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-muted hover:text-foreground flex-shrink-0" aria-label="Copy transaction ID" onClick={() => {
                    navigator.clipboard.writeText(selectedTransaction.id);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                    toast({
                      description: "Transaction ID copied"
                    });
                  }}>
                        {copiedId ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason */}
                {selectedTransaction.status === 'rejected' && selectedTransaction.rejection_reason && <div className="mt-5 p-3 bg-destructive/10 rounded-xl">
                    <div className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium tracking-[-0.5px] text-destructive mb-1">Rejection Reason</div>
                        <p className="text-sm text-muted-foreground">{selectedTransaction.rejection_reason}</p>
                      </div>
                    </div>
                  </div>}
              </div>

              {/* Fixed Buttons */}
              <div className="sticky bottom-0 left-0 right-0 p-4 bg-background border-t border-border mt-auto flex flex-col gap-2">
                <Button onClick={() => setShareDialogOpen(true)} className="w-full gap-2">
                  Share Transaction
                </Button>
                <Button variant="ghost" onClick={() => setTransactionSheetOpen(false)} className="w-full md:hidden text-muted-foreground hover:text-foreground hover:bg-muted/50">
                  Close
                </Button>
              </div>
            </div>}
        </SheetContent>
      </Sheet>

      {/* Share Transaction Dialog */}
      <TransactionShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} transaction={selectedTransaction} userProfile={userProfile} />
    </div>;
}