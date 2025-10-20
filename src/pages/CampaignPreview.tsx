import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="h-[calc(100vh-4rem)] w-full flex flex-col">
        <div className="p-4 border-b bg-background">
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Large banner card skeleton */}
            <Skeleton className="w-full aspect-video rounded-xl" />
            
            {/* Title skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              
              {/* Subtitle/section heading */}
              <Skeleton className="h-8 w-1/2 mt-8" />
              
              {/* Text content lines */}
              <div className="space-y-3 pt-4">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-11/12" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-5/6" />
              </div>
            </div>
          </div>
        </div>
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
