import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
import { CreateBountyDialog } from "@/components/brand/CreateBountyDialog";
import { BountyApplicationsSheet } from "@/components/brand/BountyApplicationsSheet";
import { BountyCampaignsView } from "@/components/brand/BountyCampaignsView";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, TrendingUp, PanelLeft, ArrowRight, Home, LayoutGrid, Menu, DollarSign, Video, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Skeleton } from "@/components/ui/skeleton";
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
  created_at: string;
}

interface BountyCampaign {
  id: string;
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements: string;
  max_accepted_creators: number;
  accepted_creators_count: number;
  start_date: string | null;
  end_date: string | null;
  banner_url: string | null;
  status: string;
  created_at: string;
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
  const [bounties, setBounties] = useState<BountyCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [bountyToDelete, setBountyToDelete] = useState<BountyCampaign | null>(null);
  const [activeView, setActiveView] = useState<"campaigns" | "bounties" | "home">("home");
  const [createBountyOpen, setCreateBountyOpen] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<{ id: string; title: string; maxAccepted: number; currentAccepted: number } | null>(null);
  const [applicationsSheetOpen, setApplicationsSheetOpen] = useState(false);
  const sidebar = useSidebar();
  const isMobile = useIsMobile();
  const handleViewChange = (value: string) => {
    const newView = value as "campaigns" | "bounties" | "home";
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

      // Fetch bounties for this brand
      const {
        data: bountiesData,
        error: bountiesError
      } = await supabase.from("bounty_campaigns").select("*").eq("brand_id", brandData.id).order("created_at", {
        ascending: false
      });
      if (bountiesError) throw bountiesError;
      setBounties((bountiesData as any) || []);
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
  
  const handleDeleteBountyClick = (bounty: BountyCampaign) => {
    setBountyToDelete(bounty);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (campaignToDelete) {
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
    } else if (bountyToDelete) {
      try {
        const {
          error
        } = await supabase.from("bounty_campaigns").delete().eq("id", bountyToDelete.id);
        if (error) throw error;
        toast.success("Bounty deleted successfully");
        fetchBrandData();
      } catch (error) {
        console.error("Error deleting bounty:", error);
        toast.error("Failed to delete bounty");
      } finally {
        setDeleteDialogOpen(false);
        setBountyToDelete(null);
      }
    }
  };
  if (loading) {
    return <div className="min-h-screen p-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Skeleton className="h-[350px] rounded-lg" />
            <Skeleton className="h-[350px] rounded-lg" />
            <Skeleton className="h-[350px] rounded-lg" />
          </div>
        </div>
      </div>;
  }
  if (!brand) {
    return <div className="min-h-screen p-8 bg-background flex items-center justify-center">
        <div className="text-foreground">Brand not found</div>
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
  return <div className="min-h-screen bg-background">
      {/* Header - Hide when showing home embed */}
      {effectiveView !== "home" && (
        <>
          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => isMobile ? sidebar.setOpenMobile(true) : toggleSidebar()} className="text-muted-foreground hover:text-foreground hover:bg-accent">
                  {isMobile ? <Menu className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
                </Button>
                <h1 className="text-2xl font-bold text-foreground font-instrument tracking-tight">
                  {brand.name}
                </h1>
              </div>
              <div className="flex gap-2">
                <CreateCampaignDialog brandId={brand.id} brandName={brand.name} onSuccess={fetchBrandData} />
                <Button onClick={() => setCreateBountyOpen(true)} variant="outline" className="gap-2">
                  <Users className="h-4 w-4" />
                  Create Bounty
                </Button>
              </div>
            </div>

            {/* View Toggle - Only show if both views are available */}
            {showToggle && <Tabs value={effectiveView} onValueChange={handleViewChange} className="w-full mb-6">
              <TabsList className="bg-muted border-border">
                <TabsTrigger value="home" className="gap-2 data-[state=active]:bg-card">
                  <Home className="h-4 w-4" />
                  Home
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="gap-2 data-[state=active]:bg-card">
                  <LayoutGrid className="h-4 w-4" />
                  Campaigns
                </TabsTrigger>
                <TabsTrigger value="bounties" className="gap-2 data-[state=active]:bg-card">
                  <Users className="h-4 w-4" />
                  Bounties
                </TabsTrigger>
              </TabsList>
            </Tabs>}
          </div>
        </>
      )}

      {/* Floating buttons when on home view */}
      {effectiveView === "home" && showToggle && (
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <CreateCampaignDialog brandId={brand.id} brandName={brand.name} onSuccess={fetchBrandData} />
          <Button
            onClick={() => setActiveView("campaigns")}
            className="bg-primary hover:bg-primary/90"
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            View Campaigns
          </Button>
        </div>
      )}

      {/* Content Area */}
      {showToggle ? <>
          {/* Home Embed View - Full Width */}
          {effectiveView === "home" && <div className="w-full h-screen">
              <div dangerouslySetInnerHTML={{
          __html: brand.home_url
        }} className="w-full h-full" />
            </div>}

          {/* Campaigns View - With Padding */}
          {effectiveView === "campaigns" && <div className="max-w-7xl mx-auto px-4 md:px-8 pb-8">
              <div className="space-y-6">
                {campaigns.length > 0 ? <div className="space-y-3">
                      <h2 className="text-lg font-semibold text-foreground">Campaigns</h2>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        {campaigns.map(campaign => {
                  const usedBudget = Number(campaign.budget_used || 0);
                  const budgetPercentage = Number(campaign.budget) > 0 ? usedBudget / Number(campaign.budget) * 100 : 0;
                  return <Card key={campaign.id} className="group bg-card border transition-all duration-300 animate-fade-in flex flex-col overflow-hidden cursor-pointer hover:bg-accent/50" onClick={() => navigate(`/brand/${slug}/management?campaign=${campaign.id}`)}>
                              {campaign.banner_url && <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                                  <OptimizedImage src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105" />
                                </div>}
                              <CardContent className="p-3 flex-1 flex flex-col gap-2.5 font-instrument tracking-tight">
                            <div className="flex items-start justify-between">
                              <h3 className="text-sm font-semibold line-clamp-2 leading-snug flex-1">
                                {campaign.title}
                              </h3>
                              <div onClick={e => e.stopPropagation()}>
                                <CreateCampaignDialog brandId={brand.id} brandName={brand.name} onSuccess={fetchBrandData} campaign={campaign} onDelete={() => handleDeleteClick(campaign)} trigger={<Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>} />
                              </div>
                            </div>

                                {/* Budget Progress Bar - Refined */}
                                <div className="rounded-lg p-2.5 space-y-1.5 bg-[#0d0d0d]">
                                  <div className="flex items-baseline justify-between">
                                    <div className="flex items-baseline gap-1.5 font-chakra tracking-tight">
                                      <span className="text-base font-bold tabular-nums">${usedBudget.toLocaleString()}</span>
                                      <span className="text-xs text-muted-foreground font-bold">/ ${Number(campaign.budget).toLocaleString()}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Progress Bar */}
                                  <div className="relative h-1.5 rounded-full overflow-hidden bg-[#1b1b1b]">
                                    <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700" style={{
                            width: `${budgetPercentage}%`
                          }} />
                                  </div>
                                  
                                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                                    <span className="font-medium">{budgetPercentage.toFixed(0)}% used</span>
                                  </div>
                                </div>

                                {/* RPM Display */}
                                <div className="flex items-center justify-between text-xs pt-1">
                                  <span className="text-muted-foreground font-medium">RPM Rate</span>
                                  <span className="font-bold tabular-nums">
                                    ${Number(campaign.rpm_rate).toFixed(2)}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>;
                })}
                      </div>
                    </div> : null}

                {bounties.length > 0 ? <div className="space-y-3">
                      <h2 className="text-lg font-semibold text-foreground">Bounties</h2>
                      <BountyCampaignsView 
                        bounties={bounties}
                        onViewApplications={(bounty) => {
                          setSelectedBounty(bounty);
                          setApplicationsSheetOpen(true);
                        }}
                        onDelete={handleDeleteBountyClick}
                      />
                    </div> : null}

                {campaigns.length === 0 && bounties.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-muted-foreground mb-4">No campaigns or bounties yet</p>
                    <div className="flex gap-2">
                      <CreateCampaignDialog brandId={brand.id} brandName={brand.name} onSuccess={fetchBrandData} />
                      <Button onClick={() => setCreateBountyOpen(true)} variant="outline" className="gap-2">
                        <Users className="h-4 w-4" />
                        Create Bounty
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>}
        </> :
    // Single view - no toggle needed
    effectiveView === "home" ? <div className="w-full h-screen">
            <div dangerouslySetInnerHTML={{
        __html: brand.home_url || ""
      }} className="w-full h-full" />
          </div> : <div className="max-w-7xl mx-auto px-4 md:px-8 pb-8">
            {campaigns.length > 0 ? <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {campaigns.map(campaign => {
          const usedBudget = Number(campaign.budget_used || 0);
          const budgetPercentage = Number(campaign.budget) > 0 ? usedBudget / Number(campaign.budget) * 100 : 0;
          return <Card key={campaign.id} className="group bg-card border transition-all duration-300 animate-fade-in flex flex-col overflow-hidden cursor-pointer" onClick={() => navigate(`/brand/${slug}/management?campaign=${campaign.id}`)}>
                      {campaign.banner_url && <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                          <OptimizedImage src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105" />
                        </div>}
                      <CardContent className="p-3 flex-1 flex flex-col gap-2.5 font-instrument tracking-tight">
                        <div className="flex items-start justify-between">
                          <h3 className="text-sm font-semibold line-clamp-2 leading-snug flex-1">
                            {campaign.title}
                          </h3>
                          <div onClick={e => e.stopPropagation()}>
                            <CreateCampaignDialog brandId={brand.id} brandName={brand.name} onSuccess={fetchBrandData} campaign={campaign} onDelete={() => handleDeleteClick(campaign)} trigger={<Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>} />
                          </div>
                        </div>

                        {/* Budget Progress Bar - Refined */}
                        <div className="rounded-lg p-2.5 space-y-1.5 bg-[#0d0d0d]">
                          <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline gap-1.5 font-chakra tracking-tight">
                              <span className="text-base font-bold tabular-nums">${usedBudget.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground font-bold">/ ${Number(campaign.budget).toLocaleString()}</span>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="relative h-1.5 rounded-full overflow-hidden bg-[#1b1b1b]">
                            <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700" style={{
                    width: `${budgetPercentage}%`
                  }} />
                          </div>
                          
                          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                            <span className="font-medium">{budgetPercentage.toFixed(0)}% used</span>
                          </div>
                        </div>

                        {/* RPM Display */}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-muted-foreground font-medium">RPM Rate</span>
                          <span className="font-bold tabular-nums">
                            ${Number(campaign.rpm_rate).toFixed(2)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>;
        })}
              </div> : <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-4">No campaigns yet</p>
                <CreateCampaignDialog brandId={brand.id} brandName={brand.name} onSuccess={fetchBrandData} />
              </div>}
          </div>}

          {/* Bounties View */}
          {effectiveView === "bounties" && <div className="max-w-7xl mx-auto px-4 md:px-8 pb-8">
              <BountyCampaignsView 
                bounties={bounties}
                onViewApplications={(bounty) => {
                  setSelectedBounty(bounty);
                  setApplicationsSheetOpen(true);
                }}
                onDelete={handleDeleteBountyClick}
              />
          </div>}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-card border">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong className="text-foreground">{campaignToDelete?.title || bountyToDelete?.title}</strong>.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-muted border hover:bg-accent">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bounty Creation Dialog */}
        <CreateBountyDialog 
          open={createBountyOpen}
          onOpenChange={setCreateBountyOpen}
          brandId={brand.id}
          onSuccess={fetchBrandData}
        />

        {/* Bounty Applications Sheet */}
        {selectedBounty && (
          <BountyApplicationsSheet
            open={applicationsSheetOpen}
            onOpenChange={setApplicationsSheetOpen}
            bountyId={selectedBounty.id}
            bountyTitle={selectedBounty.title}
            maxAccepted={selectedBounty.maxAccepted}
            currentAccepted={selectedBounty.currentAccepted}
          />
        )}
    </div>;
}