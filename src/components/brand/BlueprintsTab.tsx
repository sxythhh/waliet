import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CampaignCreationWizard } from "./CampaignCreationWizard";
import { CreateCampaignTypeDialog } from "./CreateCampaignTypeDialog";
import { CreateBountyDialog } from "./CreateBountyDialog";
import { TemplateSelector } from "./TemplateSelector";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SubscriptionGateDialog } from "./SubscriptionGateDialog";
import { format } from "date-fns";

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
        label: 'Assigned',
        bgColor: 'bg-emerald-500',
        textColor: 'text-white',
      };
    case 'draft':
      return {
        label: 'Draft',
        bgColor: 'bg-amber-500',
        textColor: 'text-white',
      };
    case 'empty':
    default:
      return {
        label: 'Empty',
        bgColor: 'bg-muted',
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
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [brandInfo, setBrandInfo] = useState<{ name: string; logoUrl?: string } | null>(null);
  const [userInfo, setUserInfo] = useState<{ name: string; avatarUrl?: string } | null>(null);
  const [campaignLinks, setCampaignLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBlueprints();
    fetchBrandInfo();
    fetchUserInfo();
  }, [brandId]);

  const fetchUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) {
        setUserInfo({
          name: data.full_name || data.username || "You",
          avatarUrl: data.avatar_url || undefined,
        });
      }
    }
  };

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
      setSubscriptionStatus(data.subscription_status);
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
      
      // Fetch campaign links for blueprints
      if (data && data.length > 0) {
        const blueprintIds = data.map(b => b.id);
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, blueprint_id")
          .in("blueprint_id", blueprintIds);
        
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
    setSearchParams(prev => {
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
    if (blueprintId) {
      setSelectedBlueprintId(blueprintId);
    }
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
    setSearchParams(prev => {
      prev.set("blueprint", data.id);
      return prev;
    });
  };

  const getBlueprintStatus = (blueprint: Blueprint): BlueprintStatus => {
    // Check if assigned to a campaign
    if (campaignLinks[blueprint.id]) {
      return 'assigned';
    }
    // Check if has content (draft)
    const hasContent = blueprint.content && blueprint.content.replace(/<[^>]*>/g, '').trim().length > 0;
    if (hasContent || (blueprint.platforms && blueprint.platforms.length > 0)) {
      return 'draft';
    }
    // Otherwise empty
    return 'empty';
  };

  const getContentPreview = (content: string | null) => {
    if (!content) return null;
    const stripped = content.replace(/<[^>]*>/g, '').trim();
    return stripped.length > 0 ? stripped.slice(0, 120) : null;
  };

  if (loading) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Blueprints</h2>
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div className="p-1 rounded-full bg-muted/50 hover:bg-muted transition-colors cursor-help">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[280px] p-3">
                <p className="text-sm leading-relaxed">
                  Blueprints are content briefs that outline what creators should produce. Assign them to campaigns to guide creators with talking points, brand voice, and example videos.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button
          onClick={() => setTemplateSelectorOpen(true)}
          size="sm"
          className="gap-2 text-white border-t border-t-[#4b85f7] font-geist font-medium text-sm tracking-[-0.5px] rounded-[10px] bg-[#2060df] py-1.5 hover:bg-[#1a50c8]"
        >
          <Plus className="h-4 w-4" />
          New Blueprint
        </Button>
      </div>

      {blueprints.length === 0 ? (
        <div className="w-full h-[calc(100vh-200px)] min-h-[500px]">
          <iframe
            src="https://join.virality.gg/blueprint-card"
            className="w-full h-full border-0 rounded-lg"
            title="Blueprint Introduction"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {blueprints.map(blueprint => {
            const contentPreview = getContentPreview(blueprint.content);
            const status = getBlueprintStatus(blueprint);
            const statusConfig = getStatusConfig(status);

            return (
              <DropdownMenu key={blueprint.id}>
              <DropdownMenuTrigger asChild>
                  <div className={`group cursor-pointer rounded-xl ${statusConfig.bgColor} flex flex-col h-full`}>
                    {/* Status Label */}
                    <div className="px-4 py-1 text-center">
                      <span className={`text-xs font-medium font-inter tracking-[-0.5px] ${statusConfig.textColor}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Content Card overlaying the status background */}
                    <div className="flex-1 rounded-xl border border-dashed border-border/40 bg-card group-hover:bg-[#0e0e0e] transition-colors duration-200 p-4 flex flex-col">
                      {/* Title */}
                      <h3 className="font-semibold text-base mb-2 truncate font-inter tracking-[-0.3px]">
                        {blueprint.title}
                      </h3>

                      {/* Description Preview */}
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4 min-h-[40px] font-inter tracking-[-0.2px]">
                        {contentPreview || "No content yet..."}
                      </p>

                      {/* Status Badge Row */}
                      <div className="flex items-center justify-end mb-4 flex-1">
                        {status === 'assigned' && (
                          <span className="px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-foreground">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/20">
                        <div className="flex items-center gap-2">
                          {userInfo?.avatarUrl ? (
                            <img
                              src={userInfo.avatarUrl}
                              alt={userInfo.name}
                              className="h-5 w-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                              {(userInfo?.name || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-inter tracking-[-0.5px] text-white">
                            {userInfo?.name || "You"}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                          {format(new Date(blueprint.updated_at), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-44">
                  <DropdownMenuItem
                    onClick={() => openBlueprint(blueprint.id)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleActivateBlueprint(blueprint.id)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Create Campaign
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => deleteBlueprint(blueprint.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
      )}

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