import { useState, useEffect } from "react";
import { Plus, MoreVertical, Trash2, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignCreationWizard } from "./CampaignCreationWizard";
import tiktokLogo from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-black-new.png";
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

export function BlueprintsTab({ brandId }: BlueprintsTabProps) {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSearchParams] = useSearchParams();
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(null);
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
          avatarUrl: data.avatar_url || undefined
        });
      }
    }
  };

  const fetchBrandInfo = async () => {
    const { data } = await supabase
      .from("brands")
      .select("name, logo_url")
      .eq("id", brandId)
      .single();
    if (data) {
      setBrandInfo({
        name: data.name,
        logoUrl: data.logo_url || undefined
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
    }
    setLoading(false);
  };

  const createBlueprint = async () => {
    const { data, error } = await supabase
      .from("blueprints")
      .insert({
        brand_id: brandId,
        title: "Untitled"
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating blueprint:", error);
      toast.error("Failed to create blueprint");
      return;
    }

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
    setCreateCampaignOpen(true);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'tiktok':
        return <img src={tiktokLogo} alt="TikTok" className="h-4 w-4 dark:invert" />;
      case 'instagram':
        return <img src={instagramLogo} alt="Instagram" className="h-4 w-4" />;
      case 'youtube':
        return <img src={youtubeLogo} alt="YouTube" className="h-4 w-4" />;
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
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[200px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Blueprints</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage your campaign briefs
          </p>
        </div>
        <Button 
          onClick={createBlueprint} 
          size="sm" 
          className="gap-2 text-white border-t border-t-[#4b85f7] font-geist font-medium text-sm tracking-[-0.5px] rounded-[10px] bg-[#2060df] py-1.5"
        >
          <Plus className="h-4 w-4" />
          New Blueprint
        </Button>
      </div>

      {blueprints.length === 0 ? (
        <div className="w-full h-[calc(100vh-200px)] min-h-[500px]">
          <iframe 
            src="https://joinvirality.com/blueprint-card" 
            className="w-full h-full border-0 rounded-lg" 
            title="Blueprint Introduction" 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {blueprints.map(blueprint => {
            const contentPreview = getContentPreview(blueprint.content);
            
            return (
              <div
                key={blueprint.id}
                onClick={() => openBlueprint(blueprint.id)}
                className="group cursor-pointer rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 dark:bg-card/20 dark:hover:bg-card/40 transition-all duration-200 hover:border-border hover:shadow-sm overflow-hidden"
              >
                {/* Content Preview */}
                <div className="p-5 min-h-[120px] border-b border-border/30">
                  {contentPreview ? (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                      {contentPreview}...
                    </p>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-4 text-muted-foreground/50">
                      <FileText className="h-8 w-8 mb-2" />
                      <span className="text-xs">No content yet</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 space-y-3">
                  {/* Title Row */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-[15px] truncate flex-1">
                      {blueprint.title}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0 hover:bg-muted transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem 
                          className="focus:bg-muted focus:text-foreground" 
                          onClick={e => {
                            e.stopPropagation();
                            handleActivateBlueprint(blueprint.id);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Campaign
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:bg-muted focus:text-destructive" 
                          onClick={e => {
                            e.stopPropagation();
                            deleteBlueprint(blueprint.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Platforms */}
                  {blueprint.platforms && blueprint.platforms.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {blueprint.platforms.map((platform, idx) => (
                        <div 
                          key={idx} 
                          className="p-1.5 rounded-md bg-muted/50"
                        >
                          {getPlatformIcon(platform)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meta Row */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      {userInfo?.avatarUrl ? (
                        <img 
                          src={userInfo.avatarUrl} 
                          alt={userInfo.name} 
                          className="h-5 w-5 rounded-full object-cover" 
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                          {(userInfo?.name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {userInfo?.name || "You"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(blueprint.updated_at), 'MMM d')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {brandInfo && (
        <CampaignCreationWizard 
          brandId={brandId} 
          brandName={brandInfo.name} 
          brandLogoUrl={brandInfo.logoUrl} 
          onSuccess={() => {}} 
          open={createCampaignOpen} 
          onOpenChange={setCreateCampaignOpen} 
        />
      )}
    </div>
  );
}
