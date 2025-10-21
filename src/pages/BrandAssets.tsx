import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { RoadmapView } from "@/components/brand/RoadmapView";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";

export default function BrandAssets() {
  const { slug } = useParams();
  const [assetsUrl, setAssetsUrl] = useState<string | null>(null);
  const [brandType, setBrandType] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const sidebar = useSidebar();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchBrand = async () => {
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from("brands")
          .select("id, name, assets_url, brand_type")
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;
        
        setBrandId(data?.id || null);
        setBrandName(data?.name || "");
        setBrandType(data?.brand_type || null);
        
        // For non-DWY brands, use the assets_url
        if (data?.brand_type !== "DWY") {
          setAssetsUrl(data?.assets_url || null);
        }
      } catch (error) {
        console.error("Error fetching brand:", error);
        toast.error("Failed to load assets");
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-[#0C0C0C]">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 bg-[#1a1a1a]" />
          <Skeleton className="h-[calc(100vh-200px)] w-full rounded-lg bg-[#1a1a1a]" />
        </div>
      </div>
    );
  }

  // For DWY brands, show the roadmap
  if (brandType === "DWY" && brandId) {
    return (
      <div className="min-h-screen w-full bg-[#0C0C0C]">
        {/* Header with Menu and Create Campaign */}
        <div className="p-4 flex items-center justify-between">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => sidebar.setOpenMobile(true)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <Menu className="h-6 w-6" />
            </Button>
          )}
          <div className={isMobile ? "" : "ml-auto"}>
            <CreateCampaignDialog brandId={brandId} brandName={brandName} onSuccess={() => {}} />
          </div>
        </div>
        <RoadmapView brandId={brandId} />
      </div>
    );
  }

  // For non-DWY brands, show iframe if URL exists
  if (!assetsUrl) {
    return (
      <div className="min-h-screen p-8 bg-[#0C0C0C] flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-2">No Assets URL Configured</div>
          <div className="text-white/60">
            Configure the assets URL in the Management section
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0C0C0C] flex flex-col">
      {/* Header with Menu and Create Campaign */}
      <div className="p-4 flex items-center justify-between md:justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => sidebar.setOpenMobile(true)}
          className="md:hidden text-white/60 hover:text-white hover:bg-white/10"
        >
          <Menu className="h-6 w-6" />
        </Button>
        {brandId && (
          <CreateCampaignDialog brandId={brandId} brandName={brandName} onSuccess={() => {}} />
        )}
      </div>
      <iframe
        src={assetsUrl}
        className="w-full flex-1 border-0"
        title="Brand Assets"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
