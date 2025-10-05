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
import { ExternalLink, Package, Trash2 } from "lucide-react";
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
      } = await supabase.from("brands").select("*").order("created_at", {
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
      <div className="max-w-7xl mx-auto p-8 py-0">
        {brands.length === 0 ? <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-1">No brands yet</p>
              <p className="text-sm text-muted-foreground">Create your first brand to get started</p>
            </CardContent>
          </Card> : <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map(brand => <TableRow key={brand.id}>
                    <TableCell>
                      {brand.logo_url ? <img src={brand.logo_url} alt={brand.name} className="w-10 h-10 rounded-lg object-cover border" /> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>}
                    </TableCell>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>
                      {brand.brand_type ? <Badge className={`${getBrandTypeBadgeColor(brand.brand_type)} rounded`}>
                          {brand.brand_type}
                        </Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{brand.slug}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <EditBrandDialog brand={brand} onSuccess={fetchBrands} />
                        <Button size="sm" variant="outline" onClick={() => window.open(`/brand/${brand.slug}`, '_blank')}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
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