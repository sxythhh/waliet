import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Brand {
  id: string;
  name: string;
  slug: string;
  brand_type: string | null;
  is_active: boolean;
  created_at: string;
  renewal_date: string | null;
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
        .select('id, name, slug, brand_type, is_active, created_at, renewal_date')
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
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Brand Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Renewal Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.map((brand) => (
            <TableRow key={brand.id}>
              <TableCell className="font-medium">{brand.name}</TableCell>
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
  );
}
