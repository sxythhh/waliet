import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignCreationWizard } from "./CampaignCreationWizard";
import { CreateCampaignTypeDialog } from "./CreateCampaignTypeDialog";
import { CreateBountyDialog } from "./CreateBountyDialog";
import { TemplateSelector } from "./TemplateSelector";
import { SubscriptionGateDialog } from "./SubscriptionGateDialog";
import { useTheme } from "@/components/ThemeProvider";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import { format } from "date-fns";
interface Blueprint {
  id: string;
  title: string;
  status: string;
  content: string | null;
  platforms: string[] | null;
  created_at: string;
  updated_at: string;
}
interface BlueprintsTabProps {
  brandId: string;
}
export function BlueprintsTab({
  brandId
}: BlueprintsTabProps) {
  const {
    resolvedTheme
  } = useTheme();
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
  const [brandInfo, setBrandInfo] = useState<{
    name: string;
    logoUrl?: string;
  } | null>(null);
  const [userInfo, setUserInfo] = useState<{
    name: string;
    avatarUrl?: string;
  } | null>(null);
  useEffect(() => {
    fetchBlueprints();
    fetchBrandInfo();
    fetchUserInfo();
  }, [brandId]);
  const fetchUserInfo = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (user) {
      const {
        data
      } = await supabase.from("profiles").select("full_name, username, avatar_url").eq("id", user.id).single();
      if (data) {
        setUserInfo({
          name: data.full_name || data.username || "You",
          avatarUrl: data.avatar_url || undefined
        });
      }
    }
  };
  const fetchBrandInfo = async () => {
    const {
      data
    } = await supabase.from("brands").select("name, logo_url, subscription_status").eq("id", brandId).single();
    if (data) {
      setBrandInfo({
        name: data.name,
        logoUrl: data.logo_url || undefined
      });
      setSubscriptionStatus(data.subscription_status);
    }
  };
  const fetchBlueprints = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("blueprints").select("id, title, status, content, platforms, created_at, updated_at").eq("brand_id", brandId).order("updated_at", {
      ascending: false
    });
    if (error) {
      console.error("Error fetching blueprints:", error);
      toast.error("Failed to load blueprints");
    } else {
      setBlueprints(data || []);
    }
    setLoading(false);
  };
  const createBlueprint = async () => {
    const {
      data,
      error
    } = await supabase.from("blueprints").insert({
      brand_id: brandId,
      title: "Untitled"
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
    const {
      data,
      error
    } = await supabase.from("blueprints").insert({
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
      content_guidelines: template.content_guidelines
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
  const getPlatformIcon = (platform: string) => {
    const isDark = resolvedTheme === 'dark';
    switch (platform?.toLowerCase()) {
      case 'tiktok':
        return <img src={isDark ? tiktokLogoWhite : tiktokLogoBlack} alt="TikTok" className="h-4 w-4" />;
      case 'instagram':
        return <img src={isDark ? instagramLogoWhite : instagramLogoBlack} alt="Instagram" className="h-4 w-4" />;
      case 'youtube':
        return <img src={isDark ? youtubeLogoWhite : youtubeLogoBlack} alt="YouTube" className="h-4 w-4" />;
      default:
        return null;
    }
  };
  const getContentPreview = (content: string | null) => {
    if (!content) return null;
    const stripped = content.replace(/<[^>]*>/g, '').trim();
    return stripped.length > 0 ? stripped.slice(0, 180) : null;
  };
  if (loading) {
    return null;
  }
  return <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Blueprints</h2>
          
        </div>
        <Button onClick={() => setTemplateSelectorOpen(true)} size="sm" className="gap-2 text-white border-t border-t-[#4b85f7] font-geist font-medium text-sm tracking-[-0.5px] rounded-[10px] bg-[#2060df] py-1.5 hover:bg-[#1a50c8]">
          <Plus className="h-4 w-4" />
          New Blueprint
        </Button>
      </div>

      {blueprints.length === 0 ? <div className="w-full h-[calc(100vh-200px)] min-h-[500px]">
          <iframe src="https://join.virality.gg/blueprint-card" className="w-full h-full border-0 rounded-lg" title="Blueprint Introduction" />
        </div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {blueprints.map(blueprint => {
        const contentPreview = getContentPreview(blueprint.content);
        const hasContent = !!contentPreview;
        return <DropdownMenu key={blueprint.id}>
                <DropdownMenuTrigger asChild>
                  <div className="group cursor-pointer rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-150 p-4">
                    {/* Title & Platforms Row */}
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h3 className="font-medium text-sm truncate flex-1 font-inter tracking-[-0.3px]">
                        {blueprint.title}
                      </h3>
                      {blueprint.platforms && blueprint.platforms.length > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {blueprint.platforms.slice(0, 3).map((platform, idx) => (
                            <div key={idx} className="opacity-60">
                              {getPlatformIcon(platform)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Content Preview or Empty State */}
                    <div className="mb-3">
                      {hasContent ? (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 font-inter tracking-[-0.3px]">
                          {contentPreview}
                        </p>
                      ) : (
                        <span className="text-xs italic text-muted-foreground/40 font-inter tracking-[-0.3px]">No content yet</span>
                      )}
                    </div>

                    {/* Meta Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {userInfo?.avatarUrl ? (
                          <img src={userInfo.avatarUrl} alt={userInfo.name} className="h-4 w-4 rounded-full object-cover" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium font-inter">
                            {(userInfo?.name || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-[11px] text-foreground font-inter tracking-[-0.3px]">
                          {userInfo?.name || "You"}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground/50 font-inter tracking-[-0.3px]">
                        {format(new Date(blueprint.updated_at), 'MMM d')}
                      </span>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="bg-popover w-44">
                  <DropdownMenuItem className="focus:bg-muted focus:text-foreground font-inter tracking-[-0.5px] text-sm" onClick={() => openBlueprint(blueprint.id)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-muted focus:text-foreground font-inter tracking-[-0.5px] text-sm" onClick={() => handleActivateBlueprint(blueprint.id)}>
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Create Campaign
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:bg-muted focus:text-destructive font-inter tracking-[-0.5px] text-sm" onClick={() => deleteBlueprint(blueprint.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>;
      })}
        </div>}

      <CreateCampaignTypeDialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen} brandId={brandId} defaultBlueprintId={selectedBlueprintId || undefined} onSelectClipping={handleSelectClipping} onSelectManaged={handleSelectClipping} onSelectBoost={handleSelectBoost} />

      {brandInfo && <CampaignCreationWizard brandId={brandId} brandName={brandInfo.name} brandLogoUrl={brandInfo.logoUrl} initialBlueprintId={selectedBlueprintId || undefined} onSuccess={() => {}} open={createCampaignOpen} onOpenChange={setCreateCampaignOpen} />}
      
      {brandInfo && <CreateBountyDialog brandId={brandId} open={createBoostOpen} onOpenChange={setCreateBoostOpen} onSuccess={() => setCreateBoostOpen(false)} />}

      <TemplateSelector open={templateSelectorOpen} onOpenChange={setTemplateSelectorOpen} onSelectTemplate={handleSelectTemplate} onStartBlank={createBlueprint} />

      <SubscriptionGateDialog brandId={brandId} open={subscriptionGateOpen} onOpenChange={setSubscriptionGateOpen} />
    </div>;
}