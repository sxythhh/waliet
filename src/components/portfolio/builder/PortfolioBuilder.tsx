import { useState, useCallback, useEffect } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Loader2, Eye, EyeOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMyPortfolio, useUpsertPortfolio } from "@/hooks/usePortfolio";
import { useDebounce } from "@/hooks/use-debounce";
import type { CreatorPortfolio, PortfolioSectionType } from "@/types/portfolio";
import { PortfolioSectionMenu } from "./PortfolioSectionMenu";
import { SortableSection } from "./SortableSection";
import { ResumeSection } from "./ResumeSection";
import { SkillsSection } from "./SkillsSection";
import { MediaShowcase } from "./MediaShowcase";
import { PlatformSection } from "./PlatformSection";
import { CreatorInfoSection } from "./CreatorInfoSection";
import { CustomSectionEditor } from "./CustomSectionEditor";

const DEFAULT_SECTION_ORDER: PortfolioSectionType[] = [
  "resume",
  "skills",
  "media",
  "platforms",
  "creator_info",
];

export function PortfolioBuilder() {
  const { data: portfolio, isLoading } = useMyPortfolio();
  const upsertPortfolio = useUpsertPortfolio();

  const [localPortfolio, setLocalPortfolio] = useState<Partial<CreatorPortfolio>>({});
  const [enabledSections, setEnabledSections] = useState<PortfolioSectionType[]>(DEFAULT_SECTION_ORDER);
  const [isPublic, setIsPublic] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const debouncedPortfolio = useDebounce(localPortfolio, 2000);

  // Initialize from loaded portfolio
  useEffect(() => {
    if (portfolio) {
      setLocalPortfolio(portfolio);
      setIsPublic(portfolio.is_public);
      if (portfolio.section_order && portfolio.section_order.length > 0) {
        setEnabledSections(portfolio.section_order as PortfolioSectionType[]);
      }
    }
  }, [portfolio]);

  // Auto-save when portfolio changes
  useEffect(() => {
    if (hasChanges && Object.keys(debouncedPortfolio).length > 0) {
      upsertPortfolio.mutate({
        ...debouncedPortfolio,
        section_order: enabledSections,
        is_public: isPublic,
      });
      setHasChanges(false);
    }
  }, [debouncedPortfolio, enabledSections, isPublic, hasChanges]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEnabledSections((items) => {
        const oldIndex = items.indexOf(active.id as PortfolioSectionType);
        const newIndex = items.indexOf(over.id as PortfolioSectionType);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasChanges(true);
    }
  }, []);

  const handleToggleSection = useCallback((sectionId: PortfolioSectionType) => {
    setEnabledSections((prev) => {
      if (prev.includes(sectionId)) {
        return prev.filter((id) => id !== sectionId);
      }
      return [...prev, sectionId];
    });
    setHasChanges(true);
  }, []);

  const updateField = useCallback(<K extends keyof CreatorPortfolio>(
    field: K,
    value: CreatorPortfolio[K]
  ) => {
    setLocalPortfolio((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    upsertPortfolio.mutate({
      ...localPortfolio,
      section_order: enabledSections,
      is_public: isPublic,
    });
    setHasChanges(false);
  }, [localPortfolio, enabledSections, isPublic, upsertPortfolio]);

  const renderSection = (sectionId: PortfolioSectionType) => {
    switch (sectionId) {
      case "resume":
        return (
          <ResumeSection
            workExperience={localPortfolio.work_experience || []}
            education={localPortfolio.education || []}
            certifications={localPortfolio.certifications || []}
            onWorkExperienceChange={(value) => updateField("work_experience", value)}
            onEducationChange={(value) => updateField("education", value)}
            onCertificationsChange={(value) => updateField("certifications", value)}
          />
        );
      case "skills":
        return (
          <SkillsSection
            skills={localPortfolio.skills || []}
            onChange={(value) => updateField("skills", value)}
          />
        );
      case "media":
        return (
          <MediaShowcase
            featuredVideos={localPortfolio.featured_videos || []}
            showcaseItems={localPortfolio.showcase_items || []}
            onFeaturedVideosChange={(value) => updateField("featured_videos", value)}
            onShowcaseItemsChange={(value) => updateField("showcase_items", value)}
          />
        );
      case "platforms":
        return (
          <PlatformSection
            platforms={localPortfolio.platforms || []}
            onChange={(value) => updateField("platforms", value)}
          />
        );
      case "creator_info":
        return (
          <CreatorInfoSection
            contentNiches={localPortfolio.content_niches || []}
            equipment={localPortfolio.equipment || []}
            languages={localPortfolio.languages || []}
            availability={localPortfolio.availability || null}
            rateRange={localPortfolio.rate_range || null}
            onContentNichesChange={(value) => updateField("content_niches", value)}
            onEquipmentChange={(value) => updateField("equipment", value)}
            onLanguagesChange={(value) => updateField("languages", value)}
            onAvailabilityChange={(value) => updateField("availability", value)}
            onRateRangeChange={(value) => updateField("rate_range", value)}
          />
        );
      case "custom":
        return (
          <CustomSectionEditor
            customSections={localPortfolio.custom_sections || []}
            onChange={(value) => updateField("custom_sections", value)}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Portfolio Builder</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Customize your public profile to showcase your work and experience
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isPublic ? (
              <Eye className="h-4 w-4 text-muted-foreground" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="public-toggle" className="text-sm text-muted-foreground">
              {isPublic ? "Public" : "Private"}
            </Label>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={(checked) => {
                setIsPublic(checked);
                setHasChanges(true);
              }}
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || upsertPortfolio.isPending}
            size="sm"
          >
            {upsertPortfolio.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Sections */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={enabledSections}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {enabledSections.map((sectionId) => (
              <SortableSection
                key={sectionId}
                id={sectionId}
                onRemove={() => handleToggleSection(sectionId)}
              >
                {renderSection(sectionId)}
              </SortableSection>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Section Menu */}
      <PortfolioSectionMenu
        enabledSections={enabledSections}
        onToggleSection={handleToggleSection}
      />

      {/* Auto-save indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-muted/90 backdrop-blur-sm text-muted-foreground text-sm px-3 py-2 rounded-lg shadow-lg">
          Auto-saving...
        </div>
      )}
    </div>
  );
}
