import { useState, useRef, useEffect } from "react";
import { Plus, Briefcase, Wrench, Video, Share2, User, Layout, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioSectionType } from "@/types/portfolio";

interface SectionDefinition {
  id: PortfolioSectionType;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ALL_SECTIONS: SectionDefinition[] = [
  {
    id: "resume",
    title: "Experience & Education",
    description: "Work history and education",
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    id: "skills",
    title: "Skills",
    description: "Your skills and expertise",
    icon: <Wrench className="h-4 w-4" />,
  },
  {
    id: "media",
    title: "Media Showcase",
    description: "Featured videos and content",
    icon: <Video className="h-4 w-4" />,
  },
  {
    id: "platforms",
    title: "Social Platforms",
    description: "Your social presence",
    icon: <Share2 className="h-4 w-4" />,
  },
  {
    id: "creator_info",
    title: "Creator Info",
    description: "Niches, availability, rates",
    icon: <User className="h-4 w-4" />,
  },
  {
    id: "custom",
    title: "Custom Section",
    description: "Add your own section",
    icon: <Layout className="h-4 w-4" />,
  },
];

interface PortfolioSectionMenuProps {
  enabledSections: PortfolioSectionType[];
  onToggleSection: (sectionId: PortfolioSectionType) => void;
}

export function PortfolioSectionMenu({
  enabledSections,
  onToggleSection,
}: PortfolioSectionMenuProps) {
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
    (section) => !enabledSections.includes(section.id) || section.id === "custom"
  );
  const addedSections = ALL_SECTIONS.filter(
    (section) => enabledSections.includes(section.id) && section.id !== "custom"
  );

  return (
    <div ref={menuRef} className="relative flex items-center gap-4 py-4">
      <div className="flex-1 h-[1px] bg-border" />

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

      <div className="flex-1 h-[1px] bg-border" />

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-72 max-h-96 overflow-y-auto rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-xl">
          {availableSections.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Add Section
              </p>
              <div className="space-y-0.5 mt-1">
                {availableSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      onToggleSection(section.id);
                      if (section.id !== "custom") {
                        setIsOpen(false);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-all text-left group"
                  >
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      {section.icon}
                    </span>
                    <div className="flex-1">
                      <span className="text-sm font-inter tracking-[-0.5px] text-foreground block">
                        {section.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {section.description}
                      </span>
                    </div>
                    <Plus className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableSections.length > 0 && addedSections.length > 0 && (
            <div className="mx-2 border-t border-border/30" />
          )}

          {addedSections.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Remove Section
              </p>
              <div className="space-y-0.5 mt-1">
                {addedSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      onToggleSection(section.id);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 transition-all text-left group"
                  >
                    <span className="text-muted-foreground">
                      {section.icon}
                    </span>
                    <span className="text-sm font-inter tracking-[-0.5px] text-foreground flex-1">
                      {section.title}
                    </span>
                    <MinusCircle className="h-4 w-4 text-destructive/60 group-hover:text-destructive transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
