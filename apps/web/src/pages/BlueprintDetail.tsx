import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Copy, ExternalLink, Play, Check, X } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";

interface HookItem {
  text: string;
}

interface TalkingPointItem {
  text: string;
}

interface ExampleVideoItem {
  url: string;
  title?: string;
  description?: string;
}

interface AssetItem {
  url: string;
  name?: string;
  type?: string;
}

interface PersonaItem {
  name?: string;
  description?: string;
  age_range?: string;
  interests?: string[];
}

interface BrandMembership {
  brand_id: string;
  brands: {
    subscription_status: string | null;
  } | null;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
}

interface Blueprint {
  id: string;
  brand_id: string;
  title: string;
  content: string | null;
  hooks: (string | HookItem)[] | null;
  talking_points: (string | TalkingPointItem)[] | null;
  dos_and_donts: { dos?: string[]; donts?: string[] } | null;
  call_to_action: string | null;
  hashtags: string[] | null;
  brand_voice: string | null;
  content_guidelines: string | null;
  example_videos: (string | ExampleVideoItem)[] | null;
  assets: (string | AssetItem)[] | null;
  target_personas: (string | PersonaItem)[] | null;
  platforms: string[] | null;
}

function SectionHeader({ emoji, title, action }: { emoji: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <span className="text-xl">{emoji}</span>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function BlueprintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!user) return;

    const { data: memberships } = await supabase
      .from("brand_members")
      .select("brand_id, brands(subscription_status)")
      .eq("user_id", user.id);

    if (memberships && memberships.length > 0) {
      const typedMemberships = memberships as BrandMembership[];
      const activeSub = typedMemberships.find((m) => m.brands?.subscription_status === "active");
      setSubscriptionStatus(activeSub ? "active" : typedMemberships[0]?.brands?.subscription_status || null);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const showBetaGate = !adminLoading && !isAdmin && subscriptionStatus !== "active";

  const fetchBlueprint = useCallback(async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("blueprints")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setBlueprint(data as Blueprint);

      // Fetch brand info
      if (data.brand_id) {
        const { data: brandData } = await supabase
          .from("brands")
          .select("id, name, logo_url, brand_color")
          .eq("id", data.brand_id)
          .single();

        if (brandData) {
          setBrand(brandData);
        }
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchBlueprint();
  }, [fetchBlueprint]);

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "tiktok":
        return <img src={tiktokLogoBlack} alt="TikTok" className="h-4 w-4 dark:invert" />;
      case "youtube":
        return <img src={youtubeLogoBlack} alt="YouTube" className="h-4 w-4 dark:invert" />;
      case "instagram":
        return <img src={instagramLogoBlack} alt="Instagram" className="h-4 w-4 dark:invert" />;
      default:
        return null;
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const copyHashtags = () => {
    if (blueprint?.hashtags) {
      const hashtagsText = blueprint.hashtags.map(h => `#${h.replace(/^#/, "")}`).join(" ");
      navigator.clipboard.writeText(hashtagsText);
      toast.success("Copied to clipboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-foreground">Blueprint not found</p>
          <p className="text-sm text-muted-foreground">This document may have been moved or deleted.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)} className="rounded-full px-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Beta Gate Overlay */}
      {showBetaGate && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-background/80">
          <div className="text-center space-y-6 max-w-md mx-auto px-6">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
              <img src="/beta-shield-icon.svg" alt="Beta" className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-inter tracking-[-0.5px] text-foreground">
                This Feature is still in BETA
              </h2>
              <p className="text-muted-foreground font-inter tracking-[-0.5px]">
                Come back soon.
              </p>
            </div>
            <Button
              onClick={() => navigate("/dashboard?tab=campaigns")}
              className="px-6"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      )}

      {/* Floating back button */}
      <div className="fixed top-6 left-6 z-40">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-xl border-border/50 shadow-sm hover:shadow-md transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Document content */}
      <div className="max-w-2xl mx-auto px-6 py-20">
        {/* Header */}
        <header className="mb-16">
          {/* Brand info */}
          {brand && (
            <div className="flex items-center gap-3 mb-8">
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="h-8 w-8 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: brand.brand_color || "#000" }}
                >
                  {brand.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-muted-foreground font-medium">{brand.name}</span>
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground leading-[1.1] mb-6">
            {blueprint.title || "Content Brief"}
          </h1>

          {/* Platforms */}
          {blueprint.platforms && blueprint.platforms.length > 0 && (
            <div className="flex items-center gap-4">
              {blueprint.platforms.map((platform) => (
                <div key={platform} className="flex items-center gap-2 text-muted-foreground">
                  {getPlatformIcon(platform)}
                  <span className="text-sm capitalize">{platform}</span>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* Content sections */}
        <div className="space-y-16">
          {/* Content Brief */}
          {blueprint.content && (
            <section>
              <SectionHeader emoji="📝" title="Content Brief" />
              <div
                className="prose prose-lg dark:prose-invert max-w-none prose-p:text-foreground/80 prose-p:leading-relaxed prose-headings:font-semibold prose-headings:tracking-tight"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(blueprint.content) }}
              />
            </section>
          )}

          {/* Brand Voice */}
          {blueprint.brand_voice && (
            <section>
              <SectionHeader emoji="🎙️" title="Brand Voice" />
              <blockquote className="pl-6 border-l-2 border-foreground/20">
                <p className="text-xl text-foreground/80 italic leading-relaxed">
                  "{blueprint.brand_voice}"
                </p>
              </blockquote>
            </section>
          )}

          {/* Hooks */}
          {blueprint.hooks && blueprint.hooks.length > 0 && (
            <section>
              <SectionHeader emoji="🪝" title="Hooks" />
              <div className="space-y-4">
                {blueprint.hooks.map((hook, index) => {
                  const hookText = typeof hook === 'string' ? hook : hook.text;
                  return (
                    <div
                      key={`hook-${index}`}
                      className="group flex items-start gap-4 p-4 -mx-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => copyText(hookText)}
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </span>
                      <p className="text-foreground/90 leading-relaxed flex-1 pt-0.5">{hookText}</p>
                      <Copy className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Do's and Don'ts */}
          {blueprint.dos_and_donts && (blueprint.dos_and_donts.dos?.length || blueprint.dos_and_donts.donts?.length) && (
            <section>
              <SectionHeader emoji="✅" title="Guidelines" />
              <div className="grid sm:grid-cols-2 gap-8">
                {blueprint.dos_and_donts.dos && blueprint.dos_and_donts.dos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 uppercase tracking-wide">Do</h4>
                    <ul className="space-y-3">
                      {blueprint.dos_and_donts.dos.map((item, index) => (
                        <li key={`do-${index}`} className="flex items-start gap-3">
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-foreground/80 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {blueprint.dos_and_donts.donts && blueprint.dos_and_donts.donts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-4 uppercase tracking-wide">Don't</h4>
                    <ul className="space-y-3">
                      {blueprint.dos_and_donts.donts.map((item, index) => (
                        <li key={`dont-${index}`} className="flex items-start gap-3">
                          <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                          <span className="text-foreground/80 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Talking Points */}
          {blueprint.talking_points && blueprint.talking_points.length > 0 && (
            <section>
              <SectionHeader emoji="💬" title="Talking Points" />
              <ul className="space-y-4">
                {blueprint.talking_points.map((point, index) => {
                  const pointText = typeof point === 'string' ? point : point.text;
                  return (
                    <li key={`point-${index}`} className="flex items-start gap-4 group">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 mt-2.5 shrink-0" />
                      <p className="text-foreground/80 leading-relaxed">{pointText}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Call to Action */}
          {blueprint.call_to_action && (
            <section>
              <SectionHeader emoji="📣" title="Call to Action" />
              <div className="p-6 rounded-2xl bg-gradient-to-br from-foreground/[0.03] to-foreground/[0.06] border border-foreground/[0.08]">
                <p className="text-lg font-medium text-foreground leading-relaxed">
                  {blueprint.call_to_action}
                </p>
              </div>
            </section>
          )}

          {/* Hashtags */}
          {blueprint.hashtags && blueprint.hashtags.length > 0 && (
            <section>
              <SectionHeader
                emoji="#️⃣"
                title="Hashtags"
                action={
                  <button
                    onClick={copyHashtags}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy all
                  </button>
                }
              />
              <div className="flex flex-wrap gap-2">
                {blueprint.hashtags.map((hashtag, index) => (
                  <button
                    key={`hashtag-${index}`}
                    onClick={() => copyText(`#${hashtag.replace(/^#/, "")}`)}
                    className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors"
                  >
                    #{hashtag.replace(/^#/, "")}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Target Personas */}
          {blueprint.target_personas && blueprint.target_personas.length > 0 && (
            <section>
              <SectionHeader emoji="🎯" title="Target Audience" />
              <div className="space-y-6">
                {blueprint.target_personas.map((persona, index) => {
                  const personaData = typeof persona === 'string'
                    ? { name: persona, description: null, age_range: null, interests: null }
                    : persona;
                  return (
                    <div
                      key={`persona-${index}`}
                      className="p-6 rounded-2xl bg-gradient-to-br from-foreground/[0.02] to-foreground/[0.05] border border-foreground/[0.06]"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">👤</span>
                        <div>
                          <h4 className="font-semibold text-foreground">{personaData.name || "Persona"}</h4>
                          {personaData.age_range && (
                            <p className="text-sm text-muted-foreground">{personaData.age_range}</p>
                          )}
                        </div>
                      </div>
                      {personaData.description && (
                        <p className="text-foreground/80 leading-relaxed mb-4">{personaData.description}</p>
                      )}
                      {personaData.interests && personaData.interests.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {personaData.interests.map((interest, i) => (
                            <span
                              key={`interest-${index}-${i}`}
                              className="px-2.5 py-1 rounded-full bg-foreground/5 text-foreground/70 text-xs font-medium"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Content Guidelines */}
          {blueprint.content_guidelines && (
            <section>
              <SectionHeader emoji="📋" title="Content Guidelines" />
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {blueprint.content_guidelines}
              </p>
            </section>
          )}

          {/* Assets */}
          {blueprint.assets && blueprint.assets.length > 0 && (
            <section>
              <SectionHeader emoji="📎" title="Assets" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {blueprint.assets.map((asset, index) => {
                  const assetData = typeof asset === 'string'
                    ? { url: asset, name: asset, type: null }
                    : asset;
                  return (
                    <a
                      key={`asset-${index}`}
                      href={assetData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-muted hover:ring-2 hover:ring-foreground/10 transition-all"
                    >
                      {assetData.type?.includes("image") ? (
                        <img
                          src={assetData.url}
                          alt={assetData.name || "Asset"}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl">📄</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-white font-medium truncate block">{assetData.name}</span>
                      </div>
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-4 w-4 text-white" />
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* Example Videos */}
          {blueprint.example_videos && blueprint.example_videos.length > 0 && (
            <section>
              <SectionHeader emoji="🎬" title="Example Videos" />
              <div className="space-y-4">
                {blueprint.example_videos.map((video, index) => {
                  const videoData = typeof video === 'string'
                    ? { url: video, title: null, description: null }
                    : video;
                  return (
                    <a
                      key={`video-${index}`}
                      href={videoData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-4 p-4 -mx-4 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-xl bg-foreground/5 group-hover:bg-foreground/10 flex items-center justify-center shrink-0 transition-colors">
                        <Play className="h-5 w-5 text-foreground/60 group-hover:text-foreground transition-colors" />
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="text-sm text-foreground group-hover:underline truncate mb-1">
                          {videoData.title || videoData.url}
                        </p>
                        {videoData.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{videoData.description}</p>
                        )}
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1.5" />
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Footer spacer */}
        <div className="h-20" />
      </div>
    </div>
  );
}
