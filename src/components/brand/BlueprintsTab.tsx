import { useState, useEffect } from "react";
import { Plus, Trash2, Clock, Pencil } from "lucide-react";
import editDocumentIcon from "@/assets/edit-document-icon.svg";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignCreationWizard } from "./CampaignCreationWizard";
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
    } = await supabase.from("brands").select("name, logo_url").eq("id", brandId).single();
    if (data) {
      setBrandInfo({
        name: data.name,
        logoUrl: data.logo_url || undefined
      });
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
    setCreateCampaignOpen(true);
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
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-28 rounded-lg" />
            <Skeleton className="h-4 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        
        {/* Blueprint Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="rounded-xl border border-border/30 bg-card/20 overflow-hidden"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Content Preview Skeleton */}
              <div className="p-5 min-h-[120px] border-b border-border/20 space-y-3">
                <Skeleton className="h-3 w-full rounded-md" />
                <Skeleton className="h-3 w-[90%] rounded-md" />
                <Skeleton className="h-3 w-[75%] rounded-md" />
                <Skeleton className="h-3 w-[60%] rounded-md" />
              </div>
              
              {/* Footer Skeleton */}
              <div className="p-4 space-y-3">
                {/* Title */}
                <Skeleton className="h-5 w-3/4 rounded-md" />
                
                {/* Platforms */}
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-7 w-7 rounded-md" />
                  <Skeleton className="h-7 w-7 rounded-md" />
                </div>
                
                {/* Meta Row */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-3 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-12 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Blueprints</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage your campaign briefs
          </p>
        </div>
        <Button onClick={createBlueprint} size="sm" className="gap-2 text-white border-t border-t-[#4b85f7] font-geist font-medium text-sm tracking-[-0.5px] rounded-[10px] bg-[#2060df] py-1.5">
          <Plus className="h-4 w-4" />
          New Blueprint
        </Button>
      </div>

      {blueprints.length === 0 ? <div className="w-full h-[calc(100vh-200px)] min-h-[500px]">
          <iframe src="https://joinvirality.com/blueprint-card" className="w-full h-full border-0 rounded-lg" title="Blueprint Introduction" />
        </div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {blueprints.map(blueprint => {
        const contentPreview = getContentPreview(blueprint.content);
        return <DropdownMenu key={blueprint.id}>
                <DropdownMenuTrigger asChild>
                  <div className="group cursor-pointer rounded-xl border border-border/50 bg-card/30 dark:bg-card/20 transition-all duration-200 hover:border-border hover:shadow-sm overflow-hidden">
                    {/* Content Preview */}
                    <div className="p-5 min-h-[120px] border-b border-border/30">
                      {contentPreview && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4 font-inter tracking-[-0.5px]">
                          {contentPreview}...
                        </p>}
                    </div>

                    {/* Footer */}
                    <div className="p-4 space-y-3 group-hover:bg-[#f5f5f5] dark:group-hover:bg-[#0f0f0f] transition-colors">
                      {/* Title Row */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-[15px] truncate flex-1">
                          {blueprint.title}
                        </h3>
                      </div>

                      {/* Platforms */}
                      {blueprint.platforms && blueprint.platforms.length > 0 && <div className="flex items-center gap-1.5">
                          {blueprint.platforms.map((platform, idx) => <div key={idx} className="p-1.5 rounded-md bg-muted/50">
                              {getPlatformIcon(platform)}
                            </div>)}
                        </div>}

                      {/* Meta Row */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          {userInfo?.avatarUrl ? <img src={userInfo.avatarUrl} alt={userInfo.name} className="h-5 w-5 rounded-full object-cover" /> : <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium font-inter tracking-[-0.5px]">
                              {(userInfo?.name || "U").charAt(0).toUpperCase()}
                            </div>}
                          <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                            {userInfo?.name || "You"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground/70 font-inter tracking-[-0.5px]">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(blueprint.updated_at), 'MMM d')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="bg-popover w-48">
                  <DropdownMenuItem className="focus:bg-muted focus:text-foreground font-inter tracking-[-0.5px]" onClick={() => openBlueprint(blueprint.id)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Blueprint
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-muted focus:text-foreground font-inter tracking-[-0.5px]" onClick={() => handleActivateBlueprint(blueprint.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:bg-muted focus:text-destructive font-inter tracking-[-0.5px]" onClick={() => deleteBlueprint(blueprint.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>;
      })}
        </div>}

      {brandInfo && <CampaignCreationWizard brandId={brandId} brandName={brandInfo.name} brandLogoUrl={brandInfo.logoUrl} onSuccess={() => {}} open={createCampaignOpen} onOpenChange={setCreateCampaignOpen} />}
    </div>;
}