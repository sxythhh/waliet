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

      // 1. Update all campaign submissions to 'withdrawn'
      const { error: submissionError } = await supabase
        .from("campaign_submissions")
        .update({ status: 'withdrawn' })
        .eq("campaign_id", id)
        .eq("creator_id", user.id)
        .neq("status", "withdrawn");

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

  // Show embed URL if available
  if (!campaign.embed_url) {
    return (
      <>
        <div className="p-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard?tab=campaigns")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Campaigns
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
          <p className="text-muted-foreground">No embed URL available for this campaign.</p>
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
      </>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard?tab=campaigns")}
          className="bg-[#121212] border-t"
          style={{ borderTopColor: '#3b3b3b' }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/dashboard?tab=profile")}
            className="border-0"
          >
            <Link className="mr-2 h-4 w-4" />
            Link Account
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLeaveDialog(true)}
            disabled={leavingCampaign}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1">
        <iframe
          src={campaign.embed_url}
          className="w-full h-full border-0"
          title={campaign.title}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
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
