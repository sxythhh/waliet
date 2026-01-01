import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import {
  CheckCircle2,
  Building2,
  Sparkles,
  Clock,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Users,
  DollarSign,
  Wallet
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
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "new",
    label: "New",
    icon: <Sparkles className="w-4 h-4" />,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
    glowColor: "shadow-violet-500/20"
  },
  {
    id: "active",
    label: "Active",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    glowColor: "shadow-emerald-500/20"
  },
  {
    id: "past_due",
    label: "Past Due",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    glowColor: "shadow-amber-500/20"
  },
  {
    id: "cancelled",
    label: "Cancelled",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
    glowColor: "shadow-rose-500/20"
  },
  {
    id: "inactive",
    label: "Inactive",
    icon: <Clock className="w-4 h-4" />,
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/20",
    glowColor: "shadow-slate-500/20"
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
    setSelectedBrand(brand);
    setSheetOpen(true);
  };

  const getBrandsByStage = (stageId: string) => {
    return brands.filter(brand => getStageForBrand(brand) === stageId);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {PIPELINE_STAGES.map((stage) => (
          <div key={stage.id} className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
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
      {/* Pipeline Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card/50 border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{brands.length}</p>
              <p className="text-xs text-muted-foreground">Total Brands</p>
            </div>
          </div>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{getBrandsByStage("active").length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{getBrandsByStage("new").length}</p>
              <p className="text-xs text-muted-foreground">New This Week</p>
            </div>
          </div>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{getBrandsByStage("past_due").length}</p>
              <p className="text-xs text-muted-foreground">Needs Attention</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-h-[500px]">
        {PIPELINE_STAGES.map((stage) => {
          const stageBrands = getBrandsByStage(stage.id);
          return (
            <div key={stage.id} className="flex flex-col">
              {/* Column Header */}
              <div className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-xl mb-3 border",
                stage.bgColor,
                stage.borderColor
              )}>
                <div className="flex items-center gap-2">
                  <span className={stage.color}>{stage.icon}</span>
                  <span className="font-medium text-sm">{stage.label}</span>
                </div>
                <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">
                  {stageBrands.length}
                </Badge>
              </div>

              {/* Column Content */}
              <div className={cn(
                "flex-1 rounded-xl border-2 border-dashed p-2 space-y-2 transition-colors",
                stage.borderColor,
                "hover:border-opacity-50"
              )}>
                {stageBrands.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                    No brands
                  </div>
                ) : (
                  stageBrands.map((brand, index) => (
                    <BrandCard
                      key={brand.id}
                      brand={brand}
                      stage={stage}
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
  stage: PipelineStage;
  index: number;
  onClick: () => void;
}

function BrandCard({ brand, stage, index, onClick }: BrandCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-3 rounded-xl border cursor-pointer transition-all duration-200",
        "bg-card hover:bg-card/80 border-border/50 hover:border-border",
        "hover:shadow-lg",
        stage.glowColor
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        animation: 'fadeInUp 0.3s ease-out forwards',
      }}
    >
      {/* Accent dot */}
      <div className={cn(
        "absolute top-3 right-3 w-2 h-2 rounded-full",
        stage.id === "active" && "bg-emerald-500 animate-pulse",
        stage.id === "new" && "bg-violet-500",
        stage.id === "past_due" && "bg-amber-500",
        stage.id === "cancelled" && "bg-rose-500",
        stage.id === "inactive" && "bg-slate-400"
      )} />

      <div className="flex items-start gap-3">
        {/* Logo */}
        <Avatar className={cn(
          "h-10 w-10 rounded-lg border transition-all duration-200",
          stage.borderColor,
          "group-hover:scale-105"
        )}>
          <AvatarImage src={brand.logo_url || ''} alt={brand.name} className="object-cover" />
          <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 text-xs font-semibold">
            {brand.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="font-medium text-sm truncate">{brand.name}</h4>
            {brand.is_verified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {brand.brand_type || format(new Date(brand.created_at), 'MMM dd, yyyy')}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      {brand.subscription_plan && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <Badge variant="outline" className="text-[10px] h-5 capitalize">
            {brand.subscription_plan}
          </Badge>
        </div>
      )}
    </div>
  );
}
