import { useState, useCallback } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
      skill.toLowerCase().includes(inputValue.toLowerCase()) &&
      !skills.includes(skill)
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
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <Badge
            key={skill}
            variant="secondary"
            className="pl-3 pr-1 py-1.5 text-sm flex items-center gap-1.5"
          >
            {skill}
            <button
              onClick={() => handleRemoveSkill(skill)}
              className="p-0.5 rounded-full hover:bg-background/50 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-muted-foreground" />
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
            className="flex-1"
          />
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (inputValue || filteredSuggestions.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
            {inputValue && !SKILL_SUGGESTIONS.some((s) => s.toLowerCase() === inputValue.toLowerCase()) && (
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                onClick={() => handleAddSkill(inputValue)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add "{inputValue}"
              </button>
            )}
            {filteredSuggestions.map((skill) => (
              <button
                key={skill}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => handleAddSkill(skill)}
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add Suggestions */}
      {skills.length < 5 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Quick add:</p>
          <div className="flex flex-wrap gap-1.5">
            {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s))
              .slice(0, 12)
              .map((skill) => (
                <button
                  key={skill}
                  onClick={() => handleAddSkill(skill)}
                  className="px-2.5 py-1 text-xs bg-muted/50 hover:bg-muted rounded-full transition-colors"
                >
                  + {skill}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Add skills that showcase your expertise. These help brands find you for relevant campaigns.
      </p>
    </div>
  );
}
