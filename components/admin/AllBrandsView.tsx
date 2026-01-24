import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import {
  ChevronRight,
  Calendar,
  Globe,
  CheckCircle2,
  XCircle,
  Building2,
  ExternalLink,
  MoreHorizontal,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const handleBrandClick = (brand: Brand) => {
    navigate(`/brand/${brand.slug}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No brands yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first brand to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {brands.map((brand, index) => (
        <div
          key={brand.id}
          onClick={() => handleBrandClick(brand)}
          onMouseEnter={() => setHoveredId(brand.id)}
          onMouseLeave={() => setHoveredId(null)}
          className={cn(
            "group relative p-4 rounded-xl border cursor-pointer transition-all duration-300",
            "bg-card/50 hover:bg-card border-border/50 hover:border-border",
            "hover:shadow-lg hover:shadow-primary/5",
            hoveredId === brand.id && "scale-[1.01]"
          )}
          style={{
            animationDelay: `${index * 50}ms`,
            animation: 'fadeInUp 0.4s ease-out forwards',
          }}
        >
          {/* Gradient accent line */}
          <div className={cn(
            "absolute left-0 top-4 bottom-4 w-1 rounded-full transition-all duration-300",
            brand.is_active 
              ? "bg-gradient-to-b from-emerald-500 to-emerald-500/50" 
              : "bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10"
          )} />

          <div className="flex items-center gap-4 pl-4">
            {/* Logo */}
            <div className="relative">
              <Avatar className={cn(
                "h-12 w-12 rounded-xl border-2 transition-all duration-300",
                brand.is_active ? "border-emerald-500/20" : "border-border"
              )}>
                <AvatarImage src={brand.logo_url || ''} alt={brand.name} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-sm font-semibold">
                  {brand.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {brand.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </div>
              )}
            </div>

            {/* Brand Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{brand.name}</h3>
                {brand.brand_type && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium capitalize">
                    {brand.brand_type}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(brand.created_at), 'MMM dd, yyyy')}
                </span>
                {brand.home_url && (() => {
                  try {
                    return (
                      <span className="flex items-center gap-1 truncate max-w-[150px]">
                        <Globe className="w-3 h-3 shrink-0" />
                        {new URL(brand.home_url).hostname.replace('www.', '')}
                      </span>
                    );
                  } catch {
                    return null;
                  }
                })()}
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center gap-3">
              {/* Renewal Badge */}
              {brand.renewal_date && (
                <div className="hidden sm:flex flex-col items-end text-xs">
                  <span className="text-muted-foreground">Renews</span>
                  <span className="font-medium">{format(new Date(brand.renewal_date), 'MMM dd')}</span>
                </div>
              )}

              {/* Status */}
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs font-medium border-0 gap-1",
                  brand.is_active 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "bg-muted text-muted-foreground"
                )}
              >
                {brand.is_active ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" />
                    Inactive
                  </>
                )}
              </Badge>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/brand/${brand.slug}`);
                  }}>
                    <Building2 className="w-4 h-4 mr-2" />
                    View Dashboard
                  </DropdownMenuItem>
                  {brand.home_url && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      window.open(brand.home_url!, '_blank');
                    }}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visit Website
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Arrow */}
              <ChevronRight className={cn(
                "w-4 h-4 text-muted-foreground transition-all duration-300",
                hoveredId === brand.id && "translate-x-1 text-foreground"
              )} />
            </div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
