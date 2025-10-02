import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  preview_url: string | null;
}

export default function CampaignPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    setLoading(true);
    
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("id, title, preview_url")
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

      // If no preview_url, redirect to join page
      if (!campaignData.preview_url) {
        navigate(`/campaign/join/${id}`);
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

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col">
      <div className="p-4 border-b bg-background">
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
          src={campaign.preview_url!}
          className="w-full h-full border-0"
          title={campaign.title}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  );
}
