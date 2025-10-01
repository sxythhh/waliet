import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, TrendingUp, DollarSign, Calendar, Users, Video, Share2, Infinity, Instagram, Youtube } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  description: string;
  brand_name: string;
  brand_logo_url: string;
  budget: number;
  rpm_rate: number;
  status: string;
  start_date: string | null;
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchCampaigns();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Fetch user profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    
    setProfile(profileData);
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch campaigns",
      });
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Active Campaigns
          </h1>
          <p className="text-muted-foreground mt-2">
            Choose a campaign and start earning
          </p>
        </div>
        <Button onClick={handleSignOut} variant="outline">
          Sign Out
        </Button>
      </div>

      {/* Stats Cards */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${profile.total_earnings?.toFixed(2) || "0.00"}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaigns.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Creator Level</CardTitle>
              <Sparkles className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rising Star</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaigns Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No active campaigns at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Card 
              key={campaign.id}
              className="bg-gradient-card border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-glow cursor-pointer overflow-hidden"
              onClick={() => navigate(`/campaign/${campaign.id}`)}
            >
              <div className="relative h-48 bg-gradient-to-br from-background to-muted overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={campaign.brand_logo_url}
                    alt={campaign.brand_name}
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-border/50"
                  />
                </div>
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary text-primary-foreground font-bold text-base px-3 py-1">
                    ${campaign.rpm_rate.toFixed(1)}/1K
                  </Badge>
                </div>
              </div>

              <CardHeader className="space-y-3 pb-3">
                <div>
                  <CardTitle className="text-xl mb-2">{campaign.title}</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      RPM Campaign
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5 text-muted-foreground" />
                      <Video className="w-3.5 h-3.5 text-muted-foreground" />
                      <Youtube className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <CardDescription className="line-clamp-2 text-sm">
                  {campaign.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Start Date</span>
                  </div>
                  <div className="text-right text-foreground font-medium text-xs">
                    {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'TBA'}
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Share2 className="w-4 h-4" />
                    <span className="text-xs">Networks</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <Instagram className="w-4 h-4" />
                    <Video className="w-4 h-4" />
                    <Youtube className="w-4 h-4" />
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">Reward</span>
                  </div>
                  <div className="text-right text-foreground font-medium text-xs">
                    ${campaign.rpm_rate.toFixed(2)} per 100K views
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Campaign Budget</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-success font-bold text-lg">
                        ${(campaign.budget / 1000).toFixed(1)}K
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <Infinity className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
