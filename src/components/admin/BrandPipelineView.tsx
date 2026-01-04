import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import {
  CheckCircle2,
  Building2,
  Sparkles,
  Clock,
  AlertTriangle,
  XCircle,
  Users,
  DollarSign,
  Wallet,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandContextSheet } from "./BrandContextSheet";

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
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
}

interface PipelineStage {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "new",
    label: "New",
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    id: "active",
    label: "Active",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  {
    id: "past_due",
    label: "Past Due",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  {
    id: "cancelled",
    label: "Cancelled",
    icon: <XCircle className="w-4 h-4" />,
  },
  {
    id: "inactive",
    label: "Inactive",
    icon: <Clock className="w-4 h-4" />,
  },
];

function getStageForBrand(brand: Brand): string {
  if (!brand.subscription_status || brand.subscription_status === "inactive") {
    // Check if it's a new brand (created within last 7 days with no subscription)
    const createdDate = new Date(brand.created_at);
    const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 7 && !brand.subscription_status) {
      return "new";
    }
    return "inactive";
  }
  return brand.subscription_status;
}

export function BrandPipelineView() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select(`
          id,
          name,
          slug,
          brand_type,
          is_active,
          is_verified,
          created_at,
          renewal_date,
          logo_url,
          description,
          home_url,
          account_url,
          assets_url,
          show_account_tab,
          subscription_status,
          subscription_plan,
          subscription_expires_at
        `)
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
    setSelectedBrand(brand);
    setSheetOpen(true);
  };

  const getBrandsByStage = (stageId: string) => {
    return brands.filter(brand => getStageForBrand(brand) === stageId);
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
    <>
      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-h-[500px]">
        {PIPELINE_STAGES.map((stage) => {
          const stageBrands = getBrandsByStage(stage.id);
          return (
            <div key={stage.id} className="flex flex-col">
              {/* Column Header */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-3 border border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{stage.icon}</span>
                  <span className="font-medium text-sm">{stage.label}</span>
                </div>
                <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">
                  {stageBrands.length}
                </Badge>
              </div>

              {/* Column Content */}
              <div className="flex-1 rounded-xl border-2 border-dashed border-border p-2 space-y-2 transition-colors hover:border-muted-foreground/30">
                {stageBrands.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                    No brands
                  </div>
                ) : (
                  stageBrands.map((brand, index) => (
                    <BrandCard
                      key={brand.id}
                      brand={brand}
                      index={index}
                      onClick={() => handleBrandClick(brand)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Brand Context Sheet */}
      <BrandContextSheet
        brand={selectedBrand}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onBrandUpdated={fetchBrands}
      />

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

interface BrandCardProps {
  brand: Brand;
  index: number;
  onClick: () => void;
}

function BrandCard({ brand, index, onClick }: BrandCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative p-3 rounded-xl border cursor-pointer transition-all duration-200 bg-card hover:bg-muted/50 border-border"
      style={{
        animationDelay: `${index * 50}ms`,
        animation: 'fadeInUp 0.3s ease-out forwards',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Logo */}
        <Avatar className="h-10 w-10 rounded-lg border border-border transition-all duration-200 group-hover:scale-105">
          <AvatarImage src={brand.logo_url || ''} alt={brand.name} className="object-cover" />
          <AvatarFallback className="rounded-lg bg-muted text-xs font-semibold">
            {brand.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="font-medium text-sm truncate">{brand.name}</h4>
            {brand.is_verified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {brand.brand_type || format(new Date(brand.created_at), 'MMM dd, yyyy')}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      {brand.subscription_plan && (
        <div className="mt-2 pt-2 border-t border-border">
          <Badge variant="outline" className="text-[10px] h-5 capitalize">
            {brand.subscription_plan}
          </Badge>
        </div>
      )}
    </div>
  );
}
