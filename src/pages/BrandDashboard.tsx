import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, TrendingUp, PanelLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  brand_type: string | null;
  home_url: string | null;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  budget: number;
  budget_used: number;
  rpm_rate: number;
  status: string;
  banner_url: string | null;
  guidelines: string | null;
  allowed_platforms: string[];
  application_questions: any[];
  slug: string;
}

export default function BrandDashboard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

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

      // Parse application_questions from JSON to array
      const parsedCampaigns = (campaignsData || []).map(campaign => ({
        ...campaign,
        application_questions: Array.isArray(campaign.application_questions) 
          ? campaign.application_questions 
          : []
      }));

      setCampaigns(parsedCampaigns as Campaign[]);
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

  const handleDeleteClick = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return;

    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignToDelete.id);

      if (error) throw error;

      toast.success("Campaign deleted successfully");
      fetchBrandData();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    } finally {
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    }
  };

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

  // If brand type is "DWY" and home_url is configured, render as iframe
  if (brand.brand_type === "DWY" && brand.home_url) {
    return (
      <div className="h-screen w-full bg-[#191919]">
        <iframe
          src={brand.home_url}
          className="w-full h-full border-0"
          title={`${brand.name} Dashboard`}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
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
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
            {brand.logo_url ? (
              <img 
                src={brand.logo_url} 
                alt={`${brand.name} logo`}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-white/5 flex items-center justify-center">
                <div className="h-10 w-10 rounded-md bg-white/10" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-white">{brand.name}</h1>
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

        {/* Campaigns List */}
        {campaigns.length > 0 && (
          <div className="space-y-4 mt-8">
            <h2 className="text-2xl font-bold text-white">Campaigns</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaigns.map((campaign) => {
                const usedBudget = Number(campaign.budget_used || 0);
                const budgetPercentage = Number(campaign.budget) > 0 ? (usedBudget / Number(campaign.budget)) * 100 : 0;
                
                return (
                  <Card 
                    key={campaign.id} 
                    className="bg-[#202020] border-none overflow-hidden cursor-pointer transition-all hover:bg-[#252525]"
                    onClick={() => navigate(`/brand/${slug}/management?campaign=${campaign.id}`)}
                  >
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
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-white mb-1">
                            {campaign.title}
                          </h3>
                          {campaign.description && (
                            <p className="text-sm text-white/60 line-clamp-2">
                              {campaign.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-white/60 hover:text-white hover:bg-white/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              const joinUrl = `${window.location.origin}/join/${campaign.slug}`;
                              navigator.clipboard.writeText(joinUrl);
                              toast.success("Campaign join URL copied to clipboard");
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
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
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(campaign);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Budget Progress Bar */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/60">Budget Usage</span>
                          <span className="text-white font-medium">
                            ${usedBudget.toLocaleString()} / ${Number(campaign.budget).toLocaleString()}
                          </span>
                        </div>
                        <div className="relative h-3 bg-[#191919] rounded-full overflow-hidden">
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-[#3b4ad9] to-[#5865F2] rounded-full transition-all duration-500"
                            style={{ width: `${budgetPercentage}%` }}
                          >
                            <div 
                              className="absolute inset-0 opacity-40"
                              style={{
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.2) 10px, rgba(255,255,255,.2) 20px)',
                                animation: 'slide 1.5s linear infinite',
                                backgroundSize: '40px 40px'
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* RPM Display */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">RPM:</span>
                        <span className="text-white font-semibold">
                          ${Number(campaign.rpm_rate).toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-[#202020] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                This will permanently delete <strong className="text-white">{campaignToDelete?.title}</strong>.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
