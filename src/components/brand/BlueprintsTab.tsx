import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, FileText, Calendar, Link2, Sparkles, Zap, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CampaignCreationWizard } from "./CampaignCreationWizard";
import { CreateCampaignTypeDialog } from "./CreateCampaignTypeDialog";
import { CreateBountyDialog } from "./CreateBountyDialog";
import { TemplateSelector } from "./TemplateSelector";
import { SubscriptionGateDialog } from "./SubscriptionGateDialog";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import tiktokIcon from "@/assets/tiktok-logo-black.png";
import instagramIcon from "@/assets/instagram-logo-black.png";
import youtubeIcon from "@/assets/youtube-logo-black.png";

interface Blueprint {
  id: string;
  title: string;
  status: string;
  content: string | null;
  platforms: string[] | null;
  hooks: string[] | null;
  talking_points: string[] | null;
  hashtags: string[] | null;
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
      .select("id, title, status, content, platforms, hooks, talking_points, hashtags, created_at, updated_at")
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

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "tiktok":
        return tiktokIcon;
      case "instagram":
      case "instagram reels":
        return instagramIcon;
      case "youtube":
      case "youtube shorts":
        return youtubeIcon;
      default:
        return null;
    }
  };

  const getCompletionScore = (blueprint: Blueprint) => {
    let score = 0;
    let total = 5;
    if (blueprint.content && blueprint.content.replace(/<[^>]*>/g, "").trim().length > 0) score++;
    if (blueprint.platforms && blueprint.platforms.length > 0) score++;
    if (blueprint.hooks && blueprint.hooks.length > 0) score++;
    if (blueprint.talking_points && blueprint.talking_points.length > 0) score++;
    if (blueprint.hashtags && blueprint.hashtags.length > 0) score++;
    return { score, total, percentage: Math.round((score / total) * 100) };
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
            const completion = getCompletionScore(blueprint);
            const isLinked = !!campaignLinks[blueprint.id];

            return (
              <div
                key={blueprint.id}
                onClick={() => openBlueprint(blueprint.id)}
                className={cn(
                  "group relative cursor-pointer",
                  "rounded-2xl border border-border/60",
                  "bg-card/60 backdrop-blur-sm",
                  "hover:bg-card hover:border-border hover:shadow-md",
                  "transition-all duration-200 ease-out"
                )}
              >
                {/* Completion indicator bar */}
                <div className="absolute top-0 left-4 right-4 h-0.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      completion.percentage === 100 ? "bg-emerald-500" :
                      completion.percentage >= 60 ? "bg-amber-500" : "bg-primary/50"
                    )}
                    style={{ width: `${completion.percentage}%` }}
                  />
                </div>

                <div className="p-5 pt-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={cn(
                        "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center",
                        status === "assigned" ? "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5" :
                        status === "draft" ? "bg-gradient-to-br from-amber-500/20 to-amber-500/5" :
                        "bg-muted/50"
                      )}>
                        <FileText className={cn(
                          "w-5 h-5",
                          status === "assigned" ? "text-emerald-600 dark:text-emerald-400" :
                          status === "draft" ? "text-amber-600 dark:text-amber-400" :
                          "text-muted-foreground"
                        )} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-[15px] leading-tight truncate font-inter tracking-[-0.3px]">
                          {blueprint.title || "Untitled"}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig.dotColor)} />
                            <span className={cn("text-xs font-medium", statusConfig.textColor)}>
                              {statusConfig.label}
                            </span>
                          </div>
                          {isLinked && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 bg-primary/5 text-primary border-primary/20">
                              <Link2 className="h-2.5 w-2.5" />
                              Campaign
                            </Badge>
                          )}
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openBlueprint(blueprint.id); }}>
                          Edit blueprint
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleActivateBlueprint(blueprint.id); }}>
                          Create campaign
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); deleteBlueprint(blueprint.id); }}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Platforms */}
                  {blueprint.platforms && blueprint.platforms.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-3">
                      {blueprint.platforms.slice(0, 3).map((platform) => {
                        const icon = getPlatformIcon(platform);
                        return icon ? (
                          <div key={platform} className="w-6 h-6 rounded-md bg-muted/60 flex items-center justify-center" title={platform}>
                            <img src={icon} alt={platform} className="w-3.5 h-3.5 opacity-70" />
                          </div>
                        ) : null;
                      })}
                      {blueprint.platforms.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{blueprint.platforms.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Content preview */}
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3 tracking-[-0.2px]">
                    {contentPreview}
                  </p>

                  {/* Quick stats */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {blueprint.hooks && blueprint.hooks.length > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                        <Sparkles className="h-3 w-3" />
                        <span className="text-[10px] font-medium">{blueprint.hooks.length} hooks</span>
                      </div>
                    )}
                    {blueprint.talking_points && blueprint.talking_points.length > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Zap className="h-3 w-3" />
                        <span className="text-[10px] font-medium">{blueprint.talking_points.length} points</span>
                      </div>
                    )}
                    {blueprint.hashtags && blueprint.hashtags.length > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400">
                        <Hash className="h-3 w-3" />
                        <span className="text-[10px] font-medium">{blueprint.hashtags.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                      <Calendar className="w-3 h-3" />
                      <span>Updated {formatDistanceToNow(new Date(blueprint.updated_at), { addSuffix: true })}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/50">
                      {completion.score}/{completion.total} complete
                    </div>
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
