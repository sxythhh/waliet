import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Search, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
    preview_url: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [searchQuery, campaigns]);

  const fetchCampaigns = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch campaigns",
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

    const filtered = campaigns.filter(
      (campaign) =>
        campaign.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.brand_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
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
      preview_url: campaign.preview_url || "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateCampaign = async () => {
    if (!selectedCampaign) return;

    const { error } = await supabase
      .from("campaigns")
      .update({
        title: editForm.title,
        brand_name: editForm.brand_name,
        description: editForm.description,
        budget: parseFloat(editForm.budget),
        budget_used: parseFloat(editForm.budget_used),
        rpm_rate: parseFloat(editForm.rpm_rate),
        status: editForm.status,
        preview_url: editForm.preview_url || null,
      })
      .eq("id", selectedCampaign.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update campaign",
      });
    } else {
      toast({
        title: "Success",
        description: "Campaign updated successfully",
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

    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", selectedCampaign.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete campaign",
      });
    } else {
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
      setDeleteDialogOpen(false);
      fetchCampaigns();
    }
  };

  const stats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter((c) => c.status === "active").length,
    totalBudget: campaigns.reduce((sum, c) => sum + Number(c.budget), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 p-8 space-y-6">
        <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaign Management</h1>
        <p className="text-muted-foreground mt-1">View and manage all campaigns</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Campaigns</p>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Active Campaigns</p>
              <Calendar className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold">{stats.activeCampaigns}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold">${stats.totalBudget.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-card border-0">
        <CardContent className="pt-6">
          <Label htmlFor="search">Search Campaigns</Label>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by title or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card className="bg-card border-0">
        <CardHeader>
          <CardTitle>Campaigns ({filteredCampaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">RPM Rate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No campaigns found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.title}</TableCell>
                    <TableCell>{campaign.brand_name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={campaign.status === "active" ? "default" : "secondary"}
                      >
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(campaign.budget).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(campaign.rpm_rate).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(campaign)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteDialog(campaign)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>Update campaign details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand Name *</Label>
              <Input
                id="brand"
                value={editForm.brand_name}
                onChange={(e) => setEditForm({ ...editForm, brand_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Total Budget (USD) *</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={editForm.budget}
                  onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget_used">Used Budget (USD) *</Label>
                <Input
                  id="budget_used"
                  type="number"
                  step="0.01"
                  value={editForm.budget_used}
                  onChange={(e) => setEditForm({ ...editForm, budget_used: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rpm">RPM Rate (USD) *</Label>
                <Input
                  id="rpm"
                  type="number"
                  step="0.01"
                  value={editForm.rpm_rate}
                  onChange={(e) => setEditForm({ ...editForm, rpm_rate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preview_url">Preview URL</Label>
              <Input
                id="preview_url"
                type="url"
                placeholder="https://..."
                value={editForm.preview_url}
                onChange={(e) => setEditForm({ ...editForm, preview_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">URL to embed for non-members viewing this campaign</p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateCampaign}>
                Save Changes
              </Button>
            </div>
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
      </main>
    </div>
  );
}
