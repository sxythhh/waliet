import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Common skills suggestions for creators
const SKILL_SUGGESTIONS = [
  "Video Editing",
  "Content Creation",
  "Social Media Marketing",
  "Photography",
  "Copywriting",
  "Motion Graphics",
  "Color Grading",
  "Sound Design",
  "Storytelling",
  "Brand Partnerships",
  "Community Management",
  "Live Streaming",
  "Podcast Production",
  "SEO",
  "Analytics",
  "Adobe Premiere",
  "Final Cut Pro",
  "DaVinci Resolve",
  "After Effects",
  "Photoshop",
  "Lightroom",
  "Canva",
  "CapCut",
  "TikTok Strategy",
  "YouTube Strategy",
  "Instagram Strategy",
  "Influencer Marketing",
  "UGC Creation",
  "Product Reviews",
  "Tutorials",
  "Vlogs",
];

interface SkillsSectionProps {
  skills: string[];
  onChange: (skills: string[]) => void;
}

export function SkillsSection({ skills, onChange }: SkillsSectionProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = SKILL_SUGGESTIONS.filter(
    (skill) =>
      skill.toLowerCase().includes(inputValue.toLowerCase()) && !skills.includes(skill)
  ).slice(0, 8);

  const handleAddSkill = useCallback(
    (skill: string) => {
      const trimmed = skill.trim();
      if (trimmed && !skills.includes(trimmed)) {
        onChange([...skills, trimmed]);
      }
      setInputValue("");
      setShowSuggestions(false);
    },
    [skills, onChange]
  );

  const handleRemoveSkill = useCallback(
    (skill: string) => {
      onChange(skills.filter((s) => s !== skill));
    },
    [skills, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleAddSkill(inputValue);
    } else if (e.key === "Backspace" && !inputValue && skills.length > 0) {
      handleRemoveSkill(skills[skills.length - 1]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Skills Tags */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <div
              key={skill}
              className={cn(
                "group flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                "bg-primary/10 text-primary text-sm font-medium",
                "border border-primary/20"
              )}
            >
              <span>{skill}</span>
              <button
                onClick={() => handleRemoveSkill(skill)}
                className="p-0.5 rounded-full opacity-60 hover:opacity-100 hover:bg-primary/20 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="Type a skill and press Enter"
          className="bg-muted/30 border-0 focus-visible:ring-1"
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && (inputValue || filteredSuggestions.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover rounded-xl border shadow-lg z-10 max-h-48 overflow-y-auto">
            {inputValue &&
              !SKILL_SUGGESTIONS.some((s) => s.toLowerCase() === inputValue.toLowerCase()) && (
                <button
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                  onClick={() => handleAddSkill(inputValue)}
                >
                  <span className="text-primary">+</span>
                  <span>Add "{inputValue}"</span>
                </button>
              )}
            {filteredSuggestions.map((skill) => (
              <button
                key={skill}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors"
                onClick={() => handleAddSkill(skill)}
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add Suggestions */}
      {skills.length < 8 && (
        <div className="space-y-2.5">
          <Label className="text-xs text-muted-foreground tracking-[-0.5px]">
            Suggested skills
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s))
              .slice(0, 10)
              .map((skill) => (
                <button
                  key={skill}
                  onClick={() => handleAddSkill(skill)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-full transition-all",
                    "bg-muted/50 text-muted-foreground",
                    "hover:bg-primary/10 hover:text-primary hover:border-primary/20",
                    "border border-transparent"
                  )}
                >
                  + {skill}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {skills.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm tracking-[-0.5px]">
          <p>No skills added yet</p>
          <p className="text-xs mt-1">Add skills to help brands find you for relevant campaigns</p>
        </div>
      )}
    </div>
  );
}
