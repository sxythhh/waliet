import { useState, useEffect, useCallback, useRef } from "react";
import { Link as LinkIcon, Plus, Trash2, X, Upload, Video, FileText, Share2, MessageSquare, ListChecks, ThumbsUp, Hash, Folder, Users, Mic, Sparkles, GraduationCap, HelpCircle } from "lucide-react";
import playArrowIcon from "@/assets/play-arrow-icon.svg";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { debounce } from "@/lib/utils";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useTheme } from "@/components/ThemeProvider";
import { CampaignWizard, CampaignType } from "@/components/brand/CampaignWizard";
import { CreateCampaignTypeDialog } from "@/components/brand/CreateCampaignTypeDialog";
import { TemplateSelector } from "@/components/brand/TemplateSelector";
import { BlueprintSection } from "@/components/brand/BlueprintSection";
import { BlueprintSectionMenu, SectionType, ALL_SECTIONS } from "@/components/brand/BlueprintSectionMenu";
import { TrainingModuleEditor, type TrainingModule } from "@/components/brand/TrainingModuleEditor";
import { GoogleDocsImportButton } from "@/components/brand/GoogleDocsImportButton";
import { DndContext, pointerWithin, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, useDroppable, TouchSensor } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";

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
interface FAQ {
  question: string;
  answer: string;
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
  training_modules: TrainingModule[];
  faqs: FAQ[];
}
interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  subscription_plan: string | null;
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
}];

// Default sections that are shown when creating a new blueprint
const DEFAULT_SECTIONS: SectionType[] = ["content", "platforms", "brand_voice", "hooks", "talking_points", "dos_and_donts", "call_to_action", "assets", "example_videos"];
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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<CampaignType | undefined>(undefined);
  const [showCampaignTypeDialog, setShowCampaignTypeDialog] = useState(false);
  const [enabledSections, setEnabledSections] = useState<SectionType[]>(DEFAULT_SECTIONS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const isDark = resolvedTheme === "dark";
  const PLATFORMS = getPlatforms(isDark);
  const isMobile = useIsMobile();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  useEffect(() => {
    fetchBlueprintAndBrand();
  }, [blueprintId, brandId]);
  const fetchBlueprintAndBrand = async () => {
    setLoading(true);
    const [blueprintRes, brandRes] = await Promise.all([supabase.from("blueprints").select("*").eq("id", blueprintId).single(), supabase.from("brands").select("id, name, logo_url, brand_color, subscription_plan").eq("id", brandId).single()]);
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
      talking_points: data.talking_points as string[] || [],
      training_modules: data.training_modules as TrainingModule[] || [],
      faqs: data.faqs as FAQ[] || []
    });

    // Load saved section order if it exists
    if (data.section_order && Array.isArray(data.section_order) && data.section_order.length > 0) {
      setEnabledSections(data.section_order as SectionType[]);
    }
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
    setShowCampaignTypeDialog(true);
  };
  const handleGoogleDocsImport = (fields: Partial<Blueprint>) => {
    if (!blueprint) return;
    // Merge imported fields with existing blueprint data
    const updates: Partial<Blueprint> = {};

    if (fields.title && !blueprint.title) updates.title = fields.title;
    if (fields.content) updates.content = fields.content;
    if (fields.brand_voice) updates.brand_voice = fields.brand_voice;
    if (fields.target_personas?.length) {
      updates.target_personas = [...(blueprint.target_personas || []), ...fields.target_personas];
    }
    if (fields.hooks?.length) {
      updates.hooks = [...(blueprint.hooks || []), ...fields.hooks];
    }
    if (fields.talking_points?.length) {
      updates.talking_points = [...(blueprint.talking_points || []), ...fields.talking_points];
    }
    if (fields.dos_and_donts) {
      updates.dos_and_donts = {
        dos: [...(blueprint.dos_and_donts?.dos || []), ...(fields.dos_and_donts.dos || [])],
        donts: [...(blueprint.dos_and_donts?.donts || []), ...(fields.dos_and_donts.donts || [])],
      };
    }
    if (fields.call_to_action) updates.call_to_action = fields.call_to_action;
    if (fields.hashtags?.length) {
      updates.hashtags = [...new Set([...(blueprint.hashtags || []), ...fields.hashtags])];
    }
    if (fields.platforms?.length) {
      updates.platforms = [...new Set([...(blueprint.platforms || []), ...fields.platforms])];
    }

    if (Object.keys(updates).length > 0) {
      updateBlueprint(updates);
      toast.success("Content imported from Google Docs");
    }
  };
  const handleSelectClipping = (selectedBlueprintId?: string) => {
    setShowCampaignTypeDialog(false);
    setWizardType('cpm');
    setWizardOpen(true);
  };
  const handleSelectBoost = () => {
    setShowCampaignTypeDialog(false);
    setWizardType('boost');
    setWizardOpen(true);
  };
  const toggleSection = (sectionId: SectionType) => {
    setEnabledSections(prev => {
      const newSections = prev.includes(sectionId) ? prev.filter(s => s !== sectionId) : [...prev, sectionId];
      // Save section order to database
      saveSectionOrder(newSections);
      return newSections;
    });
  };
  const saveSectionOrder = useCallback(debounce(async (sections: SectionType[]) => {
    const {
      error
    } = await supabase.from("blueprints").update({
      section_order: sections
    }).eq("id", blueprintId);
    if (error) {
      console.error("Error saving section order:", error);
    }
  }, 500), [blueprintId]);
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    setActiveId(null);

    // Check if dropped on trash
    if (over?.id === "trash-zone") {
      setEnabledSections(prev => {
        const newSections = prev.filter(s => s !== active.id);
        saveSectionOrder(newSections);
        return newSections;
      });
      return;
    }
    if (over && active.id !== over.id) {
      setEnabledSections(items => {
        const oldIndex = items.indexOf(active.id as SectionType);
        const newIndex = items.indexOf(over.id as SectionType);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        saveSectionOrder(newOrder);
        return newOrder;
      });
    }
  };

  // Trash Drop Zone - must be inside DndContext so defined as inner component
  const TrashDropZoneInner = () => {
    const {
      isOver,
      setNodeRef
    } = useDroppable({
      id: "trash-zone"
    });
    return <div ref={setNodeRef} className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-200 ${isOver ? "bg-destructive/20 scale-110" : "bg-neutral-200 dark:bg-neutral-900 backdrop-blur-sm"}`}>
        <span className={`text-sm font-inter tracking-[-0.5px] ${isOver ? "text-destructive font-medium" : "text-muted-foreground"}`}>
          Drop here to remove
        </span>
      </div>;
  };
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

  // FAQ functions
  const addFAQ = () => {
    const newFAQs = [...(blueprint?.faqs || []), { question: "", answer: "" }];
    updateBlueprint({ faqs: newFAQs });
  };
  const updateFAQ = (index: number, field: keyof FAQ, value: string) => {
    const newFAQs = [...(blueprint?.faqs || [])];
    newFAQs[index] = { ...newFAQs[index], [field]: value };
    updateBlueprint({ faqs: newFAQs });
  };
  const removeFAQ = (index: number) => {
    const newFAQs = blueprint?.faqs.filter((_, i) => i !== index) || [];
    updateBlueprint({ faqs: newFAQs });
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
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video must be under 100MB");
      return;
    }
    setUploadingVideo(true);
    setUploadingFileName(file.name);
    setUploadProgress(0);
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

  // Helper functions for status
  const getSectionStatus = (sectionId: SectionType): {
    status?: "filled" | "unfilled" | "selected";
    count?: number;
  } => {
    if (!blueprint) return {};
    switch (sectionId) {
      case "content":
        return {
          status: blueprint.content ? "filled" : "unfilled"
        };
      case "platforms":
        return blueprint.platforms.length > 0 ? {
          status: "selected",
          count: blueprint.platforms.length
        } : {
          status: "unfilled"
        };
      case "brand_voice":
        return {
          status: blueprint.brand_voice ? "filled" : "unfilled"
        };
      case "hooks":
        return blueprint.hooks.length > 0 ? {
          status: "filled"
        } : {
          status: "unfilled"
        };
      case "talking_points":
        return blueprint.talking_points.length > 0 ? {
          status: "filled"
        } : {
          status: "unfilled"
        };
      case "dos_and_donts":
        return blueprint.dos_and_donts.dos.length > 0 || blueprint.dos_and_donts.donts.length > 0 ? {
          status: "filled"
        } : {
          status: "unfilled"
        };
      case "call_to_action":
        return {
          status: blueprint.call_to_action ? "filled" : "unfilled"
        };
      case "assets":
        return blueprint.assets.length > 0 ? {
          status: "filled"
        } : {
          status: "unfilled"
        };
      case "example_videos":
        return blueprint.example_videos.length > 0 ? {
          status: "filled"
        } : {
          status: "unfilled"
        };
      case "training":
        return blueprint.training_modules.length > 0 ? {
          status: "filled",
          count: blueprint.training_modules.length
        } : {
          status: "unfilled"
        };
      case "faqs":
        return blueprint.faqs.length > 0 ? {
          status: "filled",
          count: blueprint.faqs.length
        } : {
          status: "unfilled"
        };
      default:
        return {};
    }
  };
  const getSectionIcon = (sectionId: SectionType) => {
    const iconMap: Record<SectionType, React.ReactNode> = {
      content: <FileText className="h-4 w-4" />,
      platforms: <Share2 className="h-4 w-4" />,
      brand_voice: <Mic className="h-4 w-4" />,
      hooks: <MessageSquare className="h-4 w-4" />,
      talking_points: <ListChecks className="h-4 w-4" />,
      dos_and_donts: <ThumbsUp className="h-4 w-4" />,
      call_to_action: <MessageSquare className="h-4 w-4" />,
      assets: <Folder className="h-4 w-4" />,
      example_videos: <Video className="h-4 w-4" />,
      training: <GraduationCap className="h-4 w-4" />,
      faqs: <HelpCircle className="h-4 w-4" />
    };
    return iconMap[sectionId];
  };
  const getSectionTitle = (sectionId: SectionType) => {
    return ALL_SECTIONS.find(s => s.id === sectionId)?.title || sectionId;
  };

  // Render a section by ID - enables dynamic ordering based on enabledSections array
  const renderSection = (sectionId: SectionType): React.ReactNode => {
    if (!blueprint) return null;
    switch (sectionId) {
      case "content":
        return <BlueprintSection key="content" id="content" title="Brief Content" icon={<FileText className="h-4 w-4" />} status={getSectionStatus("content").status} onRemove={() => toggleSection("content")}>
            <div className="rounded-xl bg-muted/30 overflow-hidden">
              <RichTextEditor content={blueprint.content || ""} onChange={content => updateBlueprint({
              content
            })} placeholder="Write your campaign brief content here..." />
            </div>
          </BlueprintSection>;
      case "platforms":
        return <BlueprintSection key="platforms" id="platforms" title="Platforms" icon={<Share2 className="h-4 w-4" />} status={getSectionStatus("platforms").status} statusCount={getSectionStatus("platforms").count} onRemove={() => toggleSection("platforms")}>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(platform => {
              const isSelected = blueprint.platforms.includes(platform.id);
              return <button key={platform.id} onClick={() => togglePlatform(platform.id)} className={`
                      flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 font-inter tracking-[-0.3px] text-sm
                      ${isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-foreground hover:bg-muted/70"}
                    `}>
                    <img src={platform.logo} alt={platform.label} className={`h-4 w-4 object-contain ${isSelected ? "brightness-0 invert" : ""}`} />
                    <span className="font-medium">{platform.label}</span>
                  </button>;
            })}
            </div>
          </BlueprintSection>;
      case "brand_voice":
        return <BlueprintSection key="brand_voice" id="brand_voice" title="Brand Voice" icon={<Mic className="h-4 w-4" />} status={getSectionStatus("brand_voice").status} onRemove={() => toggleSection("brand_voice")}>
            <Textarea value={blueprint.brand_voice || ""} onChange={e => updateBlueprint({
            brand_voice: e.target.value
          })} placeholder="Describe the brand's tone and voice (e.g., casual, professional, witty, educational...)" className="min-h-[100px] resize-none rounded-xl bg-muted/30 border-0 focus-visible:ring-0 focus-visible:bg-muted/40 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
          </BlueprintSection>;
      case "hooks":
        return <BlueprintSection key="hooks" id="hooks" title="Hooks" icon={<MessageSquare className="h-4 w-4" />} status={getSectionStatus("hooks").status} onRemove={() => toggleSection("hooks")}>
            <div className="space-y-2">
              {blueprint.hooks.length === 0 ? <div className="rounded-xl bg-muted/20 py-8 text-center">
                  <p className="text-muted-foreground/60 text-sm font-inter tracking-[-0.3px]">Add attention-grabbing hooks for creators to use</p>
                </div> : blueprint.hooks.map((hook, index) => <div key={`hook-${index}-${blueprint.id}`} className="flex items-center gap-2 group">
                    <Input value={hook} onChange={e => updateHook(index, e.target.value)} placeholder={`Hook #${index + 1}`} className="flex-1 h-10 rounded-xl bg-muted/30 border-0 focus-visible:ring-0 focus-visible:bg-muted/40 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
                    <Button variant="ghost" size="icon" onClick={() => removeHook(index)} className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" aria-label="Remove hook">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>)}
              <Button variant="ghost" size="sm" onClick={addHook} className="h-9 px-4 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 mt-1 transition-colors">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Hook
              </Button>
            </div>
          </BlueprintSection>;
      case "talking_points":
        return <BlueprintSection key="talking_points" id="talking_points" title="Requirements" icon={<ListChecks className="h-4 w-4" />} status={getSectionStatus("talking_points").status} onRemove={() => toggleSection("talking_points")}>
            <div className="space-y-2">
              {blueprint.talking_points.length === 0 ? <div className="rounded-xl bg-muted/20 py-8 text-center">
                  <p className="text-muted-foreground/60 text-sm font-inter tracking-[-0.3px]">Add requirements that creators must follow</p>
                </div> : blueprint.talking_points.map((point, index) => <div key={`point-${index}-${blueprint.id}`} className="flex items-center gap-2 group">
                    <Input value={point} onChange={e => updateTalkingPoint(index, e.target.value)} placeholder={`Requirement #${index + 1}`} className="flex-1 h-10 rounded-xl bg-muted/30 border-0 focus-visible:ring-0 focus-visible:bg-muted/40 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
                    <Button variant="ghost" size="icon" onClick={() => removeTalkingPoint(index)} className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" aria-label="Remove requirement">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>)}
              <Button variant="ghost" size="sm" onClick={addTalkingPoint} className="h-9 px-4 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 mt-1 transition-colors">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Requirement
              </Button>
            </div>
          </BlueprintSection>;
      case "dos_and_donts":
        return <BlueprintSection key="dos_and_donts" id="dos_and_donts" title="Do's & Don'ts" icon={<ThumbsUp className="h-4 w-4" />} status={getSectionStatus("dos_and_donts").status} onRemove={() => toggleSection("dos_and_donts")}>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Do's</span>
                </div>
                <div className="space-y-2">
                  {blueprint.dos_and_donts.dos.map((item, index) => <div key={`do-${index}-${blueprint.id}`} className="flex items-center gap-2 group">
                      <Input value={item} onChange={e => updateDo(index, e.target.value)} placeholder="Add a do..." className="flex-1 h-9 rounded-lg bg-background/60 border-0 focus-visible:ring-0 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
                      <Button variant="ghost" size="icon" onClick={() => removeDo(index)} className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" aria-label="Remove do item">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>)}
                  <Button variant="ghost" size="sm" onClick={addDo} className="h-8 w-full rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Do
                  </Button>
                </div>
              </div>
              <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">Don'ts</span>
                </div>
                <div className="space-y-2">
                  {blueprint.dos_and_donts.donts.map((item, index) => <div key={`dont-${index}-${blueprint.id}`} className="flex items-center gap-2 group">
                      <Input value={item} onChange={e => updateDont(index, e.target.value)} placeholder="Add a don't..." className="flex-1 h-9 rounded-lg bg-background/60 border-0 focus-visible:ring-0 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
                      <Button variant="ghost" size="icon" onClick={() => removeDont(index)} className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" aria-label="Remove don't item">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>)}
                  <Button variant="ghost" size="sm" onClick={addDont} className="h-8 w-full rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Don't
                  </Button>
                </div>
              </div>
            </div>
          </BlueprintSection>;
      case "call_to_action":
        return <BlueprintSection key="call_to_action" id="call_to_action" title="Call to Action" icon={<MessageSquare className="h-4 w-4" />} status={getSectionStatus("call_to_action").status} onRemove={() => toggleSection("call_to_action")}>
            <Input value={blueprint.call_to_action || ""} onChange={e => updateBlueprint({
            call_to_action: e.target.value
          })} placeholder="What should viewers do? (e.g., 'Click the link in bio', 'Use code SAVE20')" className="h-10 rounded-xl bg-muted/30 border-0 focus-visible:ring-0 focus-visible:bg-muted/40 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
          </BlueprintSection>;
      case "assets":
        return <BlueprintSection key="assets" id="assets" title="Assets & Files" icon={<Folder className="h-4 w-4" />} status={getSectionStatus("assets").status} onRemove={() => toggleSection("assets")}>
            <div className="space-y-2">
              {blueprint.assets.length === 0 ? <div className="rounded-xl bg-muted/20 py-8 text-center">
                  <p className="text-muted-foreground/60 text-sm font-inter tracking-[-0.3px]">No assets added yet</p>
                </div> : blueprint.assets.map((asset, index) => <div key={`asset-${index}-${blueprint.id}`} className="flex items-center gap-2 group">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                        <Input value={asset.link} onChange={e => updateAsset(index, "link", e.target.value)} placeholder="https://drive.google.com/..." className="pl-9 h-10 rounded-xl bg-muted/30 border-0 focus-visible:ring-0 focus-visible:bg-muted/40 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
                      </div>
                      <Input value={asset.notes} onChange={e => updateAsset(index, "notes", e.target.value)} placeholder="Description..." className="h-10 rounded-xl bg-muted/30 border-0 focus-visible:ring-0 focus-visible:bg-muted/40 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeAsset(index)} className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" aria-label="Remove asset">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>)}
              <Button variant="ghost" size="sm" onClick={addAsset} className="h-9 px-4 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 mt-1 transition-colors">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Asset
              </Button>
            </div>
          </BlueprintSection>;
      case "example_videos":
        return <BlueprintSection key="example_videos" id="example_videos" title="Example Videos" icon={<Video className="h-4 w-4" />} status={getSectionStatus("example_videos").status} onRemove={() => toggleSection("example_videos")}>
            <div className="space-y-3">
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
              {!uploadingVideo ? <div className="flex gap-2">
                  <div onClick={() => videoInputRef.current?.click()} className="flex-1 rounded-xl border border-dashed border-border/30 bg-muted/10 p-4 cursor-pointer transition-all hover:bg-muted/20 hover:border-border/50">
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="h-4 w-4 text-muted-foreground/60" />
                      <span className="text-sm font-inter tracking-[-0.3px] text-muted-foreground/80">
                        Upload video <span className="text-muted-foreground/40">(max 100MB)</span>
                      </span>
                    </div>
                  </div>
                  <div onClick={addExampleVideo} className="rounded-xl border border-dashed border-border/30 bg-muted/10 p-4 cursor-pointer transition-all hover:bg-muted/20 hover:border-border/50">
                    <div className="flex items-center justify-center gap-2">
                      <Plus className="h-4 w-4 text-muted-foreground/60" />
                      <span className="text-sm font-inter tracking-[-0.3px] text-muted-foreground/80">
                        Add URL
                      </span>
                    </div>
                  </div>
                </div> : <div className="rounded-xl bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-inter tracking-[-0.3px] text-foreground truncate">
                      {uploadingFileName}
                    </p>
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
              {/* Manual Example Videos */}
              {blueprint.example_videos.length > 0 && <div className="space-y-2">
                  {blueprint.example_videos.map((video, index) => <div key={`video-${index}-${blueprint.id}`} className="group rounded-xl bg-muted/20 p-3 transition-colors hover:bg-muted/30">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          <Input value={video.url} onChange={e => updateExampleVideo(index, "url", e.target.value)} placeholder="Video URL (TikTok, YouTube, Instagram...)" className="h-9 rounded-lg bg-background/50 border-0 focus-visible:ring-0 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
                          <Input value={video.description} onChange={e => updateExampleVideo(index, "description", e.target.value)} placeholder="Why this is a good example..." className="h-9 rounded-lg bg-background/50 border-0 focus-visible:ring-0 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeExampleVideo(index)} className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" aria-label="Remove example video">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>)}
                </div>}
            </div>
          </BlueprintSection>;
      case "training":
        return <BlueprintSection key="training" id="training" title="Creator Training" icon={<GraduationCap className="h-4 w-4" />} status={getSectionStatus("training").status} statusCount={getSectionStatus("training").count} onRemove={() => toggleSection("training")}>
            <TrainingModuleEditor
              modules={blueprint.training_modules}
              onChange={(modules) => updateBlueprint({ training_modules: modules })}
            />
          </BlueprintSection>;
      case "faqs":
        return <BlueprintSection key="faqs" id="faqs" title="FAQs" icon={<HelpCircle className="h-4 w-4" />} status={getSectionStatus("faqs").status} statusCount={getSectionStatus("faqs").count} onRemove={() => toggleSection("faqs")}>
            <div className="space-y-3">
              {blueprint.faqs.length === 0 ? <div className="rounded-xl bg-muted/20 py-8 text-center">
                  <p className="text-muted-foreground/60 text-sm font-inter tracking-[-0.3px]">Add frequently asked questions for creators</p>
                </div> : blueprint.faqs.map((faq, index) => (
                  <div key={`faq-${index}-${blueprint.id}`} className="rounded-xl bg-muted/20 p-4 space-y-3 group relative">
                    <div className="space-y-2">
                      <Input
                        value={faq.question}
                        onChange={e => updateFAQ(index, "question", e.target.value)}
                        placeholder="Question"
                        className="flex-1 h-10 rounded-xl bg-background/60 border-0 focus-visible:ring-0 font-inter tracking-[-0.3px] text-sm font-medium placeholder:text-muted-foreground/50 transition-colors"
                      />
                      <Textarea
                        value={faq.answer}
                        onChange={e => updateFAQ(index, "answer", e.target.value)}
                        placeholder="Answer"
                        className="min-h-[80px] resize-none rounded-xl bg-background/60 border-0 focus-visible:ring-0 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFAQ(index)}
                      className="absolute top-2 right-2 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                      aria-label="Remove FAQ"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              <Button variant="ghost" size="sm" onClick={addFAQ} className="h-9 px-4 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 mt-1 transition-colors">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add FAQ
              </Button>
            </div>
          </BlueprintSection>;
      default:
        return null;
    }
  };
  if (loading || !blueprint) return null;
  return <>
      <div className="h-full p-[5px]">
        <div className="h-full flex flex-col bg-background border border-border rounded-[20px] overflow-hidden">
          {/* Header - Fixed */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 py-2 sm:py-2.5 bg-background border-b border-border px-3 sm:px-[14px]">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              {brand?.logo_url ? <img src={brand.logo_url} alt={brand.name} className="h-5 w-5 sm:h-6 sm:w-6 rounded object-cover shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setSearchParams(prev => {
              prev.delete('blueprint');
              return prev;
            })} /> : <div className="h-5 w-5 sm:h-6 sm:w-6 rounded flex items-center justify-center text-white text-xs font-semibold shrink-0 cursor-pointer hover:opacity-80 transition-opacity" style={{
              backgroundColor: brand?.brand_color || '#8B5CF6'
            }} onClick={() => setSearchParams(prev => {
              prev.delete('blueprint');
              return prev;
            })}>
                  {(brand?.name || 'B').charAt(0).toUpperCase()}
                </div>}
              <span className="text-sm font-medium text-foreground font-inter tracking-[-0.5px] shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setSearchParams(prev => {
              prev.delete('blueprint');
              return prev;
            })}>{brand?.name}</span>
              <span className="text-muted-foreground/50 shrink-0">/</span>
              <Input value={blueprint.title} onChange={e => updateBlueprint({
              title: e.target.value
            })} className="h-8 flex-1 min-w-0 !bg-transparent border-none focus-visible:ring-0 px-1 text-foreground font-medium font-inter tracking-[-0.5px] text-sm" placeholder="Untitled" />
              {saving && <span className="text-xs text-muted-foreground animate-pulse font-inter tracking-[-0.5px] shrink-0">
                  Saving...
                </span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <GoogleDocsImportButton onImport={handleGoogleDocsImport} />
              <button onClick={() => window.open(`/blueprint/${blueprintId}/preview`, '_blank')} className="p-1.5 rounded-md border border-border bg-muted dark:bg-muted/50 text-secondary-foreground hover:bg-muted/80 dark:hover:bg-muted/70 transition-colors">
                <img src={playArrowIcon} alt="Preview" className="h-5 w-5" />
              </button>
              <button onClick={activateBlueprint} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground border border-primary/20 font-inter font-medium tracking-[-0.4px] text-xs sm:text-sm hover:bg-primary/90 transition-colors">
                Publish
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-3 sm:space-y-4 py-[10px]">
              {/* Modular Details Header */}
              

              {/* Modular Sections */}
              <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={enabledSections} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {enabledSections.map(sectionId => renderSection(sectionId))}

                    {/* Add Section Button */}
                    <BlueprintSectionMenu enabledSections={enabledSections} onToggleSection={toggleSection} />
                  </div>
            </SortableContext>

            {/* Drag Overlay for smooth dragging - hidden on mobile */}
            {!isMobile && <DragOverlay dropAnimation={null}>
                {activeId && <div className="rounded-xl border border-border/50 bg-card shadow-xl p-3 opacity-90">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium font-inter tracking-[-0.5px]">
                        {getSectionTitle(activeId as SectionType)}
                      </span>
                    </div>
                  </div>}
              </DragOverlay>}

            {/* Floating Trash Zone - only visible when dragging, hidden on mobile */}
            {!isMobile && activeId && <TrashDropZoneInner />}
          </DndContext>
        </div>
      </div>
    </div>
  </div>

      {/* Campaign Type Selection Dialog */}
      <CreateCampaignTypeDialog open={showCampaignTypeDialog} onOpenChange={setShowCampaignTypeDialog} onSelectClipping={handleSelectClipping} onSelectManaged={handleSelectClipping} onSelectBoost={handleSelectBoost} brandId={brandId} subscriptionPlan={brand?.subscription_plan} defaultBlueprintId={blueprintId} />

      {/* Campaign/Boost Creation Wizard */}
      <CampaignWizard
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) setWizardType(undefined);
        }}
        brandId={brandId}
        brandName={brand?.name || ""}
        brandLogoUrl={brand?.logo_url || undefined}
        subscriptionPlan={brand?.subscription_plan}
        initialBlueprintId={blueprintId}
        initialType={wizardType}
        mode="create"
      />
    </>;
}