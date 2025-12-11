import { useState, useEffect } from "react";
import { Plus, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignCreationWizard } from "./CampaignCreationWizard";
import tiktokLogo from "@/assets/tiktok-logo-black.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";

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
  const [brandInfo, setBrandInfo] = useState<{ name: string; logoUrl?: string } | null>(null);
  const [userInfo, setUserInfo] = useState<{ name: string; avatarUrl?: string } | null>(null);

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
      setBrandInfo({ name: data.name, logoUrl: data.logo_url || undefined });
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
      .insert({ brand_id: brandId, title: "Untitled" })
      .select()
      .single();

    if (error) {
      console.error("Error creating blueprint:", error);
      toast.error("Failed to create blueprint");
      return;
    }

    // Navigate to the new blueprint
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

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Blueprints</h2>
        <Button onClick={createBlueprint} size="sm" className="gap-2 text-white border-t border-t-[#4b85f7] font-geist font-medium text-sm tracking-[-0.5px] rounded-[10px] bg-[#2060df] py-1.5">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {blueprints.map((blueprint) => (
            <Card
              key={blueprint.id}
              className="cursor-pointer bg-[#f5f5f5] hover:bg-[#e8e8e8] dark:bg-[#0e0e0e] dark:hover:bg-[#141414] transition-colors group border-0"
              onClick={() => openBlueprint(blueprint.id)}
            >
              {/* Content Preview Area */}
              <div 
                className="mx-[10px] mt-[10px] p-4 rounded-t-md min-h-[100px] bg-[#e8e8e8] dark:bg-[#181717] border-t border-[#d0d0d0] dark:border-[#312f2f]"
              >
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {blueprint.content ? blueprint.content.replace(/<[^>]*>/g, '').slice(0, 250) + '...' : 'No content yet...'}
                </p>
              </div>

              {/* Title, User Info, and Actions */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-base truncate flex-1 mr-2">{blueprint.title}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0 hover:bg-muted"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem
                        className="focus:bg-muted focus:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivateBlueprint(blueprint.id);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Campaign
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:bg-muted focus:text-destructive"
                        onClick={(e) => {
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
                
                {/* Platform Icons */}
                {blueprint.platforms && blueprint.platforms.length > 0 && (
                  <div className="flex items-center gap-2">
                    {blueprint.platforms.map((platform) => (
                      <div key={platform} className="flex items-center">
                        {getPlatformIcon(platform)}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  {userInfo?.avatarUrl ? (
                    <img 
                      src={userInfo.avatarUrl} 
                      alt={userInfo.name} 
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {(userInfo?.name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-muted-foreground">{userInfo?.name || "You"}</span>
                </div>
              </div>
            </Card>
          ))}
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
