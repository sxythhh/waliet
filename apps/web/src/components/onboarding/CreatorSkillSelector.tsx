import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Icon } from "@iconify/react";

interface SkillType {
  id: string;
  name: string;
  category: string;
  description: string | null;
}

interface CreatorSkillSelectorProps {
  selectedSkillId: string | null;
  onSkillSelect: (skillId: string | null) => void;
  selectedSoftware: string[];
  onSoftwareChange: (software: string[]) => void;
  compact?: boolean;
}

const EDITING_SOFTWARE = [
  { id: "capcut", name: "CapCut", icon: "simple-icons:capcut" },
  { id: "premiere", name: "Premiere Pro", icon: "simple-icons:adobepremierepro" },
  { id: "davinci", name: "DaVinci Resolve", icon: "simple-icons:davinciresolve" },
  { id: "finalcut", name: "Final Cut Pro", icon: "simple-icons:apple" },
  { id: "aftereffects", name: "After Effects", icon: "simple-icons:adobeaftereffects" },
  { id: "vegas", name: "Vegas Pro", icon: "mdi:movie-edit" },
  { id: "filmora", name: "Filmora", icon: "mdi:movie-filter" },
  { id: "other", name: "Other", icon: "mdi:dots-horizontal" },
];

const CATEGORY_INFO: Record<string, { label: string; description: string; icon: string }> = {
  editor: {
    label: "Video Editor",
    description: "Create original content from raw footage",
    icon: "ph:film-strip-fill",
  },
  clipper: {
    label: "Clipper",
    description: "Extract highlights from long-form content",
    icon: "ph:scissors-fill",
  },
  repurposer: {
    label: "Repurposer",
    description: "Adapt content across platforms",
    icon: "ph:arrows-clockwise-fill",
  },
  hybrid: {
    label: "Hybrid",
    description: "Combination of multiple skills",
    icon: "ph:intersect-fill",
  },
};

export function CreatorSkillSelector({
  selectedSkillId,
  onSkillSelect,
  selectedSoftware,
  onSoftwareChange,
  compact = false,
}: CreatorSkillSelectorProps) {
  const [skillTypes, setSkillTypes] = useState<SkillType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch skill types from database
  useEffect(() => {
    const fetchSkillTypes = async () => {
      const { data, error } = await supabase
        .from("creator_skill_types")
        .select("id, name, category, description")
        .eq("is_active", true)
        .order("sort_order");

      if (error) {
        console.error("Error fetching skill types:", error);
      } else {
        setSkillTypes(data || []);
        // If a skill is already selected, set the category
        if (selectedSkillId) {
          const selected = data?.find(s => s.id === selectedSkillId);
          if (selected) {
            setSelectedCategory(selected.category);
          }
        }
      }
      setLoading(false);
    };

    fetchSkillTypes();
  }, [selectedSkillId]);

  const toggleSoftware = (softwareId: string) => {
    if (selectedSoftware.includes(softwareId)) {
      onSoftwareChange(selectedSoftware.filter(s => s !== softwareId));
    } else {
      onSoftwareChange([...selectedSoftware, softwareId]);
    }
  };

  const categories = Object.keys(CATEGORY_INFO);
  const filteredSkills = selectedCategory
    ? skillTypes.filter(s => s.category === selectedCategory)
    : skillTypes;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      {/* Category Selection */}
      <div className="space-y-3">
        <p className="text-sm font-medium font-inter tracking-[-0.5px]">
          What type of work do you do?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => {
            const info = CATEGORY_INFO[category];
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(isSelected ? null : category);
                  if (isSelected) {
                    onSkillSelect(null);
                  }
                }}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all text-left",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-primary/30 hover:bg-muted/20"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon icon={info.icon} className={cn(
                    "w-5 h-5",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium font-inter tracking-[-0.5px]",
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {info.label}
                  </span>
                </div>
                {!compact && (
                  <p className="text-xs text-muted-foreground mt-1 font-inter tracking-[-0.3px]">
                    {info.description}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skill Type Selection (shown when category selected) */}
      {selectedCategory && filteredSkills.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium font-inter tracking-[-0.5px]">
            Specialization
          </p>
          <div className="flex flex-wrap gap-2">
            {filteredSkills.map((skill) => {
              const isSelected = selectedSkillId === skill.id;
              return (
                <button
                  key={skill.id}
                  onClick={() => onSkillSelect(isSelected ? null : skill.id)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-inter tracking-[-0.3px] transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {skill.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Editing Software Selection */}
      <div className="space-y-3">
        <p className="text-sm font-medium font-inter tracking-[-0.5px]">
          What software do you use?
        </p>
        <div className="flex flex-wrap gap-2">
          {EDITING_SOFTWARE.map((software) => {
            const isSelected = selectedSoftware.includes(software.id);
            return (
              <button
                key={software.id}
                onClick={() => toggleSoftware(software.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-inter tracking-[-0.3px] transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon icon={software.icon} className="w-4 h-4" />
                {software.name}
              </button>
            );
          })}
        </div>
        {selectedSoftware.length > 0 && (
          <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
            {selectedSoftware.length} selected
          </p>
        )}
      </div>
    </div>
  );
}
