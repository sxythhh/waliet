import { ExternalLink } from "lucide-react";
import type { CustomSection } from "@/types/portfolio";

interface CustomSectionDisplayProps {
  sections: CustomSection[];
}

export function CustomSectionDisplay({ sections }: CustomSectionDisplayProps) {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {sortedSections.map((section) => (
        <div key={section.id} className="space-y-3">
          <h3 className="font-medium">{section.title}</h3>

          {section.type === "text" && typeof section.content === "string" && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground whitespace-pre-wrap">{section.content}</p>
            </div>
          )}

          {section.type === "list" && Array.isArray(section.content) && (
            <ul className="space-y-2">
              {section.content.map((item, index) => (
                <li key={index} className="flex gap-2 text-muted-foreground">
                  <span className="text-primary">\u2022</span>
                  {item}
                </li>
              ))}
            </ul>
          )}

          {section.type === "gallery" && Array.isArray(section.content) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {section.content.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square bg-muted rounded-lg overflow-hidden group"
                >
                  <img
                    src={url}
                    alt={`Gallery item ${index + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          )}

          {section.type === "links" && Array.isArray(section.content) && (
            <div className="space-y-2">
              {section.content.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {url}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
