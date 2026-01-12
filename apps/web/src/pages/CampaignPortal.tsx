import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import AuthDialog from "@/components/AuthDialog";
import { SEOHead } from "@/components/SEOHead";
import { generateCampaignSchema, getCanonicalUrl, truncateDescription } from "@/lib/seo";
import { getCampaignPortalUrl } from "@/utils/subdomain";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import { toast } from "sonner";
import { ArrowRight, ExternalLink, PauseCircle, Users, DollarSign, Eye, Video } from "lucide-react";
import { ExampleVideosCarousel } from "@/components/ExampleVideosCarousel";

// Platform icons
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  description: string | null;
  is_verified?: boolean;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  campaign_type: string | null;
  category: string | null;
  brand_name: string;
  brand_logo_url: string | null;
  budget: number;
  budget_used: number | null;
  rpm_rate: number;
  status: string | null;
  start_date: string | null;
  created_at: string | null;
  banner_url: string | null;
  allowed_platforms: string[] | null;
  slug: string;
  guidelines: string | null;
  requires_application: boolean;
  preview_url: string | null;
  is_infinite_budget: boolean | null;
  blueprint_id: string | null;
}

interface BountyCampaign {
  id: string;
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements: string;
  max_accepted_creators: number;
  accepted_creators_count: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  banner_url: string | null;
  status: string;
  blueprint_id: string | null;
  slug: string | null;
}

interface Blueprint {
  id: string;
  title: string;
  content: string | null;
  hooks: (string | { text?: string; content?: string })[] | null;
  talking_points: (string | { text?: string; content?: string })[] | null;
  dos_and_donts: { dos?: string[]; donts?: string[] } | null;
  call_to_action: string | null;
  hashtags: string[] | null;
  brand_voice: string | null;
  content_guidelines: string | null;
  example_videos: { url: string; title?: string; thumbnail?: string }[] | null;
  assets: { url: string; name?: string; type?: string }[] | null;
}

interface PortalSettings {
  show_budget: boolean;
  show_rpm_rate: boolean;
  show_creator_count: boolean;
  show_video_count: boolean;
  show_deadline: boolean;
  show_blueprint: boolean;
  show_example_videos: boolean;
  show_brand_description: boolean;
  accent_color: string | null;
  is_indexable: boolean;
  custom_meta_title: string | null;
  custom_meta_description: string | null;
}

const defaultSettings: PortalSettings = {
  show_budget: true,
  show_rpm_rate: true,
  show_creator_count: true,
  show_video_count: true,
  show_deadline: true,
  show_blueprint: true,
  show_example_videos: true,
  show_brand_description: true,
  accent_color: null,
  is_indexable: true,
  custom_meta_title: null,
  custom_meta_description: null,
};

export default function CampaignPortal() {
  const { brandSlug, campaignSlug } = useParams<{ brandSlug: string; campaignSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  // Embed mode detection
  const isEmbed = searchParams.get("embed") === "true";
  const themeOverride = searchParams.get("theme") as "light" | "dark" | null;

  // State
  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [boostCampaign, setBoostCampaign] = useState<BountyCampaign | null>(null);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [settings, setSettings] = useState<PortalSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  const isBoost = !!boostCampaign;

  // Apply theme override for embed
  useEffect(() => {
    if (themeOverride && isEmbed) {
      setTheme(themeOverride);
    }
  }, [themeOverride, isEmbed, setTheme]);

  // Fetch brand and campaign data
  useEffect(() => {
    const fetchData = async () => {
      if (!brandSlug || !campaignSlug) {
        setError("Invalid portal URL");
        setLoading(false);
        return;
      }

      try {
        // Fetch brand
        const { data: brandData, error: brandError } = await supabase
          .from("brands")
          .select("id, name, slug, logo_url, brand_color, description, is_verified")
          .eq("slug", brandSlug)
          .maybeSingle();

        if (brandError) throw brandError;
        if (!brandData) {
          setError("Brand not found");
          setLoading(false);
          return;
        }

        setBrand(brandData);

        // Try to fetch campaign first
        const { data: campaignData, error: campaignError } = await supabase
          .from("campaigns")
          .select("*")
          .eq("slug", campaignSlug)
          .eq("brand_id", brandData.id)
          .maybeSingle();

        if (campaignError && campaignError.code !== "PGRST116") throw campaignError;

        if (campaignData) {
          setCampaign({
            ...campaignData,
            brand_name: brandData.name,
            brand_logo_url: brandData.logo_url,
          });

          // Fetch member count
          const { count } = await supabase
            .from("social_account_campaigns")
            .select("user_id", { count: "exact", head: true })
            .eq("campaign_id", campaignData.id)
            .eq("status", "active");
          setMemberCount(count || 0);

          // Fetch blueprint if exists
          if (campaignData.blueprint_id) {
            const { data: blueprintData } = await supabase
              .from("blueprints")
              .select("*")
              .eq("id", campaignData.blueprint_id)
              .single();
            if (blueprintData) setBlueprint(blueprintData as Blueprint);
          }

          // Fetch or create portal settings
          const { data: settingsData } = await supabase
            .from("campaign_portal_settings")
            .select("*")
            .eq("campaign_id", campaignData.id)
            .maybeSingle();

          if (settingsData) {
            setSettings({ ...defaultSettings, ...settingsData });
          }

          // Track page view
          supabase.rpc("increment_portal_views", { p_campaign_id: campaignData.id });
        } else {
          // Try bounty campaign
          const { data: boostData, error: boostError } = await supabase
            .from("bounty_campaigns")
            .select("*")
            .eq("slug", campaignSlug)
            .eq("brand_id", brandData.id)
            .maybeSingle();

          if (boostError && boostError.code !== "PGRST116") throw boostError;

          if (!boostData) {
            setError("Campaign not found");
            setLoading(false);
            return;
          }

          setBoostCampaign(boostData);

          // Fetch member count for boost
          const { count } = await supabase
            .from("bounty_applications")
            .select("id", { count: "exact", head: true })
            .eq("bounty_campaign_id", boostData.id)
            .in("status", ["pending", "accepted"]);
          setMemberCount(count || 0);

          // Fetch blueprint if exists
          if (boostData.blueprint_id) {
            const { data: blueprintData } = await supabase
              .from("blueprints")
              .select("*")
              .eq("id", boostData.blueprint_id)
              .single();
            if (blueprintData) setBlueprint(blueprintData as Blueprint);
          }

          // Fetch or create portal settings
          const { data: settingsData } = await supabase
            .from("campaign_portal_settings")
            .select("*")
            .eq("bounty_campaign_id", boostData.id)
            .maybeSingle();

          if (settingsData) {
            setSettings({ ...defaultSettings, ...settingsData });
          }

          // Track page view
          supabase.rpc("increment_portal_views", { p_bounty_campaign_id: boostData.id });
        }
      } catch (err) {
        console.error("Error fetching portal data:", err);
        setError("Failed to load campaign");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [brandSlug, campaignSlug]);

  // Apply brand accent color
  useEffect(() => {
    const accentColor = settings.accent_color || brand?.brand_color || "#2061de";
    document.documentElement.style.setProperty("--portal-accent", accentColor);
    return () => {
      document.documentElement.style.removeProperty("--portal-accent");
    };
  }, [settings.accent_color, brand?.brand_color]);

  const getPlatformIcon = (platform: string) => {
    const isLightMode = resolvedTheme === "light";
    switch (platform.toLowerCase()) {
      case "tiktok":
        return isLightMode ? tiktokLogoBlack : tiktokLogo;
      case "instagram":
        return isLightMode ? instagramLogoBlack : instagramLogo;
      case "youtube":
        return isLightMode ? youtubeLogoBlack : youtubeLogo;
      default:
        return null;
    }
  };

  const handleApplyClick = () => {
    // Track apply click
    if (campaign?.id) {
      supabase.rpc("increment_portal_apply_clicks", { p_campaign_id: campaign.id });
    } else if (boostCampaign?.id) {
      supabase.rpc("increment_portal_apply_clicks", { p_bounty_campaign_id: boostCampaign.id });
    }

    // For embed mode, open in new tab
    if (isEmbed) {
      const applyUrl = `/c/${campaignSlug}`;
      window.open(applyUrl, "_blank");
      return;
    }

    // For logged out users, show auth dialog
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    // Navigate to apply page
    navigate(`/c/${campaignSlug}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen bg-background ${isEmbed ? "p-4" : ""}`}>
        {!isEmbed && <PortalHeader brand={null} loading />}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-48 w-full rounded-2xl mb-6" />
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !brand) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-2xl font-semibold text-foreground mb-2 font-inter tracking-[-0.5px]">
            {error || "Campaign not found"}
          </h1>
          <p className="text-muted-foreground mb-4 font-inter tracking-[-0.3px]">
            The campaign you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/discover")}>Browse Campaigns</Button>
        </div>
      </div>
    );
  }

  // Get unified data
  const title = isBoost ? boostCampaign?.title : campaign?.title;
  const description = isBoost ? boostCampaign?.description : campaign?.description;
  const bannerUrl = isBoost ? boostCampaign?.banner_url : campaign?.banner_url;
  const status = isBoost ? boostCampaign?.status : campaign?.status;
  const createdAt = isBoost ? boostCampaign?.created_at : campaign?.created_at;
  const isEnded = status === "ended";

  // SEO
  const seoTitle = settings.custom_meta_title || `${title} - ${brand.name}`;
  const seoDescription =
    settings.custom_meta_description ||
    truncateDescription(`${title} by ${brand.name}. ${description || ""}`);
  const portalUrl = getCampaignPortalUrl(brandSlug!, campaignSlug!);

  // Build stats for display
  const stats: { icon: React.ReactNode; label: string; value: string }[] = [];

  if (isBoost && boostCampaign) {
    if (settings.show_budget) {
      stats.push({
        icon: <DollarSign className="h-4 w-4" />,
        label: "Monthly Pay",
        value: `$${boostCampaign.monthly_retainer.toLocaleString()}`,
      });
    }
    if (settings.show_video_count) {
      stats.push({
        icon: <Video className="h-4 w-4" />,
        label: "Videos",
        value: `${boostCampaign.videos_per_month}/mo`,
      });
    }
    if (settings.show_creator_count) {
      const spotsLeft = boostCampaign.max_accepted_creators - boostCampaign.accepted_creators_count;
      stats.push({
        icon: <Users className="h-4 w-4" />,
        label: "Spots Left",
        value: `${spotsLeft}`,
      });
    }
  } else if (campaign) {
    if (settings.show_rpm_rate) {
      stats.push({
        icon: <DollarSign className="h-4 w-4" />,
        label: "RPM Rate",
        value: `$${campaign.rpm_rate}`,
      });
    }
    if (settings.show_budget && !campaign.is_infinite_budget) {
      const remaining = campaign.budget - (campaign.budget_used || 0);
      stats.push({
        icon: <DollarSign className="h-4 w-4" />,
        label: "Budget Left",
        value: `$${remaining.toLocaleString()}`,
      });
    }
    if (settings.show_creator_count) {
      stats.push({
        icon: <Users className="h-4 w-4" />,
        label: "Creators",
        value: memberCount.toString(),
      });
    }
  }

  return (
    <div className={`min-h-screen bg-background ${isEmbed ? "" : ""}`}>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonical={getCanonicalUrl(portalUrl)}
        ogImage={bannerUrl || brand.logo_url || undefined}
        ogType="website"
        noIndex={!settings.is_indexable}
        structuredData={
          title && brand.name && createdAt
            ? generateCampaignSchema({
                title,
                description: seoDescription,
                brandName: brand.name,
                brandLogo: brand.logo_url || undefined,
                datePosted: createdAt,
                url: portalUrl,
              })
            : undefined
        }
      />

      {/* Header - hidden in embed mode */}
      {!isEmbed && <PortalHeader brand={brand} />}

      {/* Main Content */}
      <main className={isEmbed ? "p-4" : "max-w-4xl mx-auto px-4 py-6"}>
        {/* Banner */}
        {bannerUrl && !isEmbed && (
          <div className="h-48 md:h-64 w-full rounded-2xl overflow-hidden mb-6">
            <OptimizedImage src={bannerUrl} alt={title || ""} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Title & Brand */}
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="h-14 w-14 border-2 border-border">
            <AvatarImage src={brand.logo_url || undefined} className="object-cover" />
            <AvatarFallback className="text-lg font-bold bg-muted">{brand.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">{brand.name}</span>
              {brand.is_verified && <VerifiedBadge size="sm" />}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-inter">{title}</h1>
            <div className="flex items-center gap-2 mt-2">
              {isEnded ? (
                <Badge variant="destructive" className="gap-1">
                  <PauseCircle className="h-3 w-3" />
                  Ended
                </Badge>
              ) : status === "active" ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">{status}</Badge>
              )}
              {createdAt && (
                <span className="text-xs text-muted-foreground">
                  Posted {format(new Date(createdAt), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">{stat.label}</p>
                  <p className="text-lg font-semibold font-inter tracking-[-0.5px]">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Platforms */}
        {!isBoost && campaign?.allowed_platforms && campaign.allowed_platforms.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-muted-foreground">Platforms:</span>
            {campaign.allowed_platforms.map((platform) => {
              const icon = getPlatformIcon(platform);
              return (
                <div
                  key={platform}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border"
                >
                  {icon && <img src={icon} alt={platform} className="w-4 h-4 object-contain" />}
                  <span className="text-xs font-medium font-inter tracking-[-0.5px] capitalize">{platform}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Description */}
        {description && settings.show_brand_description && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px]">About</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap font-inter tracking-[-0.3px]">
              {description}
            </p>
          </div>
        )}

        {/* Blueprint Content */}
        {settings.show_blueprint && blueprint && (
          <>
            {blueprint.content_guidelines && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px]">Content Guidelines</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap font-inter tracking-[-0.3px]">
                  {blueprint.content_guidelines}
                </p>
              </div>
            )}

            {blueprint.content && (
              <div
                className="prose prose-sm dark:prose-invert max-w-none mb-8"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(blueprint.content) }}
              />
            )}

            {blueprint.hooks && blueprint.hooks.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px]">Hook Ideas</h2>
                <div className="space-y-2">
                  {blueprint.hooks.map((hook, i) => (
                    <div key={i} className="p-3 rounded-xl bg-muted/50 border border-border text-sm font-inter">
                      {typeof hook === "string" ? hook : hook.text || hook.content}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {blueprint.dos_and_donts && (
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {blueprint.dos_and_donts.dos && blueprint.dos_and_donts.dos.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 text-green-500 font-inter">Do's</h2>
                    <ul className="space-y-2">
                      {blueprint.dos_and_donts.dos.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm p-2 rounded-lg bg-green-500/10 border border-green-500/20"
                        >
                          <span className="text-green-500">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {blueprint.dos_and_donts.donts && blueprint.dos_and_donts.donts.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 text-red-500 font-inter">Don'ts</h2>
                    <ul className="space-y-2">
                      {blueprint.dos_and_donts.donts.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm p-2 rounded-lg bg-red-500/10 border border-red-500/20"
                        >
                          <span className="text-red-500">✗</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {blueprint.hashtags && blueprint.hashtags.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px]">Hashtags</h2>
                <div className="flex flex-wrap gap-2">
                  {blueprint.hashtags.map((tag, i) => (
                    <Badge key={i} variant="secondary">
                      #{tag.replace("#", "")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Example Videos */}
        {settings.show_example_videos && blueprint?.example_videos && blueprint.example_videos.length > 0 && (
          <div className="mb-8">
            <ExampleVideosCarousel videos={blueprint.example_videos} />
          </div>
        )}

        {/* CTA */}
        {!isEnded && (
          <div className={`${isEmbed ? "" : "sticky bottom-4"} mt-8`}>
            <Button
              size="lg"
              className="w-full font-inter tracking-[-0.5px] gap-2"
              style={{ backgroundColor: "var(--portal-accent, #2061de)" }}
              onClick={handleApplyClick}
            >
              {user ? "Apply Now" : "Sign In to Apply"}
              {isEmbed ? <ExternalLink className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </main>

      {/* Auth Dialog */}
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  );
}

// Header component for non-embed mode
function PortalHeader({ brand, loading }: { brand: Brand | null; loading?: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {loading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : brand ? (
          <Link to={`/b/${brand.slug}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={brand.name} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: brand.brand_color || "#5865f2" }}
              >
                {brand.name.charAt(0)}
              </div>
            )}
            <span className="font-semibold font-inter tracking-[-0.5px]">{brand.name}</span>
            {brand.is_verified && <VerifiedBadge size="sm" />}
          </Link>
        ) : null}

        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
