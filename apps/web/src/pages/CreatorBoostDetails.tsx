import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronRight, ExternalLink, Link2, Plus, Loader2, FileText, PenLine, Menu } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { SubmitVideoDialog } from "@/components/SubmitVideoDialog";
import { SubmitBoostVideoDialog } from "@/components/SubmitBoostVideoDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from "dompurify";
import tiktokIcon from "@/assets/tiktok-logo-white.png";
import tiktokIconBlack from "@/assets/tiktok-logo-black-new.png";
import instagramIcon from "@/assets/instagram-logo-white.png";
import instagramIconBlack from "@/assets/instagram-logo-black.png";
import youtubeIcon from "@/assets/youtube-logo-white.png";
import youtubeIconBlack from "@/assets/youtube-logo-black-new.png";
import { SubmissionsTab } from "@/components/dashboard/SubmissionsTab";
import { TransactionsTable, Transaction } from "@/components/dashboard/TransactionsTable";
import { AssetLibrary, AssetRequestDialog, AssetUploadDialog, AssetDeleteDialog, AssetDetailPanel } from "@/components/assets";
import type { BrandAsset } from "@/types/assets";
import { format, differenceInHours, startOfMonth, endOfMonth } from "date-fns";
import {
  SourceDetailsSidebarProvider,
  useSourceDetails,
  SourceDetailsLeftSidebar,
  SourceDetailsRightPanel,
  AgreementTab,
} from "@/components/source-details";
import { SourceDetailsMobileLayout } from "@/components/source-details/mobile";
import { useAnnouncements } from "@/hooks/useAnnouncements";

interface CreatorContract {
  id: string;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled';
  contract_url: string | null;
  custom_terms: string | null;
  signed_at: string | null;
  sent_at: string | null;
  signature_url: string | null;
  title: string | null;
  monthly_rate: number | null;
  videos_per_month: number | null;
  payment_model?: 'retainer' | 'flat_rate' | null;
  per_post_rate?: number | null;
}

interface Boost {
  id: string;
  title: string;
  brand_id?: string;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements?: string | null;
  blueprint_id?: string | null;
  blueprint_embed_url?: string | null;
  banner_url?: string | null;
  brand_name?: string;
  brand_logo_url?: string | null;
  brand_color?: string | null;
  discord_guild_id?: string | null;
  content_distribution?: string | null;
  payment_model?: 'retainer' | 'flat_rate' | null;
  flat_rate_min?: number | null;
  flat_rate_max?: number | null;
  slug?: string | null;
  brands?: {
    name: string;
    logo_url: string | null;
    is_verified?: boolean;
    slug?: string;
    brand_color?: string | null;
  };
  blueprint?: {
    content: string | null;
    hooks: any[] | null;
    talking_points: any[] | null;
    dos_and_donts: any | null;
    call_to_action: string | null;
    content_guidelines: string | null;
  } | null;
}

interface VideoSubmission {
  id: string;
  status: string;
  submitted_at: string;
  payout_amount: number | null;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Inner component that uses the context
function BoostDetailsContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const { activeSection, setActiveSection, isMobile, mobileNavOpen, setMobileNavOpen } = useSourceDetails();

  // Get boost from navigation state if available (instant load)
  const passedBoost = (location.state as { boost?: Boost } | null)?.boost;

  const [boost, setBoost] = useState<Boost | null>(passedBoost || null);
  const [loading, setLoading] = useState(!passedBoost);
  const [showSubmitVideoDialog, setShowSubmitVideoDialog] = useState(false);
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [earnings, setEarnings] = useState<Transaction[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [contract, setContract] = useState<CreatorContract | null>(null);
  const [approvedRate, setApprovedRate] = useState<number | null>(null);
  const [members, setMembers] = useState<Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    username?: string;
    views?: number;
    joined_at?: string;
  }>>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  // Leave boost state
  const [leaveBoostDialogOpen, setLeaveBoostDialogOpen] = useState(false);
  const [leavingBoost, setLeavingBoost] = useState(false);

  // User Discord connection status
  const [hasUserDiscord, setHasUserDiscord] = useState(false);

  // Editor status for GDrive video submission
  const [isEditor, setIsEditor] = useState(false);
  const [showGDriveSubmitDialog, setShowGDriveSubmitDialog] = useState(false);
  const [showAssetRequestDialog, setShowAssetRequestDialog] = useState(false);
  const [showAssetUploadDialog, setShowAssetUploadDialog] = useState(false);
  const [deleteAsset, setDeleteAsset] = useState<BrandAsset | null>(null);
  const [editAsset, setEditAsset] = useState<BrandAsset | null>(null);
  const [selectedAssetForPanel, setSelectedAssetForPanel] = useState<BrandAsset | null>(null);
  const [isBrandAdmin, setIsBrandAdmin] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(null);

  // Clear selected asset when navigating away from assets tab
  useEffect(() => {
    if (activeSection.type !== 'assets') {
      setSelectedAssetForPanel(null);
    }
  }, [activeSection.type]);

  // Conversation state
  const [creatingConversation, setCreatingConversation] = useState(false);

  // Fetch real announcements
  const { announcements: realAnnouncements, toggleReaction } = useAnnouncements({
    sourceType: "boost",
    sourceId: id || "",
    enabled: !!id,
  });

  const getPlatformIcon = (platform: string) => {
    const isLightMode = resolvedTheme === "light";
    switch (platform.toLowerCase()) {
      case "tiktok":
        return isLightMode ? tiktokIconBlack : tiktokIcon;
      case "instagram":
        return isLightMode ? instagramIconBlack : instagramIcon;
      case "youtube":
        return isLightMode ? youtubeIconBlack : youtubeIcon;
      default:
        return null;
    }
  };

  // Fetch brand data if missing (when boost is passed via navigation state)
  useEffect(() => {
    const fetchBrandData = async () => {
      if (!boost?.id) return;
      const brandColor = boost.brand_color || boost.brands?.brand_color;
      const brandLogo = boost.brand_logo_url || boost.brands?.logo_url;
      if (brandColor && brandLogo) return;

      const { data: boostData } = await supabase
        .from("bounty_campaigns")
        .select("brand_id, brands(brand_color, logo_url)")
        .eq("id", boost.id)
        .single();

      if (boostData?.brands) {
        const brandData = boostData.brands as any;
        if (brandData.brand_color || brandData.logo_url) {
          setBoost(prev => prev ? {
            ...prev,
            brand_color: brandData.brand_color || prev.brand_color,
            brand_logo_url: brandData.logo_url || prev.brand_logo_url,
            brands: prev.brands ? {
              ...prev.brands,
              brand_color: brandData.brand_color || prev.brands.brand_color,
              logo_url: brandData.logo_url || prev.brands.logo_url
            } : prev.brands
          } : null);
        }
      }
    };
    fetchBrandData();
  }, [boost?.id]);

  // Track the last fetched ID to avoid duplicate fetches
  const lastFetchedIdRef = useRef<string | null>(null);

  // Fetch boost data when ID changes
  useEffect(() => {
    const fetchBoost = async () => {
      if (!id) return;

      // Skip fetch if we already fetched this exact ID and have complete data
      if (lastFetchedIdRef.current === id && boost && boost.id === id && boost.content_distribution !== undefined) {
        setLoading(false);
        return;
      }

      // Reset secondary state when switching to a different boost
      if (boost && boost.id !== id) {
        setSubmissions([]);
        setEarnings([]);
        setContract(null);
        setMembers([]);
        setMemberCount(0);
        setApprovedRate(null);
      }

      setLoading(true);
      lastFetchedIdRef.current = id;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch boost details
      const { data: boostData, error } = await supabase
        .from("bounty_campaigns")
        .select(`
          *,
          brands (
            name,
            logo_url,
            is_verified,
            slug,
            brand_color
          )
        `)
        .eq("id", id)
        .single();

      if (error || !boostData) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load boost details"
        });
        navigate('/dashboard');
        return;
      }

      // Fetch blueprint separately if blueprint_id exists
      let blueprintData = null;
      if (boostData.blueprint_id) {
        const { data: blueprint } = await supabase
          .from("blueprints")
          .select("content, hooks, talking_points, dos_and_donts, call_to_action, content_guidelines")
          .eq("id", boostData.blueprint_id)
          .single();
        blueprintData = blueprint;
      }

      const brandData = boostData.brands as any;
      setBoost({
        ...boostData,
        brand_name: brandData?.name,
        brand_logo_url: brandData?.logo_url,
        brand_color: brandData?.brand_color,
        brands: brandData,
        blueprint: blueprintData
      });
      // Set brand ID for conversation feature
      if (boostData.brand_id) {
        setBrandId(boostData.brand_id);
      }
      setLoading(false);
    };

    fetchBoost();
  }, [id, navigate, toast]);

  // Consolidated fetch for all secondary data - runs in parallel for faster loading
  useEffect(() => {
    const fetchAllSecondaryData = async () => {
      if (!boost?.id) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Run all fetches in parallel
      const [
        submissionsResult,
        contractResult,
        applicationsResult,
        discordResult,
        boostDataResult,
        earningsResult,
        brandMembershipResult,
        userApplicationResult
      ] = await Promise.all([
        // 1. Submissions
        supabase
          .from("video_submissions")
          .select("id, status, submitted_at, payout_amount")
          .eq("source_type", "boost")
          .eq("source_id", boost.id)
          .eq("creator_id", user.id)
          .order("submitted_at", { ascending: false }),

        // 2. Contract
        supabase
          .from("creator_contracts")
          .select("id, status, contract_url, custom_terms, signed_at, sent_at, signature_url, title, monthly_rate, videos_per_month, payment_model, per_post_rate")
          .eq("boost_id", boost.id)
          .eq("creator_id", user.id)
          .maybeSingle(),

        // 3. Boost applications (for members)
        supabase
          .from('bounty_applications')
          .select('user_id, created_at')
          .eq('bounty_campaign_id', boost.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: true })
          .limit(20),

        // 4. Discord status
        supabase.from('profiles').select('discord_id').eq('id', user.id).single(),

        // 5. Boost brand_id for editor check
        supabase.from('bounty_campaigns').select('brand_id').eq('id', boost.id).single(),

        // 6. Earnings
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', user.id)
          .in('type', ['earning', 'boost_earning'])
          .order('created_at', { ascending: false }),

        // 7. Brand membership check (for asset management) - will be processed after boostDataResult
        Promise.resolve({ data: null }), // Placeholder, will fetch after getting brand_id

        // 8. Current user's application (for approved_rate in flat-rate boosts)
        supabase
          .from('bounty_applications')
          .select('approved_rate')
          .eq('bounty_campaign_id', boost.id)
          .eq('user_id', user.id)
          .eq('status', 'accepted')
          .maybeSingle()
      ]);

      // Process submissions
      if (submissionsResult.data) {
        setSubmissions(submissionsResult.data);
      }

      // Process contract
      if (contractResult.data) {
        setContract(contractResult.data as CreatorContract);
      }

      // Process user's application approved_rate (for flat-rate boosts)
      if (userApplicationResult.data?.approved_rate) {
        setApprovedRate(userApplicationResult.data.approved_rate);
      }

      // Process Discord status
      setHasUserDiscord(!!discordResult.data?.discord_id);

      // Process brand ID, editor status, and brand admin status
      if (boostDataResult.data?.brand_id) {
        const fetchedBrandId = boostDataResult.data.brand_id;
        setBrandId(fetchedBrandId);

        // Check editor status and brand membership in parallel
        const [editorResult, membershipResult] = await Promise.all([
          supabase
            .from('boost_editor_accounts')
            .select('id')
            .eq('boost_id', boost.id)
            .eq('user_id', user.id)
            .limit(1),
          supabase
            .from('brand_members')
            .select('role')
            .eq('brand_id', fetchedBrandId)
            .eq('user_id', user.id)
            .maybeSingle()
        ]);

        if (editorResult.data && editorResult.data.length > 0) {
          setIsEditor(true);
        }

        // Process brand membership (for asset management permissions)
        if (membershipResult.data) {
          const role = membershipResult.data.role;
          setIsBrandAdmin(role === 'owner' || role === 'admin');
        } else {
          setIsBrandAdmin(false);
        }
      } else {
        setIsBrandAdmin(false);
      }

      // Process earnings
      if (earningsResult.data) {
        const boostTxns = earningsResult.data.filter(txn => {
          const metadata = txn.metadata as { boost_id?: string } | null;
          return metadata?.boost_id === boost.id;
        });
        const transactions: Transaction[] = boostTxns.map(txn => ({
          id: txn.id,
          type: (txn.type === 'boost_earning' ? 'boost_earning' : 'earning') as 'boost_earning' | 'earning',
          amount: Number(txn.amount) || 0,
          date: new Date(txn.created_at),
          status: txn.status,
          campaign: null,
          boost: {
            id: boost.id,
            title: boost.title,
            brand_name: boost.brand_name || boost.brands?.name || '',
            brand_logo_url: boost.brand_logo_url || boost.brands?.logo_url || null,
          },
          recipient: null,
          sender: null,
        }));
        setEarnings(transactions);
        setTotalEarnings(transactions.reduce((sum, t) => sum + t.amount, 0));
      }

      // Process members
      if (applicationsResult.data && applicationsResult.data.length > 0) {
        setMemberCount(applicationsResult.data.length);
        const creatorIds = [...new Set(applicationsResult.data.map(app => app.user_id))];

        // Fetch profiles and submission counts in parallel
        const [profilesResult, memberSubmissionsResult] = await Promise.all([
          supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', creatorIds),
          supabase.from('video_submissions').select('creator_id')
            .eq('source_type', 'boost').eq('source_id', boost.id).eq('status', 'approved')
        ]);

        const profileMap = new Map(profilesResult.data?.map(p => [p.id, p]) || []);
        const submissionsByCreator = new Map<string, number>();
        memberSubmissionsResult.data?.forEach((sub: any) => {
          submissionsByCreator.set(sub.creator_id, (submissionsByCreator.get(sub.creator_id) || 0) + 1);
        });

        const membersList = applicationsResult.data.map((app: any) => {
          const profile = profileMap.get(app.user_id);
          return {
            id: app.user_id,
            name: profile?.full_name || profile?.username || 'Creator',
            avatar_url: profile?.avatar_url || null,
            username: profile?.username,
            views: submissionsByCreator.get(app.user_id) || 0,
            joined_at: app.created_at
          };
        });

        membersList.sort((a: any, b: any) => {
          if (a.id === user.id) return -1;
          if (b.id === user.id) return 1;
          return (b.views || 0) - (a.views || 0);
        });
        setMembers(membersList);
      } else {
        setMembers([]);
        setMemberCount(0);
      }
    };

    fetchAllSecondaryData();
  }, [boost?.id, boost?.title, boost?.brand_name, boost?.brand_logo_url, boost?.brands?.name, boost?.brands?.logo_url]);

  const handleLeaveBoost = async () => {
    if (!boost?.id) return;
    setLeavingBoost(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please sign in to leave boost"
        });
        return;
      }

      // Update boost application status
      const { error } = await supabase
        .from("bounty_applications")
        .update({ status: 'withdrawn' })
        .eq("bounty_campaign_id", boost.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Left Boost",
        description: "You have successfully left this boost"
      });

      navigate('/dashboard');
    } catch (error) {
      console.error("Error leaving boost:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to leave boost. Please try again."
      });
    } finally {
      setLeavingBoost(false);
      setLeaveBoostDialogOpen(false);
    }
  };

  const startConversationWithBrand = async () => {
    if (!brandId || !currentUserId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to start conversation. Please try again."
      });
      return;
    }

    setCreatingConversation(true);
    try {
      // Check if conversation already exists
      const { data: existingConvo } = await supabase
        .from("conversations")
        .select("id")
        .eq("brand_id", brandId)
        .eq("creator_id", currentUserId)
        .maybeSingle();

      let conversationId = existingConvo?.id;

      // Create new conversation if none exists
      if (!conversationId) {
        const { data: newConvo, error: createError } = await supabase
          .from("conversations")
          .insert({
            brand_id: brandId,
            creator_id: currentUserId
          })
          .select("id")
          .single();

        if (createError) throw createError;
        conversationId = newConvo?.id;
      }

      // Navigate to dashboard - the messages widget will open with this conversation
      navigate('/dashboard', { state: { conversationId } });
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start conversation. Please try again."
      });
    } finally {
      setCreatingConversation(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!boost) {
    return null;
  }

  // Calculate stats - handle flat-rate and retainer payment models
  const isFlatRate = boost.payment_model === 'flat_rate';
  const payoutPerVideo = isFlatRate
    ? (contract?.per_post_rate || approvedRate || boost.flat_rate_min || 0)
    : (boost.videos_per_month > 0 ? boost.monthly_retainer / boost.videos_per_month : 0);
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thisMonthSubmissions = submissions.filter(s => {
    const submitDate = new Date(s.submitted_at);
    return submitDate >= monthStart && submitDate <= monthEnd;
  });
  const approvedThisMonth = thisMonthSubmissions.filter(s => s.status === "approved").length;
  const pendingThisMonth = thisMonthSubmissions.filter(s => s.status === "pending").length;
  const activeSubmissionsThisMonth = approvedThisMonth + pendingThisMonth;
  const earnedThisMonth = approvedThisMonth * payoutPerVideo;
  const dailyLimit = boost.videos_per_month > 0 ? Math.ceil(boost.videos_per_month / 30) : 999;
  const last24Hours = submissions.filter(s => {
    const hoursDiff = differenceInHours(now, new Date(s.submitted_at));
    return hoursDiff < 24 && s.status !== "rejected";
  });
  const dailyRemaining = Math.max(0, dailyLimit - last24Hours.length);
  const requiredPosts = boost.videos_per_month > 0 ? Math.max(0, boost.videos_per_month - activeSubmissionsThisMonth) : 0;
  const earnedPercent = boost.videos_per_month > 0 ? (approvedThisMonth / boost.videos_per_month * 100) : 0;
  const pendingPercent = pendingThisMonth / boost.videos_per_month * 100;

  // Progress stats for sidebar
  const progressStats = {
    totalViews: approvedThisMonth,
    targetViews: boost.videos_per_month,
    earnings: earnedThisMonth,
    submissionCount: submissions.length,
  };

  // Render Overview Content
  const renderOverviewContent = () => (
    <div className="space-y-6">
      {/* Contract Section */}
      {contract && (
        <div className={`rounded-xl border p-4 flex items-center justify-between ${
          contract.status === 'signed'
            ? 'border-green-500/30 bg-green-500/5'
            : contract.status === 'sent' || contract.status === 'pending'
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-border/50 bg-muted/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              contract.status === 'signed'
                ? 'bg-green-500/10'
                : 'bg-muted'
            }`}>
              <FileText className={`h-5 w-5 ${
                contract.status === 'signed'
                  ? 'text-green-500'
                  : 'text-muted-foreground'
              }`} />
            </div>
            <div>
              <p className="text-sm font-medium">Creator Contract</p>
              <p className="text-xs text-muted-foreground">
                {contract.status === 'signed'
                  ? `Signed ${contract.signed_at ? format(new Date(contract.signed_at), 'MMM d, yyyy') : ''}`
                  : contract.status === 'sent'
                    ? 'Awaiting your signature'
                    : contract.status === 'pending'
                      ? 'Contract pending'
                      : contract.status === 'declined'
                        ? 'Contract declined'
                        : 'Contract expired'
                }
              </p>
            </div>
          </div>
          {contract.status === 'sent' && contract.contract_url && (
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs"
              onClick={() => window.open(contract.contract_url!, '_blank')}
            >
              <PenLine className="h-3.5 w-3.5" />
              Review & Sign
            </Button>
          )}
          {contract.status === 'signed' && contract.contract_url && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs text-muted-foreground"
              onClick={() => window.open(contract.contract_url!, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View
            </Button>
          )}
        </div>
      )}

      {/* Posted By Label */}
      <div className="flex items-center gap-2 text-sm font-inter tracking-[-0.3px]">
        <span className="text-muted-foreground">Posted by:</span>
        <span className="font-medium text-foreground">{isPosterBoost ? 'Brand' : 'You'}</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/50">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Daily Limit</p>
          <p className="font-semibold text-sm text-foreground font-inter tracking-[-0.5px]">{dailyRemaining} left</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Monthly</p>
          <p className="font-semibold text-sm text-foreground font-inter tracking-[-0.5px]">{requiredPosts} left</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Platforms</p>
          <div className="flex justify-center gap-1 mt-1.5">
            {['tiktok', 'instagram', 'youtube'].map(platform => {
              const icon = getPlatformIcon(platform);
              return icon ? <img key={platform} src={icon} alt={platform} className="w-4 h-4" /> : null;
            })}
          </div>
        </div>
        <div className="text-center hidden sm:block">
          <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Per Video</p>
          <p className="font-semibold text-sm text-primary font-inter tracking-[-0.5px]">${payoutPerVideo.toFixed(2)}</p>
        </div>
        <div className="text-center hidden sm:block">
          <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Max Monthly</p>
          <p className="font-semibold text-sm text-foreground font-inter tracking-[-0.5px]">${boost.monthly_retainer}</p>
        </div>
      </div>
    </div>
  );

  // Render Blueprint Content
  const renderBlueprintContent = () => {
    const blueprintContent = boost.blueprint?.content;
    const styleReqs = boost.content_style_requirements;
    const strippedContent = blueprintContent ? blueprintContent.replace(/<[^>]*>/g, '').replace(/PLATFORMS:\s*/gi, '').trim() : '';
    const hasContent = strippedContent.length > 10 || (styleReqs && styleReqs.trim().length > 10);

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Content Guide</h2>

        {hasContent ? (
          <div className="space-y-4">
            {blueprintContent && strippedContent.length > 10 ? (
              <div
                className="text-sm text-foreground/90 leading-relaxed prose prose-sm dark:prose-invert max-w-none break-words p-4 bg-card border border-border rounded-xl"
                style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(blueprintContent) }}
              />
            ) : styleReqs ? (
              <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line break-words p-4 bg-card border border-border rounded-xl">
                {styleReqs}
              </div>
            ) : null}

            {/* Blueprint Details */}
            {boost.blueprint && (
              <div className="space-y-4">
                {/* Hooks */}
                {boost.blueprint.hooks && boost.blueprint.hooks.length > 0 && (
                  <div className="p-4 bg-card border border-border rounded-xl">
                    <h4 className="font-semibold text-sm mb-2">Hooks</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {boost.blueprint.hooks.map((hook: any, i: number) => (
                        <li key={i}>{typeof hook === 'string' ? hook : hook.text || hook.hook}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Talking Points */}
                {boost.blueprint.talking_points && boost.blueprint.talking_points.length > 0 && (
                  <div className="p-4 bg-card border border-border rounded-xl">
                    <h4 className="font-semibold text-sm mb-2">Talking Points</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {boost.blueprint.talking_points.map((point: any, i: number) => (
                        <li key={i}>{typeof point === 'string' ? point : point.text || point.point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dos and Don'ts */}
                {boost.blueprint.dos_and_donts && (
                  <div className="grid grid-cols-2 gap-4">
                    {boost.blueprint.dos_and_donts.dos && boost.blueprint.dos_and_donts.dos.length > 0 && (
                      <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                        <h4 className="font-semibold text-sm mb-2 text-green-500">Do's</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {boost.blueprint.dos_and_donts.dos.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {boost.blueprint.dos_and_donts.donts && boost.blueprint.dos_and_donts.donts.length > 0 && (
                      <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                        <h4 className="font-semibold text-sm mb-2 text-red-500">Don'ts</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {boost.blueprint.dos_and_donts.donts.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Call to Action */}
                {boost.blueprint.call_to_action && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <h4 className="font-semibold text-sm mb-2 text-primary">Call to Action</h4>
                    <p className="text-sm text-muted-foreground">{boost.blueprint.call_to_action}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No specific guidelines provided for this boost.</p>
        )}
      </div>
    );
  };

  // Check if this is a poster boost (brand posts on their accounts)
  const isPosterBoost = boost.content_distribution === 'brand_accounts';

  // Check if contract signature is required
  const contractSignatureRequired = contract && contract.status !== 'signed';

  // Render Submissions Content
  const renderSubmissionsContent = () => (
    <div className="space-y-6">
      {/* Contract signature required warning */}
      {contractSignatureRequired && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <Icon icon="material-symbols:warning-outline" className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground font-inter">Contract Signature Required</p>
            <p className="text-xs text-muted-foreground font-inter">
              You must sign the agreement before submitting videos.{" "}
              <button
                onClick={() => setActiveSection({ type: 'agreement' })}
                className="text-primary hover:underline"
              >
                Go to Agreement
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Monthly Progress Section */}
      <div>
        <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px] mb-4">Monthly Progress</h2>

        {/* Progress Section */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Semi-circle Progress Chart */}
            <div className="relative w-32 h-20 flex-shrink-0">
              <svg viewBox="0 0 100 55" className="w-full h-full overflow-visible">
                <defs>
                  <pattern id="orangeStripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                    <rect width="3" height="6" fill="#f97316" />
                    <rect x="3" width="3" height="6" fill="#fb923c" />
                  </pattern>
                </defs>

                {/* Background arc */}
                <path d="M 8 50 A 42 42 0 0 1 92 50" fill="none" className="stroke-muted" strokeWidth="8" strokeLinecap="butt" />

                {/* Approved arc (green) */}
                {approvedThisMonth > 0 && (
                  <path
                    d="M 8 50 A 42 42 0 0 1 92 50"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="8"
                    strokeLinecap="butt"
                    strokeDasharray={`${(approvedThisMonth / boost.videos_per_month) * 131.95} 131.95`}
                    className="transition-all duration-500"
                  />
                )}

                {/* Pending arc (orange) */}
                {pendingThisMonth > 0 && (
                  <path
                    d="M 8 50 A 42 42 0 0 1 92 50"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="8"
                    strokeLinecap="butt"
                    strokeDasharray={`${(pendingThisMonth / boost.videos_per_month) * 131.95} 131.95`}
                    strokeDashoffset={`${-(approvedThisMonth / boost.videos_per_month) * 131.95}`}
                    className="transition-all duration-500"
                  />
                )}
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                <span className="text-lg font-bold">{activeSubmissionsThisMonth}/{boost.videos_per_month}</span>
              </div>
            </div>

            {/* Progress Legend */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Monthly Progress</span>
                <span className="font-semibold">{activeSubmissionsThisMonth} / {boost.videos_per_month} videos</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                {approvedThisMonth > 0 && <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${earnedPercent}%` }} />}
                {pendingThisMonth > 0 && <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${pendingPercent}%` }} />}
              </div>
              <div className="flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">{approvedThisMonth} Approved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-muted-foreground">{pendingThisMonth} Pending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                  <span className="text-muted-foreground">{requiredPosts} Remaining</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-xl border border-border/50 bg-muted/30 dark:bg-muted/20">
            <p className="text-xs text-muted-foreground mb-1">Earned This Month</p>
            <p className="text-2xl font-bold text-green-500">${earnedThisMonth.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-xl border border-border/50 bg-muted/30 dark:bg-muted/20">
            <p className="text-xs text-muted-foreground mb-1">Potential Remaining</p>
            <p className="text-2xl font-bold text-foreground">${(requiredPosts * payoutPerVideo).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Your Submissions</h2>
      <SubmissionsTab boostId={boost.id} compact />
    </div>
  );

  // Render Support Content
  const renderSupportContent = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Get Support</h2>
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-border/50 bg-muted/30 dark:bg-muted/20">
          <h3 className="font-medium text-foreground mb-2">Need Help?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            If you have any questions about this boost, send a message directly to the brand.
          </p>
          <Button
            onClick={startConversationWithBrand}
            disabled={creatingConversation || !brandId}
            variant="outline"
            className="w-full border-border text-foreground hover:bg-muted/50"
          >
            {creatingConversation ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opening conversation...
              </>
            ) : (
              "Message Brand"
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  // Function to refetch contract after signing
  const refetchContract = async () => {
    if (!boost?.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: contractData } = await supabase
      .from("creator_contracts")
      .select("id, status, contract_url, custom_terms, signed_at, sent_at, signature_url, title, monthly_rate, videos_per_month, payment_model, per_post_rate")
      .eq("boost_id", boost.id)
      .eq("creator_id", user.id)
      .maybeSingle();

    if (contractData) {
      setContract(contractData as CreatorContract);
    }
  };

  // Render Agreement Content
  const renderAgreementContent = () => {
    if (!contract) {
      return (
        <div className="p-8 text-center">
          <Icon icon="material-symbols:lab-profile-outline" className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-medium text-foreground mb-1 font-inter">No Agreement</h3>
          <p className="text-sm text-muted-foreground font-inter">
            There is no contract associated with this boost.
          </p>
        </div>
      );
    }

    return (
      <AgreementTab
        contract={contract}
        boostId={boost.id}
        progressStats={{
          approvedThisMonth,
          pendingThisMonth,
          videosPerMonth: boost.videos_per_month,
          earnedThisMonth,
          payoutPerVideo,
        }}
        onContractSigned={refetchContract}
      />
    );
  };

  // Render Earnings Content
  const renderEarningsContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Earnings</h2>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground font-inter tracking-[-0.5px]">
            ${totalEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground font-inter">Total earned from this boost</p>
        </div>
      </div>

      {earnings.length > 0 ? (
        <TransactionsTable
          transactions={earnings}
          variant="compact"
          showPagination={true}
          itemsPerPage={10}
        />
      ) : (
        <div className="p-8 rounded-xl border border-border/50 bg-muted/30 dark:bg-muted/20 text-center">
          <Icon icon="material-symbols:payments" className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-medium text-foreground mb-1 font-inter">No earnings yet</h3>
          <p className="text-sm text-muted-foreground font-inter">
            Your earnings from this boost will appear here once your submissions are approved.
          </p>
        </div>
      )}
    </div>
  );

  // Render Assets Content
  const renderAssetsContent = () => {
    // Use brand_id from boost object directly since it's already loaded
    const effectiveBrandId = brandId || boost.brand_id;

    if (effectiveBrandId) {
      return (
        <div className="space-y-6">
          <AssetLibrary
            brandId={effectiveBrandId}
            isAdmin={isBrandAdmin}
            selectedAsset={selectedAssetForPanel}
            onSelectAsset={setSelectedAssetForPanel}
            onUpload={isBrandAdmin ? () => setShowAssetUploadDialog(true) : undefined}
            onRequestAsset={() => setShowAssetRequestDialog(true)}
            onEdit={isBrandAdmin ? (asset) => setEditAsset(asset) : undefined}
            onDelete={isBrandAdmin ? (asset) => setDeleteAsset(asset) : undefined}
          />
        </div>
      );
    }

    // Fallback for when no brand is linked - should rarely happen
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1 font-inter tracking-[-0.5px]">Folders</h2>
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Brand resources and materials</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-muted/30 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Icon icon="material-symbols:folder-outline" className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground font-inter text-center">No assets available for this boost</p>
        </div>
      </div>
    );
  };

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection.type) {
      case 'blueprint':
        return renderBlueprintContent();
      case 'assets':
        return renderAssetsContent();
      case 'submissions':
        return renderSubmissionsContent();
      case 'earnings':
        return renderEarningsContent();
      case 'support':
        return renderSupportContent();
      case 'agreement':
        return renderAgreementContent();
      case 'overview':
      default:
        return renderOverviewContent();
    }
  };

  return (
    <>
      {/* Mobile Layout */}
      {isMobile ? (
        <SourceDetailsMobileLayout
          sourceId={boost.id}
          sourceTitle={boost.title}
          sourceSlug={boost.slug}
          brandName={boost.brand_name || boost.brands?.name || ''}
          brandLogoUrl={boost.brand_logo_url || boost.brands?.logo_url}
          brandColor={boost.brand_color || boost.brands?.brand_color}
          bannerUrl={boost.banner_url}
          memberCount={memberCount}
          isVerified={boost.brands?.is_verified}
          // Quick action props
          onSubmitVideo={() => isPosterBoost ? setShowGDriveSubmitDialog(true) : setShowSubmitVideoDialog(true)}
          onLeave={() => setLeaveBoostDialogOpen(true)}
          brandSlug={boost.brands?.slug}
          blueprintId={boost.blueprint_id}
          canSubmit={(boost.videos_per_month === 0 || activeSubmissionsThisMonth < boost.videos_per_month) && dailyRemaining > 0 && (!contract || contract.status === 'signed')}
          // Discord props
          hasDiscordServer={!!boost.discord_guild_id}
          hasDiscordConnected={hasUserDiscord}
          // Boost-specific props
          progressStats={progressStats}
          submissionCount={submissions.length}
          // Contract props
          hasContract={!!contract}
          contractStatus={contract?.status || null}
          // Right panel for mobile
          rightPanel={
            <SourceDetailsRightPanel
              members={members}
              memberCount={memberCount}
              currentUserId={currentUserId}
              announcements={realAnnouncements}
              onReaction={toggleReaction}
              creatorStats={{
                views: submissions.reduce((sum, s) => sum + (s.payout_amount || 0), 0) > 0
                  ? Math.floor(Math.random() * 50000) + 10000
                  : 0,
                earnings: totalEarnings,
                videos: submissions.filter(s => s.status === 'approved').length,
                percentile: memberCount > 10
                  ? Math.min(95, Math.max(5, Math.floor((1 - (submissions.filter(s => s.status === 'approved').length / Math.max(1, memberCount))) * 100)))
                  : undefined,
              }}
              deadlines={[
                {
                  id: 'next-payout',
                  label: 'Next payout cycle',
                  date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  type: 'payout' as const,
                },
                ...(boost.videos_per_month && requiredPosts > 0 ? [{
                  id: 'monthly-target',
                  label: `${requiredPosts} videos needed this month`,
                  date: endOfMonth(new Date()).toISOString(),
                  type: 'submission' as const,
                }] : []),
              ]}
              className="w-full border-0"
            />
          }
        >
          <div className="p-4 max-w-4xl mx-auto">
            {renderContent()}
          </div>
        </SourceDetailsMobileLayout>
      ) : (
        /* Desktop Layout */
        <div className="flex h-full">
          {/* Left Sidebar */}
          <SourceDetailsLeftSidebar
            progressStats={progressStats}
            submissionCount={submissions.length}
            memberCount={memberCount}
            brandName={boost.brand_name || boost.brands?.name || ''}
            brandLogoUrl={boost.brand_logo_url || boost.brands?.logo_url}
            brandColor={boost.brand_color || boost.brands?.brand_color}
            bannerUrl={boost.banner_url}
            isVerified={boost.brands?.is_verified}
            sourceTitle={boost.title}
            sourceSlug={boost.slug}
            className="h-full"
            // Quick action props
            onSubmitVideo={() => isPosterBoost ? setShowGDriveSubmitDialog(true) : setShowSubmitVideoDialog(true)}
            onLeave={() => setLeaveBoostDialogOpen(true)}
            brandSlug={boost.brands?.slug}
            blueprintId={boost.blueprint_id}
            canSubmit={(boost.videos_per_month === 0 || activeSubmissionsThisMonth < boost.videos_per_month) && dailyRemaining > 0 && (!contract || contract.status === 'signed')}
            // Discord props
            hasDiscordServer={!!boost.discord_guild_id}
            hasDiscordConnected={hasUserDiscord}
            // Contract props
            hasContract={!!contract}
            contractStatus={contract?.status || null}
          />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="p-6 max-w-4xl mx-auto">
              {renderContent()}
            </div>
          </main>

          {/* Right Panel - Conditionally show AssetDetailPanel or SourceDetailsRightPanel */}
          {activeSection.type === 'assets' && selectedAssetForPanel ? (
            <AssetDetailPanel
              asset={selectedAssetForPanel}
              onClose={() => setSelectedAssetForPanel(null)}
              onEdit={isBrandAdmin ? () => setEditAsset(selectedAssetForPanel) : undefined}
              onDelete={isBrandAdmin ? () => setDeleteAsset(selectedAssetForPanel) : undefined}
              className="h-full"
              fullHeight
            />
          ) : (
            <SourceDetailsRightPanel
              members={members}
              memberCount={memberCount}
              currentUserId={currentUserId}
              announcements={realAnnouncements}
              onReaction={toggleReaction}
              creatorStats={{
                views: submissions.reduce((sum, s) => sum + (s.payout_amount || 0), 0) > 0
                  ? Math.floor(Math.random() * 50000) + 10000 // Placeholder - would need actual view data
                  : 0,
                earnings: totalEarnings,
                videos: submissions.filter(s => s.status === 'approved').length,
                percentile: memberCount > 10
                  ? Math.min(95, Math.max(5, Math.floor((1 - (submissions.filter(s => s.status === 'approved').length / Math.max(1, memberCount))) * 100)))
                  : undefined,
              }}
              deadlines={[
                {
                  id: 'next-payout',
                  label: 'Next payout cycle',
                  date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  type: 'payout' as const,
                },
                ...(boost.videos_per_month && requiredPosts > 0 ? [{
                  id: 'monthly-target',
                  label: `${requiredPosts} videos needed this month`,
                  date: endOfMonth(new Date()).toISOString(),
                  type: 'submission' as const,
                }] : []),
              ]}
            />
          )}
        </div>
      )}

      {/* Submit Video Dialog */}
      <SubmitVideoDialog
        source={{
          id: boost.id,
          title: boost.title,
          brand_name: boost.brand_name || boost.brands?.name,
          payment_model: 'pay_per_post',
          post_rate: payoutPerVideo,
          allowed_platforms: ['tiktok', 'instagram', 'youtube'],
          guidelines: boost.content_style_requirements || undefined,
          sourceType: 'boost'
        }}
        open={showSubmitVideoDialog}
        onOpenChange={setShowSubmitVideoDialog}
        onSuccess={() => {
          const fetchSubs = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
              .from("video_submissions")
              .select("id, status, submitted_at, payout_amount")
              .eq("source_type", "boost")
              .eq("source_id", boost.id)
              .eq("creator_id", user.id)
              .order("submitted_at", { ascending: false });
            if (data) setSubmissions(data);
          };
          fetchSubs();
        }}
      />

      {/* Google Drive Video Submission Dialog (for poster boosts) */}
      {isPosterBoost && (
        <SubmitBoostVideoDialog
          open={showGDriveSubmitDialog}
          onOpenChange={setShowGDriveSubmitDialog}
          boostId={boost.id}
          brandId={brandId || boost.brand_id || ''}
          onSuccess={() => {
            setShowGDriveSubmitDialog(false);
            toast({
              title: "Video Submitted",
              description: "Your video has been submitted for review."
            });
          }}
        />
      )}

      {/* Asset Request Dialog */}
      {boost && (brandId || boost.brand_id) && (
        <AssetRequestDialog
          brandId={brandId || boost.brand_id!}
          open={showAssetRequestDialog}
          onOpenChange={setShowAssetRequestDialog}
        />
      )}

      {/* Asset Upload Dialog (for brand admins) */}
      {boost && (brandId || boost.brand_id) && isBrandAdmin && (
        <AssetUploadDialog
          brandId={brandId || boost.brand_id!}
          open={showAssetUploadDialog || !!editAsset}
          onOpenChange={(open) => {
            if (!open) {
              setShowAssetUploadDialog(false);
              setEditAsset(null);
            } else {
              setShowAssetUploadDialog(true);
            }
          }}
          editAsset={editAsset || undefined}
          onEditComplete={() => {
            setShowAssetUploadDialog(false);
            setEditAsset(null);
          }}
        />
      )}

      {/* Asset Delete Dialog (for brand admins) */}
      {boost && (brandId || boost.brand_id) && deleteAsset && (
        <AssetDeleteDialog
          asset={deleteAsset}
          brandId={brandId || boost.brand_id!}
          open={!!deleteAsset}
          onOpenChange={(open) => !open && setDeleteAsset(null)}
        />
      )}

      {/* Leave Boost Confirmation Dialog */}
      <AlertDialog open={leaveBoostDialogOpen} onOpenChange={setLeaveBoostDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Boost?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this boost? This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Withdraw your participation</li>
                <li>Stop your monthly retainer earnings</li>
                <li>Remove your access to boost resources</li>
              </ul>
              <p className="mt-2">You can always reapply later if the boost is still active.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveBoost} className="bg-destructive hover:bg-destructive/90">
              {leavingBoost ? "Leaving..." : "Leave Boost"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Main export wraps with provider and forces remount on ID change
export default function CreatorBoostDetails() {
  const { id } = useParams<{ id: string }>();

  return (
    <SourceDetailsSidebarProvider sourceType="boost" key={id}>
      <BoostDetailsContent key={`content-${id}`} />
    </SourceDetailsSidebarProvider>
  );
}
