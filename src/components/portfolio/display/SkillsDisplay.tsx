import { Badge } from "@/components/ui/badge";

interface SkillsDisplayProps {
  skills: string[];
}

export function SkillsDisplay({ skills }: SkillsDisplayProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <Badge
          key={skill}
          variant="secondary"
          className="px-3 py-1.5 text-sm font-medium font-['Inter'] tracking-[-0.3px]"
        >
          {skill}
        </Badge>
      ))}
    </div>
  );
}
