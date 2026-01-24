import { useState, useEffect } from "react";
import { FileText, ChevronRight, Sparkles, Globe, Plus } from "lucide-react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleDocsImportButton } from "@/components/brand/GoogleDocsImportButton";
import { NotionImportButton } from "@/components/brand/NotionImportButton";
import { AIBlueprintGenerator } from "@/components/brand/AIBlueprintGenerator";
import { cn } from "@/lib/utils";

interface BlueprintTemplate {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  platforms: string[] | null;
  category: string | null;
  hooks: string[];
  talking_points: string[];
  dos_and_donts: {
    dos: string[];
    donts: string[];
  };
  call_to_action: string | null;
  hashtags: string[] | null;
  brand_voice: string | null;
  target_personas: Array<{
    name: string;
    target_audience: string;
    description: string;
  }>;
  assets: Array<{
    link: string;
    notes: string;
  }>;
  example_videos: Array<{
    url: string;
    description: string;
  }>;
  content_guidelines: string | null;
}

interface BlueprintImportFields {
  title?: string;
  content?: string;
  brand_voice?: string;
  target_personas?: Array<{
    name: string;
    target_audience: string;
    description: string;
  }>;
  hooks?: string[];
  talking_points?: string[];
  dos_and_donts?: {
    dos: string[];
    donts: string[];
  };
  call_to_action?: string;
  hashtags?: string[];
  platforms?: string[];
}

interface TemplateSelectorProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelectTemplate: (template: BlueprintTemplate) => void;
  onStartBlank?: () => void;
  onImportFromGoogleDocs?: (fields: BlueprintImportFields) => void;
  onImportFromNotion?: (fields: BlueprintImportFields) => void;
  onGenerateWithAI?: (fields: BlueprintImportFields) => void;
  brandId?: string;
  hideBlankOption?: boolean;
}

export function TemplateSelector({
  open: controlledOpen,
  onOpenChange,
  onSelectTemplate,
  onStartBlank,
  onImportFromGoogleDocs,
  onImportFromNotion,
  onGenerateWithAI,
  brandId,
  hideBlankOption = false
}: TemplateSelectorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [templates, setTemplates] = useState<BlueprintTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

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
        hooks: t.hooks as string[] || [],
        talking_points: t.talking_points as string[] || [],
        dos_and_donts: t.dos_and_donts as { dos: string[]; donts: string[] } || { dos: [], donts: [] },
        target_personas: t.target_personas as Array<{ name: string; target_audience: string; description: string }> || [],
        assets: t.assets as Array<{ link: string; notes: string }> || [],
        example_videos: t.example_videos as Array<{ url: string; description: string }> || []
      })));
    }
    setLoading(false);
  };

  const handleSelect = (template: BlueprintTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
  };

  const handleStartBlank = () => {
    if (onStartBlank) {
      onStartBlank();
    }
    setOpen(false);
  };

  const handleGoogleDocsImport = (fields: BlueprintImportFields) => {
    if (onImportFromGoogleDocs) {
      onImportFromGoogleDocs(fields);
    }
    setOpen(false);
  };

  const handleNotionImport = (fields: BlueprintImportFields) => {
    if (onImportFromNotion) {
      onImportFromNotion(fields);
    }
    setOpen(false);
  };

  const handleAIGenerate = (fields: BlueprintImportFields) => {
    if (onGenerateWithAI) {
      onGenerateWithAI(fields);
    }
    setOpen(false);
  };

  // Option card component for consistent styling
  const OptionCard = ({
    icon,
    iconBg,
    title,
    description,
    onClick,
    className,
  }: {
    icon: React.ReactNode;
    iconBg?: string;
    title: string;
    description: string;
    onClick: () => void;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-card/20",
        "hover:bg-muted/40 hover:border-border/60 transition-all text-left w-full",
        className
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
        iconBg || "bg-muted/50"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-[14px] text-foreground font-inter tracking-[-0.3px]">
          {title}
        </h3>
        <p className="text-[13px] text-muted-foreground font-inter tracking-[-0.2px] mt-0.5">
          {description}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
    </button>
  );

  // Controlled dialog content
  if (isControlled) {
    return (
      <>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <DialogTitle className="text-lg font-semibold font-geist tracking-[-0.5px]">
                {hideBlankOption ? "Import Content" : "New Blueprint"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.2px] mt-1">
                {hideBlankOption
                  ? "Import content from an external source"
                  : "Choose how you want to start your blueprint"}
              </p>
            </div>

            {/* Options */}
            <div className="px-6 pb-4 space-y-2">
              {/* Start Blank */}
              {!hideBlankOption && (
                <OptionCard
                  icon={<Plus className="h-5 w-5 text-foreground/70" />}
                  iconBg="bg-muted/60"
                  title="Start with blank"
                  description="Create a blueprint from scratch"
                  onClick={handleStartBlank}
                />
              )}

              {/* Import from Google Docs */}
              {onImportFromGoogleDocs && (
                <GoogleDocsImportButton
                  variant="card"
                  onImport={handleGoogleDocsImport}
                  className="w-full"
                />
              )}

              {/* Import from Notion */}
              {onImportFromNotion && (
                <NotionImportButton
                  variant="card"
                  onImport={handleNotionImport}
                  className="w-full"
                />
              )}

              {/* Generate with AI */}
              {onGenerateWithAI && brandId && (
                <OptionCard
                  icon={<Icon icon="material-symbols:wand-shine" className="h-5 w-5 text-violet-500" />}
                  iconBg="bg-violet-500/10"
                  title="Generate with AI"
                  description="Analyze your website to auto-generate guidelines"
                  onClick={() => setAiGeneratorOpen(true)}
                />
              )}
            </div>

            {/* Templates Section */}
            {loading ? (
              <div className="px-6 pb-6 space-y-2">
                <div className="h-px bg-border/50 mb-4" />
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : templates.length > 0 && (
              <div className="px-6 pb-6">
                <div className="h-px bg-border/50 mb-4" />
                <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
                  Templates
                </p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleSelect(template)}
                      className="group flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-card/10 hover:bg-muted/30 hover:border-border/50 transition-all text-left w-full"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-[13px] text-foreground font-inter tracking-[-0.2px] truncate">
                            {template.title}
                          </h4>
                          {template.category && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                              {template.category}
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-[12px] text-muted-foreground font-inter line-clamp-1 mt-0.5">
                            {template.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* AI Blueprint Generator Dialog */}
        {onGenerateWithAI && brandId && (
          <AIBlueprintGenerator
            open={aiGeneratorOpen}
            onOpenChange={setAiGeneratorOpen}
            onGenerated={handleAIGenerate}
            brandId={brandId}
          />
        )}
      </>
    );
  }

  // Uncontrolled mode with trigger button
  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 border-dashed border-border/50 bg-card/30 hover:bg-card/50 text-muted-foreground hover:text-foreground font-inter tracking-[-0.3px]"
      >
        <Sparkles className="h-4 w-4" />
        Start from Template
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-geist tracking-[-0.5px] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Choose a Template
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.2px]">
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
                <p className="font-inter tracking-[-0.3px]">No templates available yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    className="w-full text-left p-4 rounded-xl border border-border/40 bg-card/20 hover:bg-muted/40 hover:border-border/60 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-[15px] text-foreground font-inter tracking-[-0.3px]">
                            {template.title}
                          </h3>
                          {template.category && (
                            <Badge variant="secondary" className="text-[10px]">
                              {template.category}
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 font-inter tracking-[-0.2px]">
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
