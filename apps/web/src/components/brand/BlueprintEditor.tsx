import { useState, useEffect, useCallback, useRef } from "react";
import { Link as LinkIcon, Plus, Trash2, X, Upload, Video, FileText, MessageSquare, ListChecks, Hash, Users, Mic, Sparkles, GraduationCap, HelpCircle } from "lucide-react";
import { Icon } from "@iconify/react";
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
import { BlueprintOnboarding } from "@/components/brand/BlueprintOnboarding";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { BlueprintSection } from "@/components/brand/BlueprintSection";
import { BlueprintSectionMenu, SectionType, ALL_SECTIONS } from "@/components/brand/BlueprintSectionMenu";
import { TrainingModuleEditor, type TrainingModule } from "@/components/brand/TrainingModuleEditor";
import { DndContext, pointerWithin, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, useDroppable, TouchSensor } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";

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
  target_personas: Persona[];
  hooks: string[];
  content_guidelines: string | null;
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
  readOnly?: boolean;
}
// Default sections that are shown when creating a new blueprint
const DEFAULT_SECTIONS: SectionType[] = ["content", "brand_voice", "hooks", "talking_points", "call_to_action", "example_videos"];
export function BlueprintEditor({
  blueprintId,
  brandId,
  readOnly = false
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [connectPlatform, setConnectPlatform] = useState<"tiktok" | "instagram" | "youtube" | "twitter">("tiktok");
  const [hideOnboarding, setHideOnboarding] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const isDark = resolvedTheme === "dark";
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
      target_personas: data.target_personas as Persona[] || [],
      hooks: data.hooks as string[] || [],
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
    if (fields.call_to_action) updates.call_to_action = fields.call_to_action;
    if (fields.hashtags?.length) {
      updates.hashtags = [...new Set([...(blueprint.hashtags || []), ...fields.hashtags])];
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

  // Check if blueprint is empty (for showing onboarding)
  const isEmptyBlueprint = useCallback(() => {
    if (!blueprint) return false;
    const hasContent = blueprint.content?.replace(/<[^>]*>/g, "").trim().length > 0;
    const hasHooks = blueprint.hooks?.length > 0;
    const hasTalkingPoints = blueprint.talking_points?.length > 0;
    return !(hasContent || hasHooks || hasTalkingPoints);
  }, [blueprint]);

  // Handle template selection from onboarding
  const handleApplyTemplate = (templateId: string) => {
    // Template content definitions
    const templates: Record<string, Partial<Blueprint>> = {
      slideshows: {
        content: "<p>Create engaging slideshow content that captures attention through visual storytelling.</p>",
        hooks: ["Wait for it...", "You won't believe this", "Part 1 of..."],
        talking_points: ["Use high-quality images", "Keep text minimal", "Add smooth transitions"],
      },
      lifestyle: {
        content: "<p>Create authentic lifestyle content that showcases personality and builds connection with your audience.</p>",
        hooks: ["Day in my life", "Get ready with me", "This changed everything"],
        talking_points: ["Be authentic and relatable", "Show behind-the-scenes", "Engage with your audience"],
      },
      faceless: {
        content: "<p>Create compelling UGC content without showing your face. Perfect for product demos and tutorials.</p>",
        hooks: ["POV: You just discovered...", "Things TikTok made me buy", "This product actually works"],
        talking_points: ["Focus on the product", "Use good lighting", "Show before/after results"],
      },
      watermark: {
        content: "<p>Create clipping-style content from existing videos with proper watermarking and attribution.</p>",
        hooks: ["This went viral", "Nobody is talking about this", "The internet found this"],
        talking_points: ["Credit original creator", "Add value with commentary", "Keep clips under 60 seconds"],
      },
    };

    const templateContent = templates[templateId];
    if (templateContent) {
      updateBlueprint(templateContent);
      toast.success("Template applied successfully");
    }
  };

  // Handle connect account button click
  const handleOpenConnectDialog = (platform: "tiktok" | "instagram") => {
    setConnectPlatform(platform);
    setConnectDialogOpen(true);
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
      case "call_to_action":
        return {
          status: blueprint.call_to_action ? "filled" : "unfilled"
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
      brand_voice: <Mic className="h-4 w-4" />,
      hooks: <MessageSquare className="h-4 w-4" />,
      talking_points: <ListChecks className="h-4 w-4" />,
      call_to_action: <MessageSquare className="h-4 w-4" />,
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
        return <BlueprintSection key="content" id="content" title="Brief Content" icon={<FileText className="h-4 w-4" />} status={getSectionStatus("content").status} onRemove={readOnly ? undefined : () => toggleSection("content")} readOnly={readOnly}>
            <div className="rounded-xl bg-muted/30 overflow-hidden">
              {readOnly ? (
                <div className="p-4 prose prose-sm dark:prose-invert max-w-none font-inter" dangerouslySetInnerHTML={{ __html: blueprint.content || '<p class="text-muted-foreground">No content</p>' }} />
              ) : (
                <RichTextEditor content={blueprint.content || ""} onChange={content => updateBlueprint({ content })} placeholder="Write your campaign brief content here..." />
              )}
            </div>
          </BlueprintSection>;
      case "brand_voice":
        return <BlueprintSection key="brand_voice" id="brand_voice" title="Brand Voice" icon={<Mic className="h-4 w-4" />} status={getSectionStatus("brand_voice").status} onRemove={readOnly ? undefined : () => toggleSection("brand_voice")} readOnly={readOnly}>
            {readOnly ? (
              <p className="text-sm font-inter tracking-[-0.3px] text-foreground whitespace-pre-wrap">{blueprint.brand_voice || <span className="text-muted-foreground">No brand voice defined</span>}</p>
            ) : (
              <Textarea value={blueprint.brand_voice || ""} onChange={e => updateBlueprint({ brand_voice: e.target.value })} placeholder="Describe the brand's tone and voice (e.g., casual, professional, witty, educational...)" className="min-h-[100px] resize-none rounded-xl bg-muted/30 border-0 focus-visible:ring-0 focus-visible:bg-muted/40 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
            )}
          </BlueprintSection>;
      case "hooks":
        return <BlueprintSection key="hooks" id="hooks" title="Hooks" icon={<MessageSquare className="h-4 w-4" />} status={getSectionStatus("hooks").status} onRemove={readOnly ? undefined : () => toggleSection("hooks")} readOnly={readOnly}>
            <div className="space-y-2">
              {blueprint.hooks.length === 0 ? (
                <p className="text-muted-foreground text-sm font-inter tracking-[-0.3px]">{readOnly ? "No hooks" : "Add attention-grabbing hooks for creators to use"}</p>
              ) : readOnly ? (
                <ul className="space-y-2">
                  {blueprint.hooks.map((hook, index) => (
                    <li key={`hook-${index}-${blueprint.id}`} className="text-sm font-inter tracking-[-0.3px] text-foreground flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{hook}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  {blueprint.hooks.map((hook, index) => <div key={`hook-${index}-${blueprint.id}`} className="flex items-center gap-2 group">
                    <Input value={hook} onChange={e => updateHook(index, e.target.value)} placeholder={`Hook #${index + 1}`} className="flex-1 h-10 rounded-xl bg-muted/30 border-0 focus-visible:ring-0 focus-visible:bg-muted/40 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
                    <Button variant="ghost" size="icon" onClick={() => removeHook(index)} className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" aria-label="Remove hook">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>)}
                  <Button variant="ghost" size="sm" onClick={addHook} className="h-9 px-4 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 mt-1 transition-colors">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Hook
                  </Button>
                </>
              )}
            </div>
          </BlueprintSection>;
      case "talking_points":
        return <BlueprintSection key="talking_points" id="talking_points" title="Requirements" icon={<ListChecks className="h-4 w-4" />} status={getSectionStatus("talking_points").status} onRemove={readOnly ? undefined : () => toggleSection("talking_points")} readOnly={readOnly}>
            <div className="space-y-2">
              {blueprint.talking_points.length === 0 ? (
                <p className="text-muted-foreground text-sm font-inter tracking-[-0.3px]">{readOnly ? "No requirements" : "Add requirements that creators must follow"}</p>
              ) : readOnly ? (
                <ul className="space-y-2">
                  {blueprint.talking_points.map((point, index) => (
                    <li key={`point-${index}-${blueprint.id}`} className="text-sm font-inter tracking-[-0.3px] text-foreground flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  {blueprint.talking_points.map((point, index) => <div key={`point-${index}-${blueprint.id}`} className="flex items-center gap-2 group">
                    <Input value={point} onChange={e => updateTalkingPoint(index, e.target.value)} placeholder={`Requirement #${index + 1}`} className="flex-1 h-10 rounded-xl bg-muted/30 border-0 focus-visible:ring-0 focus-visible:bg-muted/40 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
                    <Button variant="ghost" size="icon" onClick={() => removeTalkingPoint(index)} className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" aria-label="Remove requirement">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>)}
                  <Button variant="ghost" size="sm" onClick={addTalkingPoint} className="h-9 px-4 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 mt-1 transition-colors">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Requirement
                  </Button>
                </>
              )}
            </div>
          </BlueprintSection>;
      case "call_to_action":
        return <BlueprintSection key="call_to_action" id="call_to_action" title="Call to Action" icon={<MessageSquare className="h-4 w-4" />} status={getSectionStatus("call_to_action").status} onRemove={readOnly ? undefined : () => toggleSection("call_to_action")} readOnly={readOnly}>
            {readOnly ? (
              <p className="text-sm font-inter tracking-[-0.3px] text-foreground">{blueprint.call_to_action || <span className="text-muted-foreground">No call to action</span>}</p>
            ) : (
              <Input value={blueprint.call_to_action || ""} onChange={e => updateBlueprint({ call_to_action: e.target.value })} placeholder="What should viewers do? (e.g., 'Click the link in bio', 'Use code SAVE20')" className="h-10 rounded-xl bg-muted/30 border-0 focus-visible:ring-0 focus-visible:bg-muted/40 font-inter tracking-[-0.3px] text-sm placeholder:text-muted-foreground/50 transition-colors" />
            )}
          </BlueprintSection>;
      case "example_videos":
        return <BlueprintSection key="example_videos" id="example_videos" title="Example Videos" icon={<Video className="h-4 w-4" />} status={getSectionStatus("example_videos").status} onRemove={readOnly ? undefined : () => toggleSection("example_videos")} readOnly={readOnly}>
            <div className="space-y-3">
              {readOnly ? (
                blueprint.example_videos.length > 0 ? (
                  <ul className="space-y-2">
                    {blueprint.example_videos.map((video, index) => (
                      <li key={`video-${index}-${blueprint.id}`} className="rounded-xl bg-muted/20 p-3">
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline block truncate">{video.url}</a>
                        {video.description && <p className="text-xs text-muted-foreground mt-1">{video.description}</p>}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-muted-foreground text-sm">No example videos</p>
              ) : (
                <>
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
                      <div className="h-full bg-primary rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
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
                </>
              )}
            </div>
          </BlueprintSection>;
      case "training":
        return <BlueprintSection key="training" id="training" title="Creator Training" icon={<GraduationCap className="h-4 w-4" />} status={getSectionStatus("training").status} statusCount={getSectionStatus("training").count} onRemove={readOnly ? undefined : () => toggleSection("training")} readOnly={readOnly}>
            {readOnly ? (
              blueprint.training_modules.length > 0 ? (
                <div className="space-y-3">
                  {blueprint.training_modules.map((module, index) => (
                    <div key={`training-${index}-${blueprint.id}`} className="rounded-xl bg-muted/20 p-4">
                      <h4 className="text-sm font-medium text-foreground">{module.title}</h4>
                      {module.description && <p className="text-sm text-muted-foreground mt-1">{module.description}</p>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">No training modules</p>
            ) : (
              <TrainingModuleEditor
                modules={blueprint.training_modules}
                onChange={(modules) => updateBlueprint({ training_modules: modules })}
              />
            )}
          </BlueprintSection>;
      case "faqs":
        return <BlueprintSection key="faqs" id="faqs" title="FAQs" icon={<HelpCircle className="h-4 w-4" />} status={getSectionStatus("faqs").status} statusCount={getSectionStatus("faqs").count} onRemove={readOnly ? undefined : () => toggleSection("faqs")} readOnly={readOnly}>
            <div className="space-y-3">
              {blueprint.faqs.length === 0 ? (
                <p className="text-muted-foreground text-sm font-inter tracking-[-0.3px]">{readOnly ? "No FAQs" : "Add frequently asked questions for creators"}</p>
              ) : readOnly ? (
                blueprint.faqs.map((faq, index) => (
                  <div key={`faq-${index}-${blueprint.id}`} className="rounded-xl bg-muted/20 p-4">
                    <h4 className="text-sm font-medium text-foreground">{faq.question}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
                  </div>
                ))
              ) : (
                <>
                  {blueprint.faqs.map((faq, index) => (
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
                </>
              )}
            </div>
          </BlueprintSection>;
      default:
        return null;
    }
  };
  if (loading || !blueprint) return null;
  return <>
      <div className={`${readOnly ? '' : 'h-full p-[5px]'}`}>
        <div className={`${readOnly ? '' : 'h-full'} flex flex-col bg-background ${readOnly ? '' : 'border border-border rounded-[20px] overflow-hidden'}`}>
          {/* ReadOnly Header */}
          {readOnly && (
            <div className="sticky top-0 z-10 flex items-center justify-between py-2.5 bg-background border-b border-border px-4">
              <div className="flex items-center gap-2">
                {brand?.logo_url ? (
                  <img src={brand.logo_url} alt={brand.name} className="h-5 w-5 rounded object-cover" />
                ) : (
                  <div
                    className="h-5 w-5 rounded flex items-center justify-center text-white text-[10px] font-semibold"
                    style={{ backgroundColor: brand?.brand_color || '#8B5CF6' }}
                  >
                    {(brand?.name || 'B').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-foreground font-inter tracking-[-0.3px]">
                  {brand?.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied to clipboard");
                  }}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  title="Copy link"
                >
                  <Icon icon="material-symbols:link" className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: blueprint.title || "Blueprint",
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Link copied to clipboard");
                    }
                  }}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  title="Share"
                >
                  <Icon icon="material-symbols:share" className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Header - Fixed (edit mode only) */}
          {!readOnly && (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 py-2 sm:py-2.5 bg-white dark:bg-background border-b border-border px-3 sm:px-[14px]">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              <div className="group flex items-center gap-1.5 sm:gap-2 cursor-pointer" onClick={() => setSearchParams(prev => {
                prev.delete('blueprint');
                return prev;
              })}>
                {brand?.logo_url ? <img src={brand.logo_url} alt={brand.name} className="h-5 w-5 sm:h-6 sm:w-6 rounded object-cover shrink-0 group-hover:opacity-80 transition-opacity" /> : <div className="h-5 w-5 sm:h-6 sm:w-6 rounded flex items-center justify-center text-white text-xs font-semibold shrink-0 group-hover:opacity-80 transition-opacity" style={{
                  backgroundColor: brand?.brand_color || '#8B5CF6'
                }}>
                  {(brand?.name || 'B').charAt(0).toUpperCase()}
                </div>}
                <span className="text-sm font-medium text-foreground font-inter tracking-[-0.5px] shrink-0 group-hover:opacity-80 transition-opacity">{brand?.name}</span>
              </div>
              <span className="text-muted-foreground/50 shrink-0">/</span>
              <Input value={blueprint.title} onChange={e => updateBlueprint({
              title: e.target.value
            })} className="h-8 flex-1 min-w-0 !bg-transparent border-none focus-visible:ring-0 px-1 text-foreground font-medium font-inter tracking-[-0.5px] text-sm" placeholder="Untitled" />
              {saving && <span className="text-xs text-muted-foreground animate-pulse font-inter tracking-[-0.5px] shrink-0">
                  Saving...
                </span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setImportDialogOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-muted dark:bg-muted/50 text-secondary-foreground hover:bg-muted/80 dark:hover:bg-muted/70 transition-colors text-sm font-medium font-inter tracking-[-0.3px]"
              >
                <Icon icon="material-symbols:download" className="h-5 w-5" />
                Import
              </button>
              <button onClick={() => window.open(`/blueprint/${blueprintId}`, '_blank')} className="p-1.5 rounded-md border border-border bg-muted dark:bg-muted/50 text-secondary-foreground hover:bg-muted/80 dark:hover:bg-muted/70 transition-colors">
                <img src={playArrowIcon} alt="Preview" className="h-5 w-5 dark:invert" />
              </button>
              <button onClick={activateBlueprint} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground border border-primary/20 font-inter font-medium tracking-[-0.4px] text-xs sm:text-sm hover:bg-primary/90 transition-colors">
                Publish
              </button>
            </div>
          </div>
          )}

          {/* Content */}
          <div className={readOnly ? "" : "flex-1 overflow-auto"}>
            <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-3 sm:space-y-4 py-[10px]">
              {/* Blueprint Title - Large inline input (or text in readOnly) */}
              {readOnly ? (
                <h1 className={`w-full text-2xl sm:text-3xl font-semibold font-inter tracking-[-0.5px] ${
                  !blueprint.title ? "text-muted-foreground/50" : "text-foreground"
                }`}>
                  {blueprint.title || "Untitled"}
                </h1>
              ) : (
                <input
                  type="text"
                  value={blueprint.title}
                  onChange={(e) => updateBlueprint({ title: e.target.value })}
                  placeholder="Untitled"
                  className={`w-full text-2xl sm:text-3xl font-semibold bg-transparent border-none outline-none focus:outline-none focus:ring-0 font-inter tracking-[-0.5px] placeholder:text-muted-foreground/50 ${
                    !blueprint.title ? "text-muted-foreground/50 focus:text-foreground" : "text-foreground"
                  }`}
                />
              )}

              {/* Onboarding Section - only shown for empty blueprints when not hidden (not in readOnly) */}
              {!readOnly && isEmptyBlueprint() && !hideOnboarding && (
                <BlueprintOnboarding
                  brandId={brandId}
                  onSelectTemplate={handleApplyTemplate}
                  onStartBlank={() => setHideOnboarding(true)}
                />
              )}

              {/* Modular Sections */}
              <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={enabledSections} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {enabledSections.map(sectionId => renderSection(sectionId))}

                    {/* Add Section Button - hidden in readOnly mode */}
                    {!readOnly && <BlueprintSectionMenu enabledSections={enabledSections} onToggleSection={toggleSection} />}
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

      {/* Import Content Dialog */}
      <TemplateSelector
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSelectTemplate={() => {}}
        onImportFromGoogleDocs={handleGoogleDocsImport}
        onImportFromNotion={handleGoogleDocsImport}
        onGenerateWithAI={handleGoogleDocsImport}
        brandId={brandId}
        hideBlankOption
      />

      {/* Connect Social Account Dialog */}
      <AddSocialAccountDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        onSuccess={() => {
          setConnectDialogOpen(false);
          toast.success("Account connected successfully");
        }}
        initialPlatform={connectPlatform}
      />
    </>;
}