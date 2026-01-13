import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import PublicNavbar from "@/components/PublicNavbar";
import { Globe, Instagram } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SEOHead } from "@/components/SEOHead";
import { getCanonicalUrl, truncateDescription } from "@/lib/seo";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { BoostDiscoverCard } from "@/components/dashboard/BoostDiscoverCard";
import { useAuth } from "@/contexts/AuthContext";
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
  is_verified: boolean;
}
interface Campaign {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  rpm_rate: number;
  status: string;
  slug: string;
  budget: number;
  budget_used: number;
  is_infinite_budget: boolean;
  allowed_platforms: string[] | null;
}
interface Boost {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  max_accepted_creators: number;
  accepted_creators_count: number;
  status: string;
  slug: string;
  created_at: string;
  tags: string[] | null;
}
interface CampaignStats {
  totalPaidOut: number;
  approvalPercentage: number;
  avgApprovalTimeHours: number | null;
}
type ContentItem = {
  type: "campaign";
  data: Campaign;
  stats?: CampaignStats;
} | {
  type: "boost";
  data: Boost;
  stats?: CampaignStats;
};
const formatCurrency = (num: number) => {
  if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K';
  return '$' + num.toFixed(0);
};
const formatApprovalTime = (hours: number | null) => {
  if (hours === null) return '—';
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 7) return `${Math.round(days)}d`;
  return `${Math.round(days / 7)}w`;
};
export default function BrandPublicPage() {
  const {
    slug
  } = useParams<{
    slug: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [campaignStats, setCampaignStats] = useState<Record<string, CampaignStats>>({});
  const [boostStats, setBoostStats] = useState<Record<string, CampaignStats>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "ended">("active");
  useEffect(() => {
    const fetchBrandData = async () => {
      if (!slug) return;
      try {
        const {
          data: brandData,
          error: brandError
        } = await supabase.from("brands").select("id, name, slug, logo_url, description, home_url, website_url, instagram_handle, tiktok_handle, linkedin_handle, brand_color, is_verified").eq("slug", slug).eq("is_active", true).maybeSingle();
        if (brandError || !brandData) {
          navigate("/404");
          return;
        }
        setBrand(brandData);

        // Fetch campaigns and boosts
        const [campaignsResult, boostsResult] = await Promise.all([
          supabase.from("campaigns")
            .select("id, title, description, banner_url, rpm_rate, status, slug, budget, budget_used, is_infinite_budget, allowed_platforms")
            .eq("brand_id", brandData.id)
            .eq("is_private", false)
            .order("created_at", { ascending: false }),
          supabase.from("bounty_campaigns")
            .select("id, title, description, banner_url, monthly_retainer, videos_per_month, max_accepted_creators, accepted_creators_count, status, slug, created_at, tags")
            .eq("brand_id", brandData.id)
            .eq("is_private", false)
            .order("created_at", { ascending: false })
        ]);
        const campaignsData = campaignsResult.data || [];
        const boostsData = boostsResult.data || [];
        setCampaigns(campaignsData);
        setBoosts(boostsData);

        // Fetch stats for campaigns
        if (campaignsData.length > 0) {
          const campaignIds = campaignsData.map(c => c.id);

          // Get video submissions for campaigns
          const {
            data: submissions
          } = await supabase.from("video_submissions").select("id, source_id, status, submitted_at, reviewed_at").eq("source_type", "campaign").in("source_id", campaignIds);

          // Get wallet transactions for campaigns
          const {
            data: transactions
          } = await supabase.from("wallet_transactions").select("amount, metadata").eq("type", "earning");
          const statsMap: Record<string, CampaignStats> = {};
          campaignIds.forEach(campaignId => {
            const campaignSubmissions = (submissions || []).filter(s => s.source_id === campaignId);
            const approvedSubmissions = campaignSubmissions.filter(s => s.status === 'approved');
            const totalSubmissions = campaignSubmissions.length;

            // Calculate approval percentage
            const approvalPercentage = totalSubmissions > 0 ? approvedSubmissions.length / totalSubmissions * 100 : 0;

            // Calculate average approval time
            const approvalTimes = approvedSubmissions.filter(s => s.submitted_at && s.reviewed_at).map(s => {
              const submitted = new Date(s.submitted_at!).getTime();
              const reviewed = new Date(s.reviewed_at!).getTime();
              return (reviewed - submitted) / (1000 * 60 * 60); // hours
            });
            const avgApprovalTimeHours = approvalTimes.length > 0 ? approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length : null;

            // Calculate total paid out
            const campaignTransactions = (transactions || []).filter(t => {
              const metadata = t.metadata as any;
              return metadata?.campaign_id === campaignId;
            });
            const totalPaidOut = campaignTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
            statsMap[campaignId] = {
              totalPaidOut,
              approvalPercentage,
              avgApprovalTimeHours
            };
          });
          setCampaignStats(statsMap);
        }

        // Fetch stats for boosts
        if (boostsData.length > 0) {
          const boostIds = boostsData.map(b => b.id);

          // Get boost video submissions
          const {
            data: boostSubmissions
          } = await supabase.from("boost_video_submissions").select("id, bounty_campaign_id, status, submitted_at, reviewed_at").in("bounty_campaign_id", boostIds);

          // Get wallet transactions for boosts
          const {
            data: transactions
          } = await supabase.from("wallet_transactions").select("amount, metadata").eq("type", "earning");
          const statsMap: Record<string, CampaignStats> = {};
          boostIds.forEach(boostId => {
            const submissions = (boostSubmissions || []).filter(s => s.bounty_campaign_id === boostId);
            const approvedSubmissions = submissions.filter(s => s.status === 'approved');
            const totalSubmissions = submissions.length;
            const approvalPercentage = totalSubmissions > 0 ? approvedSubmissions.length / totalSubmissions * 100 : 0;
            const approvalTimes = approvedSubmissions.filter(s => s.submitted_at && s.reviewed_at).map(s => {
              const submitted = new Date(s.submitted_at!).getTime();
              const reviewed = new Date(s.reviewed_at!).getTime();
              return (reviewed - submitted) / (1000 * 60 * 60);
            });
            const avgApprovalTimeHours = approvalTimes.length > 0 ? approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length : null;
            const boostTransactions = (transactions || []).filter(t => {
              const metadata = t.metadata as any;
              return metadata?.boost_id === boostId;
            });
            const totalPaidOut = boostTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
            statsMap[boostId] = {
              totalPaidOut,
              approvalPercentage,
              avgApprovalTimeHours
            };
          });
          setBoostStats(statsMap);
        }
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
    data: c,
    stats: campaignStats[c.id]
  })), ...boosts.filter(b => b.status === "active").map(b => ({
    type: "boost" as const,
    data: b,
    stats: boostStats[b.id]
  }))];
  const endedItems: ContentItem[] = [...campaigns.filter(c => c.status !== "active").map(c => ({
    type: "campaign" as const,
    data: c,
    stats: campaignStats[c.id]
  })), ...boosts.filter(b => b.status !== "active").map(b => ({
    type: "boost" as const,
    data: b,
    stats: boostStats[b.id]
  }))];
  const currentItems = activeTab === "active" ? activeItems : endedItems;
  if (loading) {
    return <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="flex flex-col items-center gap-4 mb-16">
            <Skeleton className="w-20 h-20 rounded-full" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>;
  }
  if (!brand) {
    return null;
  }
  const handleItemClick = (item: ContentItem) => {
    if (item.type === "campaign") {
      navigate(`/join/${item.data.slug}`);
    } else {
      navigate(`/join/${item.data.id}`);
    }
  };
  // SEO data
  const seoDescription = brand.description
    ? truncateDescription(`${brand.name} - ${brand.description}`)
    : `Join ${brand.name} creator campaigns on Virality. ${activeItems.length} active opportunities available.`;

  const brandSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    url: getCanonicalUrl(`/b/${brand.slug}`),
    logo: brand.logo_url || undefined,
    description: brand.description || undefined,
    sameAs: [
      brand.website_url,
      brand.instagram_handle ? `https://instagram.com/${brand.instagram_handle}` : null,
      brand.tiktok_handle ? `https://tiktok.com/@${brand.tiktok_handle}` : null,
      brand.linkedin_handle ? `https://linkedin.com/company/${brand.linkedin_handle}` : null,
    ].filter(Boolean),
  };

  return <>
      <SEOHead
        title={`${brand.name} | Creator Campaigns & Opportunities`}
        description={seoDescription}
        canonical={getCanonicalUrl(`/b/${brand.slug}`)}
        ogImage={brand.logo_url || undefined}
        ogType="website"
        keywords={['creator campaigns', brand.name, 'influencer marketing', 'content creator', 'brand partnership'].filter(Boolean)}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Discover', url: '/discover' },
          { name: brand.name, url: `/b/${brand.slug}` },
        ]}
        structuredData={brandSchema}
      />

      <PublicNavbar />
      <div className="min-h-screen bg-background overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-12">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <Avatar className="w-20 h-20 mb-4">
              <AvatarImage src={brand.logo_url || undefined} alt={brand.name} />
              <AvatarFallback className="text-2xl font-medium text-white" style={{
              backgroundColor: brand.brand_color || 'hsl(var(--muted))'
            }}>
                {brand.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-1.5">
              {brand.name}
              {brand.is_verified && <VerifiedBadge size="md" />}
            </h1>
            {brand.description && <p className="text-muted-foreground text-sm mt-2 max-w-sm font-inter tracking-[-0.5px]">
                {brand.description}
              </p>}
            
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
              <button onClick={() => setActiveTab("active")} className={`pb-3 text-sm font-medium transition-colors relative font-inter tracking-[-0.5px] ${activeTab === "active" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Active
                <span className="ml-1.5 text-muted-foreground">{activeItems.length}</span>
                {activeTab === "active" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
              <button onClick={() => setActiveTab("ended")} className={`pb-3 text-sm font-medium transition-colors relative font-inter tracking-[-0.5px] ${activeTab === "ended" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Ended
                <span className="ml-1.5 text-muted-foreground">{endedItems.length}</span>
                {activeTab === "ended" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            </div>
            <div className="h-px bg-border -mt-px" />
          </div>

          {/* Content Grid */}
          {currentItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {currentItems.map(item => {
                if (item.type === "campaign") {
                  const campaign = item.data as Campaign;
                  const isEnded = campaign.status === "ended";
                  return (
                    <CampaignCard
                      key={campaign.id}
                      id={campaign.id}
                      title={campaign.title}
                      brand_name={brand.name}
                      brand_logo_url={brand.logo_url}
                      brand_is_verified={brand.is_verified}
                      brand_color={brand.brand_color}
                      brand_slug={brand.slug}
                      banner_url={campaign.banner_url}
                      budget={campaign.budget}
                      budget_used={campaign.budget_used}
                      is_infinite_budget={campaign.is_infinite_budget}
                      platforms={campaign.allowed_platforms || []}
                      isEnded={isEnded}
                      slug={campaign.slug}
                      onClick={() => navigate(`/join/${campaign.slug}`)}
                      showBookmark={false}
                    />
                  );
                } else {
                  const boost = item.data as Boost;
                  const isEnded = boost.status === "ended";
                  return (
                    <BoostDiscoverCard
                      key={boost.id}
                      id={boost.id}
                      title={boost.title}
                      description={boost.description}
                      brand_name={brand.name}
                      brand_logo_url={brand.logo_url}
                      brand_is_verified={brand.is_verified}
                      brand_slug={brand.slug}
                      monthly_retainer={boost.monthly_retainer}
                      videos_per_month={boost.videos_per_month}
                      max_accepted_creators={boost.max_accepted_creators}
                      accepted_creators_count={boost.accepted_creators_count}
                      isEnded={isEnded}
                      slug={boost.slug}
                      created_at={boost.created_at}
                      tags={boost.tags}
                      onClick={() => navigate(`/join/${boost.slug}`)}
                    />
                  );
                }
              })}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                {activeTab === "active" ? "No active opportunities" : "No ended opportunities"}
              </p>
            </div>
          )}
        </div>
      </div>

    </>;
}