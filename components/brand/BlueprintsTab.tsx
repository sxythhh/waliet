import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, FileText, Calendar, Link2, Sparkles, Zap, Hash, Trash2, Pencil, Copy, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoading } from "@/components/ui/loading-bar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CreateCampaignTypeDialog } from "./CreateCampaignTypeDialog";
import { CampaignWizard, CampaignType } from "./CampaignWizard";
import { TemplateSelector } from "./TemplateSelector";
import { SubscriptionGateDialog } from "./SubscriptionGateDialog";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/components/tour/DemoDataProvider";
interface Blueprint {
  id: string;
  title: string;
  status: string;
  content: string | null;
  hooks: string[] | null;
  talking_points: string[] | null;
  hashtags: string[] | null;
  created_at: string;
  updated_at: string;
  campaign_id?: string | null;
  created_by: string | null;
  creator?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface BlueprintTemplate {
  title?: string;
  content?: string;
  hooks?: string[];
  talking_points?: string[];
  call_to_action?: string;
  hashtags?: string[];
  brand_voice?: string;
  target_personas?: Record<string, unknown>[];
  example_videos?: string[];
  content_guidelines?: string;
}
interface BlueprintsTabProps {
  brandId: string;
}
type BlueprintStatus = 'empty' | 'draft' | 'assigned';
const getStatusConfig = (status: BlueprintStatus) => {
  switch (status) {
    case 'assigned':
      return {
        label: 'Active',
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-600 dark:text-emerald-400'
      };
    case 'draft':
      return {
        label: 'Draft',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-600 dark:text-amber-400'
      };
    case 'empty':
    default:
      return {
        label: 'Empty',
        dotColor: 'bg-muted-foreground/40',
        textColor: 'text-muted-foreground'
      };
  }
};
export function BlueprintsTab({
  brandId
}: BlueprintsTabProps) {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const { user } = useAuth();
  const { isDemoMode, demoBlueprints, demoBrand } = useDemoData();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSearchParams] = useSearchParams();
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<CampaignType | undefined>(undefined);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(null);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [subscriptionGateOpen, setSubscriptionGateOpen] = useState(false);
  const [brandInfo, setBrandInfo] = useState<{
    name: string;
    logoUrl?: string;
    subscriptionPlan?: string | null;
  } | null>(null);
  const [campaignLinks, setCampaignLinks] = useState<Record<string, string>>({});
  useEffect(() => {
    fetchBlueprints();
    if (!isDemoMode) {
      fetchBrandInfo();
    }
  }, [brandId, isDemoMode]);
  const fetchBrandInfo = async () => {
    const {
      data
    } = await supabase.from("brands").select("name, logo_url, subscription_status, subscription_plan").eq("id", brandId).single();
    if (data) {
      setBrandInfo({
        name: data.name,
        logoUrl: data.logo_url || undefined,
        subscriptionPlan: data.subscription_plan
      });
    }
  };
  const fetchBlueprints = async () => {
    setLoading(true);

    // In demo mode, use mock data
    if (isDemoMode) {
      setBlueprints(demoBlueprints as Blueprint[]);
      setBrandInfo({
        name: demoBrand.name,
        logoUrl: demoBrand.logo_url || undefined,
        subscriptionPlan: "pro",
      });
      setLoading(false);
      return;
    }

    const {
      data,
      error
    } = await supabase.from("blueprints").select(`
      id, title, status, content, hooks, talking_points, hashtags, created_at, updated_at, created_by,
      creator:profiles(id, username, full_name, avatar_url)
    `).eq("brand_id", brandId).order("updated_at", {
      ascending: false
    });
    if (error) {
      console.error("Error fetching blueprints:", error);
      toast.error("Failed to load blueprints");
    } else {
      setBlueprints((data || []) as Blueprint[]);
      if (data && data.length > 0) {
        const blueprintIds = data.map(b => b.id);
        const {
          data: campaigns
        } = await supabase.from("campaigns").select("id, blueprint_id").in("blueprint_id", blueprintIds);
        if (campaigns) {
          const links: Record<string, string> = {};
          campaigns.forEach(c => {
            if (c.blueprint_id) links[c.blueprint_id] = c.id;
          });
          setCampaignLinks(links);
        }
      }
    }
    setLoading(false);
  };
  const createBlueprint = async () => {
    const {
      data,
      error
    } = await supabase.from("blueprints").insert({
      brand_id: brandId,
      title: "",
      created_by: user?.id
    }).select().single();
    if (error) {
      console.error("Error creating blueprint:", error);
      toast.error("Failed to create blueprint");
      return;
    }
    setTemplateSelectorOpen(false);
    setSearchParams(prev => {
      prev.set("blueprint", data.id);
      return prev;
    });
  };
  const deleteBlueprint = async (id: string) => {
    const {
      error
    } = await supabase.from("blueprints").delete().eq("id", id);
    if (error) {
      console.error("Error deleting blueprint:", error);
      toast.error("Failed to delete blueprint");
      return;
    }
    toast.success("Blueprint deleted");
    fetchBlueprints();
  };
  const duplicateBlueprint = async (blueprint: Blueprint) => {
    const { data, error } = await supabase
      .from("blueprints")
      .select("*")
      .eq("id", blueprint.id)
      .single();
    if (error || !data) {
      toast.error("Failed to duplicate blueprint");
      return;
    }
    const { id, created_at, updated_at, created_by, ...rest } = data;
    const { error: insertError } = await supabase
      .from("blueprints")
      .insert({
        ...rest,
        title: `${data.title || "Untitled"} (Copy)`,
        created_by: user?.id,
      });
    if (insertError) {
      toast.error("Failed to duplicate blueprint");
      return;
    }
    toast.success("Blueprint duplicated");
    fetchBlueprints();
  };
  const openBlueprint = (id: string) => {
    setSearchParams(prev => {
      prev.set("blueprint", id);
      return prev;
    });
  };
  const handleActivateBlueprint = (blueprintId: string) => {
    setSelectedBlueprintId(blueprintId);
    setTypeDialogOpen(true);
  };
  const handleSelectClipping = (blueprintId?: string) => {
    setTypeDialogOpen(false);
    if (blueprintId) setSelectedBlueprintId(blueprintId);
    setWizardType('cpm');
    setWizardOpen(true);
  };
  const handleSelectBoost = () => {
    setTypeDialogOpen(false);
    setWizardType('boost');
    setWizardOpen(true);
  };
  const handleSelectTemplate = async (template: BlueprintTemplate) => {
    const {
      data,
      error
    } = await supabase.from("blueprints").insert({
      brand_id: brandId,
      title: template.title || "Untitled",
      content: template.content,
      hooks: template.hooks,
      talking_points: template.talking_points,
      call_to_action: template.call_to_action,
      hashtags: template.hashtags,
      brand_voice: template.brand_voice,
      target_personas: template.target_personas,
      example_videos: template.example_videos,
      content_guidelines: template.content_guidelines,
      created_by: user?.id
    }).select().single();
    if (error) {
      console.error("Error creating blueprint from template:", error);
      toast.error("Failed to create blueprint");
      return;
    }
    setTemplateSelectorOpen(false);
    setSearchParams(prev => {
      prev.set("blueprint", data.id);
      return prev;
    });
  };
  const handleImportFromExternal = async (fields: {
    title?: string;
    content?: string;
    brand_voice?: string;
    target_personas?: Record<string, unknown>[];
    hooks?: string[];
    talking_points?: string[];
    call_to_action?: string;
    hashtags?: string[];
  }) => {
    const {
      data,
      error
    } = await supabase.from("blueprints").insert({
      brand_id: brandId,
      title: fields.title || "Imported Blueprint",
      content: fields.content,
      hooks: fields.hooks,
      talking_points: fields.talking_points,
      call_to_action: fields.call_to_action,
      hashtags: fields.hashtags,
      brand_voice: fields.brand_voice,
      target_personas: fields.target_personas,
      created_by: user?.id
    }).select().single();
    if (error) {
      console.error("Error creating blueprint from import:", error);
      toast.error("Failed to import blueprint");
      return;
    }
    toast.success("Blueprint imported successfully");
    setTemplateSelectorOpen(false);
    setSearchParams(prev => {
      prev.set("blueprint", data.id);
      return prev;
    });
  };
  const getBlueprintStatus = (blueprint: Blueprint): BlueprintStatus => {
    if (campaignLinks[blueprint.id]) return "assigned";
    const hasContent = blueprint.content && blueprint.content.replace(/<[^>]*>/g, "").trim().length > 0;
    if (hasContent) return "draft";
    return "empty";
  };
  const getContentPreview = (content: string | null) => {
    if (!content) return "No content yet";
    const stripped = content.replace(/<[^>]*>/g, "").trim();
    if (stripped.length > 100) return stripped.slice(0, 100) + "...";
    return stripped || "No content yet";
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isThisYear = date.getFullYear() === now.getFullYear();
    return format(date, isThisYear ? "MMM d" : "MMM d, yyyy");
  };
  const getCompletionScore = (blueprint: Blueprint) => {
    let score = 0;
    let total = 4;
    if (blueprint.content && blueprint.content.replace(/<[^>]*>/g, "").trim().length > 0) score++;
    if (blueprint.hooks && blueprint.hooks.length > 0) score++;
    if (blueprint.talking_points && blueprint.talking_points.length > 0) score++;
    if (blueprint.hashtags && blueprint.hashtags.length > 0) score++;
    return {
      score,
      total,
      percentage: Math.round(score / total * 100)
    };
  };
  if (loading) {
    return <PageLoading />;
  }
  return <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold font-inter tracking-[-0.5px]">Blueprints</h2>
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-0.5">
            Content guidelines for your campaigns
          </p>
        </div>
        <Button data-tour-target="create-blueprint-btn" onClick={() => setTemplateSelectorOpen(true)} size="sm" className="h-9 px-4 gap-2 font-inter tracking-[-0.3px] text-sm">
          New Blueprint

        </Button>
      </div>

      {blueprints.length === 0 ? (
        isDarkMode ? (
          <div className="w-full">
            <iframe
              src="https://join.virality.gg/blueprint-card"
              className="w-full h-[600px] border-0 rounded-2xl"
              title="Blueprint Card"
            />
          </div>
        ) : null
      ) : <div data-tour-target="blueprints-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {blueprints.map(blueprint => {
        const status = getBlueprintStatus(blueprint);
        const statusConfig = getStatusConfig(status);
        const contentPreview = getContentPreview(blueprint.content);
        const completion = getCompletionScore(blueprint);
        const isLinked = !!campaignLinks[blueprint.id];
        return <ContextMenu key={blueprint.id}>
          <ContextMenuTrigger asChild>
            <div onClick={() => openBlueprint(blueprint.id)} className={cn("group relative cursor-pointer", "rounded-2xl border border-border/60", "bg-card/60 backdrop-blur-sm", "hover:bg-card dark:hover:bg-[#0e0e0e]", "transition-all duration-200 ease-out")}>
                <div className="p-4">
                  {/* Header row */}
                  <div className="mb-2">
                    <h3 className="font-medium text-[15px] leading-tight truncate font-inter tracking-[-0.5px]">
                      {blueprint.title || "Untitled"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-xs font-inter tracking-[-0.5px]", statusConfig.textColor)}>
                        {statusConfig.label}
                      </span>
                      {isLinked && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 bg-primary/5 text-primary border-primary/20 font-inter tracking-[-0.5px]">
                          Campaign
                        </Badge>}
                    </div>
                  </div>

                  {/* Content preview */}
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3 font-inter tracking-[-0.5px]">
                    {contentPreview}
                  </p>


                  {/* Footer */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/60 font-inter tracking-[-0.5px]">
                    <div className="flex items-center gap-2">
                      {blueprint.creator && (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={blueprint.creator.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px]">
                              {(blueprint.creator.full_name || blueprint.creator.username || "?")[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-[80px]">
                            {blueprint.creator.full_name || blueprint.creator.username || "Unknown"}
                          </span>
                        </div>
                      )}
                      <span>{formatDistanceToNow(new Date(blueprint.updated_at), { addSuffix: true })}</span>
                    </div>
                    <span>{completion.score}/{completion.total}</span>
                  </div>
                </div>
              </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                openBlueprint(blueprint.id);
              }}
            >
              <Pencil className="mr-2.5 h-4 w-4 text-muted-foreground" />
              Edit
            </ContextMenuItem>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                duplicateBlueprint(blueprint);
              }}
            >
              <Copy className="mr-2.5 h-4 w-4 text-muted-foreground" />
              Duplicate
            </ContextMenuItem>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleActivateBlueprint(blueprint.id);
              }}
              disabled={isLinked}
            >
              <Rocket className="mr-2.5 h-4 w-4 text-muted-foreground" />
              Create Campaign
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                deleteBlueprint(blueprint.id);
              }}
              className="text-red-500 focus:text-red-500 dark:text-red-400 dark:focus:text-red-400"
            >
              <Trash2 className="mr-2.5 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>;
      })}
        </div>}

      {/* Dialogs */}
      <CreateCampaignTypeDialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen} brandId={brandId} subscriptionPlan={brandInfo?.subscriptionPlan} defaultBlueprintId={selectedBlueprintId || undefined} onSelectClipping={handleSelectClipping} onSelectManaged={handleSelectClipping} onSelectBoost={handleSelectBoost} />

      {brandInfo && <CampaignWizard
        brandId={brandId}
        brandName={brandInfo.name}
        brandLogoUrl={brandInfo.logoUrl}
        subscriptionPlan={brandInfo.subscriptionPlan}
        initialBlueprintId={selectedBlueprintId || undefined}
        initialType={wizardType}
        onSuccess={() => setWizardOpen(false)}
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) setWizardType(undefined);
        }}
        mode="create"
      />}

      <TemplateSelector
        open={templateSelectorOpen}
        onOpenChange={setTemplateSelectorOpen}
        onSelectTemplate={handleSelectTemplate}
        onStartBlank={createBlueprint}
        onImportFromGoogleDocs={handleImportFromExternal}
        onImportFromNotion={handleImportFromExternal}
        onGenerateWithAI={handleImportFromExternal}
        brandId={brandId}
      />

      <SubscriptionGateDialog brandId={brandId} open={subscriptionGateOpen} onOpenChange={setSubscriptionGateOpen} />
    </div>;
}