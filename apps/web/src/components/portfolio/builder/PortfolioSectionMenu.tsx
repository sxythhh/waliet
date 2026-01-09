import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { PortfolioSectionType } from "@/types/portfolio";

interface SectionDefinition {
  id: PortfolioSectionType;
  title: string;
  description: string;
}

const ALL_SECTIONS: SectionDefinition[] = [
  {
    id: "resume",
    title: "Experience & Education",
    description: "Work history and education",
  },
  {
    id: "skills",
    title: "Skills",
    description: "Your skills and expertise",
  },
  {
    id: "media",
    title: "Media Showcase",
    description: "Featured videos and content",
  },
  {
    id: "platforms",
    title: "Social Platforms",
    description: "Your social presence",
  },
  {
    id: "creator_info",
    title: "Creator Info",
    description: "Niches, availability, rates",
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
    (section) => !enabledSections.includes(section.id)
  );
  const addedSections = ALL_SECTIONS.filter((section) =>
    enabledSections.includes(section.id)
  );

  return (
    <div ref={menuRef} className="relative flex items-center gap-4 py-4">
      <div className="flex-1 h-[1px] bg-border/50" />

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-4 py-2 rounded-full transition-all tracking-[-0.5px] text-sm",
          isOpen
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        Add section
      </button>

      <div className="flex-1 h-[1px] bg-border/50" />

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-72 max-h-96 overflow-y-auto rounded-2xl bg-card shadow-xl border border-border/50">
          {availableSections.length > 0 && (
            <div className="p-3">
              <p className="px-3 py-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Add Section
              </p>
              <div className="space-y-1 mt-1">
                {availableSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      onToggleSection(section.id);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-all text-left group"
                  >
                    <div className="flex-1">
                      <span className="text-sm tracking-[-0.5px] text-foreground block">
                        {section.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {section.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableSections.length > 0 && addedSections.length > 0 && (
            <div className="mx-3 border-t border-border/30" />
          )}

          {addedSections.length > 0 && (
            <div className="p-3">
              <p className="px-3 py-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Remove Section
              </p>
              <div className="space-y-1 mt-1">
                {addedSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      onToggleSection(section.id);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-destructive/10 transition-all text-left group"
                  >
                    <span className="text-sm tracking-[-0.5px] text-foreground">
                      {section.title}
                    </span>
                    <span className="text-xs text-muted-foreground group-hover:text-destructive transition-colors">
                      Remove
                    </span>
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
