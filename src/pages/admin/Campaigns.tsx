import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Search, TrendingUp, Calendar, DollarSign, Copy, Package } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
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
export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchCampaigns();
  }, []);
  useEffect(() => {
    filterCampaigns();
  }, [searchQuery, campaigns]);
  const fetchCampaigns = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("campaigns").select("*").order("created_at", {
      ascending: false
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch campaigns"
      });
    } else {
      // Parse application_questions from JSON to array
      const parsedCampaigns = (data || []).map(campaign => ({
        ...campaign,
        application_questions: Array.isArray(campaign.application_questions) 
          ? campaign.application_questions 
          : []
      })) as Campaign[];
      
      setCampaigns(parsedCampaigns);
      setFilteredCampaigns(parsedCampaigns);
    }
    setLoading(false);
  };
  const filterCampaigns = () => {
    if (!searchQuery) {
      setFilteredCampaigns(campaigns);
      return;
    }
    const filtered = campaigns.filter(campaign => campaign.title?.toLowerCase().includes(searchQuery.toLowerCase()) || campaign.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    setFilteredCampaigns(filtered);
  };
  const openEditDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setEditDialogOpen(true);
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
  if (loading) {
    return <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading campaigns...</p>
      </div>;
  }
  return <div className="p-8 space-y-6 px-[27px] py-0">
      

      {/* Stats */}
      

      {/* Search */}
      <Card className="bg-card border-0">
        
      </Card>

      {/* Campaigns Gallery */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Campaigns ({filteredCampaigns.length})</h2>
        {filteredCampaigns.length === 0 ? <Card className="bg-card border-0">
            <CardContent className="py-12 text-center text-muted-foreground">
              No campaigns found
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
    </div>;
}