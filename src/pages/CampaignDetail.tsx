import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, DollarSign, Calendar, TrendingUp, Lock } from "lucide-react";

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

      if (!submissionData) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You must be part of this campaign to view it",
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

  const hasApplied = !!submission;

  // If campaign has embed_url, show it as an iframe
  if (campaign.embed_url) {
    return (
      <div className="h-screen w-full">
        <iframe
          src={campaign.embed_url}
          className="w-full h-full border-0"
          title={campaign.title}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate("/dashboard")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Campaigns
      </Button>

      {/* Campaign Header */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-start gap-4">
            {campaign.brand_logo_url && (
              <img
                src={campaign.brand_logo_url}
                alt={campaign.brand_name}
                className="w-20 h-20 rounded-xl object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-3xl mb-2">{campaign.title}</CardTitle>
                  <p className="text-muted-foreground">{campaign.brand_name}</p>
                  {hasApplied && (
                    <Badge className="mt-2 bg-blue-500/20 text-blue-400 border-blue-500/30">
                      Application Status: {submission.status}
                    </Badge>
                  )}
                </div>
                <Badge className="bg-success/20 text-success">
                  {campaign.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <CardDescription className="text-base">
            {campaign.description}
          </CardDescription>
          
          <Separator />
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">RPM Rate</p>
                <p className="text-xl font-bold">${campaign.rpm_rate.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
              <TrendingUp className="h-8 w-8 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-xl font-bold">${campaign.budget.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
              <Calendar className="h-8 w-8 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-xl font-bold">Active</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guidelines - Only show if applied */}
      {hasApplied ? (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle>Campaign Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-line text-muted-foreground">
              {campaign.guidelines || "No specific guidelines provided."}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Campaign Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-6">
                Join this campaign to view full guidelines and submit content
              </p>
              <Button 
                size="lg"
                onClick={() => navigate(`/join/${campaign.id}`)}
                className="bg-primary hover:bg-primary/90"
              >
                Join Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons - Only show if applied */}
      {hasApplied && (
        <div className="flex gap-4">
          <Button className="flex-1" size="lg">
            Submit Content
          </Button>
          <Button variant="outline" size="lg">
            Download Assets
          </Button>
        </div>
      )}
    </div>
  );
}
