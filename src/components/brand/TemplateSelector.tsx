import { useState, useEffect } from "react";
import { FileText, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface BlueprintTemplate {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  platforms: string[] | null;
  category: string | null;
  hooks: string[];
  talking_points: string[];
  dos_and_donts: { dos: string[]; donts: string[] };
  call_to_action: string | null;
  hashtags: string[] | null;
  brand_voice: string | null;
  target_personas: Array<{ name: string; target_audience: string; description: string }>;
  assets: Array<{ link: string; notes: string }>;
  example_videos: Array<{ url: string; description: string }>;
  content_guidelines: string | null;
}

interface TemplateSelectorProps {
  onSelectTemplate: (template: BlueprintTemplate) => void;
}

export function TemplateSelector({ onSelectTemplate }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<BlueprintTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blueprint_templates")
      .select("*")
      .eq("is_active", true)
      .order("title", { ascending: true });

    if (error) {
      console.error("Error fetching templates:", error);
    } else {
      setTemplates((data || []).map(t => ({
        ...t,
        hooks: (t.hooks as string[]) || [],
        talking_points: (t.talking_points as string[]) || [],
        dos_and_donts: (t.dos_and_donts as { dos: string[]; donts: string[] }) || { dos: [], donts: [] },
        target_personas: (t.target_personas as Array<{ name: string; target_audience: string; description: string }>) || [],
        assets: (t.assets as Array<{ link: string; notes: string }>) || [],
        example_videos: (t.example_videos as Array<{ url: string; description: string }>) || []
      })));
    }
    setLoading(false);
  };

  const handleSelect = (template: BlueprintTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 border-dashed border-border/50 bg-card/30 hover:bg-card/50 text-muted-foreground hover:text-foreground font-inter tracking-[-0.5px]"
      >
        <Sparkles className="h-4 w-4" />
        Start from Template
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Choose a Template
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              Start with a pre-built template to save time
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-inter tracking-[-0.5px]">No templates available yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    className="w-full text-left p-4 rounded-xl border border-border/50 bg-card/30 hover:bg-card/50 hover:border-border transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-[15px] text-foreground font-inter tracking-[-0.5px]">
                            {template.title}
                          </h3>
                          {template.category && (
                            <Badge variant="secondary" className="text-[10px]">
                              {template.category}
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 font-inter tracking-[-0.5px]">
                            {template.description}
                          </p>
                        )}
                        {template.platforms && template.platforms.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            {template.platforms.map(platform => (
                              <Badge key={platform} variant="outline" className="text-[10px] capitalize">
                                {platform}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/70">
                          <span>{template.hooks?.length || 0} hooks</span>
                          <span>•</span>
                          <span>{template.talking_points?.length || 0} talking points</span>
                          {template.dos_and_donts?.dos?.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{template.dos_and_donts.dos.length} do's</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
