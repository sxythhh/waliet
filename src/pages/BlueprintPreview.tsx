import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Globe, FileText, Lightbulb, MessageSquare, Hash, Image, Video, Users, Check, X, Sparkles, Target, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        return <Globe className="h-4 w-4" />;
    }
  };

  const copyHashtags = () => {
    if (blueprint?.hashtags) {
      const hashtagsText = blueprint.hashtags.map(h => `#${h.replace(/^#/, "")}`).join(" ");
      navigator.clipboard.writeText(hashtagsText);
      toast.success("Hashtags copied to clipboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Blueprint not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt={brand.name} className="h-10 w-10 rounded-xl object-cover shadow-sm" />
            ) : (
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-sm"
                style={{ backgroundColor: brand?.brand_color || "#8B5CF6" }}
              >
                {(brand?.name || "B").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-semibold font-inter tracking-[-0.5px] truncate">{blueprint.title}</h1>
              <p className="text-sm text-muted-foreground">{brand?.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Content Brief */}
        {blueprint.content && (
          <Section icon={<FileText className="h-4 w-4" />} title="Content Brief">
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-foreground/80 prose-headings:font-semibold" dangerouslySetInnerHTML={{ __html: blueprint.content }} />
          </Section>
        )}

        {/* Platforms */}
        {blueprint.platforms && blueprint.platforms.length > 0 && (
          <Section icon={<Globe className="h-4 w-4" />} title="Platforms">
            <div className="flex flex-wrap gap-2">
              {blueprint.platforms.map((platform) => (
                <div
                  key={platform}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 border border-border/50"
                >
                  {getPlatformIcon(platform)}
                  <span className="text-sm font-medium capitalize">{platform}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Brand Voice */}
        {blueprint.brand_voice && (
          <Section icon={<MessageSquare className="h-4 w-4" />} title="Brand Voice">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-foreground/90 leading-relaxed italic">"{blueprint.brand_voice}"</p>
            </div>
          </Section>
        )}

        {/* Hooks */}
        {blueprint.hooks && blueprint.hooks.length > 0 && (
          <Section icon={<Sparkles className="h-4 w-4" />} title="Hooks">
            <div className="space-y-3">
              {blueprint.hooks.map((hook, index) => (
                <div
                  key={`hook-${index}`}
                  className="group flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/10 hover:border-amber-500/20 transition-colors"
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{index + 1}</span>
                  </div>
                  <p className="text-foreground/90 leading-relaxed pt-0.5">{hook.text}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Do's and Don'ts */}
        {blueprint.dos_and_donts && (blueprint.dos_and_donts.dos?.length > 0 || blueprint.dos_and_donts.donts?.length > 0) && (
          <Section icon={<FileText className="h-4 w-4" />} title="Do's and Don'ts">
            <div className="grid md:grid-cols-2 gap-4">
              {blueprint.dos_and_donts.dos && blueprint.dos_and_donts.dos.length > 0 && (
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Do's</h4>
                  </div>
                  <ul className="space-y-2.5">
                    {blueprint.dos_and_donts.dos.map((item, index) => (
                      <li key={`do-${index}`} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-foreground/80">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {blueprint.dos_and_donts.donts && blueprint.dos_and_donts.donts.length > 0 && (
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                      <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">Don'ts</h4>
                  </div>
                  <ul className="space-y-2.5">
                    {blueprint.dos_and_donts.donts.map((item, index) => (
                      <li key={`dont-${index}`} className="flex items-start gap-2.5 text-sm">
                        <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <span className="text-foreground/80">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Hashtags */}
        {blueprint.hashtags && blueprint.hashtags.length > 0 && (
          <Section
            icon={<Hash className="h-4 w-4" />}
            title="Hashtags"
            action={
              <Button variant="ghost" size="sm" onClick={copyHashtags} className="h-8 text-xs gap-1.5">
                <Copy className="h-3.5 w-3.5" />
                Copy All
              </Button>
            }
          >
            <div className="flex flex-wrap gap-2">
              {blueprint.hashtags.map((hashtag, index) => (
                <Badge
                  key={`hashtag-${index}`}
                  variant="secondary"
                  className="px-3 py-1.5 text-sm font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20 cursor-pointer transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(`#${hashtag.replace(/^#/, "")}`);
                    toast.success("Hashtag copied");
                  }}
                >
                  #{hashtag.replace(/^#/, "")}
                </Badge>
              ))}
            </div>
          </Section>
        )}

        {/* Assets */}
        {blueprint.assets && blueprint.assets.length > 0 && (
          <Section icon={<Image className="h-4 w-4" />} title="Assets">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {blueprint.assets.map((asset, index) => (
                <a
                  key={`asset-${index}`}
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square rounded-xl overflow-hidden border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg"
                >
                  {asset.type?.includes("image") ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <FileText className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <span className="text-xs text-white font-medium truncate block">{asset.name}</span>
                  </div>
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Example Videos */}
        {blueprint.example_videos && blueprint.example_videos.length > 0 && (
          <Section icon={<Video className="h-4 w-4" />} title="Example Videos">
            <div className="space-y-3">
              {blueprint.example_videos.map((video, index) => (
                <a
                  key={`video-${index}`}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-primary group-hover:underline truncate">{video.url}</p>
                      {video.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{video.description}</p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Target Personas */}
        {blueprint.target_personas && blueprint.target_personas.length > 0 && (
          <Section icon={<Users className="h-4 w-4" />} title="Target Personas">
            <div className="grid md:grid-cols-2 gap-4">
              {blueprint.target_personas.map((persona, index) => (
                <div
                  key={`persona-${index}`}
                  className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-transparent space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                      <Target className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{persona.name}</h4>
                      {persona.age_range && (
                        <p className="text-xs text-muted-foreground">Age: {persona.age_range}</p>
                      )}
                    </div>
                  </div>
                  {persona.description && (
                    <p className="text-sm text-foreground/80 leading-relaxed">{persona.description}</p>
                  )}
                  {persona.interests && persona.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {persona.interests.map((interest, i) => (
                        <Badge key={`interest-${index}-${i}`} variant="outline" className="text-xs px-2 py-0.5">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Call to Action */}
        {blueprint.call_to_action && (
          <Section icon={<Lightbulb className="h-4 w-4" />} title="Call to Action">
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
              <p className="text-foreground font-medium leading-relaxed">{blueprint.call_to_action}</p>
            </div>
          </Section>
        )}

        {/* Content Guidelines */}
        {blueprint.content_guidelines && (
          <Section icon={<FileText className="h-4 w-4" />} title="Content Guidelines">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap text-sm">{blueprint.content_guidelines}</p>
            </div>
          </Section>
        )}

        {/* Talking Points */}
        {blueprint.talking_points && blueprint.talking_points.length > 0 && (
          <Section icon={<MessageSquare className="h-4 w-4" />} title="Talking Points">
            <div className="space-y-2">
              {blueprint.talking_points.map((point, index) => (
                <div
                  key={`point-${index}`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <p className="text-foreground/90 leading-relaxed">{point.text}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
  action
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
          <h2 className="text-base font-semibold font-inter tracking-[-0.3px]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
