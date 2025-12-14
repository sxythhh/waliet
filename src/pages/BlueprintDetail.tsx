import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Lightbulb, MessageSquare, ThumbsUp, ThumbsDown, Hash, Mic, ExternalLink, Check, X, Image, Video, Users } from "lucide-react";

interface Blueprint {
  id: string;
  title: string;
  content: string | null;
  hooks: any[] | null;
  talking_points: any[] | null;
  dos_and_donts: { dos?: string[]; donts?: string[] } | null;
  call_to_action: string | null;
  hashtags: string[] | null;
  brand_voice: string | null;
  content_guidelines: string | null;
  example_videos: any[] | null;
  assets: any[] | null;
  target_personas: any[] | null;
  platforms: string[] | null;
}

export default function BlueprintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlueprint = async () => {
      if (!id) return;
      
      const { data, error } = await supabase
        .from("blueprints")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setBlueprint(data as Blueprint);
      }
      setLoading(false);
    };

    fetchBlueprint();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Blueprint not found</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold font-geist tracking-[-0.5px]">
              {blueprint.title || "Content Brief"}
            </h1>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
              Complete guidelines for your content
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Main Content */}
        {blueprint.content && (
          <div className="rounded-xl bg-card border border-border p-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border/50 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-semibold font-geist tracking-[-0.5px]">Overview</span>
            </div>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed font-inter tracking-[-0.3px]"
              dangerouslySetInnerHTML={{ __html: blueprint.content }}
            />
          </div>
        )}

        {/* Hooks Section */}
        {blueprint.hooks && blueprint.hooks.length > 0 && (
          <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-base font-semibold font-geist tracking-[-0.5px]">Hooks</span>
            </div>
            <div className="space-y-3 pl-2">
              {blueprint.hooks.map((hook: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-foreground/80 font-inter tracking-[-0.3px]">
                  <span className="text-amber-500 mt-0.5 text-lg">•</span>
                  <span>{typeof hook === 'string' ? hook : hook.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Talking Points Section */}
        {blueprint.talking_points && blueprint.talking_points.length > 0 && (
          <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-base font-semibold font-geist tracking-[-0.5px]">Talking Points</span>
            </div>
            <div className="space-y-3 pl-2">
              {blueprint.talking_points.map((point: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-foreground/80 font-inter tracking-[-0.3px]">
                  <span className="text-blue-500 mt-0.5 text-lg">•</span>
                  <span>{typeof point === 'string' ? point : point.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Do's and Don'ts Section */}
        {blueprint.dos_and_donts && (blueprint.dos_and_donts.dos?.length > 0 || blueprint.dos_and_donts.donts?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Do's */}
            {blueprint.dos_and_donts.dos && blueprint.dos_and_donts.dos.length > 0 && (
              <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <ThumbsUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400 font-geist tracking-[-0.5px]">Do's</span>
                </div>
                <div className="space-y-2 pl-2">
                  {blueprint.dos_and_donts.dos.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 text-sm text-foreground/80 font-inter tracking-[-0.3px]">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Don'ts */}
            {blueprint.dos_and_donts.donts && blueprint.dos_and_donts.donts.length > 0 && (
              <div className="rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <ThumbsDown className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-base font-semibold text-red-600 dark:text-red-400 font-geist tracking-[-0.5px]">Don'ts</span>
                </div>
                <div className="space-y-2 pl-2">
                  {blueprint.dos_and_donts.donts.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 text-sm text-foreground/80 font-inter tracking-[-0.3px]">
                      <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Call to Action */}
        {blueprint.call_to_action && (
          <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-base font-semibold font-geist tracking-[-0.5px]">Call to Action</span>
            </div>
            <p className="text-sm text-foreground/80 font-inter tracking-[-0.3px] pl-2">
              {blueprint.call_to_action}
            </p>
          </div>
        )}

        {/* Hashtags */}
        {blueprint.hashtags && blueprint.hashtags.length > 0 && (
          <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Hash className="w-4 h-4 text-cyan-500" />
              </div>
              <span className="text-base font-semibold font-geist tracking-[-0.5px]">Hashtags</span>
            </div>
            <div className="flex flex-wrap gap-2 pl-2">
              {blueprint.hashtags.map((tag: string, idx: number) => (
                <span 
                  key={idx} 
                  className="px-3 py-1.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-sm font-medium font-inter tracking-[-0.3px]"
                >
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Brand Voice */}
        {blueprint.brand_voice && (
          <div className="rounded-xl bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                <Mic className="w-4 h-4 text-pink-500" />
              </div>
              <span className="text-base font-semibold font-geist tracking-[-0.5px]">Brand Voice</span>
            </div>
            <p className="text-sm text-foreground/80 font-inter tracking-[-0.3px] pl-2 whitespace-pre-line">
              {blueprint.brand_voice}
            </p>
          </div>
        )}

        {/* Content Guidelines */}
        {blueprint.content_guidelines && (
          <div className="rounded-xl bg-card border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-base font-semibold font-geist tracking-[-0.5px]">Content Guidelines</span>
            </div>
            <p className="text-sm text-foreground/80 font-inter tracking-[-0.3px] pl-2 whitespace-pre-line">
              {blueprint.content_guidelines}
            </p>
          </div>
        )}

        {/* Example Videos */}
        {blueprint.example_videos && blueprint.example_videos.length > 0 && (
          <div className="rounded-xl bg-card border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Video className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-base font-semibold font-geist tracking-[-0.5px]">Example Videos</span>
            </div>
            <div className="space-y-3 pl-2">
              {blueprint.example_videos.map((video: any, idx: number) => (
                <a 
                  key={idx}
                  href={typeof video === 'string' ? video : video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline font-inter tracking-[-0.3px]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{typeof video === 'string' ? video : (video.title || video.url)}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Assets */}
        {blueprint.assets && blueprint.assets.length > 0 && (
          <div className="rounded-xl bg-card border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Image className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-base font-semibold font-geist tracking-[-0.5px]">Assets</span>
            </div>
            <div className="space-y-3 pl-2">
              {blueprint.assets.map((asset: any, idx: number) => (
                <a 
                  key={idx}
                  href={typeof asset === 'string' ? asset : asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline font-inter tracking-[-0.3px]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{typeof asset === 'string' ? asset : (asset.name || asset.url)}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Target Personas */}
        {blueprint.target_personas && blueprint.target_personas.length > 0 && (
          <div className="rounded-xl bg-card border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-base font-semibold font-geist tracking-[-0.5px]">Target Personas</span>
            </div>
            <div className="space-y-3 pl-2">
              {blueprint.target_personas.map((persona: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-foreground/80 font-inter tracking-[-0.3px]">
                  <span className="text-muted-foreground mt-0.5 text-lg">•</span>
                  <span>{typeof persona === 'string' ? persona : persona.name || persona.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
