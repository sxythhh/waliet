import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { EditBrandDialog } from "@/components/EditBrandDialog";
import { ManageRoadmapDialog } from "@/components/admin/ManageRoadmapDialog";
import { ExternalLink, Package, Trash2, Calendar, Link as LinkIcon } from "lucide-react";
interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  brand_type: string | null;
  home_url: string | null;
  account_url: string | null;
  assets_url: string | null;
  show_account_tab: boolean;
  is_active: boolean;
  created_at: string;
}
export default function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    checkAuth();
    fetchBrands();
  }, []);
  const checkAuth = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };
  const fetchBrands = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("brands").select("*").order("is_active", {
        ascending: false
      }).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error("Error fetching brands:", error);
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteClick = (brand: Brand) => {
    setBrandToDelete(brand);
    setDeleteDialogOpen(true);
  };
  const handleDeleteConfirm = async () => {
    if (!brandToDelete) return;
    try {
      const {
        error
      } = await supabase.from("brands").delete().eq("id", brandToDelete.id);
      if (error) throw error;
      toast.success("Brand deleted successfully");
      fetchBrands();
    } catch (error) {
      console.error("Error deleting brand:", error);
      toast.error("Failed to delete brand");
    } finally {
      setDeleteDialogOpen(false);
      setBrandToDelete(null);
    }
  };
  const toggleBrandActive = async (brand: Brand) => {
    try {
      const { error } = await supabase
        .from("brands")
        .update({ is_active: !brand.is_active })
        .eq("id", brand.id);
      
      if (error) throw error;
      toast.success(`Brand ${!brand.is_active ? 'activated' : 'deactivated'}`);
      fetchBrands();
    } catch (error) {
      console.error("Error updating brand status:", error);
      toast.error("Failed to update brand status");
    }
  };

  const getBrandTypeBadgeColor = (type: string | null) => {
    switch (type) {
      case "Standard":
        return "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30";
      case "DWY":
        return "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30";
      default:
        return "";
    }
  };
  if (loading) {
    return <div className="p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto p-8 bg-[080808] bg-[#080808] py-[13px]">
          <div className="flex items-center justify-between">
            
            <CreateBrandDialog onSuccess={fetchBrands} />
          </div>
          
          {/* Stats */}
          
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8 py-6">
        {brands.length === 0 ? <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-1">No brands yet</p>
              <p className="text-sm text-muted-foreground">Create your first brand to get started</p>
            </CardContent>
          </Card> : <div className="space-y-3">
            {brands.map(brand => <Card key={brand.id} className="bg-card border-0 hover:bg-muted/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-6">
                    {/* Left: Logo & Main Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {brand.logo_url ? <img src={brand.logo_url} alt={brand.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" /> : <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Package className="h-7 w-7 text-muted-foreground" />
                        </div>}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold truncate">{brand.name}</h3>
                          {brand.brand_type && <Badge className={`${getBrandTypeBadgeColor(brand.brand_type)} text-xs px-2 py-0.5`}>
                              {brand.brand_type}
                            </Badge>}
                        </div>
                        
                        {brand.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {brand.description}
                          </p>}
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <LinkIcon className="h-3.5 w-3.5" />
                            <span className="font-mono">{brand.slug}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{new Date(brand.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          
                          {brand.home_url && <div className="flex items-center gap-1.5">
                              <ExternalLink className="h-3.5 w-3.5" />
                              <a href={brand.home_url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                                Home URL
                              </a>
                            </div>}
                          
                          {brand.account_url && <div className="flex items-center gap-1.5">
                              <ExternalLink className="h-3.5 w-3.5" />
                              <a href={brand.account_url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                                Account URL
                              </a>
                            </div>}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {brand.brand_type === "DWY" && (
                        <ManageRoadmapDialog brandId={brand.id} brandName={brand.name} />
                      )}
                      <Button 
                        size="sm" 
                        variant={brand.is_active ? "outline" : "default"}
                        onClick={() => toggleBrandActive(brand)}
                        className="h-9 px-3"
                      >
                        {brand.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <EditBrandDialog brand={brand} onSuccess={fetchBrands} />
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => window.open(`/brand/${brand.slug}`, '_blank')} 
                        className="h-9 w-9 p-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDeleteClick(brand)}
                        className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>)}
          </div>}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{brandToDelete?.name}</strong> and all
              associated campaigns. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}