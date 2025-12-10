import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Link as LinkIcon, Plus, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { debounce } from "@/lib/utils";
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

interface Blueprint {
  id: string;
  brand_id: string;
  title: string;
  content: string | null;
  assets: Asset[];
  platforms: string[];
  target_personas: Persona[];
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

  const togglePlatform = (platformId: string) => {
    const platforms = blueprint?.platforms || [];
    const newPlatforms = platforms.includes(platformId)
      ? platforms.filter((p) => p !== platformId)
      : [...platforms, platformId];
    updateBlueprint({ platforms: newPlatforms });
  };

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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!blueprint) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Return
          </Button>
          {brand?.logo_url && (
            <img src={brand.logo_url} alt={brand.name} className="h-6 w-6 rounded object-cover" />
          )}
          <span className="text-muted-foreground">{brand?.name}</span>
          <span className="text-muted-foreground">/</span>
          <Input
            value={blueprint.title}
            onChange={(e) => updateBlueprint({ title: e.target.value })}
            className="h-8 w-48 bg-transparent border-none focus-visible:ring-0 px-1 text-foreground"
            placeholder="Untitled"
          />
          {saving && <span className="text-xs text-muted-foreground">Saving...</span>}
        </div>
        <Button
          onClick={activateBlueprint}
          className={blueprint.status === "active" ? "bg-green-600 hover:bg-green-700" : ""}
        >
          <Zap className="h-4 w-4 mr-2" />
          {blueprint.status === "active" ? "Deactivate" : "Activate Blueprint"}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-8">
        {/* Main Content Area */}
        <Card className="p-4 min-h-[120px]">
          <Textarea
            value={blueprint.content || ""}
            onChange={(e) => updateBlueprint({ content: e.target.value })}
            placeholder="Write your campaign brief content here..."
            className="min-h-[100px] resize-none border-none focus-visible:ring-0 bg-transparent"
          />
        </Card>

        {/* Assets Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Assets</h3>
            <Button variant="ghost" size="sm" onClick={addAsset}>
              <Plus className="h-4 w-4 mr-1" />
              Add Asset
            </Button>
          </div>
          <Card className="p-4">
            {blueprint.assets.length === 0 ? (
              <p className="text-muted-foreground text-sm">No assets added yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-4 text-sm font-medium text-muted-foreground">
                  <span>Link</span>
                  <span>Notes</span>
                  <span className="w-8" />
                </div>
                {blueprint.assets.map((asset, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center">
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={asset.link}
                        onChange={(e) => updateAsset(index, "link", e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="pl-10"
                      />
                    </div>
                    <Input
                      value={asset.notes}
                      onChange={(e) => updateAsset(index, "notes", e.target.value)}
                      placeholder="Add notes..."
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAsset(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Platforms Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Platforms</h3>
          <Card className="p-4">
            <div className="flex flex-wrap gap-4">
              {PLATFORMS.map((platform) => (
                <label
                  key={platform.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={blueprint.platforms.includes(platform.id)}
                    onCheckedChange={() => togglePlatform(platform.id)}
                  />
                  <img src={platform.logo} alt={platform.label} className="h-5 w-5 object-contain" />
                  <span>{platform.label}</span>
                </label>
              ))}
            </div>
          </Card>
        </div>

        {/* Target Personas Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Target Personas</h3>
            <Button variant="ghost" size="sm" onClick={addPersona}>
              <Plus className="h-4 w-4 mr-1" />
              Add Persona
            </Button>
          </div>
          {blueprint.target_personas.length === 0 ? (
            <Card className="p-4">
              <p className="text-muted-foreground text-sm">No personas added yet.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {blueprint.target_personas.map((persona, index) => (
                <Card key={index} className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Persona Name</label>
                        <Input
                          value={persona.name}
                          onChange={(e) => updatePersona(index, "name", e.target.value)}
                          placeholder="Persona #1"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Target Audience</label>
                        <Input
                          value={persona.target_audience}
                          onChange={(e) => updatePersona(index, "target_audience", e.target.value)}
                          placeholder="Males 18-25 who care about gut health"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <Textarea
                          value={persona.description}
                          onChange={(e) => updatePersona(index, "description", e.target.value)}
                          placeholder="Location, interests, etc.."
                          className="mt-1 min-h-[80px]"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePersona(index)}
                      className="ml-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
