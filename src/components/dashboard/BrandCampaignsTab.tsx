import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
import { CreateBountyDialog } from "@/components/brand/CreateBountyDialog";
import { CreateCampaignTypeDialog } from "@/components/brand/CreateCampaignTypeDialog";
import { BountyCampaignsView } from "@/components/brand/BountyCampaignsView";
import { OptimizedImage } from "@/components/OptimizedImage";
import { toast } from "sonner";
import { Pencil, Plus, BarChart3 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  budget: number;
  budget_used: number;
  rpm_rate: number;
  status: string;
  banner_url: string | null;
  slug: string;
  created_at: string;
  guidelines: string | null;
  allowed_platforms: string[] | null;
  application_questions: any[];
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

interface BrandCampaignsTabProps {
  brandId: string;
  brandName: string;
}

export function BrandCampaignsTab({ brandId, brandName }: BrandCampaignsTabProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [bounties, setBounties] = useState<BountyCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [bountyToDelete, setBountyToDelete] = useState<BountyCampaign | null>(null);
  const [createBountyOpen, setCreateBountyOpen] = useState(false);
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);

  useEffect(() => {
    fetchBrandData();
  }, [brandId]);

  const fetchBrandData = async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;
      
      // Parse application_questions from JSON to array
      const parsedCampaigns = (campaignsData || []).map(campaign => ({
        ...campaign,
        application_questions: Array.isArray(campaign.application_questions) ? campaign.application_questions : []
      })) as Campaign[];
      setCampaigns(parsedCampaigns);

      // Fetch bounties
      const { data: bountiesData, error: bountiesError } = await supabase
        .from("bounty_campaigns")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });

      if (bountiesError) throw bountiesError;
      setBounties((bountiesData || []) as BountyCampaign[]);
    } catch (error) {
      console.error("Error fetching brand data:", error);
      toast.error("Failed to load brand data");
    } finally {
      setLoading(false);
    }
  };

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
        const { error } = await supabase.from("campaigns").delete().eq("id", campaignToDelete.id);
        if (error) throw error;
        toast.success("Campaign deleted");
        fetchBrandData();
      } catch (error) {
        toast.error("Failed to delete campaign");
      } finally {
        setDeleteDialogOpen(false);
        setCampaignToDelete(null);
      }
    } else if (bountyToDelete) {
      try {
        const { error } = await supabase.from("bounty_campaigns").delete().eq("id", bountyToDelete.id);
        if (error) throw error;
        toast.success("Bounty deleted");
        fetchBrandData();
      } catch (error) {
        toast.error("Failed to delete bounty");
      } finally {
        setDeleteDialogOpen(false);
        setBountyToDelete(null);
      }
    }
  };

  const handleCampaignClick = (campaign: Campaign) => {
    // Navigate to analytics tab for this campaign
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", "analytics");
    newParams.set("campaign", campaign.id);
    setSearchParams(newParams);
  };

  if (loading) {
    return (
      <div className="space-y-6 px-4 sm:px-6 md:px-8 py-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const totalBudget = campaigns.reduce((sum, c) => sum + Number(c.budget), 0);
  const totalUsed = campaigns.reduce((sum, c) => sum + Number(c.budget_used || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;

  return (
    <div className="space-y-6 px-4 sm:px-6 md:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{brandName}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCampaigns} active campaign{activeCampaigns !== 1 ? 's' : ''} · ${totalUsed.toLocaleString()} / ${totalBudget.toLocaleString()} budget used
          </p>
        </div>
        <CreateCampaignTypeDialog
          onSelectClipping={() => setCreateCampaignOpen(true)}
          onSelectManaged={() => setCreateBountyOpen(true)}
        />
      </div>

      {/* Embed Section */}
      <div className="w-full h-[250px] rounded-xl overflow-hidden">
        <iframe
          src="https://joinvirality.com/pickplan-4"
          className="w-full h-full border-0"
          title="Pick Plan"
        />
      </div>

      {/* Campaigns Grid */}
      {campaigns.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Campaigns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {campaigns.map(campaign => {
              const usedBudget = Number(campaign.budget_used || 0);
              const budgetPercentage = Number(campaign.budget) > 0 
                ? (usedBudget / Number(campaign.budget)) * 100 
                : 0;

              return (
                <Card 
                  key={campaign.id} 
                  className="group bg-card transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
                  onClick={() => handleCampaignClick(campaign)}
                >
                  {campaign.banner_url && (
                    <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                      <OptimizedImage 
                        src={campaign.banner_url} 
                        alt={campaign.title} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                      />
                    </div>
                  )}
                  <CardContent className="p-3 flex-1 flex flex-col gap-2.5 font-instrument tracking-tight bg-[#f8f8f8] dark:bg-[#0e0e0e] group-hover:bg-[#f0f0f0] dark:group-hover:bg-[#141414] transition-colors">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-semibold line-clamp-2 leading-snug flex-1 group-hover:underline">
                        {campaign.title}
                      </h3>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleCampaignClick(campaign)}
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                        </Button>
                        <CreateCampaignDialog 
                          brandId={brandId} 
                          brandName={brandName} 
                          onSuccess={fetchBrandData} 
                          campaign={campaign} 
                          onDelete={() => handleDeleteClick(campaign)} 
                          trigger={
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          } 
                        />
                      </div>
                    </div>

                    {/* Budget Progress */}
                    <div className="rounded-lg p-2.5 space-y-1.5 bg-card border-t border-[#e0e0e0] dark:border-[#262626]">
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5 font-chakra tracking-tight">
                          <span className="text-base font-bold tabular-nums">${usedBudget.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground font-semibold">/ ${Number(campaign.budget).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="relative h-1.5 rounded-full overflow-hidden bg-muted">
                        <div 
                          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700" 
                          style={{ width: `${budgetPercentage}%` }} 
                        />
                      </div>
                      
                      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                        <span>{budgetPercentage.toFixed(0)}% used</span>
                        <span>${Number(campaign.rpm_rate).toFixed(2)} RPM</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Bounties Section */}
      {bounties.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Bounties</h2>
          <BountyCampaignsView 
            bounties={bounties}
            onDelete={handleDeleteBountyClick}
          />
        </div>
      )}

      {/* Empty State */}
      {campaigns.length === 0 && bounties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground mb-4">No campaigns or bounties yet</p>
          <CreateCampaignTypeDialog
            onSelectClipping={() => setCreateCampaignOpen(true)}
            onSelectManaged={() => setCreateBountyOpen(true)}
          />
        </div>
      )}

      {/* Create Campaign Dialog (Clipping) */}
      <CreateCampaignDialog
        brandId={brandId}
        brandName={brandName}
        onSuccess={fetchBrandData}
        open={createCampaignOpen}
        onOpenChange={setCreateCampaignOpen}
      />

      {/* Create Bounty Dialog (Managed) */}
      <CreateBountyDialog
        open={createBountyOpen}
        onOpenChange={setCreateBountyOpen}
        brandId={brandId}
        onSuccess={fetchBrandData}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {campaignToDelete ? 'campaign' : 'bounty'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
