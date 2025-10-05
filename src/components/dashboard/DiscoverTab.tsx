import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
import emptyCampaignsImage from "@/assets/empty-campaigns.png";

interface Campaign {
  id: string;
  title: string;
  description: string;
  brand_name: string;
  brand_logo_url: string;
  budget: number;
  budget_used?: number;
  rpm_rate: number;
  status: string;
  start_date: string | null;
  banner_url: string | null;
  platforms: string[];
  slug: string;
  preview_url: string | null;
  brands?: {
    logo_url: string;
  };
}

export function DiscoverTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("campaigns")
      .select(`
        *,
        brands (
          logo_url
        )
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const campaignsWithBrandLogo = data.map(campaign => ({
        ...campaign,
        brand_logo_url: campaign.brand_logo_url || (campaign.brands as any)?.logo_url,
        platforms: campaign.allowed_platforms || []
      }));
      setCampaigns(campaignsWithBrandLogo);
    }

    setLoading(false);
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.brand_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = !selectedPlatform || 
                           (campaign.platforms && campaign.platforms.some(p => 
                             p.toLowerCase() === selectedPlatform.toLowerCase()
                           ));
    return matchesSearch && matchesPlatform;
  });

  const platforms = ["TikTok", "Instagram", "YouTube"];

  return (
    <div className="space-y-6">
      {/* Iframe Section - No padding */}
      <div className="w-full h-[300px] rounded-lg overflow-hidden border border-border">
        <iframe
          src="https://www.virality.cc/discover"
          className="w-full h-full border-0"
          title="Discover Campaigns"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>

      {/* Content with padding */}
      <div className="px-6 space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedPlatform === null ? "default" : "outline"}
              onClick={() => setSelectedPlatform(null)}
              className="h-11 px-4"
            >
              All
            </Button>
            <Button
              variant={selectedPlatform === "TikTok" ? "default" : "outline"}
              onClick={() => setSelectedPlatform(selectedPlatform === "TikTok" ? null : "TikTok")}
              className="h-11 w-11 p-0"
              title="TikTok"
            >
              <img src={tiktokLogo} alt="TikTok" className="w-5 h-5" />
            </Button>
            <Button
              variant={selectedPlatform === "Instagram" ? "default" : "outline"}
              onClick={() => setSelectedPlatform(selectedPlatform === "Instagram" ? null : "Instagram")}
              className="h-11 w-11 p-0"
              title="Instagram"
            >
              <img src={instagramLogo} alt="Instagram" className="w-5 h-5" />
            </Button>
            <Button
              variant={selectedPlatform === "YouTube" ? "default" : "outline"}
              onClick={() => setSelectedPlatform(selectedPlatform === "YouTube" ? null : "YouTube")}
              className="h-11 w-11 p-0"
              title="YouTube"
            >
              <img src={youtubeLogo} alt="YouTube" className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading campaigns...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center gap-4">
            <img src={emptyCampaignsImage} alt="No campaigns" className="w-64 h-64 object-contain opacity-80" />
            <p className="text-slate-50 font-medium">No campaigns found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 max-w-7xl">
            {filteredCampaigns.map((campaign) => {
              const budgetUsed = campaign.budget_used || 0;
              const budgetPercentage = campaign.budget > 0 ? (budgetUsed / campaign.budget) * 100 : 0;

              const handleCampaignClick = () => {
                if (campaign.preview_url) {
                  window.open(campaign.preview_url, '_blank');
                } else {
                  navigate(`/join/${campaign.slug}`);
                }
              };

              return (
                <Card
                  key={campaign.id}
                  className="group bg-card transition-all duration-300 animate-fade-in flex flex-col overflow-hidden border cursor-pointer"
                  onClick={handleCampaignClick}
                >
                  {/* Banner Image */}
                  {campaign.banner_url && (
                    <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                      <img
                        src={campaign.banner_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    </div>
                  )}

                  {/* Content Section */}
                  <CardContent className="p-3 flex-1 flex flex-col gap-2.5 font-instrument tracking-tight">
                    {/* Brand Logo + Title */}
                    <div className="flex items-start gap-2.5">
                      {campaign.brand_logo_url && (
                        <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-border">
                          <img
                            src={campaign.brand_logo_url}
                            alt={campaign.brand_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold line-clamp-2 leading-snug mb-0.5">
                          {campaign.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">{campaign.brand_name}</p>
                      </div>
                    </div>

                    {/* Budget Section */}
                    <div className="rounded-lg p-2.5 space-y-1.5 bg-[#0d0d0d]">
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5 font-chakra tracking-tight">
                          <span className="text-base font-bold tabular-nums">
                            ${budgetUsed.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            / ${campaign.budget.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative h-1.5 rounded-full overflow-hidden bg-[#1b1b1b]">
                        <div
                          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700"
                          style={{ width: `${budgetPercentage}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                        <span>{budgetPercentage.toFixed(0)}% used</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
