import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
import { useAuth } from "@/contexts/AuthContext";

export default function BrandAssets() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [assetsUrl, setAssetsUrl] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrand = async () => {
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from("brands")
          .select("id, name, assets_url")
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;
        
        setBrandId(data?.id || null);
        setBrandName(data?.name || "");
        setAssetsUrl(data?.assets_url || null);
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
      {/* Header with Create Campaign - only show for authenticated users */}
      {user && brandId && (
        <div className="p-4 flex items-center justify-end">
          <CreateCampaignDialog brandId={brandId} brandName={brandName} onSuccess={() => {}} />
        </div>
      )}
      <iframe
        src={assetsUrl}
        className="w-full flex-1 border-0"
        title="Brand Assets"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
