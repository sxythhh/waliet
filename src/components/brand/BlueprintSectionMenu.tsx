import { useState, useRef, useEffect } from "react";
import { Plus, FileText, Share2, MessageSquare, ListChecks, ThumbsUp, Hash, Folder, Video, Users, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionType = 
  | "content"
  | "platforms"
  | "brand_voice"
  | "hooks"
  | "talking_points"
  | "dos_and_donts"
  | "call_to_action"
  | "hashtags"
  | "assets"
  | "example_videos"
  | "target_personas";

interface SectionDefinition {
  id: SectionType;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ALL_SECTIONS: SectionDefinition[] = [
  {
    id: "content",
    title: "Brief Content",
    description: "Add main campaign brief",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: "platforms",
    title: "Platforms",
    description: "Select target platforms",
    icon: <Share2 className="h-4 w-4" />,
  },
  {
    id: "brand_voice",
    title: "Brand Voice",
    description: "Define tone and style",
    icon: <Mic className="h-4 w-4" />,
  },
  {
    id: "hooks",
    title: "Hooks",
    description: "Attention-grabbing openers",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: "talking_points",
    title: "Talking Points",
    description: "Key messages to cover",
    icon: <ListChecks className="h-4 w-4" />,
  },
  {
    id: "dos_and_donts",
    title: "Do's & Don'ts",
    description: "Guidelines for creators",
    icon: <ThumbsUp className="h-4 w-4" />,
  },
  {
    id: "call_to_action",
    title: "Call to Action",
    description: "Desired viewer action",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: "hashtags",
    title: "Hashtags",
    description: "Required hashtags",
    icon: <Hash className="h-4 w-4" />,
  },
  {
    id: "assets",
    title: "Assets & Files",
    description: "Links to brand assets",
    icon: <Folder className="h-4 w-4" />,
  },
  {
    id: "example_videos",
    title: "Example Videos",
    description: "Reference content",
    icon: <Video className="h-4 w-4" />,
  },
  {
    id: "target_personas",
    title: "Target Personas",
    description: "Audience profiles",
    icon: <Users className="h-4 w-4" />,
  },
];

interface BlueprintSectionMenuProps {
  enabledSections: SectionType[];
  onToggleSection: (sectionId: SectionType) => void;
}

export function BlueprintSectionMenu({
  enabledSections,
  onToggleSection,
}: BlueprintSectionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableSections = ALL_SECTIONS.filter(
    (section) => !enabledSections.includes(section.id)
  );
  const addedSections = ALL_SECTIONS.filter((section) =>
    enabledSections.includes(section.id)
  );

  return (
    <div ref={menuRef} className="relative">
      {/* Add Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed transition-all font-inter tracking-[-0.5px] text-sm",
          isOpen
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
            : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
        )}
      >
        <Plus className="h-4 w-4" />
        <span>Add section</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Available sections to add */}
          {availableSections.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1.5 text-[10px] font-medium uppercase text-muted-foreground/60 tracking-wider">
                Add Section
              </p>
              {availableSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    onToggleSection(section.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                >
                  <span className="mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors">
                    {section.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-inter tracking-[-0.5px] text-foreground">
                      {section.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {section.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          {availableSections.length > 0 && addedSections.length > 0 && (
            <div className="border-t border-border/50" />
          )}

          {/* Already added sections */}
          {addedSections.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1.5 text-[10px] font-medium uppercase text-muted-foreground/60 tracking-wider">
                Active Sections
              </p>
              {addedSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    onToggleSection(section.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-destructive/10 transition-colors text-left group"
                >
                  <span className="text-emerald-500">{section.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-inter tracking-[-0.5px] text-foreground">
                      {section.title}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:text-destructive transition-colors">
                    Remove
                  </span>
                </button>
              ))}
            </div>
          )}

          {availableSections.length === 0 && addedSections.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No sections available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { ALL_SECTIONS };
