import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, LogOut } from "lucide-react";
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
      // Add a retry mechanism for cases where approval just happened
      let submissionData = null;
      let retries = 0;
      const maxRetries = 5;
      
      while (!submissionData && retries < maxRetries) {
        const { data } = await supabase
          .from("campaign_submissions")
          .select("id, status")
          .eq("campaign_id", id)
          .eq("creator_id", user.id)
          .eq("status", "approved")
          .maybeSingle();
        
        submissionData = data;
        
        if (!submissionData && retries < maxRetries - 1) {
          // Wait 1 second before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
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
          .maybeSingle();

        toast({
          variant: "destructive",
          title: "Access Denied",
          description: pendingSubmission 
            ? "Your application is pending approval" 
            : "You must be approved to view this campaign",
        });
        navigate("/dashboard?tab=discover");
        return;
      }

      setSubmission(submissionData);

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
      <div className="p-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show embed URL if available
  if (!campaign.embed_url) {
    return (
      <div className="p-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard?tab=campaigns")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>
        <p className="text-muted-foreground">No embed URL available for this campaign.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
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
