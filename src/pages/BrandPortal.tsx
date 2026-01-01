import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { BrandPortalSidebar } from "@/components/portal/BrandPortalSidebar";
import { BrandPortalMobileNav } from "@/components/portal/BrandPortalMobileNav";
import { BrandPortalCampaigns } from "@/components/portal/BrandPortalCampaigns";
import { BrandPortalEarnings } from "@/components/portal/BrandPortalEarnings";
import { BrandPortalSubmissions } from "@/components/portal/BrandPortalSubmissions";
import { BrandPortalProfile } from "@/components/portal/BrandPortalProfile";
import { BrandPortalHome } from "@/components/portal/BrandPortalHome";
import { BrandPortalWallet } from "@/components/portal/BrandPortalWallet";
import { BrandPortalMessages } from "@/components/portal/BrandPortalMessages";
import { BrandPortalResources } from "@/components/portal/BrandPortalResources";
import { BrandPortalSettings } from "@/components/portal/BrandPortalSettings";
import { Skeleton } from "@/components/ui/skeleton";

interface PortalSettings {
  welcome_message?: string;
  show_earnings_chart?: boolean;
  show_announcements?: boolean;
  accent_color_dark?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  description: string | null;
  portal_settings?: PortalSettings | null;
}

export default function BrandPortal() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { resolvedTheme } = useTheme();

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

      setBrand(data as Brand);
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

  // Dynamic favicon - set to brand logo on brand portal
  useEffect(() => {
    if (!brand?.logo_url) return;

    // Store the original favicon href to restore later
    const originalFavicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    const originalHref = originalFavicon?.href || '/favicon.ico';

    // Update or create the favicon link
    let faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (faviconLink) {
      faviconLink.href = brand.logo_url;
    } else {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      faviconLink.href = brand.logo_url;
      document.head.appendChild(faviconLink);
    }

    // Also update apple-touch-icon if exists
    const appleTouchIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    const originalAppleIcon = appleTouchIcon?.href;
    if (appleTouchIcon) {
      appleTouchIcon.href = brand.logo_url;
    }

    // Cleanup: restore original favicon on unmount
    return () => {
      const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (link) {
        link.href = originalHref;
      }
      if (appleTouchIcon && originalAppleIcon) {
        appleTouchIcon.href = originalAppleIcon;
      }
    };
  }, [brand?.logo_url]);

  // Compute accent color based on theme
  const accentColor = resolvedTheme === 'dark'
    ? (brand?.portal_settings?.accent_color_dark || brand?.brand_color || '#4B7BF5')
    : (brand?.brand_color || '#2061de');

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen bg-white dark:bg-background">
        {/* Desktop Sidebar Skeleton */}
        <div className="hidden md:block w-64 border-r border-gray-200 dark:border-border p-4">
          <Skeleton className="h-10 w-full mb-6" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6 md:p-8 pb-24 md:pb-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full mt-6 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-background">
        <div className="text-center px-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-2">
            {error || "Brand not found"}
          </h1>
          <p className="text-gray-500 dark:text-muted-foreground mb-4">
            The brand portal you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    const userId = session?.user.id || "";
    switch (currentTab) {
      case "home":
        return <BrandPortalHome brand={brand} userId={userId} />;
      case "campaigns":
        return <BrandPortalCampaigns brand={brand} userId={userId} />;
      case "earnings":
        return <BrandPortalEarnings brand={brand} userId={userId} />;
      case "submissions":
        return <BrandPortalSubmissions brand={brand} userId={userId} />;
      case "wallet":
        return <BrandPortalWallet brand={brand} userId={userId} />;
      case "messages":
        return <BrandPortalMessages brand={brand} userId={userId} />;
      case "resources":
        return <BrandPortalResources brand={brand} userId={userId} />;
      case "settings":
        return <BrandPortalSettings brand={brand} userId={userId} />;
      case "profile":
        return <BrandPortalProfile brand={brand} userId={userId} />;
      default:
        return <BrandPortalHome brand={brand} userId={userId} />;
    }
  };

  return (
    <div
      className="flex min-h-screen bg-[#fafafa] dark:bg-background"
      style={{
        '--portal-accent': accentColor,
      } as React.CSSProperties}
    >
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <BrandPortalSidebar brand={brand} currentTab={currentTab} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="p-4 md:p-6 lg:p-8">
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <BrandPortalMobileNav brand={brand} currentTab={currentTab} />
      </div>
    </div>
  );
}
