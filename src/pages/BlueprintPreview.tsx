import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Globe, FileText, Lightbulb, MessageSquare, Hash, Image, Video, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt={brand.name} className="h-8 w-8 rounded object-cover" />
            ) : (
              <div
                className="h-8 w-8 rounded flex items-center justify-center text-white text-sm font-semibold"
                style={{ backgroundColor: brand?.brand_color || "#8B5CF6" }}
              >
                {(brand?.name || "B").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold font-inter tracking-[-0.5px]">{blueprint.title}</h1>
              <p className="text-sm text-muted-foreground">{brand?.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Content Section */}
        {blueprint.content && (
          <Section icon={<FileText className="h-5 w-5" />} title="Content Brief">
            <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: blueprint.content }} />
          </Section>
        )}

        {/* Platforms */}
        {blueprint.platforms && blueprint.platforms.length > 0 && (
          <Section icon={<Globe className="h-5 w-5" />} title="Platforms">
            <div className="flex flex-wrap gap-2">
              {blueprint.platforms.map((platform) => (
                <Badge key={platform} variant="secondary" className="flex items-center gap-2 px-3 py-1.5">
                  {getPlatformIcon(platform)}
                  <span className="capitalize">{platform}</span>
                </Badge>
              ))}
            </div>
          </Section>
        )}

        {/* Brand Voice */}
        {blueprint.brand_voice && (
          <Section icon={<MessageSquare className="h-5 w-5" />} title="Brand Voice">
            <p className="text-foreground leading-relaxed">{blueprint.brand_voice}</p>
          </Section>
        )}

        {/* Hooks */}
        {blueprint.hooks && blueprint.hooks.length > 0 && (
          <Section icon={<Lightbulb className="h-5 w-5" />} title="Hooks">
            <ul className="space-y-2">
              {blueprint.hooks.map((hook, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary font-medium">{index + 1}.</span>
                  <span className="text-foreground">{hook.text}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Do's and Don'ts */}
        {blueprint.dos_and_donts && (
          <Section icon={<FileText className="h-5 w-5" />} title="Do's and Don'ts">
            <div className="grid md:grid-cols-2 gap-6">
              {blueprint.dos_and_donts.dos && blueprint.dos_and_donts.dos.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-emerald-500 mb-3">Do's</h4>
                  <ul className="space-y-2">
                    {blueprint.dos_and_donts.dos.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-emerald-500">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {blueprint.dos_and_donts.donts && blueprint.dos_and_donts.donts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-destructive mb-3">Don'ts</h4>
                  <ul className="space-y-2">
                    {blueprint.dos_and_donts.donts.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-destructive">✗</span>
                        <span>{item}</span>
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
          <Section icon={<Hash className="h-5 w-5" />} title="Hashtags">
            <div className="flex flex-wrap gap-2">
              {blueprint.hashtags.map((hashtag, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  #{hashtag.replace(/^#/, "")}
                </Badge>
              ))}
            </div>
          </Section>
        )}

        {/* Assets */}
        {blueprint.assets && blueprint.assets.length > 0 && (
          <Section icon={<Image className="h-5 w-5" />} title="Assets">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {blueprint.assets.map((asset, index) => (
                <a
                  key={index}
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors flex flex-col items-center gap-2"
                >
                  {asset.type?.includes("image") ? (
                    <img src={asset.url} alt={asset.name} className="h-20 w-20 object-cover rounded" />
                  ) : (
                    <div className="h-20 w-20 bg-muted rounded flex items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground truncate max-w-full">{asset.name}</span>
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Example Videos */}
        {blueprint.example_videos && blueprint.example_videos.length > 0 && (
          <Section icon={<Video className="h-5 w-5" />} title="Example Videos">
            <div className="space-y-4">
              {blueprint.example_videos.map((video, index) => (
                <div key={index} className="p-4 rounded-lg border border-border">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm break-all"
                  >
                    {video.url}
                  </a>
                  {video.description && (
                    <p className="text-sm text-muted-foreground mt-2">{video.description}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Target Personas */}
        {blueprint.target_personas && blueprint.target_personas.length > 0 && (
          <Section icon={<Users className="h-5 w-5" />} title="Target Personas">
            <div className="grid md:grid-cols-2 gap-4">
              {blueprint.target_personas.map((persona, index) => (
                <div key={index} className="p-4 rounded-lg border border-border space-y-2">
                  <h4 className="font-medium">{persona.name}</h4>
                  {persona.age_range && (
                    <p className="text-sm text-muted-foreground">Age: {persona.age_range}</p>
                  )}
                  {persona.description && (
                    <p className="text-sm">{persona.description}</p>
                  )}
                  {persona.interests && persona.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {persona.interests.map((interest, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
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
          <Section icon={<Lightbulb className="h-5 w-5" />} title="Call to Action">
            <p className="text-foreground leading-relaxed">{blueprint.call_to_action}</p>
          </Section>
        )}

        {/* Content Guidelines */}
        {blueprint.content_guidelines && (
          <Section icon={<FileText className="h-5 w-5" />} title="Content Guidelines">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{blueprint.content_guidelines}</p>
          </Section>
        )}

        {/* Talking Points */}
        {blueprint.talking_points && blueprint.talking_points.length > 0 && (
          <Section icon={<MessageSquare className="h-5 w-5" />} title="Talking Points">
            <ul className="space-y-2">
              {blueprint.talking_points.map((point, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary font-medium">•</span>
                  <span className="text-foreground">{point.text}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">{title}</h2>
      </div>
      <div className="pl-7">{children}</div>
    </div>
  );
}
