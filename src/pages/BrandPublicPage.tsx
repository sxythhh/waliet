import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  home_url: string | null;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  rpm_rate: number;
  status: string;
  slug: string;
}

interface Boost {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  monthly_retainer: number;
  status: string;
}

export default function BrandPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [endedCampaigns, setEndedCampaigns] = useState<Campaign[]>([]);
  const [activeBoosts, setActiveBoosts] = useState<Boost[]>([]);
  const [endedBoosts, setEndedBoosts] = useState<Boost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrandData = async () => {
      if (!slug) return;

      try {
        const { data: brandData, error: brandError } = await supabase
          .from("brands")
          .select("id, name, slug, logo_url, description, home_url")
          .eq("slug", slug)
          .eq("is_active", true)
          .single();

        if (brandError || !brandData) {
          navigate("/404");
          return;
        }

        setBrand(brandData);

        // Fetch all campaigns
        const { data: campaignsData } = await supabase
          .from("campaigns")
          .select("id, title, description, banner_url, rpm_rate, status, slug")
          .eq("brand_id", brandData.id)
          .eq("is_private", false)
          .order("created_at", { ascending: false });

        const campaigns = campaignsData || [];
        setActiveCampaigns(campaigns.filter(c => c.status === "active"));
        setEndedCampaigns(campaigns.filter(c => c.status !== "active"));

        // Fetch all boosts
        const { data: boostsData } = await supabase
          .from("bounty_campaigns")
          .select("id, title, description, banner_url, monthly_retainer, status")
          .eq("brand_id", brandData.id)
          .eq("is_private", false)
          .order("created_at", { ascending: false });

        const boosts = boostsData || [];
        setActiveBoosts(boosts.filter(b => b.status === "active"));
        setEndedBoosts(boosts.filter(b => b.status !== "active"));
      } catch (error) {
        console.error("Error fetching brand:", error);
        navigate("/404");
      } finally {
        setLoading(false);
      }
    };

    fetchBrandData();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="flex flex-col items-center gap-4 mb-12">
            <Skeleton className="w-24 h-24 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!brand) {
    return null;
  }

  const CampaignItem = ({ campaign }: { campaign: Campaign }) => (
    <div
      className="group py-6 cursor-pointer transition-colors hover:bg-muted/30"
      onClick={() => navigate(`/campaign/${campaign.slug}`)}
    >
      <div className="flex items-start gap-5">
        {campaign.banner_url && (
          <img
            src={campaign.banner_url}
            alt={campaign.title}
            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
              {campaign.title}
            </h3>
            <span className="text-sm text-muted-foreground flex-shrink-0">
              ${campaign.rpm_rate} RPM
            </span>
          </div>
          {campaign.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {campaign.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const BoostItem = ({ boost }: { boost: Boost }) => (
    <div
      className="group py-6 cursor-pointer transition-colors hover:bg-muted/30"
      onClick={() => navigate(`/boost/${boost.id}`)}
    >
      <div className="flex items-start gap-5">
        {boost.banner_url && (
          <img
            src={boost.banner_url}
            alt={boost.title}
            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
              {boost.title}
            </h3>
            <span className="text-sm text-muted-foreground flex-shrink-0">
              ${boost.monthly_retainer}/mo
            </span>
          </div>
          {boost.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {boost.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="py-16 text-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{brand.name} | Virality</title>
        <meta name="description" content={brand.description || `Join ${brand.name} creator campaigns on Virality`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-16">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-16">
            <Avatar className="w-24 h-24 mb-5">
              <AvatarImage src={brand.logo_url || undefined} alt={brand.name} />
              <AvatarFallback className="text-3xl font-semibold bg-muted">
                {brand.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">{brand.name}</h1>
            {brand.description && (
              <p className="text-muted-foreground max-w-md">{brand.description}</p>
            )}
            {brand.home_url && (
              <a
                href={brand.home_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline mt-3"
              >
                {brand.home_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="campaigns" className="w-full">
            <TabsList className="w-full justify-start bg-transparent p-0 h-auto mb-8">
              <TabsTrigger 
                value="campaigns" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 mr-8 pb-3 rounded-none data-[state=active]:text-foreground text-muted-foreground font-medium"
              >
                Campaigns
                <span className="ml-2 text-xs text-muted-foreground">
                  {activeCampaigns.length + endedCampaigns.length}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="boosts" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 rounded-none data-[state=active]:text-foreground text-muted-foreground font-medium"
              >
                Boosts
                <span className="ml-2 text-xs text-muted-foreground">
                  {activeBoosts.length + endedBoosts.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns" className="mt-0">
              {activeCampaigns.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Active
                  </h2>
                  <div className="divide-y divide-border/50">
                    {activeCampaigns.map((campaign) => (
                      <CampaignItem key={campaign.id} campaign={campaign} />
                    ))}
                  </div>
                </div>
              )}

              {endedCampaigns.length > 0 && (
                <div>
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Ended
                  </h2>
                  <div className="divide-y divide-border/50">
                    {endedCampaigns.map((campaign) => (
                      <CampaignItem key={campaign.id} campaign={campaign} />
                    ))}
                  </div>
                </div>
              )}

              {activeCampaigns.length === 0 && endedCampaigns.length === 0 && (
                <EmptyState message="No campaigns yet" />
              )}
            </TabsContent>

            <TabsContent value="boosts" className="mt-0">
              {activeBoosts.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Active
                  </h2>
                  <div className="divide-y divide-border/50">
                    {activeBoosts.map((boost) => (
                      <BoostItem key={boost.id} boost={boost} />
                    ))}
                  </div>
                </div>
              )}

              {endedBoosts.length > 0 && (
                <div>
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Ended
                  </h2>
                  <div className="divide-y divide-border/50">
                    {endedBoosts.map((boost) => (
                      <BoostItem key={boost.id} boost={boost} />
                    ))}
                  </div>
                </div>
              )}

              {activeBoosts.length === 0 && endedBoosts.length === 0 && (
                <EmptyState message="No boosts yet" />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
