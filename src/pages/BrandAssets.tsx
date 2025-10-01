import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BrandAssets() {
  const { slug } = useParams();
  const [assetsUrl, setAssetsUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrand = async () => {
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from("brands")
          .select("assets_url")
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;
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
      <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-white">Loading...</div>
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
    <div className="h-screen w-full bg-[#191919]">
      <iframe
        src={assetsUrl}
        className="w-full h-full border-0"
        title="Brand Assets"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
