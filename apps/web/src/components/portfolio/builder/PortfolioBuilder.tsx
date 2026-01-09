import { useState, useCallback, useEffect, useRef } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyPortfolio, useUpsertPortfolio } from "@/hooks/usePortfolio";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { CreatorPortfolio, PortfolioSectionType } from "@/types/portfolio";
import { PortfolioSectionMenu } from "./PortfolioSectionMenu";
import { SortableSection } from "./SortableSection";
import { ResumeSection } from "./ResumeSection";
import { SkillsSection } from "./SkillsSection";
import { MediaShowcase } from "./MediaShowcase";
import { PlatformSection } from "./PlatformSection";
import { CreatorInfoSection } from "./CreatorInfoSection";

const DEFAULT_SECTION_ORDER: PortfolioSectionType[] = [
  "resume",
  "skills",
  "media",
  "platforms",
  "creator_info",
];

// Helper to count items per section for the badge display
function getSectionItemCount(
  sectionId: PortfolioSectionType,
  portfolio: Partial<CreatorPortfolio>
): number {
  switch (sectionId) {
    case "resume":
      return (
        (portfolio.work_experience?.length || 0) +
        (portfolio.education?.length || 0) +
        (portfolio.certifications?.length || 0)
      );
    case "skills":
      return portfolio.skills?.length || 0;
    case "media":
      return (
        (portfolio.featured_videos?.length || 0) +
        (portfolio.showcase_items?.length || 0)
      );
    case "platforms":
      return portfolio.platforms?.length || 0;
    case "creator_info":
      return (
        (portfolio.content_niches?.length || 0) +
        (portfolio.equipment?.length || 0) +
        (portfolio.languages?.length || 0)
      );
    default:
      return 0;
  }
}

type SaveStatus = "saved" | "saving" | "unsaved";

export function PortfolioBuilder() {
  const { data: portfolio, isLoading } = useMyPortfolio();
  const upsertPortfolio = useUpsertPortfolio();
  const { user } = useAuth();

  const [localPortfolio, setLocalPortfolio] = useState<Partial<CreatorPortfolio>>({});
  const [enabledSections, setEnabledSections] = useState<PortfolioSectionType[]>(DEFAULT_SECTION_ORDER);
  const [isPublic, setIsPublic] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedPortfolio = useDebounce(localPortfolio, 2000);

  // Update save status based on mutation state
  useEffect(() => {
    if (upsertPortfolio.isPending) {
      setSaveStatus("saving");
    } else if (upsertPortfolio.isSuccess && !hasChanges) {
      setSaveStatus("saved");
      // Show "saved" for 2 seconds then hide
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus("saved");
      }, 2000);
    }
  }, [upsertPortfolio.isPending, upsertPortfolio.isSuccess, hasChanges]);

  // Track unsaved changes
  useEffect(() => {
    if (hasChanges) {
      setSaveStatus("unsaved");
    }
  }, [hasChanges]);

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
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Get username for preview link
  const username = user?.user_metadata?.username;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-border/40">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.5px]">Portfolio Builder</h2>
          <p className="text-muted-foreground text-sm mt-1 tracking-[-0.5px]">
            Drag sections to reorder, click to edit content
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Save Status Indicator */}
          <div
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-all tracking-[-0.5px]",
              saveStatus === "saved" && "bg-emerald-500/10 text-emerald-600",
              saveStatus === "saving" && "bg-amber-500/10 text-amber-600",
              saveStatus === "unsaved" && "bg-muted text-muted-foreground"
            )}
          >
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Unsaved"}
          </div>

          {/* Visibility Toggle */}
          <button
            onClick={() => {
              setIsPublic(!isPublic);
              setHasChanges(true);
            }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all border tracking-[-0.5px]",
              isPublic
                ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
            )}
          >
            {isPublic ? "Public" : "Private"}
          </button>

          {/* Preview Button */}
          {username && isPublic && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs tracking-[-0.5px]"
              onClick={() => window.open(`/creator/${username}`, "_blank")}
            >
              Preview
            </Button>
          )}
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
                itemCount={getSectionItemCount(sectionId, localPortfolio)}
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
    </div>
  );
}
