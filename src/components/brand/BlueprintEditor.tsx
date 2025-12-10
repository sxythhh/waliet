import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Link as LinkIcon, Plus, Trash2, Zap, Check, X, Lightbulb, MessageSquare, Hash, Video, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { debounce } from "@/lib/utils";
import { RichTextEditor } from "@/components/RichTextEditor";
import tiktokLogo from "@/assets/tiktok-logo-black.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import xLogo from "@/assets/x-logo.png";

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
  dos_and_donts: { dos: string[]; donts: string[] };
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

const PLATFORMS = [
  { id: "tiktok", label: "TikTok", logo: tiktokLogo },
  { id: "instagram", label: "Instagram", logo: instagramLogo },
  { id: "youtube", label: "YouTube", logo: youtubeLogo },
  { id: "x", label: "X", logo: xLogo },
];

export function BlueprintEditor({ blueprintId, brandId }: BlueprintEditorProps) {
  const [, setSearchParams] = useSearchParams();
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newHashtag, setNewHashtag] = useState("");

  useEffect(() => {
    fetchBlueprintAndBrand();
  }, [blueprintId, brandId]);

  const fetchBlueprintAndBrand = async () => {
    setLoading(true);
    
    const [blueprintRes, brandRes] = await Promise.all([
      supabase.from("blueprints").select("*").eq("id", blueprintId).single(),
      supabase.from("brands").select("id, name, logo_url").eq("id", brandId).single(),
    ]);

    if (blueprintRes.error) {
      console.error("Error fetching blueprint:", blueprintRes.error);
      toast.error("Failed to load blueprint");
      goBack();
      return;
    }

    const data = blueprintRes.data as any;
    setBlueprint({
      ...data,
      assets: (data.assets as Asset[]) || [],
      target_personas: (data.target_personas as Persona[]) || [],
      platforms: data.platforms || [],
      hooks: (data.hooks as string[]) || [],
      dos_and_donts: (data.dos_and_donts as { dos: string[]; donts: string[] }) || { dos: [], donts: [] },
      hashtags: data.hashtags || [],
      example_videos: (data.example_videos as ExampleVideo[]) || [],
      talking_points: (data.talking_points as string[]) || [],
    });

    if (brandRes.data) {
      setBrand(brandRes.data);
    }

    setLoading(false);
  };

  const saveBlueprint = useCallback(
    debounce(async (updates: Partial<Blueprint>) => {
      setSaving(true);
      const { error } = await supabase
        .from("blueprints")
        .update(updates as any)
        .eq("id", blueprintId);
      if (error) {
        console.error("Error saving blueprint:", error);
        toast.error("Failed to save changes");
      }
      setSaving(false);
    }, 500),
    [blueprintId]
  );

  const updateBlueprint = (updates: Partial<Blueprint>) => {
    if (!blueprint) return;
    const newBlueprint = { ...blueprint, ...updates };
    setBlueprint(newBlueprint);
    saveBlueprint(updates);
  };

  const goBack = () => {
    setSearchParams((prev) => {
      prev.delete("blueprint");
      return prev;
    });
  };

  const activateBlueprint = async () => {
    const newStatus = blueprint?.status === "active" ? "draft" : "active";
    const { error } = await supabase
      .from("blueprints")
      .update({ status: newStatus })
      .eq("id", blueprintId);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    setBlueprint((prev) => (prev ? { ...prev, status: newStatus } : null));
    toast.success(newStatus === "active" ? "Blueprint activated" : "Blueprint deactivated");
  };

  // Asset functions
  const addAsset = () => {
    const newAssets = [...(blueprint?.assets || []), { link: "", notes: "" }];
    updateBlueprint({ assets: newAssets });
  };

  const updateAsset = (index: number, field: keyof Asset, value: string) => {
    const newAssets = [...(blueprint?.assets || [])];
    newAssets[index] = { ...newAssets[index], [field]: value };
    updateBlueprint({ assets: newAssets });
  };

  const removeAsset = (index: number) => {
    const newAssets = blueprint?.assets.filter((_, i) => i !== index) || [];
    updateBlueprint({ assets: newAssets });
  };

  // Platform toggle
  const togglePlatform = (platformId: string) => {
    const platforms = blueprint?.platforms || [];
    const newPlatforms = platforms.includes(platformId)
      ? platforms.filter((p) => p !== platformId)
      : [...platforms, platformId];
    updateBlueprint({ platforms: newPlatforms });
  };

  // Persona functions
  const addPersona = () => {
    const newPersonas = [
      ...(blueprint?.target_personas || []),
      { name: `Persona #${(blueprint?.target_personas?.length || 0) + 1}`, target_audience: "", description: "" },
    ];
    updateBlueprint({ target_personas: newPersonas });
  };

  const updatePersona = (index: number, field: keyof Persona, value: string) => {
    const newPersonas = [...(blueprint?.target_personas || [])];
    newPersonas[index] = { ...newPersonas[index], [field]: value };
    updateBlueprint({ target_personas: newPersonas });
  };

  const removePersona = (index: number) => {
    const newPersonas = blueprint?.target_personas.filter((_, i) => i !== index) || [];
    updateBlueprint({ target_personas: newPersonas });
  };

  // Hook functions
  const addHook = () => {
    const newHooks = [...(blueprint?.hooks || []), ""];
    updateBlueprint({ hooks: newHooks });
  };

  const updateHook = (index: number, value: string) => {
    const newHooks = [...(blueprint?.hooks || [])];
    newHooks[index] = value;
    updateBlueprint({ hooks: newHooks });
  };

  const removeHook = (index: number) => {
    const newHooks = blueprint?.hooks.filter((_, i) => i !== index) || [];
    updateBlueprint({ hooks: newHooks });
  };

  // Do's and Don'ts functions
  const addDo = () => {
    const dos = [...(blueprint?.dos_and_donts.dos || []), ""];
    updateBlueprint({ dos_and_donts: { ...blueprint!.dos_and_donts, dos } });
  };

  const addDont = () => {
    const donts = [...(blueprint?.dos_and_donts.donts || []), ""];
    updateBlueprint({ dos_and_donts: { ...blueprint!.dos_and_donts, donts } });
  };

  const updateDo = (index: number, value: string) => {
    const dos = [...(blueprint?.dos_and_donts.dos || [])];
    dos[index] = value;
    updateBlueprint({ dos_and_donts: { ...blueprint!.dos_and_donts, dos } });
  };

  const updateDont = (index: number, value: string) => {
    const donts = [...(blueprint?.dos_and_donts.donts || [])];
    donts[index] = value;
    updateBlueprint({ dos_and_donts: { ...blueprint!.dos_and_donts, donts } });
  };

  const removeDo = (index: number) => {
    const dos = blueprint?.dos_and_donts.dos.filter((_, i) => i !== index) || [];
    updateBlueprint({ dos_and_donts: { ...blueprint!.dos_and_donts, dos } });
  };

  const removeDont = (index: number) => {
    const donts = blueprint?.dos_and_donts.donts.filter((_, i) => i !== index) || [];
    updateBlueprint({ dos_and_donts: { ...blueprint!.dos_and_donts, donts } });
  };

  // Hashtag functions
  const addHashtag = () => {
    if (!newHashtag.trim()) return;
    const tag = newHashtag.startsWith("#") ? newHashtag : `#${newHashtag}`;
    const hashtags = [...(blueprint?.hashtags || []), tag];
    updateBlueprint({ hashtags });
    setNewHashtag("");
  };

  const removeHashtag = (index: number) => {
    const hashtags = blueprint?.hashtags.filter((_, i) => i !== index) || [];
    updateBlueprint({ hashtags });
  };

  // Talking points functions
  const addTalkingPoint = () => {
    const newPoints = [...(blueprint?.talking_points || []), ""];
    updateBlueprint({ talking_points: newPoints });
  };

  const updateTalkingPoint = (index: number, value: string) => {
    const newPoints = [...(blueprint?.talking_points || [])];
    newPoints[index] = value;
    updateBlueprint({ talking_points: newPoints });
  };

  const removeTalkingPoint = (index: number) => {
    const newPoints = blueprint?.talking_points.filter((_, i) => i !== index) || [];
    updateBlueprint({ talking_points: newPoints });
  };

  // Example video functions
  const addExampleVideo = () => {
    const newVideos = [...(blueprint?.example_videos || []), { url: "", description: "" }];
    updateBlueprint({ example_videos: newVideos });
  };

  const updateExampleVideo = (index: number, field: keyof ExampleVideo, value: string) => {
    const newVideos = [...(blueprint?.example_videos || [])];
    newVideos[index] = { ...newVideos[index], [field]: value };
    updateBlueprint({ example_videos: newVideos });
  };

  const removeExampleVideo = (index: number) => {
    const newVideos = blueprint?.example_videos.filter((_, i) => i !== index) || [];
    updateBlueprint({ example_videos: newVideos });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!blueprint) return null;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={goBack} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Return
          </Button>
          <div className="h-4 w-px bg-border" />
          {brand?.logo_url && (
            <img src={brand.logo_url} alt={brand.name} className="h-6 w-6 rounded object-cover" />
          )}
          <span className="text-muted-foreground text-sm">{brand?.name}</span>
          <span className="text-muted-foreground/50">/</span>
          <Input
            value={blueprint.title}
            onChange={(e) => updateBlueprint({ title: e.target.value })}
            className="h-8 w-56 bg-transparent border-none focus-visible:ring-0 px-1 text-foreground font-medium"
            placeholder="Untitled"
          />
          {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
        </div>
        <Button
          onClick={activateBlueprint}
          className={blueprint.status === "active" 
            ? "bg-green-600 hover:bg-green-700 text-white" 
            : "bg-primary hover:bg-primary/90"
          }
        >
          <Zap className="h-4 w-4 mr-2" />
          {blueprint.status === "active" ? "Active" : "Activate Blueprint"}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          
          {/* Main Content - Rich Text Editor */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Brief Content</h3>
            <div className="rounded-xl bg-card/50 overflow-hidden">
              <RichTextEditor
                content={blueprint.content || ""}
                onChange={(content) => updateBlueprint({ content })}
                placeholder="Write your campaign brief content here..."
              />
            </div>
          </section>

          {/* Platforms - Toggle Pills */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Platforms</h3>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const isSelected = blueprint.platforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200
                      ${isSelected 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                        : "bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground"
                      }
                    `}
                  >
                    <img src={platform.logo} alt={platform.label} className="h-5 w-5 object-contain" />
                    <span className="font-medium">{platform.label}</span>
                    {isSelected && <Check className="h-4 w-4 ml-1" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Brand Voice */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Brand Voice</h3>
            <div className="rounded-xl bg-card/50 p-4">
              <Textarea
                value={blueprint.brand_voice || ""}
                onChange={(e) => updateBlueprint({ brand_voice: e.target.value })}
                placeholder="Describe the brand's tone and voice (e.g., casual, professional, witty, educational...)"
                className="min-h-[80px] resize-none border-none focus-visible:ring-0 bg-transparent"
              />
            </div>
          </section>

          {/* Hooks Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Hooks</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={addHook} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Hook
              </Button>
            </div>
            <div className="space-y-2">
              {blueprint.hooks.length === 0 ? (
                <div className="rounded-xl bg-card/50 p-4 text-center text-muted-foreground text-sm">
                  Add attention-grabbing hooks for creators to use
                </div>
              ) : (
                blueprint.hooks.map((hook, index) => (
                  <div key={index} className="flex items-center gap-2 group">
                    <div className="flex-1 rounded-xl bg-card/50 overflow-hidden">
                      <Input
                        value={hook}
                        onChange={(e) => updateHook(index, e.target.value)}
                        placeholder={`Hook #${index + 1} - e.g., "Wait until you see this..."`}
                        className="border-none focus-visible:ring-0 bg-transparent"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHook(index)}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Talking Points */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Talking Points</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={addTalkingPoint} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Point
              </Button>
            </div>
            <div className="space-y-2">
              {blueprint.talking_points.length === 0 ? (
                <div className="rounded-xl bg-card/50 p-4 text-center text-muted-foreground text-sm">
                  Add key talking points creators should mention
                </div>
              ) : (
                blueprint.talking_points.map((point, index) => (
                  <div key={index} className="flex items-center gap-2 group">
                    <div className="flex-1 rounded-xl bg-card/50 overflow-hidden">
                      <Input
                        value={point}
                        onChange={(e) => updateTalkingPoint(index, e.target.value)}
                        placeholder={`Key message #${index + 1}`}
                        className="border-none focus-visible:ring-0 bg-transparent"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTalkingPoint(index)}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Do's and Don'ts */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Do&apos;s and Don&apos;ts</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Do's */}
              <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-500">
                    <Check className="h-4 w-4" />
                    <span className="font-medium text-sm">Do&apos;s</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={addDo} className="text-xs h-7 text-green-500 hover:text-green-400">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {blueprint.dos_and_donts.dos.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 group">
                      <Input
                        value={item}
                        onChange={(e) => updateDo(index, e.target.value)}
                        placeholder="Add a do..."
                        className="flex-1 h-9 bg-background/50 border-green-500/20 focus-visible:ring-green-500/30"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDo(index)}
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Don'ts */}
              <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-500">
                    <X className="h-4 w-4" />
                    <span className="font-medium text-sm">Don&apos;ts</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={addDont} className="text-xs h-7 text-red-500 hover:text-red-400">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {blueprint.dos_and_donts.donts.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 group">
                      <Input
                        value={item}
                        onChange={(e) => updateDont(index, e.target.value)}
                        placeholder="Add a don't..."
                        className="flex-1 h-9 bg-background/50 border-red-500/20 focus-visible:ring-red-500/30"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDont(index)}
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Call to Action</h3>
            </div>
            <div className="rounded-xl bg-card/50 p-4">
              <Input
                value={blueprint.call_to_action || ""}
                onChange={(e) => updateBlueprint({ call_to_action: e.target.value })}
                placeholder="What should viewers do? (e.g., 'Click the link in bio', 'Use code SAVE20')"
                className="border-none focus-visible:ring-0 bg-transparent"
              />
            </div>
          </section>

          {/* Hashtags */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-cyan-500" />
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Hashtags</h3>
            </div>
            <div className="rounded-xl bg-card/50 p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHashtag()}
                  placeholder="Add hashtag..."
                  className="flex-1 border-none focus-visible:ring-0 bg-transparent"
                />
                <Button variant="ghost" size="sm" onClick={addHashtag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {blueprint.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {blueprint.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-500 text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => removeHashtag(index)}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Assets */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Assets</h3>
              <Button variant="ghost" size="sm" onClick={addAsset} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Asset
              </Button>
            </div>
            <div className="rounded-xl bg-card/50 p-4">
              {blueprint.assets.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-2">No assets added yet</p>
              ) : (
                <div className="space-y-3">
                  {blueprint.assets.map((asset, index) => (
                    <div key={index} className="flex items-center gap-3 group">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={asset.link}
                            onChange={(e) => updateAsset(index, "link", e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="pl-10 bg-background/50"
                          />
                        </div>
                        <Input
                          value={asset.notes}
                          onChange={(e) => updateAsset(index, "notes", e.target.value)}
                          placeholder="Description..."
                          className="bg-background/50"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAsset(index)}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Example Videos */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-pink-500" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Example Videos</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={addExampleVideo} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Video
              </Button>
            </div>
            <div className="rounded-xl bg-card/50 p-4">
              {blueprint.example_videos.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-2">Add reference videos for creators</p>
              ) : (
                <div className="space-y-3">
                  {blueprint.example_videos.map((video, index) => (
                    <div key={index} className="flex items-center gap-3 group">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <Input
                          value={video.url}
                          onChange={(e) => updateExampleVideo(index, "url", e.target.value)}
                          placeholder="Video URL..."
                          className="bg-background/50"
                        />
                        <Input
                          value={video.description}
                          onChange={(e) => updateExampleVideo(index, "description", e.target.value)}
                          placeholder="Why this is a good example..."
                          className="bg-background/50"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExampleVideo(index)}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Target Personas */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Target Personas</h3>
              <Button variant="ghost" size="sm" onClick={addPersona} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Persona
              </Button>
            </div>
            {blueprint.target_personas.length === 0 ? (
              <div className="rounded-xl bg-card/50 p-4 text-center text-muted-foreground text-sm">
                Define your target audience personas
              </div>
            ) : (
              <div className="space-y-4">
                {blueprint.target_personas.map((persona, index) => (
                  <div key={index} className="rounded-xl bg-card/50 p-5 space-y-4 group relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePersona(index)}
                      className="absolute top-3 right-3 h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</label>
                        <Input
                          value={persona.name}
                          onChange={(e) => updatePersona(index, "name", e.target.value)}
                          placeholder="Persona name"
                          className="mt-1.5 bg-background/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target Audience</label>
                        <Input
                          value={persona.target_audience}
                          onChange={(e) => updatePersona(index, "target_audience", e.target.value)}
                          placeholder="e.g., Males 18-25 interested in fitness"
                          className="mt-1.5 bg-background/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                      <Textarea
                        value={persona.description}
                        onChange={(e) => updatePersona(index, "description", e.target.value)}
                        placeholder="Location, interests, pain points, motivations..."
                        className="mt-1.5 min-h-[80px] bg-background/50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
