import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

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

      // Check if user has a submission for this campaign
      const { data: submissionData } = await supabase
        .from("campaign_submissions")
        .select("id, status")
        .eq("campaign_id", id)
        .eq("creator_id", user.id)
        .maybeSingle();

      if (!submissionData || submissionData.status !== "approved") {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: submissionData?.status === "pending" 
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
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard?tab=campaigns")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
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
    </div>
  );
}
