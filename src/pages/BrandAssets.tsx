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
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, ArrowRight } from "lucide-react";

export default function BrandAssets() {
  const { slug } = useParams();
  const [assetsUrl, setAssetsUrl] = useState<string | null>(null);
  const [brandType, setBrandType] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const sidebar = useSidebar();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchBrand = async () => {
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from("brands")
          .select("id, assets_url, brand_type")
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;
        
        setBrandId(data?.id || null);
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
        {/* Mobile Menu Button */}
        {isMobile && (
          <div className="p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => sidebar.setOpenMobile(true)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        )}
        <RoadmapView brandId={brandId} />
      </div>
    );
  }

  // For non-DWY brands, show iframe if URL exists
  if (!assetsUrl) {
    return (
      <div className="min-h-screen p-8 bg-[#0C0C0C] flex items-center justify-center">
        <Card className="max-w-2xl w-full bg-gradient-to-br from-card/50 to-card/30 border-primary/20 backdrop-blur-sm">
          <CardContent className="p-8 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-foreground">Book a Call</h2>
              <p className="text-muted-foreground text-lg">
                Schedule a meeting with the Virality team to discuss your campaign strategy
              </p>
            </div>

            <div className="pt-4">
              <Button 
                size="lg" 
                className="group"
                onClick={() => window.open('https://partners.virality.cc/book', '_blank')}
              >
                Schedule Your Call
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground/60 pt-4">
              No assets URL configured yet. Configure it in the Management section.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0C0C0C] flex flex-col">
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
