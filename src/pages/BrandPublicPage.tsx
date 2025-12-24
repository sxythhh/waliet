import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import PublicNavbar from "@/components/PublicNavbar";
import { Globe, Instagram } from "lucide-react";
interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  home_url: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  linkedin_handle: string | null;
  brand_color: string | null;
}
interface Campaign {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  rpm_rate: number;
  status: string;
  slug: string;
}
interface Boost {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  monthly_retainer: number;
  status: string;
}
type ContentItem = {
  type: "campaign";
  data: Campaign;
} | {
  type: "boost";
  data: Boost;
};
export default function BrandPublicPage() {
  const {
    slug
  } = useParams<{
    slug: string;
  }>();
  const navigate = useNavigate();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "ended">("active");
  useEffect(() => {
    const fetchBrandData = async () => {
      if (!slug) return;
      try {
        const {
          data: brandData,
          error: brandError
        } = await supabase.from("brands").select("id, name, slug, logo_url, description, home_url, website_url, instagram_handle, tiktok_handle, linkedin_handle, brand_color").eq("slug", slug).eq("is_active", true).single();
        if (brandError || !brandData) {
          navigate("/404");
          return;
        }
        setBrand(brandData);
        const {
          data: campaignsData
        } = await supabase.from("campaigns").select("id, title, description, banner_url, rpm_rate, status, slug").eq("brand_id", brandData.id).eq("is_private", false).order("created_at", {
          ascending: false
        });
        setCampaigns(campaignsData || []);
        const {
          data: boostsData
        } = await supabase.from("bounty_campaigns").select("id, title, description, banner_url, monthly_retainer, status").eq("brand_id", brandData.id).eq("is_private", false).order("created_at", {
          ascending: false
        });
        setBoosts(boostsData || []);
      } catch (error) {
        console.error("Error fetching brand:", error);
        navigate("/404");
      } finally {
        setLoading(false);
      }
    };
    fetchBrandData();
  }, [slug, navigate]);
  const activeItems: ContentItem[] = [...campaigns.filter(c => c.status === "active").map(c => ({
    type: "campaign" as const,
    data: c
  })), ...boosts.filter(b => b.status === "active").map(b => ({
    type: "boost" as const,
    data: b
  }))];
  const endedItems: ContentItem[] = [...campaigns.filter(c => c.status !== "active").map(c => ({
    type: "campaign" as const,
    data: c
  })), ...boosts.filter(b => b.status !== "active").map(b => ({
    type: "boost" as const,
    data: b
  }))];
  const currentItems = activeTab === "active" ? activeItems : endedItems;
  if (loading) {
    return <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-6 py-20">
          <div className="flex flex-col items-center gap-4 mb-16">
            <Skeleton className="w-20 h-20 rounded-full" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>;
  }
  if (!brand) {
    return null;
  }
  const handleItemClick = (item: ContentItem) => {
    if (item.type === "campaign") {
      navigate(`/c/${item.data.slug}`);
    } else {
      navigate(`/c/${item.data.id}`);
    }
  };
  return <>
      <Helmet>
        <title>{brand.name} | Virality</title>
        <meta name="description" content={brand.description || `Join ${brand.name} creator campaigns on Virality`} />
      </Helmet>

      <PublicNavbar />
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-6 py-12">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-10 pt-[30px]">
            <Avatar className="w-20 h-20 mb-4">
              <AvatarImage src={brand.logo_url || undefined} alt={brand.name} />
              <AvatarFallback className="text-2xl font-medium text-white" style={{
              backgroundColor: brand.brand_color || 'hsl(var(--muted))'
            }}>
                {brand.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
            {brand.description && <p className="text-muted-foreground text-sm mt-2 max-w-sm font-['Inter'] tracking-[-0.5px]">{brand.description}</p>}
            
            {/* Social Links */}
            <div className="flex items-center gap-3 mt-4">
              {brand.website_url && <a href={brand.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Globe className="w-4 h-4" />
                </a>}
              {brand.instagram_handle && <a href={`https://instagram.com/${brand.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>}
              {brand.tiktok_handle && <a href={`https://tiktok.com/@${brand.tiktok_handle}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </a>}
              {brand.linkedin_handle && <a href={`https://linkedin.com/company/${brand.linkedin_handle}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>}
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex gap-8">
              <button onClick={() => setActiveTab("active")} className={`pb-3 text-sm font-medium transition-colors relative font-['Inter'] tracking-[-0.5px] ${activeTab === "active" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Active
                <span className="ml-1.5 text-muted-foreground">{activeItems.length}</span>
                {activeTab === "active" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
              <button onClick={() => setActiveTab("ended")} className={`pb-3 text-sm font-medium transition-colors relative font-['Inter'] tracking-[-0.5px] ${activeTab === "ended" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Ended
                <span className="ml-1.5 text-muted-foreground">{endedItems.length}</span>
                {activeTab === "ended" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            </div>
            <div className="h-px bg-border -mt-px" />
          </div>

          {/* Content List */}
          {currentItems.length > 0 ? <div className="space-y-1">
              {currentItems.map(item => {
            const id = item.type === "campaign" ? item.data.id : item.data.id;
            const title = item.data.title;
            const description = item.data.description;
            const banner = item.data.banner_url;
            const label = item.type === "campaign" ? `$${(item.data as Campaign).rpm_rate} RPM` : `$${(item.data as Boost).monthly_retainer}/mo`;
            const badge = item.type === "boost" ? "Boost" : null;
            return <div key={id} onClick={() => handleItemClick(item)} className="flex items-center gap-4 py-4 px-3 -mx-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50">
                    {banner ? <img src={banner} alt={title} className="w-12 h-12 object-cover rounded-md flex-shrink-0" /> : <div className="w-12 h-12 bg-muted rounded-md flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate font-['Inter'] tracking-[-0.5px]">{title}</h3>
                        {badge}
                      </div>
                      {description && <p className="text-xs text-muted-foreground truncate mt-0.5 font-['Inter'] tracking-[-0.5px]">{description}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 font-['Inter'] tracking-[-0.5px]">{label}</span>
                  </div>;
          })}
            </div> : <div className="py-20 text-center">
              <p className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                {activeTab === "active" ? "No active opportunities" : "No ended opportunities"}
              </p>
            </div>}
        </div>
      </div>
    </>;
}