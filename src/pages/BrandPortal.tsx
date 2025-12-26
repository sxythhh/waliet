import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BrandPortalSidebar } from "@/components/portal/BrandPortalSidebar";
import { BrandPortalCampaigns } from "@/components/portal/BrandPortalCampaigns";
import { BrandPortalEarnings } from "@/components/portal/BrandPortalEarnings";
import { BrandPortalSubmissions } from "@/components/portal/BrandPortalSubmissions";
import { BrandPortalProfile } from "@/components/portal/BrandPortalProfile";
import { BrandPortalHome } from "@/components/portal/BrandPortalHome";
import { Skeleton } from "@/components/ui/skeleton";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  description: string | null;
}

export default function BrandPortal() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const currentTab = searchParams.get("tab") || "home";

  // Fetch brand data
  useEffect(() => {
    const fetchBrand = async () => {
      if (!slug) {
        setError("No brand specified");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("brands")
        .select("id, name, slug, logo_url, brand_color, description")
        .eq("slug", slug)
        .maybeSingle();

      if (fetchError) {
        setError("Failed to load brand");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Brand not found");
        setLoading(false);
        return;
      }

      setBrand(data);
      setLoading(false);
    };

    fetchBrand();
  }, [slug]);

  // Auth gate - redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !session) {
      navigate(`/auth?redirect=/portal/${slug}`, { replace: true });
    }
  }, [authLoading, session, navigate, slug]);

  // Apply brand color as CSS variable
  useEffect(() => {
    if (brand?.brand_color) {
      document.documentElement.style.setProperty('--brand-accent', brand.brand_color);
    }
    return () => {
      document.documentElement.style.removeProperty('--brand-accent');
    };
  }, [brand?.brand_color]);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen bg-white">
        <div className="w-64 border-r border-gray-200 p-4">
          <Skeleton className="h-10 w-full mb-6" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {error || "Brand not found"}
          </h1>
          <p className="text-gray-500 mb-4">
            The brand portal you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentTab) {
      case "home":
        return <BrandPortalHome brand={brand} userId={session?.user.id || ""} />;
      case "campaigns":
        return <BrandPortalCampaigns brand={brand} userId={session?.user.id || ""} />;
      case "earnings":
        return <BrandPortalEarnings brand={brand} userId={session?.user.id || ""} />;
      case "submissions":
        return <BrandPortalSubmissions brand={brand} userId={session?.user.id || ""} />;
      case "profile":
        return <BrandPortalProfile brand={brand} userId={session?.user.id || ""} />;
      default:
        return <BrandPortalHome brand={brand} userId={session?.user.id || ""} />;
    }
  };

  return (
    <div 
      className="flex min-h-screen bg-[#fafafa]"
      style={{
        '--portal-accent': brand.brand_color || '#2061de',
      } as React.CSSProperties}
    >
      <BrandPortalSidebar brand={brand} currentTab={currentTab} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
