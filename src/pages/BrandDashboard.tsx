import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  budget: number;
  rpm_rate: number;
  status: string;
  banner_url: string | null;
  guidelines: string | null;
}

export default function BrandDashboard() {
  const { slug } = useParams();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBrandData = async () => {
    if (!slug) return;

    try {
      // Fetch brand
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (brandError) throw brandError;
      
      if (!brandData) {
        toast.error("Brand not found");
        return;
      }

      setBrand(brandData);

      // Fetch campaigns for this brand
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("brand_id", brandData.id)
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;

      setCampaigns(campaignsData || []);
    } catch (error) {
      console.error("Error fetching brand data:", error);
      toast.error("Failed to load brand data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-white">Brand not found</div>
      </div>
    );
  }

  const totalBudget = campaigns.reduce((sum, c) => sum + Number(c.budget), 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;


  return (
    <div className="min-h-screen p-8 bg-[#191919]">
      <div className="max-w-7xl mx-auto">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-xl bg-white/5 flex items-center justify-center">
              <div className="h-16 w-16 rounded-lg bg-white/10" />
            </div>
            <h1 className="text-4xl font-bold text-white">{brand.name}</h1>
          </div>
          <CreateCampaignDialog
            brandId={brand.id}
            brandName={brand.name}
            onSuccess={fetchBrandData}
          />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#202020] rounded-2xl p-6">
            <div className="text-white/60 text-sm mb-2">Total Budget</div>
            <div className="text-3xl font-bold text-white">
              ${totalBudget.toLocaleString()}
            </div>
          </div>
          <div className="bg-[#202020] rounded-2xl p-6">
            <div className="text-white/60 text-sm mb-2">Active Campaigns</div>
            <div className="text-3xl font-bold text-white">{activeCampaigns}</div>
          </div>
          <div className="bg-[#202020] rounded-2xl p-6">
            <div className="text-white/60 text-sm mb-2">Total Campaigns</div>
            <div className="text-3xl font-bold text-white">{campaigns.length}</div>
          </div>
        </div>

        {/* Brand Card */}
        <div className="bg-[#202020] rounded-2xl p-6 max-w-md">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-xl bg-white/5 flex items-center justify-center relative">
              <div className="h-12 w-12 rounded-lg bg-white/10" />
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-white">{brand.name}</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                ${totalBudget.toLocaleString()}
              </span>
              <span className="text-sm text-white/50">0%</span>
            </div>
            <Progress value={0} className="h-2" />
          </div>
        </div>

        {/* Campaigns List */}
        {campaigns.length > 0 && (
          <div className="space-y-4 mt-8">
            <h2 className="text-2xl font-bold text-white">Campaigns</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="bg-[#202020] border-white/10 overflow-hidden">
                  {campaign.banner_url && (
                    <div className="w-full h-32 overflow-hidden">
                      <img
                        src={campaign.banner_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-1">
                          {campaign.title}
                        </h3>
                        {campaign.description && (
                          <p className="text-sm text-white/60 line-clamp-2">
                            {campaign.description}
                          </p>
                        )}
                      </div>
                      <CreateCampaignDialog
                        brandId={brand.id}
                        brandName={brand.name}
                        onSuccess={fetchBrandData}
                        campaign={campaign}
                        trigger={
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-white/60 hover:text-white hover:bg-white/10"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Budget:</span>
                      <span className="text-white font-semibold">
                        ${Number(campaign.budget).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-white/60">RPM:</span>
                      <span className="text-white font-semibold">
                        ${Number(campaign.rpm_rate).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
