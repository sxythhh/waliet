import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Link as LinkIcon, Plus, Trash2, X, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { debounce } from "@/lib/utils";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useTheme } from "@/components/ThemeProvider";
import { CampaignCreationWizard } from "@/components/brand/CampaignCreationWizard";
import { TemplateSelector } from "@/components/brand/TemplateSelector";

// Light mode logos (dark logos for light backgrounds)
import tiktokLogoLight from "@/assets/tiktok-logo-black-new.png";
import instagramLogoLight from "@/assets/instagram-logo-black.png";
import youtubeLogoLight from "@/assets/youtube-logo-black-new.png";
import xLogoLight from "@/assets/x-logo.png";

// Dark mode logos (white logos for dark backgrounds)
import tiktokLogoDark from "@/assets/tiktok-logo-white.png";
import instagramLogoDark from "@/assets/instagram-logo-white.png";
import youtubeLogoDark from "@/assets/youtube-logo-white.png";
import xLogoDark from "@/assets/x-logo-light.png";
interface Asset {
  link: string;
  notes: string;
}
interface Persona {
  name: string;
  target_audience: string;
  description: string;
}
interface ExampleVideo {
  url: string;
  description: string;
}
interface Blueprint {
  id: string;
  brand_id: string;
  title: string;
  content: string | null;
  assets: Asset[];
  platforms: string[];
  target_personas: Persona[];
  hooks: string[];
  content_guidelines: string | null;
  dos_and_donts: {
    dos: string[];
    donts: string[];
  };
  call_to_action: string | null;
  hashtags: string[];
  example_videos: ExampleVideo[];
  talking_points: string[];
  brand_voice: string | null;
  status: string;
}
interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}
interface BlueprintEditorProps {
  blueprintId: string;
  brandId: string;
}
const getPlatforms = (isDark: boolean) => [{
  id: "tiktok",
  label: "TikTok",
  logo: isDark ? tiktokLogoDark : tiktokLogoLight
}, {
  id: "instagram",
  label: "Instagram",
  logo: isDark ? instagramLogoDark : instagramLogoLight
}, {
  id: "youtube",
  label: "YouTube",
  logo: isDark ? youtubeLogoDark : youtubeLogoLight
}, {
  id: "x",
  label: "X",
  logo: isDark ? xLogoDark : xLogoLight
}];
export function BlueprintEditor({
  blueprintId,
  brandId
}: BlueprintEditorProps) {
  const [, setSearchParams] = useSearchParams();
  const {
    resolvedTheme
  } = useTheme();
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newHashtag, setNewHashtag] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const isDark = resolvedTheme === "dark";
  const PLATFORMS = getPlatforms(isDark);
  useEffect(() => {
    fetchBlueprintAndBrand();
  }, [blueprintId, brandId]);
  const fetchBlueprintAndBrand = async () => {
    setLoading(true);
    const [blueprintRes, brandRes] = await Promise.all([supabase.from("blueprints").select("*").eq("id", blueprintId).single(), supabase.from("brands").select("id, name, logo_url").eq("id", brandId).single()]);
    if (blueprintRes.error) {
      console.error("Error fetching blueprint:", blueprintRes.error);
      toast.error("Failed to load blueprint");
      goBack();
      return;
    }
    const data = blueprintRes.data as any;
    setBlueprint({
      ...data,
      assets: data.assets as Asset[] || [],
      target_personas: data.target_personas as Persona[] || [],
      platforms: data.platforms || [],
      hooks: data.hooks as string[] || [],
      dos_and_donts: data.dos_and_donts as {
        dos: string[];
        donts: string[];
      } || {
        dos: [],
        donts: []
      },
      hashtags: data.hashtags || [],
      example_videos: data.example_videos as ExampleVideo[] || [],
      talking_points: data.talking_points as string[] || []
    });
    if (brandRes.data) {
      setBrand(brandRes.data);
    }
    setLoading(false);
  };
  const saveBlueprint = useCallback(debounce(async (updates: Partial<Blueprint>) => {
    setSaving(true);
    const {
      error
    } = await supabase.from("blueprints").update(updates as any).eq("id", blueprintId);
    if (error) {
      console.error("Error saving blueprint:", error);
      toast.error("Failed to save changes");
    }
    setSaving(false);
  }, 500), [blueprintId]);
  const updateBlueprint = (updates: Partial<Blueprint>) => {
    if (!blueprint) return;
    const newBlueprint = {
      ...blueprint,
      ...updates
    };
    setBlueprint(newBlueprint);
    saveBlueprint(updates);
  };
  const goBack = () => {
    setSearchParams(prev => {
      prev.delete("blueprint");
      return prev;
    });
  };
  const activateBlueprint = () => {
    setShowCampaignWizard(true);
  };

  // Asset functions
  const addAsset = () => {
    const newAssets = [...(blueprint?.assets || []), {
      link: "",
      notes: ""
    }];
    updateBlueprint({
      assets: newAssets
    });
  };
  const updateAsset = (index: number, field: keyof Asset, value: string) => {
    const newAssets = [...(blueprint?.assets || [])];
    newAssets[index] = {
      ...newAssets[index],
      [field]: value
    };
    updateBlueprint({
      assets: newAssets
    });
  };
  const removeAsset = (index: number) => {
    const newAssets = blueprint?.assets.filter((_, i) => i !== index) || [];
    updateBlueprint({
      assets: newAssets
    });
  };

  // Platform toggle
  const togglePlatform = (platformId: string) => {
    const platforms = blueprint?.platforms || [];
    const newPlatforms = platforms.includes(platformId) ? platforms.filter(p => p !== platformId) : [...platforms, platformId];
    updateBlueprint({
      platforms: newPlatforms
    });
  };

  // Persona functions
  const addPersona = () => {
    const newPersonas = [...(blueprint?.target_personas || []), {
      name: `Persona #${(blueprint?.target_personas?.length || 0) + 1}`,
      target_audience: "",
      description: ""
    }];
    updateBlueprint({
      target_personas: newPersonas
    });
  };
  const updatePersona = (index: number, field: keyof Persona, value: string) => {
    const newPersonas = [...(blueprint?.target_personas || [])];
    newPersonas[index] = {
      ...newPersonas[index],
      [field]: value
    };
    updateBlueprint({
      target_personas: newPersonas
    });
  };
  const removePersona = (index: number) => {
    const newPersonas = blueprint?.target_personas.filter((_, i) => i !== index) || [];
    updateBlueprint({
      target_personas: newPersonas
    });
  };

  // Hook functions
  const addHook = () => {
    const newHooks = [...(blueprint?.hooks || []), ""];
    updateBlueprint({
      hooks: newHooks
    });
  };
  const updateHook = (index: number, value: string) => {
    const newHooks = [...(blueprint?.hooks || [])];
    newHooks[index] = value;
    updateBlueprint({
      hooks: newHooks
    });
  };
  const removeHook = (index: number) => {
    const newHooks = blueprint?.hooks.filter((_, i) => i !== index) || [];
    updateBlueprint({
      hooks: newHooks
    });
  };

  // Do's and Don'ts functions
  const addDo = () => {
    const dos = [...(blueprint?.dos_and_donts.dos || []), ""];
    updateBlueprint({
      dos_and_donts: {
        ...blueprint!.dos_and_donts,
        dos
      }
    });
  };
  const addDont = () => {
    const donts = [...(blueprint?.dos_and_donts.donts || []), ""];
    updateBlueprint({
      dos_and_donts: {
        ...blueprint!.dos_and_donts,
        donts
      }
    });
  };
  const updateDo = (index: number, value: string) => {
    const dos = [...(blueprint?.dos_and_donts.dos || [])];
    dos[index] = value;
    updateBlueprint({
      dos_and_donts: {
        ...blueprint!.dos_and_donts,
        dos
      }
    });
  };
  const updateDont = (index: number, value: string) => {
    const donts = [...(blueprint?.dos_and_donts.donts || [])];
    donts[index] = value;
    updateBlueprint({
      dos_and_donts: {
        ...blueprint!.dos_and_donts,
        donts
      }
    });
  };
  const removeDo = (index: number) => {
    const dos = blueprint?.dos_and_donts.dos.filter((_, i) => i !== index) || [];
    updateBlueprint({
      dos_and_donts: {
        ...blueprint!.dos_and_donts,
        dos
      }
    });
  };
  const removeDont = (index: number) => {
    const donts = blueprint?.dos_and_donts.donts.filter((_, i) => i !== index) || [];
    updateBlueprint({
      dos_and_donts: {
        ...blueprint!.dos_and_donts,
        donts
      }
    });
  };

  // Hashtag functions
  const addHashtag = () => {
    if (!newHashtag.trim()) return;
    const tag = newHashtag.startsWith("#") ? newHashtag : `#${newHashtag}`;
    const hashtags = [...(blueprint?.hashtags || []), tag];
    updateBlueprint({
      hashtags
    });
    setNewHashtag("");
  };
  const removeHashtag = (index: number) => {
    const hashtags = blueprint?.hashtags.filter((_, i) => i !== index) || [];
    updateBlueprint({
      hashtags
    });
  };

  // Talking points functions
  const addTalkingPoint = () => {
    const newPoints = [...(blueprint?.talking_points || []), ""];
    updateBlueprint({
      talking_points: newPoints
    });
  };
  const updateTalkingPoint = (index: number, value: string) => {
    const newPoints = [...(blueprint?.talking_points || [])];
    newPoints[index] = value;
    updateBlueprint({
      talking_points: newPoints
    });
  };
  const removeTalkingPoint = (index: number) => {
    const newPoints = blueprint?.talking_points.filter((_, i) => i !== index) || [];
    updateBlueprint({
      talking_points: newPoints
    });
  };

  // Example video functions
  const addExampleVideo = () => {
    const newVideos = [...(blueprint?.example_videos || []), {
      url: "",
      description: ""
    }];
    updateBlueprint({
      example_videos: newVideos
    });
  };
  const updateExampleVideo = (index: number, field: keyof ExampleVideo, value: string) => {
    const newVideos = [...(blueprint?.example_videos || [])];
    newVideos[index] = {
      ...newVideos[index],
      [field]: value
    };
    updateBlueprint({
      example_videos: newVideos
    });
  };
  const removeExampleVideo = (index: number) => {
    const newVideos = blueprint?.example_videos.filter((_, i) => i !== index) || [];
    updateBlueprint({
      example_videos: newVideos
    });
  };
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video must be under 100MB");
      return;
    }
    setUploadingVideo(true);
    setUploadingFileName(file.name);
    setUploadProgress(0);

    // Simulate progress for better UX (since Supabase doesn't provide real progress)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${blueprintId}/${Date.now()}.${fileExt}`;
      const {
        error: uploadError
      } = await supabase.storage.from("blueprint-videos").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false
      });
      clearInterval(progressInterval);
      if (uploadError) {
        setUploadProgress(0);
        if (uploadError.message.includes("Bucket not found")) {
          toast.error("Video storage not configured. Please contact support.");
        } else {
          toast.error("Failed to upload video");
        }
        console.error("Upload error:", uploadError);
        return;
      }
      setUploadProgress(100);
      const {
        data: urlData
      } = supabase.storage.from("blueprint-videos").getPublicUrl(fileName);

      // Add the video to example_videos
      const newVideos = [...(blueprint?.example_videos || []), {
        url: urlData.publicUrl,
        description: ""
      }];
      updateBlueprint({
        example_videos: newVideos
      });
      toast.success("Video uploaded successfully");
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Upload error:", error);
      toast.error("Failed to upload video");
    } finally {
      setTimeout(() => {
        setUploadingVideo(false);
        setUploadProgress(0);
        setUploadingFileName("");
      }, 500);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  };
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };
  if (loading) {
    return <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>;
  }
  if (!blueprint) return null;
  return <>
      <div className="h-full p-[5px]">
        <div className="h-full flex flex-col bg-background border border-[#141414] rounded-[20px] overflow-hidden">
          {/* Header - Fixed */}
          <div className="sticky top-0 z-10 flex items-center justify-between py-4 bg-background border-b border-[#141414] px-[14px]">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="flex items-center gap-2 font-inter tracking-[-0.5px] text-white hover:opacity-80 transition-opacity">
                <ArrowLeft className="h-4 w-4 text-white" />
                Return
              </button>
              <div className="h-4 w-px bg-border/50" />
              {brand?.logo_url && <img src={brand.logo_url} alt={brand.name} className="h-6 w-6 rounded object-cover" />}
              <span className="text-muted-foreground text-sm font-inter tracking-[-0.5px]">{brand?.name}</span>
              <span className="text-muted-foreground/50">/</span>
              <Input value={blueprint.title} onChange={e => updateBlueprint({
              title: e.target.value
            })} className="h-8 w-56 bg-transparent border-none focus-visible:ring-0 px-1 text-foreground font-medium font-inter tracking-[-0.5px]" placeholder="Untitled" />
              {saving && <span className="text-xs text-muted-foreground animate-pulse font-inter tracking-[-0.5px]">Saving...</span>}
            </div>
            <button onClick={activateBlueprint} className="px-4 py-2 rounded-md bg-[#296BF0] border-t border-[#4A83FF] text-white font-inter tracking-[-0.5px] text-sm hover:opacity-90 transition-opacity">
              Create Campaign
            </button>
          </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          
          {/* Template Selector */}
          <section className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border/50 bg-card/20">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                Want to save time? Start with a pre-built template
              </p>
            </div>
            <TemplateSelector onSelectTemplate={template => {
                updateBlueprint({
                  content: template.content || blueprint.content,
                  platforms: template.platforms || blueprint.platforms,
                  hooks: template.hooks || blueprint.hooks,
                  talking_points: template.talking_points || blueprint.talking_points,
                  dos_and_donts: template.dos_and_donts || blueprint.dos_and_donts,
                  call_to_action: template.call_to_action || blueprint.call_to_action,
                  hashtags: template.hashtags || blueprint.hashtags,
                  brand_voice: template.brand_voice || blueprint.brand_voice,
                  target_personas: template.target_personas || blueprint.target_personas,
                  assets: template.assets || blueprint.assets,
                  example_videos: template.example_videos || blueprint.example_videos,
                  content_guidelines: template.content_guidelines || blueprint.content_guidelines
                });
                toast.success("Template applied!");
              }} />
          </section>

          {/* Main Content - Rich Text Editor */}
          <section className="space-y-2">
            <label className="text-xs font-inter tracking-[-0.5px] text-foreground">Brief Content</label>
            <div className="rounded-md bg-muted/20 overflow-hidden">
              <RichTextEditor content={blueprint.content || ""} onChange={content => updateBlueprint({
                  content
                })} placeholder="Write your campaign brief content here..." />
            </div>
          </section>

          {/* Platforms */}
          <section className="space-y-2">
            <label className="text-xs font-inter tracking-[-0.5px] text-foreground">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(platform => {
                  const isSelected = blueprint.platforms.includes(platform.id);
                  return <button key={platform.id} onClick={() => togglePlatform(platform.id)} className={`
                      flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-150 font-inter tracking-[-0.5px] text-sm
                      ${isSelected ? "bg-muted text-foreground" : "bg-muted/20 text-muted-foreground hover:bg-muted/40"}
                    `}>
                    <img src={platform.logo} alt={platform.label} className="h-4 w-4 object-contain" />
                    <span className="font-medium text-primary-foreground">{platform.label}</span>
                  </button>;
                })}
            </div>
          </section>

          {/* Brand Voice */}
          <section className="space-y-2">
            <label className="text-xs font-inter tracking-[-0.5px] text-foreground">Brand Voice</label>
            <Textarea value={blueprint.brand_voice || ""} onChange={e => updateBlueprint({
                brand_voice: e.target.value
              })} placeholder="Describe the brand's tone and voice (e.g., casual, professional, witty, educational...)" className="min-h-[80px] resize-none bg-muted/20 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm" />
          </section>

          {/* Hooks */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-inter tracking-[-0.5px] text-foreground">Hooks</label>
              <Button variant="ghost" size="sm" onClick={addHook} className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-1.5">
              {blueprint.hooks.length === 0 ? <div className="rounded-md bg-muted/20 py-6 text-center text-muted-foreground text-sm font-inter tracking-[-0.5px]">
                  Add attention-grabbing hooks for creators to use
                </div> : blueprint.hooks.map((hook, index) => <div key={index} className="flex items-center gap-1.5 group">
                    <Input value={hook} onChange={e => updateHook(index, e.target.value)} placeholder={`Hook #${index + 1} - e.g., "Wait until you see this..."`} className="flex-1 h-9 bg-muted/20 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm" />
                    <Button variant="ghost" size="icon" onClick={() => removeHook(index)} className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted/30">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>)}
            </div>
          </section>

          {/* Talking Points */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-inter tracking-[-0.5px] text-foreground">Talking Points</label>
              <Button variant="ghost" size="sm" onClick={addTalkingPoint} className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-1.5">
              {blueprint.talking_points.length === 0 ? <div className="rounded-md bg-muted/20 py-6 text-center text-muted-foreground text-sm font-inter tracking-[-0.5px]">
                  Add key talking points creators should mention
                </div> : blueprint.talking_points.map((point, index) => <div key={index} className="flex items-center gap-1.5 group">
                    <Input value={point} onChange={e => updateTalkingPoint(index, e.target.value)} placeholder={`Key message #${index + 1}`} className="flex-1 h-9 bg-muted/20 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm" />
                    <Button variant="ghost" size="icon" onClick={() => removeTalkingPoint(index)} className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted/30">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>)}
            </div>
          </section>

          {/* Do's and Don'ts */}
          <section className="space-y-2">
            <label className="text-xs font-inter tracking-[-0.5px] text-foreground">Do's and Don'ts</label>
            <div className="grid md:grid-cols-2 gap-3">
              {/* Do's */}
              <div className="rounded-md bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground/80">Do's</span>
                  <Button variant="ghost" size="sm" onClick={addDo} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/30">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {blueprint.dos_and_donts.dos.map((item, index) => <div key={index} className="flex items-center gap-1.5 group">
                      <Input value={item} onChange={e => updateDo(index, e.target.value)} placeholder="Add a do..." className="flex-1 h-8 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm" />
                      <Button variant="ghost" size="icon" onClick={() => removeDo(index)} className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted/30">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>)}
                </div>
              </div>
              
              {/* Don'ts */}
              <div className="rounded-md bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground/80">Don'ts</span>
                  <Button variant="ghost" size="sm" onClick={addDont} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/30">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {blueprint.dos_and_donts.donts.map((item, index) => <div key={index} className="flex items-center gap-1.5 group">
                      <Input value={item} onChange={e => updateDont(index, e.target.value)} placeholder="Add a don't..." className="flex-1 h-8 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm" />
                      <Button variant="ghost" size="icon" onClick={() => removeDont(index)} className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted/30">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>)}
                </div>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="space-y-2">
            <label className="text-xs font-inter tracking-[-0.5px] text-foreground">Call to Action</label>
            <Input value={blueprint.call_to_action || ""} onChange={e => updateBlueprint({
                call_to_action: e.target.value
              })} placeholder="What should viewers do? (e.g., 'Click the link in bio', 'Use code SAVE20')" className="h-9 bg-muted/20 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm" />
          </section>

          {/* Hashtags */}
          <section className="space-y-2">
            <label className="text-xs font-inter tracking-[-0.5px] text-foreground">Hashtags</label>
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <Input value={newHashtag} onChange={e => setNewHashtag(e.target.value)} onKeyDown={e => e.key === "Enter" && addHashtag()} placeholder="Add hashtag..." className="flex-1 h-9 bg-muted/20 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm" />
                <Button variant="ghost" size="sm" onClick={addHashtag} className="h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/30">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {blueprint.hashtags.length > 0 && <div className="flex flex-wrap gap-1.5">
                  {blueprint.hashtags.map((tag, index) => <span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/30 text-muted-foreground text-xs font-inter tracking-[-0.5px]">
                      {tag}
                      <button onClick={() => removeHashtag(index)} className="hover:text-foreground transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>)}
                </div>}
            </div>
          </section>

          {/* Assets */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-inter tracking-[-0.5px] text-foreground">Assets</label>
              <Button variant="ghost" size="sm" onClick={addAsset} className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <div className="rounded-md bg-muted/20 p-3">
              {blueprint.assets.length === 0 ? <p className="text-muted-foreground text-sm text-center py-4 font-inter tracking-[-0.5px]">No assets added yet</p> : <div className="space-y-2">
                  {blueprint.assets.map((asset, index) => <div key={index} className="flex items-center gap-2 group">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="relative">
                          <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input value={asset.link} onChange={e => updateAsset(index, "link", e.target.value)} placeholder="https://drive.google.com/..." className="pl-8 h-8 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm" />
                        </div>
                        <Input value={asset.notes} onChange={e => updateAsset(index, "notes", e.target.value)} placeholder="Description..." className="h-8 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm" />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeAsset(index)} className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted/30">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>)}
                </div>}
            </div>
          </section>

          {/* Example Videos */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-inter tracking-[-0.5px] text-foreground">Example Videos</label>
              <Button variant="ghost" size="sm" onClick={addExampleVideo} className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30">
                <Plus className="h-3 w-3 mr-1" />
                Add URL
              </Button>
            </div>

            {/* Upload Zone */}
            <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
            <div onClick={() => !uploadingVideo && videoInputRef.current?.click()} className={`relative rounded-xl bg-muted/10 p-6 cursor-pointer transition-all hover:bg-muted/20 ${uploadingVideo ? 'pointer-events-none' : ''}`}>
              {!uploadingVideo ? <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-inter tracking-[-0.5px] text-foreground">
                      Upload a video
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      or <span className="text-primary hover:underline">click to browse</span> (max 100MB)
                    </p>
                  </div>
                </div> : <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Video className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-inter tracking-[-0.5px] text-foreground truncate">
                          {uploadingFileName}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-300 ease-out" style={{
                      width: `${uploadProgress}%`
                    }} />
                  </div>
                </div>}
            </div>

            {/* Video List */}
            {blueprint.example_videos.length > 0 && <div className="space-y-2">
                {blueprint.example_videos.map((video, index) => <div key={index} className="group rounded-xl bg-muted/10 p-3 transition-colors hover:bg-muted/15">
                    <div className="flex items-start gap-3">
                      {/* Video preview */}
                      {video.url && <div className="w-20 h-12 rounded-lg overflow-hidden bg-background/50 flex-shrink-0">
                          <video src={video.url} className="w-full h-full object-cover" muted preload="metadata" onError={e => {
                        (e.target as HTMLVideoElement).style.display = 'none';
                      }} />
                        </div>}
                      <div className="flex-1 space-y-2 min-w-0">
                        <Input value={video.url} onChange={e => updateExampleVideo(index, "url", e.target.value)} placeholder="Video URL..." className="h-8 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm" />
                        <Input value={video.description} onChange={e => updateExampleVideo(index, "description", e.target.value)} placeholder="Why this is a good example..." className="h-8 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm" />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeExampleVideo(index)} className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>)}
              </div>}

            {/* Empty state when no videos */}
            {blueprint.example_videos.length === 0 && !uploadingVideo && <p className="text-center text-xs text-muted-foreground/60 py-2">
                Upload videos or add URLs as examples for creators
              </p>}
          </section>

          {/* Target Personas */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-inter tracking-[-0.5px] text-foreground">Target Personas</label>
              <Button variant="ghost" size="sm" onClick={addPersona} className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            {blueprint.target_personas.length === 0 ? <div className="rounded-md bg-muted/20 py-6 text-center text-muted-foreground text-sm font-inter tracking-[-0.5px]">
                Define your target audience personas
              </div> : <div className="space-y-3">
                {blueprint.target_personas.map((persona, index) => <div key={index} className="rounded-md bg-muted/20 p-4 space-y-3 group relative">
                    <Button variant="ghost" size="icon" onClick={() => removePersona(index)} className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted/30">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Name</label>
                        <Input value={persona.name} onChange={e => updatePersona(index, "name", e.target.value)} placeholder="Persona name" className="h-8 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Target Audience</label>
                        <Input value={persona.target_audience} onChange={e => updatePersona(index, "target_audience", e.target.value)} placeholder="e.g., Males 18-25 interested in fitness" className="h-8 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Description</label>
                      <Textarea value={persona.description} onChange={e => updatePersona(index, "description", e.target.value)} placeholder="Location, interests, pain points, motivations..." className="min-h-[70px] bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-muted-foreground/20 font-inter tracking-[-0.5px] text-sm resize-none" />
                    </div>
                  </div>)}
              </div>}
          </section>

        </div>
      </div>
        </div>
      </div>

      <CampaignCreationWizard brandId={brandId} brandName={brand?.name || ""} brandLogoUrl={brand?.logo_url || undefined} open={showCampaignWizard} onOpenChange={setShowCampaignWizard} />
    </>;
}