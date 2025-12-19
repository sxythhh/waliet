import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Users, Video, Zap } from "lucide-react";

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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrandData = async () => {
      if (!slug) return;

      try {
        // Fetch brand
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

        // Fetch active campaigns
        const { data: campaignsData } = await supabase
          .from("campaigns")
          .select("id, title, description, banner_url, rpm_rate, status, slug")
          .eq("brand_id", brandData.id)
          .eq("status", "active")
          .eq("is_private", false)
          .order("created_at", { ascending: false });

        setCampaigns(campaignsData || []);

        // Fetch active boosts
        const { data: boostsData } = await supabase
          .from("bounty_campaigns")
          .select("id, title, description, banner_url, monthly_retainer, status")
          .eq("brand_id", brandData.id)
          .eq("status", "active")
          .eq("is_private", false)
          .order("created_at", { ascending: false });

        setBoosts(boostsData || []);
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
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!brand) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{brand.name} | Virality</title>
        <meta name="description" content={brand.description || `Join ${brand.name} creator campaigns on Virality`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Brand Header */}
          <div className="flex items-start gap-4 mb-8">
            <Avatar className="w-20 h-20 border-2 border-border">
              <AvatarImage src={brand.logo_url || undefined} alt={brand.name} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10">
                {brand.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">{brand.name}</h1>
              {brand.description && (
                <p className="text-muted-foreground mt-1">{brand.description}</p>
              )}
              {brand.home_url && (
                <a
                  href={brand.home_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                >
                  Visit website <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="bg-card/50">
              <CardContent className="pt-4 pb-3 text-center">
                <Video className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{campaigns.length}</p>
                <p className="text-xs text-muted-foreground">Active Campaigns</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-4 pb-3 text-center">
                <Zap className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{boosts.length}</p>
                <p className="text-xs text-muted-foreground">Active Boosts</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-4 pb-3 text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">-</p>
                <p className="text-xs text-muted-foreground">Creators</p>
              </CardContent>
            </Card>
          </div>

          {/* Campaigns Section */}
          {campaigns.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Campaigns</h2>
              <div className="grid gap-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                    <div className="flex">
                      {campaign.banner_url && (
                        <div className="w-32 h-24 flex-shrink-0">
                          <img
                            src={campaign.banner_url}
                            alt={campaign.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{campaign.title}</h3>
                            {campaign.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {campaign.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            ${campaign.rpm_rate} RPM
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          className="mt-3"
                          onClick={() => navigate(`/campaign/${campaign.slug}`)}
                        >
                          View Campaign
                        </Button>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Boosts Section */}
          {boosts.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Creator Boosts</h2>
              <div className="grid gap-4">
                {boosts.map((boost) => (
                  <Card key={boost.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                    <div className="flex">
                      {boost.banner_url && (
                        <div className="w-32 h-24 flex-shrink-0">
                          <img
                            src={boost.banner_url}
                            alt={boost.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{boost.title}</h3>
                            {boost.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {boost.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            ${boost.monthly_retainer}/mo
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          className="mt-3"
                          onClick={() => navigate(`/boost/${boost.id}`)}
                        >
                          View Boost
                        </Button>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {campaigns.length === 0 && boosts.length === 0 && (
            <Card className="bg-card/50">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No active campaigns or boosts at the moment.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
