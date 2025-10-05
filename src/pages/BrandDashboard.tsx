import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, TrendingUp, PanelLeft, ArrowRight, Home, LayoutGrid, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const {
    slug
  } = useParams();
  const navigate = useNavigate();
  const {
    toggleSidebar
  } = useSidebar();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [activeView, setActiveView] = useState<"campaigns" | "home">("home");
  
  const sidebar = useSidebar();
  const isMobile = useIsMobile();
  
  const handleViewChange = (value: string) => {
    const newView = value as "campaigns" | "home";
    setActiveView(newView);
    
    // Auto-hide sidebar when switching to Home view
    if (newView === "home" && sidebar.state !== "collapsed") {
      toggleSidebar();
    }
  };
  const fetchBrandData = async () => {
    if (!slug) return;
    try {
      // Fetch brand
      const {
        data: brandData,
        error: brandError
      } = await supabase.from("brands").select("*").eq("slug", slug).maybeSingle();
      if (brandError) throw brandError;
      if (!brandData) {
        toast.error("Brand not found");
        return;
      }
      setBrand(brandData);

      // Fetch campaigns for this brand
      const {
        data: campaignsData,
        error: campaignsError
      } = await supabase.from("campaigns").select("*").eq("brand_id", brandData.id).order("created_at", {
        ascending: false
      });
      if (campaignsError) throw campaignsError;

      // Parse application_questions from JSON to array
      const parsedCampaigns = (campaignsData || []).map(campaign => ({
        ...campaign,
        application_questions: Array.isArray(campaign.application_questions) ? campaign.application_questions : []
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
      const {
        error
      } = await supabase.from("campaigns").delete().eq("id", campaignToDelete.id);
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
    return <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>;
  }
  if (!brand) {
    return <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-white">Brand not found</div>
      </div>;
  }
  const totalBudget = campaigns.reduce((sum, c) => sum + Number(c.budget), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  
  // Determine which views are available
  const hasHomeEmbed = !!brand.home_url;
  const hasCampaigns = campaigns.length > 0;
  const showToggle = hasHomeEmbed && hasCampaigns;
  
  // If only one view is available, set it as active
  const effectiveView = !hasHomeEmbed ? "campaigns" : !hasCampaigns ? "home" : activeView;
  
  return <div className="min-h-screen bg-[#191919]">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => isMobile ? sidebar.setOpenMobile(true) : toggleSidebar()} 
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              {isMobile ? <Menu className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
            </Button>
            <h1 className="text-2xl font-bold text-white font-['Instrument_Sans'] tracking-[-0.5px]">
              {brand.name}
            </h1>
          </div>
          {effectiveView === "campaigns" && <CreateCampaignDialog brandId={brand.id} brandName={brand.name} onSuccess={fetchBrandData} />}
        </div>

        {/* View Toggle - Only show if both views are available */}
        {showToggle && <Tabs value={effectiveView} onValueChange={handleViewChange} className="w-full mb-6">
          <TabsList className="bg-[#202020] border-white/10">
            <TabsTrigger value="home" className="gap-2 data-[state=active]:bg-[#2a2a2a]">
              <Home className="h-4 w-4" />
              Home
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2 data-[state=active]:bg-[#2a2a2a]">
              <LayoutGrid className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
          </TabsList>
        </Tabs>}
      </div>

      {/* Content Area */}
      {showToggle ? <>
          {/* Home Embed View - Full Width */}
          {effectiveView === "home" && <div className="w-full h-[calc(100vh-180px)] bg-[#202020]">
              <div dangerouslySetInnerHTML={{
            __html: brand.home_url
          }} className="w-full h-full" />
            </div>}

          {/* Campaigns View - With Padding */}
          {effectiveView === "campaigns" && <div className="max-w-7xl mx-auto px-8 pb-8">
              {campaigns.length > 0 ? <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {campaigns.map(campaign => {
                  const usedBudget = Number(campaign.budget_used || 0);
                  const budgetPercentage = Number(campaign.budget) > 0 ? (usedBudget / Number(campaign.budget)) * 100 : 0;
                  return <Card key={campaign.id} className="bg-[#202020] border-none overflow-hidden cursor-pointer transition-all hover:bg-[#252525]" onClick={() => navigate(`/brand/${slug}/management?campaign=${campaign.id}`)}>
                          {campaign.banner_url && <div className="w-full h-32 overflow-hidden">
                              <img src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover" />
                            </div>}
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-xl font-semibold text-white mb-1">
                                  {campaign.title}
                                </h3>
                                {campaign.description && <p className="text-sm text-white/60 line-clamp-2">
                                    {campaign.description}
                                  </p>}
                              </div>
                              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={e => {
                            e.stopPropagation();
                            navigate(`/join/${campaign.slug}`);
                          }} title="Go to join page">
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                                <CreateCampaignDialog brandId={brand.id} brandName={brand.name} onSuccess={fetchBrandData} campaign={campaign} trigger={<Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10">
                                      <Pencil className="h-4 w-4" />
                                    </Button>} />
                                <Button size="icon" variant="ghost" className="text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={e => {
                            e.stopPropagation();
                            handleDeleteClick(campaign);
                          }}>
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
                                <div className="absolute inset-0 bg-gradient-to-r from-[#3b4ad9] to-[#5865F2] rounded-full transition-all duration-500" style={{
                            width: `${budgetPercentage}%`
                          }}>
                                  <div className="absolute inset-0 opacity-40" style={{
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.2) 10px, rgba(255,255,255,.2) 20px)',
                              animation: 'slide 1.5s linear infinite',
                              backgroundSize: '40px 40px'
                            }} />
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
                        </Card>;
                })}
                  </div>
                </div> : <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-white/60 mb-4">No campaigns yet</p>
                  <CreateCampaignDialog brandId={brand.id} brandName={brand.name} onSuccess={fetchBrandData} />
                </div>}
            </div>}
        </> : 
        // Single view - no toggle needed
        effectiveView === "home" ? <div className="w-full h-[calc(100vh-180px)] bg-[#202020]">
            <div dangerouslySetInnerHTML={{
          __html: brand.home_url || ""
        }} className="w-full h-full" />
          </div> : <div className="max-w-7xl mx-auto px-8 pb-8">
            {campaigns.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {campaigns.map(campaign => {
              const usedBudget = Number(campaign.budget_used || 0);
              const budgetPercentage = Number(campaign.budget) > 0 ? (usedBudget / Number(campaign.budget)) * 100 : 0;
              return <Card key={campaign.id} className="bg-[#202020] border-none overflow-hidden cursor-pointer transition-all hover:bg-[#252525]" onClick={() => navigate(`/brand/${slug}/management?campaign=${campaign.id}`)}>
                      {campaign.banner_url && <div className="w-full h-32 overflow-hidden">
                          <img src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover" />
                        </div>}
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-white mb-1">
                              {campaign.title}
                            </h3>
                            {campaign.description && <p className="text-sm text-white/60 line-clamp-2">
                                {campaign.description}
                              </p>}
                          </div>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={e => {
                        e.stopPropagation();
                        navigate(`/join/${campaign.slug}`);
                      }} title="Go to join page">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                            <CreateCampaignDialog brandId={brand.id} brandName={brand.name} onSuccess={fetchBrandData} campaign={campaign} trigger={<Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10">
                                  <Pencil className="h-4 w-4" />
                                </Button>} />
                            <Button size="icon" variant="ghost" className="text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={e => {
                        e.stopPropagation();
                        handleDeleteClick(campaign);
                      }}>
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
                            <div className="absolute inset-0 bg-gradient-to-r from-[#3b4ad9] to-[#5865F2] rounded-full transition-all duration-500" style={{
                        width: `${budgetPercentage}%`
                      }}>
                              <div className="absolute inset-0 opacity-40" style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.2) 10px, rgba(255,255,255,.2) 20px)',
                          animation: 'slide 1.5s linear infinite',
                          backgroundSize: '40px 40px'
                        }} />
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
                    </Card>;
            })}
              </div> : <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-white/60 mb-4">No campaigns yet</p>
                <CreateCampaignDialog brandId={brand.id} brandName={brand.name} onSuccess={fetchBrandData} />
              </div>}
          </div>}

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
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>;
}