import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, DollarSign, Calendar, TrendingUp } from "lucide-react";

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
}

export default function CampaignDetail() {
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
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch campaign details",
      });
      navigate("/dashboard");
    } else {
      setCampaign(data);
    }
    setLoading(false);
  };

  if (loading || !campaign) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading...</p>
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
            <img
              src={campaign.brand_logo_url}
              alt={campaign.brand_name}
              className="w-20 h-20 rounded-xl object-cover"
            />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-3xl mb-2">{campaign.title}</CardTitle>
                  <p className="text-muted-foreground">{campaign.brand_name}</p>
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

      {/* Guidelines */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Campaign Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-line text-muted-foreground">
            {campaign.guidelines}
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex gap-4">
        <Button className="flex-1" size="lg">
          Submit Content
        </Button>
        <Button variant="outline" size="lg">
          Download Assets
        </Button>
      </div>
    </div>
  );
}
