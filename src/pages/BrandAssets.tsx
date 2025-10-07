import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";

export default function BrandAssets() {
  const { slug } = useParams();
  const [assetsUrl, setAssetsUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const sidebar = useSidebar();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchBrand = async () => {
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from("brands")
          .select("assets_url, brand_type")
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;
        
        // If DWY brand has no assets_url, use default
        const url = data?.assets_url || 
          (data?.brand_type === "DWY" ? "https://partners.virality.cc/template/assets" : null);
        
        setAssetsUrl(url);
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
      <div className="min-h-screen p-8 bg-[#191919]">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[calc(100vh-200px)] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!assetsUrl) {
    return (
      <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
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
    <div className="h-screen w-full bg-[#191919] flex flex-col">
      {/* Mobile Menu Button */}
      <div className="md:hidden p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => sidebar.setOpenMobile(true)}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <Menu className="h-6 w-6" />
        </Button>
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
