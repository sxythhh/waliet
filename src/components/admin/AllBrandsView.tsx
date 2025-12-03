import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesDealSheet } from "@/components/admin/SalesDealSheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

type SalesStage = 'lead' | 'qualified' | 'negotiation' | 'won';


interface Brand {
  id: string;
  name: string;
  slug: string;
  brand_type: string | null;
  is_active: boolean;
  created_at: string;
  renewal_date: string | null;
  logo_url: string | null;
  description: string | null;
  home_url: string | null;
  account_url: string | null;
  assets_url: string | null;
  show_account_tab: boolean;
}

interface SalesDeal {
  id: string;
  brand_id: string;
  stage: SalesStage;
  deal_value: number | null;
  probability: number | null;
  close_date: string | null;
  next_payment_date: string | null;
  payment_amount: number | null;
  notes: string | null;
  won_date: string | null;
  lost_reason: string | null;
  brands: Brand;
}

export function AllBrandsView() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<SalesDeal | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandClick = async (brand: Brand) => {
    try {
      // Fetch the sales deal for this brand
      const { data: dealData, error } = await supabase
        .from('sales_deals')
        .select('*')
        .eq('brand_id', brand.id)
        .maybeSingle();

      if (error) throw error;

      // If no deal exists, create one in lead stage
      if (!dealData) {
        const { data: newDeal, error: createError } = await supabase
          .from('sales_deals')
          .insert([{
            brand_id: brand.id,
            stage: 'lead' as SalesStage,
          }])
          .select()
          .single();

        if (createError) throw createError;

        setSelectedDeal({
          ...newDeal,
          brands: brand
        });
      } else {
        setSelectedDeal({
          ...dealData,
          brands: brand
        });
      }

      setSheetOpen(true);
    } catch (error) {
      console.error('Error fetching deal:', error);
      toast.error("Failed to load brand details");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Renewal Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell 
                  className="cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleBrandClick(brand)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={brand.logo_url || ''} alt={brand.name} />
                      <AvatarFallback className="text-xs bg-muted">
                        {brand.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{brand.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {brand.brand_type && (
                    <Badge variant="outline" className="capitalize">
                      {brand.brand_type}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={brand.is_active ? "default" : "secondary"}>
                    {brand.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(brand.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {brand.renewal_date
                    ? new Date(brand.renewal_date).toLocaleDateString()
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
            {brands.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No brands found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SalesDealSheet
        deal={selectedDeal}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={fetchBrands}
      />
    </>
  );
}
