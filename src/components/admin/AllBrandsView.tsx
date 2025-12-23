import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface Brand {
  id: string;
  name: string;
  slug: string;
  brand_type: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  renewal_date: string | null;
  logo_url: string | null;
  description: string | null;
  home_url: string | null;
  account_url: string | null;
  assets_url: string | null;
  show_account_tab: boolean;
}

export function AllBrandsView() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px]">
        <div className="col-span-4">Brand</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Created</div>
        <div className="col-span-2">Renewal</div>
      </div>

      {/* Rows */}
      {brands.map((brand) => (
        <div
          key={brand.id}
          className="grid grid-cols-12 gap-4 px-4 py-3 bg-card/50 rounded-lg hover:bg-card/80 cursor-pointer transition-colors items-center"
        >
          <div className="col-span-4 flex items-center gap-3 min-w-0">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={brand.logo_url || ''} alt={brand.name} />
              <AvatarFallback className="text-xs bg-muted font-inter tracking-[-0.5px]">
                {brand.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm font-inter tracking-[-0.5px] truncate">
              {brand.name}
            </span>
          </div>

          <div className="col-span-2">
            {brand.brand_type ? (
              <span className="text-xs font-inter tracking-[-0.5px] text-muted-foreground capitalize">
                {brand.brand_type}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground/50">—</span>
            )}
          </div>

          <div className="col-span-2">
            <Badge 
              variant="outline" 
              className={`text-xs font-inter tracking-[-0.5px] border-0 ${
                brand.is_active 
                  ? "bg-emerald-500/10 text-emerald-500" 
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {brand.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="col-span-2">
            <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
              {format(new Date(brand.created_at), 'MMM dd, yyyy')}
            </span>
          </div>

          <div className="col-span-2">
            <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
              {brand.renewal_date
                ? format(new Date(brand.renewal_date), 'MMM dd, yyyy')
                : "—"}
            </span>
          </div>
        </div>
      ))}

      {brands.length === 0 && (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground font-inter tracking-[-0.5px]">
          No brands found
        </div>
      )}
    </div>
  );
}
