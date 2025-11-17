import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Search, TrendingUp, Calendar, DollarSign, Copy, Package, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateBountyDialog } from "@/components/brand/CreateBountyDialog";
import { BountyCampaignsView } from "@/components/brand/BountyCampaignsView";
import { BountyApplicationsSheet } from "@/components/brand/BountyApplicationsSheet";
interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_id: string;
  description: string | null;
  budget: number;
  budget_used: number;
  rpm_rate: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  preview_url: string | null;
  banner_url: string | null;
  guidelines: string | null;
  allowed_platforms: string[];
  application_questions: any[];
  slug: string;
  embed_url: string | null;
  analytics_url: string | null;
  is_private: boolean;
  access_code: string | null;
  requires_application: boolean;
  is_infinite_budget: boolean;
  is_featured: boolean;
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

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [brands, setBrands] = useState<{ id: string; name: string; logo_url: string | null }[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedBrandName, setSelectedBrandName] = useState<string>("");
  
  // Bounty campaigns state
  const [bountyCampaigns, setBountyCampaigns] = useState<BountyCampaign[]>([]);
  const [bountyLoading, setBountyLoading] = useState(true);
  const [createBountyDialogOpen, setCreateBountyDialogOpen] = useState(false);
  const [selectedBountyBrandId, setSelectedBountyBrandId] = useState<string>("");
  const [bountyApplicationsOpen, setBountyApplicationsOpen] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<{
    id: string;
    title: string;
    maxAccepted: number;
    currentAccepted: number;
  } | null>(null);
  
  const { toast } = useToast();
  useEffect(() => {
    fetchCampaigns();
    fetchBrands();
    fetchBountyCampaigns();
  }, []);
  useEffect(() => {
    filterCampaigns();
  }, [searchQuery, campaigns]);
  const fetchBrands = async () => {
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, logo_url")
      .order("name");
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch brands"
      });
    } else {
      setBrands(data || []);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("campaigns").select(`
      *,
      brands!inner(logo_url)
    `).order("created_at", {
      ascending: false
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch campaigns"
      });
    } else {
      // Parse application_questions from JSON to array and add brand logo
      const parsedCampaigns = (data || []).map(campaign => ({
        ...campaign,
        brand_logo_url: campaign.brands?.logo_url || null,
        application_questions: Array.isArray(campaign.application_questions) 
          ? campaign.application_questions 
          : []
      })) as Campaign[];
      
      setCampaigns(parsedCampaigns);
      setFilteredCampaigns(parsedCampaigns);
    }
    setLoading(false);
  };
  
  const fetchBountyCampaigns = async () => {
    setBountyLoading(true);
    const { data, error } = await supabase
      .from("bounty_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch bounty campaigns"
      });
    } else {
      setBountyCampaigns(data || []);
    }
    setBountyLoading(false);
  };

  const handleDeleteBountyCampaign = async (bounty: BountyCampaign) => {
    const { error } = await supabase
      .from("bounty_campaigns")
      .delete()
      .eq("id", bounty.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete bounty campaign"
      });
    } else {
      toast({
        title: "Success",
        description: "Bounty campaign deleted successfully"
      });
      fetchBountyCampaigns();
    }
  };

  const handleViewBountyApplications = (bounty: { id: string; title: string; maxAccepted: number; currentAccepted: number }) => {
    setSelectedBounty(bounty);
    setBountyApplicationsOpen(true);
  };

  const handleCreateBountyCampaign = () => {
    if (!selectedBountyBrandId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a brand"
      });
      return;
    }
    setCreateBountyDialogOpen(true);
  };

  const filterCampaigns = () => {
    let filtered = searchQuery 
      ? campaigns.filter(campaign => 
          campaign.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
          campaign.brand_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : campaigns;
    
    // Sort by remaining budget (largest first), with ended campaigns always last
    const sorted = [...filtered].sort((a, b) => {
      // Ended campaigns go to the end
      if (a.status === 'ended' && b.status !== 'ended') return 1;
      if (a.status !== 'ended' && b.status === 'ended') return -1;
      
      // Sort by remaining budget (descending)
      const remainingA = Number(a.budget) - Number(a.budget_used || 0);
      const remainingB = Number(b.budget) - Number(b.budget_used || 0);
      return remainingB - remainingA;
    });
    
    setFilteredCampaigns(sorted);
  };
  const openEditDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setEditDialogOpen(true);
  };

  const handleCreateCampaign = () => {
    if (!selectedBrandId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a brand"
      });
      return;
    }
    const brand = brands.find(b => b.id === selectedBrandId);
    if (brand) {
      setSelectedBrandName(brand.name);
      setCreateDialogOpen(true);
    }
  };
  
  const handleDeleteCampaign = async () => {
    if (!selectedCampaign) return;
    const {
      error
    } = await supabase.from("campaigns").delete().eq("id", selectedCampaign.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete campaign"
      });
    } else {
      toast({
        title: "Success",
        description: "Campaign deleted successfully"
      });
      setSelectedCampaign(null);
      fetchCampaigns();
    }
  };
  const stats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === "active").length,
    totalBudget: campaigns.reduce((sum, c) => sum + Number(c.budget), 0)
  };
  if (loading || bountyLoading) {
    return <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading campaigns...</p>
      </div>;
  }
  
  const bountyStats = {
    totalBounties: bountyCampaigns.length,
    activeBounties: bountyCampaigns.filter(b => b.status === "active").length,
    totalSpots: bountyCampaigns.reduce((sum, b) => sum + b.max_accepted_creators, 0),
    filledSpots: bountyCampaigns.reduce((sum, b) => sum + b.accepted_creators_count, 0)
  };

  return <div className="p-8 space-y-6 px-[27px] py-0">
      <Tabs defaultValue="rpm" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="rpm">RPM Campaigns</TabsTrigger>
          <TabsTrigger value="retainer">Retainer Campaigns</TabsTrigger>
        </TabsList>

        {/* RPM Campaigns Tab */}
        <TabsContent value="rpm" className="space-y-6">
          {/* Search */}
          <Card className="bg-card border-0">
            
          </Card>

          {/* Campaigns Gallery */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">RPM Campaigns ({filteredCampaigns.length})</h2>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create RPM Campaign
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New RPM Campaign</DialogTitle>
                    <DialogDescription>Select a brand for the new campaign</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                        <div className="flex items-center gap-2">
                          {brand.logo_url && (
                            <img src={brand.logo_url} alt={brand.name} className="w-5 h-5 rounded object-cover" />
                          )}
                          {brand.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleCreateCampaign} className="w-full">
                  Continue
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {filteredCampaigns.length === 0 ? <Card className="bg-card border-0">
            <CardContent className="py-12 text-center text-muted-foreground">
              No RPM campaigns found
            </CardContent>
          </Card> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 max-w-7xl">
            {filteredCampaigns.map(campaign => <Card key={campaign.id} className="group bg-card transition-all duration-300 animate-fade-in flex flex-col overflow-hidden border hover:bg-muted/50 cursor-pointer" onClick={() => openEditDialog(campaign)}>
                {/* Content Section */}
                <CardContent className="p-3 flex-1 flex flex-col gap-2.5 font-instrument tracking-tight">
                  {/* Brand Logo + Title */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {campaign.brand_logo_url ? <img src={campaign.brand_logo_url} alt={campaign.brand_name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>}
                    
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
                          ${(campaign.budget_used || 0).toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          / ${campaign.budget.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="relative h-1.5 rounded-full overflow-hidden bg-[#1b1b1b]">
                      <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700" style={{
                  width: `${campaign.budget > 0 ? (campaign.budget_used || 0) / campaign.budget * 100 : 0}%`
                }} />
                    </div>
                    
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                      <span>
                        {campaign.budget > 0 ? ((campaign.budget_used || 0) / campaign.budget * 100).toFixed(0) : 0}% used
                      </span>
                      <span className="font-chakra">
                        ${campaign.rpm_rate.toFixed(2)} RPM
                      </span>
                    </div>
                  </div>

                  {/* Dates */}
                  

                  {/* Actions */}
                  <div className="mt-auto pt-2 flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={e => {
                e.stopPropagation();
                const joinUrl = `${window.location.origin}/campaign/join/${campaign.id}`;
                navigator.clipboard.writeText(joinUrl);
                toast({
                  title: "Copied!",
                  description: "Campaign join URL copied to clipboard"
                });
              }}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 h-8 text-[11px] font-instrument tracking-tight hover:bg-muted/50" onClick={e => {
                e.stopPropagation();
                openEditDialog(campaign);
              }}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>)}
          </div>}
      </div>

      {/* Edit Dialog */}
      {selectedCampaign && (
        <CreateCampaignDialog
          brandId={selectedCampaign.brand_id}
          brandName={selectedCampaign.brand_name}
          campaign={selectedCampaign}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedCampaign(null);
          }}
          onSuccess={() => {
            setEditDialogOpen(false);
            setSelectedCampaign(null);
            fetchCampaigns();
          }}
          onDelete={handleDeleteCampaign}
          trigger={null}
        />
      )}

      {/* Create Dialog */}
      {selectedBrandId && selectedBrandName && (
        <CreateCampaignDialog
          brandId={selectedBrandId}
          brandName={selectedBrandName}
          open={createDialogOpen && !!selectedBrandName}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedBrandId("");
              setSelectedBrandName("");
            }
          }}
          onSuccess={() => {
            setCreateDialogOpen(false);
            setSelectedBrandId("");
            setSelectedBrandName("");
            fetchCampaigns();
          }}
          trigger={null}
        />
      )}
        </TabsContent>

        {/* Retainer Campaigns Tab */}
        <TabsContent value="retainer" className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Retainer Campaigns ({bountyCampaigns.length})</h2>
              <Dialog open={createBountyDialogOpen} onOpenChange={setCreateBountyDialogOpen}>
                <Button onClick={() => setCreateBountyDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Retainer Campaign
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Retainer Campaign</DialogTitle>
                    <DialogDescription>Select a brand for the new retainer campaign</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Select value={selectedBountyBrandId} onValueChange={setSelectedBountyBrandId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            <div className="flex items-center gap-2">
                              {brand.logo_url && (
                                <img src={brand.logo_url} alt={brand.name} className="w-5 h-5 rounded object-cover" />
                              )}
                              {brand.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleCreateBountyCampaign} className="w-full">
                      Continue
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <BountyCampaignsView
              bounties={bountyCampaigns}
              onViewApplications={handleViewBountyApplications}
              onDelete={handleDeleteBountyCampaign}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Bounty Campaign Dialog */}
      {selectedBountyBrandId && (
        <CreateBountyDialog
          brandId={selectedBountyBrandId}
          open={createBountyDialogOpen && !!selectedBountyBrandId}
          onOpenChange={(open) => {
            setCreateBountyDialogOpen(open);
            if (!open) setSelectedBountyBrandId("");
          }}
          onSuccess={() => {
            setCreateBountyDialogOpen(false);
            setSelectedBountyBrandId("");
            fetchBountyCampaigns();
          }}
        />
      )}

      {/* Bounty Applications Sheet */}
      {selectedBounty && (
        <BountyApplicationsSheet
          open={bountyApplicationsOpen}
          onOpenChange={setBountyApplicationsOpen}
          bountyId={selectedBounty.id}
          bountyTitle={selectedBounty.title}
          maxAccepted={selectedBounty.maxAccepted}
          currentAccepted={selectedBounty.currentAccepted}
        />
      )}
    </div>;
}