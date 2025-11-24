import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, LogOut, Link } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Campaign {
  id: string;
  title: string;
  description: string;
  brand_name: string;
  brand_logo_url: string;
  budget: number;
  rpm_rate: number;
  status: string;
  guidelines: string;
  start_date: string;
  end_date: string;
  banner_url: string | null;
  allowed_platforms: string[];
  embed_url: string | null;
}

interface Submission {
  id: string;
  status: string;
}

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [leavingCampaign, setLeavingCampaign] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaignAndSubmission();
  }, [id]);

  const fetchCampaignAndSubmission = async () => {
    setLoading(true);
    
    try {
      // Get current user first
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please sign in to view campaigns",
        });
        navigate("/auth");
        return;
      }

      // Check if user has an approved submission for this campaign
      // Use limit(1) to handle cases where there might be duplicate submissions
      let submissionData = null;
      let retries = 0;
      const maxRetries = 3;
      
      console.log('Checking access for campaign:', id, 'user:', user.id);
      
      while (!submissionData && retries < maxRetries) {
        const { data } = await supabase
          .from("campaign_submissions")
          .select("id, status")
          .eq("campaign_id", id)
          .eq("creator_id", user.id)
          .eq("status", "approved")
          .limit(1)
          .maybeSingle();
        
        console.log(`Retry ${retries + 1}:`, { found: !!data, data });
        submissionData = data;
        
        if (!submissionData && retries < maxRetries - 1) {
          // Wait 500ms before retry
          await new Promise(resolve => setTimeout(resolve, 500));
          retries++;
        } else {
          break;
        }
      }

      if (!submissionData) {
        // Check if there's a pending submission
        const { data: pendingSubmission } = await supabase
          .from("campaign_submissions")
          .select("status")
          .eq("campaign_id", id)
          .eq("creator_id", user.id)
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();

        console.log('Access denied - no approved submission found', { 
          campaignId: id, 
          userId: user.id, 
          hasPending: !!pendingSubmission 
        });

        toast({
          variant: "destructive",
          title: "Access Denied",
          description: pendingSubmission 
            ? "Your application is pending approval" 
            : "You must be approved to view this campaign",
        });
        navigate("/dashboard?tab=campaigns");
        return;
      }

      setSubmission(submissionData);

      // Clean up duplicate submissions (keep only the oldest one)
      const { data: allSubmissions } = await supabase
        .from("campaign_submissions")
        .select("id, submitted_at")
        .eq("campaign_id", id)
        .eq("creator_id", user.id)
        .eq("status", "approved")
        .order("submitted_at", { ascending: true });
      
      if (allSubmissions && allSubmissions.length > 1) {
        // Keep the first (oldest) submission, delete the rest
        const duplicateIds = allSubmissions.slice(1).map(s => s.id);
        await supabase
          .from("campaign_submissions")
          .delete()
          .in("id", duplicateIds);
        console.log('Cleaned up duplicate submissions:', duplicateIds);
      }

      // Fetch campaign only if user has access
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (campaignError) throw campaignError;
      
      if (!campaignData) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Campaign not found",
        });
        navigate("/dashboard");
        return;
      }

      setCampaign(campaignData as Campaign);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch campaign details",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveCampaign = async () => {
    if (!id) return;
    
    setLeavingCampaign(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please sign in to leave campaign",
        });
        return;
      }

      // 1. Delete all campaign submissions
      const { error: submissionError } = await supabase
        .from("campaign_submissions")
        .delete()
        .eq("campaign_id", id)
        .eq("creator_id", user.id);

      if (submissionError) throw submissionError;

      // 2. Unlink all social accounts from this campaign
      const { error: accountError } = await supabase
        .from("social_accounts")
        .update({ campaign_id: null })
        .eq("campaign_id", id)
        .eq("user_id", user.id);

      if (accountError) throw accountError;

      toast({
        title: "Left Campaign",
        description: "You have successfully left this campaign",
      });

      // Redirect back to campaigns
      navigate("/dashboard?tab=campaigns");
    } catch (error) {
      console.error("Error leaving campaign:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to leave campaign. Please try again.",
      });
    } finally {
      setLeavingCampaign(false);
      setShowLeaveDialog(false);
    }
  };

  if (loading || !campaign) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex flex-col">
        <div className="p-4 border-b bg-background flex items-center justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl space-y-6 animate-fade-in">
            {/* Large banner card skeleton */}
            <Skeleton className="w-full aspect-video rounded-xl" />
            
            {/* Title and text content */}
            <div className="space-y-6">
              {/* Main title */}
              <Skeleton className="h-10 w-2/3" />
              
              {/* Section heading */}
              <Skeleton className="h-7 w-1/3" />
              
              {/* Text paragraph 1 */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-full" />
              </div>
              
              {/* Section heading 2 */}
              <Skeleton className="h-7 w-2/5" />
              
              {/* Text paragraph 2 */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="p-4 border-b bg-background flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard?tab=campaigns")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/dashboard?tab=profile")}
          >
            <Link className="mr-2 h-4 w-4" />
            Link Account
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => setShowLeaveDialog(true)}
            disabled={leavingCampaign}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Leave Campaign
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          {/* Banner */}
          {campaign.banner_url && (
            <div className="w-full aspect-video rounded-xl overflow-hidden">
              <img 
                src={campaign.banner_url} 
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Brand Info */}
          <div className="flex items-center gap-4">
            {campaign.brand_logo_url && (
              <img 
                src={campaign.brand_logo_url} 
                alt={campaign.brand_name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold">{campaign.title}</h1>
              <p className="text-muted-foreground">{campaign.brand_name}</p>
            </div>
          </div>

          {/* Description */}
          {campaign.description && (
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">About Campaign</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{campaign.description}</p>
            </div>
          )}

          {/* Campaign Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <h3 className="font-semibold mb-2">RPM Rate</h3>
              <p className="text-2xl font-bold">${campaign.rpm_rate}</p>
              <p className="text-sm text-muted-foreground">per 1,000 views</p>
            </div>
            
            <div className="p-4 rounded-lg border bg-card">
              <h3 className="font-semibold mb-2">Budget</h3>
              <p className="text-2xl font-bold">${campaign.budget.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">total campaign budget</p>
            </div>
            
            {campaign.start_date && (
              <div className="p-4 rounded-lg border bg-card">
                <h3 className="font-semibold mb-2">Start Date</h3>
                <p className="text-lg">{new Date(campaign.start_date).toLocaleDateString()}</p>
              </div>
            )}
            
            {campaign.end_date && (
              <div className="p-4 rounded-lg border bg-card">
                <h3 className="font-semibold mb-2">End Date</h3>
                <p className="text-lg">{new Date(campaign.end_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Allowed Platforms */}
          {campaign.allowed_platforms && campaign.allowed_platforms.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Allowed Platforms</h2>
              <div className="flex flex-wrap gap-2">
                {campaign.allowed_platforms.map((platform) => (
                  <span 
                    key={platform}
                    className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium capitalize"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Guidelines */}
          {campaign.guidelines && (
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Guidelines</h2>
              <div className="p-4 rounded-lg border bg-card">
                <p className="text-muted-foreground whitespace-pre-wrap">{campaign.guidelines}</p>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              campaign.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
            }`}>
              {campaign.status}
            </span>
          </div>
        </div>
      </div>
      
      {/* Leave Campaign Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
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
            <AlertDialogAction 
              onClick={handleLeaveCampaign}
              className="bg-destructive hover:bg-destructive/90"
            >
              {leavingCampaign ? "Leaving..." : "Leave Campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
