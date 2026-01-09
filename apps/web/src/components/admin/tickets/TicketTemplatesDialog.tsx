import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, FileText, Check } from "lucide-react";
import { REPLY_TEMPLATES, processTemplate } from "./constants";
import { TicketTemplate } from "@/types/tickets";

interface TicketTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (content: string) => void;
  variables?: {
    username?: string;
    ticket_number?: string;
  };
}

export function TicketTemplatesDialog({
  open,
  onOpenChange,
  onSelectTemplate,
  variables = {},
}: TicketTemplatesDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TicketTemplate | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(REPLY_TEMPLATES.map((t) => t.category)));
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return REPLY_TEMPLATES.filter((template) => {
      const matchesSearch =
        search === "" ||
        template.name.toLowerCase().includes(search.toLowerCase()) ||
        template.content.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === null || template.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const grouped: Record<string, TicketTemplate[]> = {};
    filteredTemplates.forEach((template) => {
      if (!grouped[template.category]) {
        grouped[template.category] = [];
      }
      grouped[template.category].push(template);
    });
    return grouped;
  }, [filteredTemplates]);

  const handleSelect = (template: TicketTemplate) => {
    const processedContent = processTemplate(template.content, variables);
    onSelectTemplate(processedContent);
    onOpenChange(false);
    setSearch("");
    setSelectedCategory(null);
    setPreviewTemplate(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reply Templates
          </DialogTitle>
        </DialogHeader>

        {/* Search and Category Filter */}
        <div className="p-4 space-y-3 shrink-0 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Badge>
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Template List */}
          <ScrollArea className="flex-1 border-r border-border">
            <div className="p-2">
              {Object.entries(groupedTemplates).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No templates found
                </p>
              ) : (
                Object.entries(groupedTemplates).map(([category, templates]) => (
                  <div key={category} className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
                      {category}
                    </p>
                    <div className="space-y-1">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setPreviewTemplate(template)}
                          onDoubleClick={() => handleSelect(template)}
                          className={cn(
                            "w-full text-left p-2 rounded-md transition-colors",
                            "hover:bg-muted/50",
                            previewTemplate?.id === template.id && "bg-muted"
                          )}
                        >
                          <p className="text-sm font-medium">{template.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {template.content.substring(0, 60)}...
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Right: Preview */}
          <div className="w-[280px] flex flex-col shrink-0">
            {previewTemplate ? (
              <>
                <div className="p-3 border-b border-border shrink-0">
                  <p className="font-medium">{previewTemplate.name}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {previewTemplate.category}
                  </Badge>
                </div>
                <ScrollArea className="flex-1 p-3">
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {processTemplate(previewTemplate.content, variables)}
                  </p>
                </ScrollArea>
                <div className="p-3 border-t border-border shrink-0">
                  <Button
                    className="w-full"
                    onClick={() => handleSelect(previewTemplate)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Use Template
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Select a template to preview
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Hint */}
        <div className="p-2 border-t border-border text-center shrink-0">
          <p className="text-xs text-muted-foreground">
            Double-click to insert • Variables: <code className="bg-muted px-1 rounded">{"{{username}}"}</code>{" "}
            <code className="bg-muted px-1 rounded">{"{{ticket_number}}"}</code>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
