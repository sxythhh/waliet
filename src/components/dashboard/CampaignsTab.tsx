import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Infinity, Instagram, Video, Youtube, Share2, Plus, Link2, UserPlus, X, AlertTriangle, LogOut, MessageCircle, Wallet } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "next-themes";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoBlack from "@/assets/instagram-logo-new.png";
import youtubeLogoBlack from "@/assets/youtube-logo-new.png";
import emptyCampaignsImage from "@/assets/empty-campaigns.png";
import discordIconNew from "@/assets/discord-icon-new.png";
import { Button } from "@/components/ui/button";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ManageAccountDialog } from "@/components/ManageAccountDialog";
import { SubmitDemographicsDialog } from "@/components/SubmitDemographicsDialog";
import { CampaignDetailsDialog } from "@/components/CampaignDetailsDialog";

interface Campaign {
  id: string;
  title: string;
  description: string;
  brand_name: string;
  brand_logo_url: string;
  budget: number;
  budget_used?: number;
  rpm_rate: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  banner_url: string | null;
  submission_status?: string;
  is_infinite_budget?: boolean;
  allowed_platforms: string[] | null;
  created_at: string;
  connected_accounts?: Array<{
    id: string;
    platform: string;
    username: string;
  }>;
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
    brands?: {
      name: string;
      logo_url: string | null;
    };
  };
}

interface CampaignsTabProps {
  onOpenPrivateDialog: () => void;
}

export function CampaignsTab({ onOpenPrivateDialog }: CampaignsTabProps) {
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
  const [campaignDetailsDialogOpen, setCampaignDetailsDialogOpen] = useState(false);
  const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState<Campaign | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<{
    id: string;
    platform: string;
    username: string;
  } | null>(null);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    theme
  } = useTheme();
  const getPlatformIcon = (platform: string) => {
    // Check if system preference is light when theme is "system"
    const systemIsLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const isLightMode = theme === "light" || theme === "system" && systemIsLight;
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
  useEffect(() => {
    fetchCampaigns();
    fetchBoostApplications();
  }, []);

  const fetchBoostApplications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('bounty_applications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      // Fetch boost campaign details for each application
      const applicationsWithDetails = await Promise.all(
        (data || []).map(async (app) => {
          const { data: campaign } = await supabase
            .from('bounty_campaigns')
            .select(`
              id,
              title,
              monthly_retainer,
              videos_per_month,
              banner_url,
              brand_id
            `)
            .eq('id', app.bounty_campaign_id)
            .single();

          let brandData = null;
          if (campaign?.brand_id) {
            const { data: brand } = await supabase
              .from('brands')
              .select('name, logo_url')
              .eq('id', campaign.brand_id)
              .single();
            brandData = brand;
          }

          return {
            ...app,
            boost_campaigns: campaign ? {
              ...campaign,
              brands: brandData
            } : null
          };
        })
      );

      setBoostApplications(applicationsWithDetails.filter(app => app.boost_campaigns) as any);
    } catch (error: any) {
      console.error("Error fetching boost applications:", error);
    }
  };
  const fetchCampaigns = async () => {
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

    // Fetch campaigns user has joined with brand logos (including ended campaigns)
    const {
      data,
      error
    } = await supabase.from("campaigns").select(`
        *,
        brands (
          logo_url
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
      `).in("campaign_id", campaignIds).eq("social_accounts.user_id", user.id).eq("status", "active");

    // Group social accounts by campaign_id
    const accountsByCampaign = new Map<string, Array<{
      id: string;
      platform: string;
      username: string;
    }>>();
    accountCampaigns?.forEach((connection: any) => {
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
      // Add submission status and brand logo to each campaign
      const campaignsWithStatus = (data || []).map(campaign => ({
        ...campaign,
        brand_logo_url: campaign.brand_logo_url || (campaign.brands as any)?.logo_url,
        submission_status: submissionStatusMap.get(campaign.id),
        connected_accounts: accountsByCampaign.get(campaign.id) || []
      }));
      setCampaigns(campaignsWithStatus);
    }
    setLoading(false);
  };
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
      const { data: userAccounts } = await supabase
        .from("social_accounts")
        .select("id")
        .eq("user_id", user.id);

      // Disconnect ALL social account campaign links for this campaign and user
      if (userAccounts && userAccounts.length > 0) {
        const accountIds = userAccounts.map(acc => acc.id);
        await supabase
          .from("social_account_campaigns")
          .update({ 
            status: 'disconnected',
            disconnected_at: new Date().toISOString()
          })
          .eq("campaign_id", selectedCampaignId)
          .in("social_account_id", accountIds);
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
      } = await supabase.from("social_account_campaigns").select("social_account_id, social_accounts(id)").eq("campaign_id", selectedCampaignId).eq("social_accounts.user_id", user.id);

      // 3. Stop tracking in Shortimize for each linked account
      if (linkedAccounts && linkedAccounts.length > 0) {
        for (const link of linkedAccounts) {
          try {
            console.log('Stopping Shortimize tracking for account...');
            const { error: untrackError } = await supabase.functions.invoke('untrack-shortimize-account', {
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

      // 5. Clear campaign_id from social_accounts table (legacy field)
      const {
        error: accountError
      } = await supabase.from("social_accounts").update({
        campaign_id: null
      }).eq("campaign_id", selectedCampaignId).eq("user_id", user.id);
      if (accountError) throw accountError;
      
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
  if (loading) {
    return <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full mx-auto">
        <Skeleton className="h-[350px] rounded-lg" />
        <Skeleton className="h-[350px] rounded-lg" />
        <Skeleton className="h-[350px] rounded-lg" />
        <Skeleton className="h-[350px] rounded-lg" />
        <Skeleton className="h-[350px] rounded-lg" />
        <Skeleton className="h-[350px] rounded-lg" />
      </div>;
  }
  if (campaigns.length === 0) {
    return <div className="text-center py-12 flex flex-col items-center gap-4">
        <img src={emptyCampaignsImage} alt="No campaigns" className="w-64 h-64 object-contain opacity-80" />
        <p className="text-foreground font-medium">You haven't joined any campaigns yet</p>
        <div className="flex gap-2 mt-2">
          <Button onClick={() => navigate("/dashboard?tab=discover")} className="bg-primary hover:bg-primary/90">
            Discover Campaigns
          </Button>
          <Button onClick={onOpenPrivateDialog} variant="outline">
            Join Private Campaign
          </Button>
        </div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">My Campaigns</h2>
        <Button onClick={onOpenPrivateDialog} variant="outline" size="sm">
          Join Private Campaign
        </Button>
      </div>

      {/* Boost Applications Section */}
      {boostApplications.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-muted-foreground">Boost Applications</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {boostApplications.map((application) => (
              <Card
                key={application.id}
                className="group bg-card transition-all duration-300 animate-fade-in flex flex-col overflow-hidden border"
              >
                {/* Banner Image */}
                {application.boost_campaigns.banner_url && (
                  <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                    <img
                      src={application.boost_campaigns.banner_url}
                      alt={application.boost_campaigns.title}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                )}

                <CardContent className="p-4 flex-1 flex flex-col gap-3">
                  {/* Brand Logo + Title */}
                  <div className="flex items-start gap-3">
                    {application.boost_campaigns.brands?.logo_url && (
                      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-border">
                        <img
                          src={application.boost_campaigns.brands.logo_url}
                          alt={application.boost_campaigns.brands.name || ''}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold line-clamp-2 leading-snug mb-0.5">
                        {application.boost_campaigns.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-semibold">
                        {application.boost_campaigns.brands?.name}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/50 p-2">
                      <div className="text-muted-foreground mb-1">Monthly</div>
                      <div className="font-semibold">${application.boost_campaigns.monthly_retainer.toLocaleString()}</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <div className="text-muted-foreground mb-1">Videos</div>
                      <div className="font-semibold">{application.boost_campaigns.videos_per_month}/mo</div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-auto pt-2">
                    <Badge
                      variant={
                        application.status === 'accepted'
                          ? 'default'
                          : application.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="w-full justify-center"
                    >
                      {application.status === 'pending' && 'Pending Review'}
                      {application.status === 'accepted' && 'Accepted'}
                      {application.status === 'rejected' && 'Rejected'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full mx-auto">
      {campaigns.map(campaign => {
        const budgetUsed = campaign.budget_used || 0;
        const budgetPercentage = campaign.budget > 0 ? budgetUsed / campaign.budget * 100 : 0;
        const isPending = campaign.submission_status === 'pending';
        const isEnded = campaign.status === 'ended';
        return <Card key={campaign.id} className={`group bg-card transition-all duration-300 animate-fade-in flex flex-col overflow-hidden border ${isPending ? 'opacity-60 cursor-not-allowed' : isEnded ? 'opacity-75 cursor-pointer' : 'cursor-pointer'}`} onClick={() => {
          console.log('Campaign clicked:', {
            id: campaign.id,
            status: campaign.submission_status,
            isPending,
            isEnded
          });
          if (!isPending && !isEnded) {
            setSelectedCampaignForDetails(campaign);
            setCampaignDetailsDialogOpen(true);
          }
        }}>
            {/* Banner Image - Top Section */}
            {campaign.banner_url && <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                <img src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105" />
                {isEnded && <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-muted/90 text-muted-foreground font-semibold">
                    Ended
                  </Badge>
                </div>}
              </div>}

            {/* Content Section */}
            <CardContent className="p-3 flex-1 flex flex-col gap-2.5 font-instrument tracking-tight">
              {/* Brand Logo + Title */}
              <div className="flex items-start gap-2.5">
                {campaign.brand_logo_url && <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-border">
                    <img src={campaign.brand_logo_url} alt={campaign.brand_name} className="w-full h-full object-cover" />
                  </div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold line-clamp-2 leading-snug mb-0.5 flex-1">
                      {campaign.title}
                    </h3>
                    {isEnded && !campaign.banner_url && <Badge variant="secondary" className="bg-muted/90 text-muted-foreground font-semibold text-[10px]">
                      Ended
                    </Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">{campaign.brand_name}</p>
                </div>
              </div>

              {/* Budget Section - Redesigned */}
              <div className="rounded-lg p-2.5 space-y-1.5 bg-card">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5 font-chakra tracking-tight">
                    {campaign.is_infinite_budget ? <>
                        
                        <span className="text-xs text-muted-foreground font-medium">Infinite Budget</span>
                      </> : <>
                        <span className="text-base font-bold tabular-nums">${budgetUsed.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground font-bold">/ ${campaign.budget.toLocaleString()}</span>
                      </>}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="relative h-1.5 rounded-full overflow-hidden bg-muted/50">
                  {campaign.is_infinite_budget ? <div className="absolute inset-0 animate-pulse" style={{
                  background: 'repeating-linear-gradient(45deg, hsl(217, 91%, 60%), hsl(217, 91%, 60%) 10px, hsl(217, 91%, 45%) 10px, hsl(217, 91%, 45%) 20px)',
                  backgroundSize: '200% 200%',
                  animation: 'slide 2s linear infinite'
                }} /> : <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700" style={{
                  width: `${budgetPercentage}%`
                }} />}
                </div>
                
                {!campaign.is_infinite_budget && <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                    <span className="font-medium">{budgetPercentage.toFixed(0)}% used</span>
                  </div>}
              </div>

              {/* Connected Accounts */}
              {campaign.connected_accounts && campaign.connected_accounts.length > 0 && <div className="pt-1">
                  <div className="flex flex-wrap gap-1.5">
                    {campaign.connected_accounts.map(account => <div key={account.id} onClick={e => {
                  e.stopPropagation();
                  setSelectedAccount(account);
                  setManageAccountDialogOpen(true);
                }} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-muted hover:brightness-95 transition-colors cursor-pointer border border-border">
                        <div className="w-4 h-4">
                          <img src={getPlatformIcon(account.platform) || ''} alt={account.platform} className="w-full h-full" />
                        </div>
                        <span className="font-medium">{account.username}</span>
                      </div>)}
                  </div>
                </div>}

              {/* No Connected Accounts Alert */}
              {!isPending && (!campaign.connected_accounts || campaign.connected_accounts.length === 0) && <Alert variant="destructive" className="border-0 bg-red-500/10 px-0 py-[11px]">
                  
                  <AlertDescription className="text-[11px] font-inter font-semibold tracking-tight ml-6 mx-[25px] py-[5px]">
                    You need to link an account to this campaign
                  </AlertDescription>
                </Alert>}

              {/* Application Status */}
              {isPending ? <div className="mt-auto pt-2 space-y-2">
                  <div className="bg-muted/30 rounded-md px-2.5 py-1.5 flex items-center justify-center">
                    <span className="text-[11px] font-instrument tracking-tight text-muted-foreground font-semibold">
                      Pending Review
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={e => {
                e.stopPropagation();
                setSelectedCampaignId(campaign.id);
                setWithdrawDialogOpen(true);
              }} className="w-full h-8 text-[11px] font-instrument tracking-tight hover:bg-destructive/10 hover:text-destructive font-semibold">
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Withdraw Application
                  </Button>
                </div> : isEnded ? <div className="mt-auto pt-2">
                  <Button variant="ghost" size="sm" onClick={e => {
                e.stopPropagation();
                setSelectedCampaignId(campaign.id);
                setLeaveCampaignDialogOpen(true);
              }} className="w-full h-8 text-[11px] font-instrument tracking-tight hover:bg-destructive/10 hover:text-destructive font-semibold">
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Leave Campaign
                  </Button>
                </div> : <div className="mt-auto pt-2">
                  <Button variant="ghost" size="sm" onClick={e => {
                e.stopPropagation();
                setDialogOpen(true);
              }} className="w-full h-8 text-[11px] font-instrument tracking-tight bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Link Account
                  </Button>
                </div>}
            </CardContent>
          </Card>;
      })}
    
    {/* Link Account Options Dialog */}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-lg border-0 bg-gradient-to-b from-background to-muted/20">
        <DialogHeader className="space-y-3 pb-2">
          <DialogTitle className="text-2xl font-bold tracking-tight">Link Your Account</DialogTitle>
          <DialogDescription className="text-base">
            Choose how you'd like to connect your social media account
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-6">
          <button 
            onClick={() => {
              setDialogOpen(false);
              navigate("/dashboard?tab=profile");
            }}
            className="group relative overflow-hidden rounded-2xl bg-card p-6 text-left transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Link2 className="h-7 w-7 text-primary transition-transform group-hover:scale-110" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-semibold tracking-tight">Link Existing Account</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Choose from your already connected social media accounts
                </p>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => {
              setDialogOpen(false);
              setAddAccountDialogOpen(true);
            }}
            className="group relative overflow-hidden rounded-2xl bg-card p-6 text-left transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <UserPlus className="h-7 w-7 text-primary transition-transform group-hover:scale-110" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-semibold tracking-tight">Add New Account</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Connect and verify a new social media account
                </p>
              </div>
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
        
        <SubmitDemographicsDialog open={submitDemographicsDialogOpen} onOpenChange={setSubmitDemographicsDialogOpen} socialAccountId={selectedAccount.id} platform={selectedAccount.platform} username={selectedAccount.username} onSuccess={() => {
          setSubmitDemographicsDialogOpen(false);
          fetchCampaigns();
        }} />
      </>}
    
      <CampaignDetailsDialog
        campaign={selectedCampaignForDetails}
        open={campaignDetailsDialogOpen}
        onOpenChange={setCampaignDetailsDialogOpen}
      />
      </div>
    </div>;
}