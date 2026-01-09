import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Users, DollarSign, Calendar, ExternalLink, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  description: string | null;
}

interface BrandPortalCampaignsProps {
  brand: Brand;
  userId: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  status: string;
  cpm_rate: number | null;
  flat_rate: number | null;
  banner_url: string | null;
  created_at: string;
  end_date: string | null;
  type: "campaign" | "boost";
  isJoined: boolean;
}

export function BrandPortalCampaigns({ brand, userId }: BrandPortalCampaignsProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const accentColor = brand.brand_color || "#2061de";

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);

      // Fetch boost campaigns (this is the main campaign type)
      const { data: boostCampaigns } = await supabase
        .from("bounty_campaigns")
        .select("id, title, description, status, monthly_retainer, banner_url, created_at, end_date")
        .eq("brand_id", brand.id)
        .eq("status", "active");

      // Fetch user's joined boosts
      const { data: joinedBoosts } = await supabase
        .from("bounty_applications")
        .select("bounty_campaign_id")
        .eq("user_id", userId)
        .eq("status", "approved");

      const joinedBoostIds = new Set(joinedBoosts?.map(jb => jb.bounty_campaign_id) || []);

      // Transform campaigns
      const formattedCampaigns: Campaign[] = [
        ...(boostCampaigns || []).map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          status: c.status,
          cpm_rate: null,
          flat_rate: c.monthly_retainer,
          banner_url: c.banner_url,
          created_at: c.created_at,
          end_date: c.end_date,
          type: "boost" as const,
          isJoined: joinedBoostIds.has(c.id),
        })),
      ];

      setCampaigns(formattedCampaigns);
      setLoading(false);
    };

    fetchCampaigns();
  }, [brand.id, userId]);

  const filteredCampaigns = campaigns.filter(c => {
    if (activeTab === "joined") return c.isJoined;
    if (activeTab === "available") return !c.isJoined;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Campaigns</h1>
        <p className="text-gray-500 mt-1">Browse and join campaigns from {brand.name}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            All ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger 
            value="joined"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Joined ({campaigns.filter(c => c.isJoined).length})
          </TabsTrigger>
          <TabsTrigger 
            value="available"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Available ({campaigns.filter(c => !c.isJoined).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredCampaigns.length === 0 ? (
            <Card className="bg-white border-gray-100">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No campaigns found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCampaigns.map((campaign) => (
                <Card key={campaign.id} className="bg-white border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Banner */}
                  <div 
                    className="h-32 bg-cover bg-center"
                    style={{
                      backgroundImage: campaign.banner_url 
                        ? `url(${campaign.banner_url})` 
                        : `linear-gradient(135deg, ${accentColor}, ${accentColor}88)`,
                    }}
                  />
                  
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{campaign.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {campaign.description || "No description"}
                        </p>
                      </div>
                      {campaign.isJoined && (
                        <Badge 
                          className="ml-2 shrink-0 border-0"
                          style={{ 
                            backgroundColor: `${accentColor}15`,
                            color: accentColor 
                          }}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Joined
                        </Badge>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      {campaign.cpm_rate && (
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>${campaign.cpm_rate}/1k</span>
                        </div>
                      )}
                      {campaign.flat_rate && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>${campaign.flat_rate}</span>
                        </div>
                      )}
                      <Badge 
                        variant="outline" 
                        className="text-xs capitalize border-gray-200 text-gray-600"
                      >
                        {campaign.type}
                      </Badge>
                    </div>

                    {/* Action */}
                    {!campaign.isJoined && (
                      <Button 
                        className="w-full text-white"
                        style={{ backgroundColor: accentColor }}
                        onClick={() => window.open(`/c/${campaign.id}`, "_blank")}
                      >
                        View Details
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                    {campaign.isJoined && (
                      <Button 
                        variant="outline"
                        className="w-full border-gray-200"
                      >
                        View Campaign
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
