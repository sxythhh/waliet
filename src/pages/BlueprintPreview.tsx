import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Copy, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";

interface Blueprint {
  id: string;
  title: string;
  content: string | null;
  platforms: string[] | null;
  brand_voice: string | null;
  hooks: { text: string }[] | null;
  dos_and_donts: { dos: string[]; donts: string[] } | null;
  hashtags: string[] | null;
  assets: { name: string; url: string; type: string }[] | null;
  example_videos: { url: string; description: string }[] | null;
  target_personas: { name: string; description: string; age_range: string; interests: string[] }[] | null;
  call_to_action: string | null;
  content_guidelines: string | null;
  talking_points: { text: string }[] | null;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
}

export default function BlueprintPreview() {
  const { blueprintId } = useParams();
  const navigate = useNavigate();
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!blueprintId) return;

      const { data: blueprintData, error: blueprintError } = await supabase
        .from("blueprints")
        .select("*")
        .eq("id", blueprintId)
        .single();

      if (blueprintError || !blueprintData) {
        console.error("Error fetching blueprint:", blueprintError);
        setLoading(false);
        return;
      }

      setBlueprint({
        ...blueprintData,
        hooks: blueprintData.hooks as Blueprint["hooks"],
        dos_and_donts: blueprintData.dos_and_donts as Blueprint["dos_and_donts"],
        assets: blueprintData.assets as Blueprint["assets"],
        example_videos: blueprintData.example_videos as Blueprint["example_videos"],
        target_personas: blueprintData.target_personas as Blueprint["target_personas"],
        talking_points: blueprintData.talking_points as Blueprint["talking_points"],
      });

      const { data: brandData } = await supabase
        .from("brands")
        .select("id, name, logo_url, brand_color")
        .eq("id", blueprintData.brand_id)
        .single();

      if (brandData) {
        setBrand(brandData);
      }

      setLoading(false);
    };

    fetchData();
  }, [blueprintId]);

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

  const copyHashtags = () => {
    if (blueprint?.hashtags) {
      const hashtagsText = blueprint.hashtags.map(h => `#${h.replace(/^#/, "")}`).join(" ");
      navigator.clipboard.writeText(hashtagsText);
      toast.success("Copied to clipboard");
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
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
    <div className="min-h-screen bg-background">
      {/* Minimal floating back button */}
      <div className="fixed top-6 left-6 z-50">
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
          <div className="flex items-center gap-3 mb-8">
            {brand?.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold"
                style={{ backgroundColor: brand?.brand_color || "#000" }}
              >
                {(brand?.name || "B").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-muted-foreground font-medium">{brand?.name}</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground leading-[1.1] mb-6">
            {blueprint.title}
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
                dangerouslySetInnerHTML={{ __html: blueprint.content }}
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
                {blueprint.hooks.map((hook, index) => (
                  <div
                    key={`hook-${index}`}
                    className="group flex items-start gap-4 p-4 -mx-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => copyText(hook.text)}
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </span>
                    <p className="text-foreground/90 leading-relaxed flex-1 pt-0.5">{hook.text}</p>
                    <Copy className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Do's and Don'ts */}
          {blueprint.dos_and_donts && (blueprint.dos_and_donts.dos?.length > 0 || blueprint.dos_and_donts.donts?.length > 0) && (
            <section>
              <SectionHeader emoji="✅" title="Guidelines" />
              <div className="grid sm:grid-cols-2 gap-8">
                {blueprint.dos_and_donts.dos && blueprint.dos_and_donts.dos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 uppercase tracking-wide">Do</h4>
                    <ul className="space-y-3">
                      {blueprint.dos_and_donts.dos.map((item, index) => (
                        <li key={`do-${index}`} className="flex items-start gap-3">
                          <span className="text-emerald-500 mt-0.5">✓</span>
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
                          <span className="text-red-500 mt-0.5">✗</span>
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
                {blueprint.talking_points.map((point, index) => (
                  <li
                    key={`point-${index}`}
                    className="flex items-start gap-4 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 mt-2.5 shrink-0" />
                    <p className="text-foreground/80 leading-relaxed">{point.text}</p>
                  </li>
                ))}
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
              <div className="flex items-center justify-between mb-6">
                <SectionHeader emoji="#️⃣" title="Hashtags" className="mb-0" />
                <button
                  onClick={copyHashtags}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy all
                </button>
              </div>
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
                {blueprint.target_personas.map((persona, index) => (
                  <div
                    key={`persona-${index}`}
                    className="p-6 rounded-2xl bg-gradient-to-br from-foreground/[0.02] to-foreground/[0.05] border border-foreground/[0.06]"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">👤</span>
                      <div>
                        <h4 className="font-semibold text-foreground">{persona.name}</h4>
                        {persona.age_range && (
                          <p className="text-sm text-muted-foreground">{persona.age_range}</p>
                        )}
                      </div>
                    </div>
                    {persona.description && (
                      <p className="text-foreground/80 leading-relaxed mb-4">{persona.description}</p>
                    )}
                    {persona.interests && persona.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {persona.interests.map((interest, i) => (
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
                ))}
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
                {blueprint.assets.map((asset, index) => (
                  <a
                    key={`asset-${index}`}
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-muted hover:ring-2 hover:ring-foreground/10 transition-all"
                  >
                    {asset.type?.includes("image") ? (
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl">📄</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-white font-medium truncate block">{asset.name}</span>
                    </div>
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-4 w-4 text-white" />
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Example Videos */}
          {blueprint.example_videos && blueprint.example_videos.length > 0 && (
            <section>
              <SectionHeader emoji="🎬" title="Example Videos" />
              <div className="space-y-4">
                {blueprint.example_videos.map((video, index) => (
                  <a
                    key={`video-${index}`}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-4 p-4 -mx-4 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-foreground/5 group-hover:bg-foreground/10 flex items-center justify-center shrink-0 transition-colors">
                      <Play className="h-5 w-5 text-foreground/60 group-hover:text-foreground transition-colors" />
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-sm text-foreground group-hover:underline truncate mb-1">
                        {video.url}
                      </p>
                      {video.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1.5" />
                  </a>
                ))}
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

function SectionHeader({
  emoji,
  title,
  className = "mb-6"
}: {
  emoji: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-xl">{emoji}</span>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
    </div>
  );
}
