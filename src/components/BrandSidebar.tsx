import { useState, useEffect } from "react";
import { Building2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { NavLink, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Skeleton } from "@/components/ui/skeleton";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export function BrandSidebar() {
  const { slug } = useParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get brands where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('brand_members')
        .select('brand_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      if (memberData && memberData.length > 0) {
        const brandIds = memberData.map(m => m.brand_id);
        
        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('id, name, slug, logo_url')
          .in('id', brandIds)
          .order('name');

        if (brandsError) throw brandsError;
        setBrands(brandsData || []);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const isActive = (brandSlug: string) => slug === brandSlug;

  if (loading) {
    return (
      <aside className={cn(
        "h-screen border-r border-border bg-card flex flex-col sticky top-0 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className="p-4 border-b border-border">
          <Skeleton className="h-5 w-32" />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className={cn(
      "h-screen border-r border-border bg-card flex flex-col sticky top-0 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className={cn(
        "p-4 border-b border-border",
        isCollapsed ? "flex justify-center" : ""
      )}>
        {!isCollapsed && (
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Your Brands
          </h2>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {brands.map((brand) => {
          const active = isActive(brand.slug);
          return (
            <NavLink
              key={brand.id}
              to={`/brand/${brand.slug}`}
              className={cn(
                "flex items-center rounded-md transition-colors font-medium hover:bg-muted/50",
                active ? "bg-muted text-foreground" : "text-muted-foreground",
                isCollapsed ? "justify-center py-3 px-2" : "gap-3 px-3 py-2"
              )}
              title={isCollapsed ? brand.name : undefined}
            >
              {brand.logo_url ? (
                <OptimizedImage
                  src={brand.logo_url}
                  alt={brand.name}
                  className="h-6 w-6 rounded object-cover shrink-0"
                />
              ) : (
                <Building2 className="h-5 w-5 shrink-0" />
              )}
              {!isCollapsed && (
                <span className={cn(
                  "text-sm font-sans tracking-tight truncate",
                  active && "font-semibold"
                )}>
                  {brand.name}
                </span>
              )}
            </NavLink>
          );
        })}

        {brands.length === 0 && !isCollapsed && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No brands yet
          </div>
        )}
      </nav>

      <div className={cn(
        "p-[10px] border-t border-border",
        isCollapsed ? "flex justify-center" : "flex gap-2"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "bg-muted/50 hover:bg-muted",
            isCollapsed ? "h-10 w-10 p-0" : "h-10 w-10 p-0"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
