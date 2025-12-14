import { useState, useRef, useEffect } from "react";
import { Plus, FileText, Share2, MessageSquare, ListChecks, ThumbsUp, Hash, Folder, Video, Users, Mic, MinusCircle } from "lucide-react";
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
    <div ref={menuRef} className="relative flex items-center gap-4 py-2">
      {/* Left line */}
      <div className="flex-1 h-[1px] bg-border" />
      
      {/* Add Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full transition-all font-inter tracking-[-0.5px] text-sm border",
          isOpen
            ? "bg-muted text-foreground border-border"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-border/50"
        )}
      >
        <Plus className="h-4 w-4" />
        <span>Add section</span>
      </button>

      {/* Right line */}
      <div className="flex-1 h-[1px] bg-border" />

      {/* Dropdown Menu - opens above */}
      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-80 max-h-96 overflow-y-auto rounded-2xl border border-border bg-card/95 backdrop-blur-sm shadow-2xl">
          {/* Available sections to add */}
          {availableSections.length > 0 && (
            <div className="p-3">
              <p className="px-2 py-2 text-[11px] font-medium uppercase text-muted-foreground/50 tracking-wider font-inter">
                Add Section
              </p>
              <div className="space-y-1">
                {availableSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      onToggleSection(section.id);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-all">
                      {section.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-inter tracking-[-0.5px] text-foreground">
                        {section.title}
                      </p>
                      <p className="text-xs text-muted-foreground/70 font-inter tracking-[-0.5px]">
                        {section.description}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {availableSections.length > 0 && addedSections.length > 0 && (
            <div className="mx-3 border-t border-border/30" />
          )}

          {/* Already added sections */}
          {addedSections.length > 0 && (
            <div className="p-3">
              <p className="px-2 py-2 text-[11px] font-medium uppercase text-muted-foreground/50 tracking-wider font-inter">
                Active Sections
              </p>
              <div className="space-y-1">
                {addedSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      onToggleSection(section.id);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-destructive/10 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      {section.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-inter tracking-[-0.5px] text-foreground">
                        {section.title}
                      </p>
                    </div>
                    <MinusCircle className="h-5 w-5 text-destructive/60 group-hover:text-destructive transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableSections.length === 0 && addedSections.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              No sections available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { ALL_SECTIONS };