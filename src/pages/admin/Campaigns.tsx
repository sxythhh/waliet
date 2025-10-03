import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Search, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  description: string;
  budget: number;
  budget_used: number;
  rpm_rate: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  preview_url: string | null;
}
export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    brand_name: "",
    description: "",
    budget: "",
    budget_used: "",
    rpm_rate: "",
    status: "active",
    preview_url: ""
  });
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
      setCampaigns(data || []);
      setFilteredCampaigns(data || []);
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
    setEditForm({
      title: campaign.title,
      brand_name: campaign.brand_name,
      description: campaign.description || "",
      budget: campaign.budget.toString(),
      budget_used: (campaign.budget_used || 0).toString(),
      rpm_rate: campaign.rpm_rate.toString(),
      status: campaign.status,
      preview_url: campaign.preview_url || ""
    });
    setEditDialogOpen(true);
  };
  const handleUpdateCampaign = async () => {
    if (!selectedCampaign) return;
    const {
      error
    } = await supabase.from("campaigns").update({
      title: editForm.title,
      brand_name: editForm.brand_name,
      description: editForm.description,
      budget: parseFloat(editForm.budget),
      budget_used: parseFloat(editForm.budget_used),
      rpm_rate: parseFloat(editForm.rpm_rate),
      status: editForm.status,
      preview_url: editForm.preview_url || null
    }).eq("id", selectedCampaign.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update campaign"
      });
    } else {
      toast({
        title: "Success",
        description: "Campaign updated successfully"
      });
      setEditDialogOpen(false);
      fetchCampaigns();
    }
  };
  const openDeleteDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDeleteDialogOpen(true);
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
      setDeleteDialogOpen(false);
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
            {filteredCampaigns.map(campaign => <Card key={campaign.id} className="group bg-card transition-all duration-300 animate-fade-in flex flex-col overflow-hidden border hover:border-primary/50 cursor-pointer" onClick={() => openEditDialog(campaign)}>
                {/* Content Section */}
                <CardContent className="p-3 flex-1 flex flex-col gap-2.5 font-instrument tracking-tight">
                  {/* Title + Brand */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold line-clamp-2 leading-snug mb-0.5">
                      {campaign.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{campaign.brand_name}</p>
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
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(campaign.start_date), 'MMM d')} - {format(new Date(campaign.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto pt-2 flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1 h-8 text-[11px] font-instrument tracking-tight hover:bg-muted/50" onClick={e => {
                e.stopPropagation();
                openEditDialog(campaign);
              }}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 h-8 text-[11px] font-instrument tracking-tight hover:bg-destructive/10 hover:text-destructive" onClick={e => {
                e.stopPropagation();
                openDeleteDialog(campaign);
              }}>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>)}
          </div>}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-0">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Edit Campaign</DialogTitle>
            <DialogDescription className="text-xs">Update campaign details</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs">Title *</Label>
                <Input id="title" className="h-9 text-sm" value={editForm.title} onChange={e => setEditForm({
              ...editForm,
              title: e.target.value
            })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brand" className="text-xs">Brand Name *</Label>
                <Input id="brand" className="h-9 text-sm" value={editForm.brand_name} onChange={e => setEditForm({
              ...editForm,
              brand_name: e.target.value
            })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Textarea id="description" className="text-sm min-h-[60px]" value={editForm.description} onChange={e => setEditForm({
              ...editForm,
              description: e.target.value
            })} rows={2} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="budget" className="text-xs">Total Budget *</Label>
                <Input id="budget" type="number" step="0.01" className="h-9 text-sm" value={editForm.budget} onChange={e => setEditForm({
                ...editForm,
                budget: e.target.value
              })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budget_used" className="text-xs">Used Budget *</Label>
                <Input id="budget_used" type="number" step="0.01" className="h-9 text-sm" value={editForm.budget_used} onChange={e => setEditForm({
                ...editForm,
                budget_used: e.target.value
              })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rpm" className="text-xs">RPM Rate *</Label>
                <Input id="rpm" type="number" step="0.01" className="h-9 text-sm" value={editForm.rpm_rate} onChange={e => setEditForm({
                ...editForm,
                rpm_rate: e.target.value
              })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs">Status *</Label>
              <select id="status" value={editForm.status} onChange={e => setEditForm({
              ...editForm,
              status: e.target.value
            })} className="w-full h-9 px-3 rounded-md border border-input bg-muted/50 text-sm">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="preview_url" className="text-xs">Preview URL</Label>
              <Input id="preview_url" type="url" placeholder="https://..." className="h-9 text-sm" value={editForm.preview_url} onChange={e => setEditForm({
              ...editForm,
              preview_url: e.target.value
            })} />
              <p className="text-[10px] text-muted-foreground">URL to embed for non-members viewing this campaign</p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdateCampaign}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCampaign?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}