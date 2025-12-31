import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CampaignCreationWizard } from "./CampaignCreationWizard";
import { CreateCampaignTypeDialog } from "./CreateCampaignTypeDialog";
import { CreateBountyDialog } from "./CreateBountyDialog";
import { TemplateSelector } from "./TemplateSelector";
import { SubscriptionGateDialog } from "./SubscriptionGateDialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Blueprint {
  id: string;
  title: string;
  status: string;
  content: string | null;
  platforms: string[] | null;
  created_at: string;
  updated_at: string;
  campaign_id?: string | null;
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
        textColor: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'draft':
      return {
        label: 'Draft',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-600 dark:text-amber-400',
      };
    case 'empty':
    default:
      return {
        label: 'Empty',
        dotColor: 'bg-muted-foreground/40',
        textColor: 'text-muted-foreground',
      };
  }
};

export function BlueprintsTab({ brandId }: BlueprintsTabProps) {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSearchParams] = useSearchParams();
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [createBoostOpen, setCreateBoostOpen] = useState(false);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(null);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [subscriptionGateOpen, setSubscriptionGateOpen] = useState(false);
  const [brandInfo, setBrandInfo] = useState<{ name: string; logoUrl?: string } | null>(null);
  const [campaignLinks, setCampaignLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBlueprints();
    fetchBrandInfo();
  }, [brandId]);

  const fetchBrandInfo = async () => {
    const { data } = await supabase
      .from("brands")
      .select("name, logo_url, subscription_status")
      .eq("id", brandId)
      .single();
    if (data) {
      setBrandInfo({
        name: data.name,
        logoUrl: data.logo_url || undefined,
      });
    }
  };

  const fetchBlueprints = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blueprints")
      .select("id, title, status, content, platforms, created_at, updated_at")
      .eq("brand_id", brandId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching blueprints:", error);
      toast.error("Failed to load blueprints");
    } else {
      setBlueprints(data || []);
      if (data && data.length > 0) {
        const blueprintIds = data.map((b) => b.id);
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, blueprint_id")
          .in("blueprint_id", blueprintIds);
        if (campaigns) {
          const links: Record<string, string> = {};
          campaigns.forEach((c) => {
            if (c.blueprint_id) links[c.blueprint_id] = c.id;
          });
          setCampaignLinks(links);
        }
      }
    }
    setLoading(false);
  };

  const createBlueprint = async () => {
    const { data, error } = await supabase
      .from("blueprints")
      .insert({ brand_id: brandId, title: "Untitled" })
      .select()
      .single();

    if (error) {
      console.error("Error creating blueprint:", error);
      toast.error("Failed to create blueprint");
      return;
    }
    setTemplateSelectorOpen(false);
    setSearchParams((prev) => {
      prev.set("blueprint", data.id);
      return prev;
    });
  };

  const deleteBlueprint = async (id: string) => {
    const { error } = await supabase.from("blueprints").delete().eq("id", id);
    if (error) {
      console.error("Error deleting blueprint:", error);
      toast.error("Failed to delete blueprint");
      return;
    }
    toast.success("Blueprint deleted");
    fetchBlueprints();
  };

  const openBlueprint = (id: string) => {
    setSearchParams((prev) => {
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
    setCreateCampaignOpen(true);
  };

  const handleSelectBoost = () => {
    setTypeDialogOpen(false);
    setCreateBoostOpen(true);
  };

  const handleSelectTemplate = async (template: any) => {
    const { data, error } = await supabase
      .from("blueprints")
      .insert({
        brand_id: brandId,
        title: template.title || "Untitled",
        content: template.content,
        platforms: template.platforms,
        hooks: template.hooks,
        talking_points: template.talking_points,
        dos_and_donts: template.dos_and_donts,
        call_to_action: template.call_to_action,
        hashtags: template.hashtags,
        brand_voice: template.brand_voice,
        target_personas: template.target_personas,
        assets: template.assets,
        example_videos: template.example_videos,
        content_guidelines: template.content_guidelines,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating blueprint from template:", error);
      toast.error("Failed to create blueprint");
      return;
    }
    setTemplateSelectorOpen(false);
    setSearchParams((prev) => {
      prev.set("blueprint", data.id);
      return prev;
    });
  };

  const getBlueprintStatus = (blueprint: Blueprint): BlueprintStatus => {
    if (campaignLinks[blueprint.id]) return "assigned";
    const hasContent =
      blueprint.content && blueprint.content.replace(/<[^>]*>/g, "").trim().length > 0;
    if (hasContent || (blueprint.platforms && blueprint.platforms.length > 0))
      return "draft";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Blueprints</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Content guidelines for your campaigns
          </p>
        </div>
        <Button
          onClick={() => setTemplateSelectorOpen(true)}
          size="sm"
          className="gap-2 rounded-full px-4"
        >
          <Plus className="h-4 w-4" />
          New Blueprint
        </Button>
      </div>

      {blueprints.length === 0 ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center py-20 px-6",
            "rounded-2xl border border-dashed border-border/50",
            "bg-muted/20"
          )}
        >
          <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1">No blueprints yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-5">
            Create your first blueprint to define content guidelines for creators
          </p>
          <Button
            onClick={() => setTemplateSelectorOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
          >
            <Plus className="w-4 h-4" />
            Create Blueprint
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {blueprints.map((blueprint) => {
            const status = getBlueprintStatus(blueprint);
            const statusConfig = getStatusConfig(status);
            const contentPreview = getContentPreview(blueprint.content);

            return (
              <div
                key={blueprint.id}
                onClick={() => openBlueprint(blueprint.id)}
                className={cn(
                  "group relative cursor-pointer",
                  "rounded-2xl border border-border/60",
                  "bg-card/60 backdrop-blur-sm",
                  "hover:bg-card hover:border-border hover:shadow-sm",
                  "transition-all duration-200 ease-out"
                )}
              >
                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-[15px] leading-tight truncate">
                          {blueprint.title || "Untitled"}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              statusConfig.dotColor
                            )}
                          />
                          <span className={cn("text-xs", statusConfig.textColor)}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8 -mr-1",
                            "opacity-0 group-hover:opacity-100",
                            "transition-opacity duration-150"
                          )}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            openBlueprint(blueprint.id);
                          }}
                        >
                          Edit blueprint
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivateBlueprint(blueprint.id);
                          }}
                        >
                          Create campaign
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBlueprint(blueprint.id);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Content preview */}
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                    {contentPreview}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(blueprint.updated_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateCampaignTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        brandId={brandId}
        defaultBlueprintId={selectedBlueprintId || undefined}
        onSelectClipping={handleSelectClipping}
        onSelectManaged={handleSelectClipping}
        onSelectBoost={handleSelectBoost}
      />

      {brandInfo && (
        <CampaignCreationWizard
          brandId={brandId}
          brandName={brandInfo.name}
          brandLogoUrl={brandInfo.logoUrl}
          initialBlueprintId={selectedBlueprintId || undefined}
          onSuccess={() => {}}
          open={createCampaignOpen}
          onOpenChange={setCreateCampaignOpen}
        />
      )}

      {brandInfo && (
        <CreateBountyDialog
          brandId={brandId}
          open={createBoostOpen}
          onOpenChange={setCreateBoostOpen}
          onSuccess={() => setCreateBoostOpen(false)}
        />
      )}

      <TemplateSelector
        open={templateSelectorOpen}
        onOpenChange={setTemplateSelectorOpen}
        onSelectTemplate={handleSelectTemplate}
        onStartBlank={createBlueprint}
      />

      <SubscriptionGateDialog
        brandId={brandId}
        open={subscriptionGateOpen}
        onOpenChange={setSubscriptionGateOpen}
      />
    </div>
  );
}
