import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Infinity, Instagram, Video, Youtube, Share2, Plus, Link2, UserPlus, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
import emptyCampaignsImage from "@/assets/empty-campaigns.png";
import { Button } from "@/components/ui/button";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  banner_url: string | null;
  submission_status?: string;
  is_infinite_budget?: boolean;
  connected_accounts?: Array<{
    id: string;
    platform: string;
    username: string;
  }>;
}
export function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchCampaigns();
  }, []);
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

    // Get campaign IDs and their submission status
    const {
      data: submissions,
      error: submissionsError
    } = await supabase.from("campaign_submissions").select("campaign_id, status").eq("creator_id", user.id).neq("status", "withdrawn");
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
      `).in("campaign_id", campaignIds).eq("social_accounts.user_id", user.id);

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
      const {
        error
      } = await supabase.from("campaign_submissions").update({
        status: 'withdrawn'
      }).eq("campaign_id", selectedCampaignId).eq("creator_id", user.id).eq("status", "pending");
      if (error) throw error;
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
  if (loading) {
    return <div className="text-center py-12">
        <p className="text-muted-foreground">Loading campaigns...</p>
      </div>;
  }
  if (campaigns.length === 0) {
    return <div className="text-center py-12 flex flex-col items-center gap-4">
        <img src={emptyCampaignsImage} alt="No campaigns" className="w-64 h-64 object-contain opacity-80" />
        <p className="text-slate-50 font-medium">You haven't joined any campaigns yet</p>
        <Button onClick={() => navigate("/dashboard?tab=discover")} className="mt-2 bg-primary hover:bg-primary/90">
          Discover Campaigns
        </Button>
      </div>;
  }
  return <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 max-w-7xl">
      {campaigns.map(campaign => {
      const budgetUsed = campaign.budget_used || 0;
      const budgetPercentage = campaign.budget > 0 ? budgetUsed / campaign.budget * 100 : 0;
      const isPending = campaign.submission_status === 'pending';
      return <Card key={campaign.id} className={`group bg-card transition-all duration-300 animate-fade-in flex flex-col overflow-hidden border hover:border-primary/50 ${isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => !isPending && navigate(`/campaign/${campaign.id}`)}>
            {/* Banner Image - Top Section */}
            {campaign.banner_url && <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                <img src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              </div>}

            {/* Content Section */}
            <CardContent className="p-3 flex-1 flex flex-col gap-2.5 font-instrument tracking-tight">
              {/* Brand Logo + Title */}
              <div className="flex items-start gap-2.5">
                {campaign.brand_logo_url && <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-border">
                    <img src={campaign.brand_logo_url} alt={campaign.brand_name} className="w-full h-full object-cover" />
                  </div>}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold line-clamp-2 leading-snug mb-0.5">
                    {campaign.title}
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold">{campaign.brand_name}</p>
                </div>
              </div>

              {/* Budget Section - Redesigned */}
              <div className="rounded-lg p-2.5 space-y-1.5 bg-[#0d0d0d]">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5 font-chakra tracking-tight">
                    {campaign.is_infinite_budget ? <>
                        
                        <span className="text-xs text-muted-foreground font-medium">Infinite Budget</span>
                      </> : <>
                        <span className="text-base font-bold tabular-nums">${budgetUsed.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground font-medium">/ ${campaign.budget.toLocaleString()}</span>
                      </>}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="relative h-1.5 rounded-full overflow-hidden bg-[#1b1b1b]">
                  {campaign.is_infinite_budget ? <div className="absolute inset-0 animate-pulse" style={{
                background: 'repeating-linear-gradient(45deg, hsl(217, 91%, 60%), hsl(217, 91%, 60%) 10px, hsl(217, 91%, 45%) 10px, hsl(217, 91%, 45%) 20px)',
                backgroundSize: '200% 200%',
                animation: 'slide 2s linear infinite'
              }} /> : <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700" style={{
                width: `${budgetPercentage}%`
              }} />}
                </div>
                
                {!campaign.is_infinite_budget && <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                    <span>{budgetPercentage.toFixed(0)}% used</span>
                  </div>}
              </div>

              {/* Connected Accounts */}
              {campaign.connected_accounts && campaign.connected_accounts.length > 0 && <div className="pt-1">
                  <div className="flex flex-wrap gap-1.5">
                    {campaign.connected_accounts.map(account => <div key={account.id} className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
                        <div className="w-3 h-3">
                          {account.platform.toLowerCase() === 'tiktok' && <img src={tiktokLogo} alt="TikTok" className="w-full h-full" />}
                          {account.platform.toLowerCase() === 'instagram' && <img src={instagramLogo} alt="Instagram" className="w-full h-full" />}
                          {account.platform.toLowerCase() === 'youtube' && <img src={youtubeLogo} alt="YouTube" className="w-full h-full" />}
                        </div>
                        <span className="text-[11px] font-semibold">@{account.username}</span>
                      </div>)}
                  </div>
                </div>}

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
                </div> : <div className="mt-auto pt-2">
                  <Button variant="ghost" size="sm" onClick={e => {
              e.stopPropagation();
              setDialogOpen(true);
            }} className="w-full h-8 text-[11px] font-instrument tracking-tight bg-[#5966f2] font-semibold">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Link Account
                  </Button>
                </div>}
            </CardContent>
          </Card>;
    })}
    
    {/* Link Account Options Dialog */}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Account to Campaign</DialogTitle>
          <DialogDescription>
            Choose how you want to link an account to this campaign
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <Button variant="ghost" className="w-full justify-start h-auto py-4 px-4 border-0 hover:bg-[#121212]" onClick={() => {
            setDialogOpen(false);
            navigate("/dashboard?tab=profile");
          }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Link Existing Account</div>
                <div className="text-xs text-muted-foreground">
                  Use an account you've already connected
                </div>
              </div>
            </div>
          </Button>
          
          <Button variant="ghost" className="w-full justify-start h-auto py-4 px-4 border-0 hover:bg-[#121212]" onClick={() => {
            setDialogOpen(false);
            setAddAccountDialogOpen(true);
          }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Add New Account</div>
                <div className="text-xs text-muted-foreground">
                  Connect and verify a new social account
                </div>
              </div>
            </div>
          </Button>
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
    
    <AddSocialAccountDialog open={addAccountDialogOpen} onOpenChange={setAddAccountDialogOpen} onSuccess={fetchCampaigns} />
    
    </div>;
}