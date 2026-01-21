import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditingTool {
  id: string;
  name: string;
  logo: string;
  category: "video-editing" | "ai-tools";
}

export const EDITING_TOOLS: EditingTool[] = [
  // Video Editing Tools
  { id: "adobe-premiere-pro", name: "Adobe Premiere Pro", logo: "/tool-logos/adobe-premiere-pro.png", category: "video-editing" },
  { id: "adobe-after-effects", name: "Adobe After Effects", logo: "/tool-logos/adobe-after-effects.png", category: "video-editing" },
  { id: "capcut", name: "CapCut", logo: "/tool-logos/capcut.png", category: "video-editing" },
  { id: "davinci-resolve", name: "DaVinci Resolve", logo: "/tool-logos/davinci-resolve.png", category: "video-editing" },
  { id: "final-cut-pro", name: "Final Cut Pro", logo: "/tool-logos/final-cut-pro.png", category: "video-editing" },
  { id: "blender", name: "Blender", logo: "/tool-logos/blender.png", category: "video-editing" },
  { id: "imovie", name: "iMovie", logo: "/tool-logos/imovie.png", category: "video-editing" },
  { id: "vegas-pro", name: "Vegas Pro", logo: "/tool-logos/vegas-pro.png", category: "video-editing" },
  { id: "vn", name: "VN", logo: "/tool-logos/vn.png", category: "video-editing" },
  { id: "avid", name: "Avid", logo: "/tool-logos/avid.png", category: "video-editing" },
  { id: "lightworks", name: "Lightworks", logo: "/tool-logos/lightworks.png", category: "video-editing" },
  { id: "filmora", name: "Filmora", logo: "/tool-logos/filmora.png", category: "video-editing" },
  { id: "alight-motion", name: "Alight Motion", logo: "/tool-logos/alight-motion.png", category: "video-editing" },
  // AI Tools
  { id: "midjourney", name: "Midjourney", logo: "/tool-logos/midjourney.png", category: "ai-tools" },
  { id: "dall-e", name: "DALL-E", logo: "/tool-logos/dall-e.png", category: "ai-tools" },
  { id: "runwayml", name: "RunwayML", logo: "/tool-logos/runwayml.png", category: "ai-tools" },
  { id: "pika-labs", name: "Pika Labs", logo: "/tool-logos/pika-labs.png", category: "ai-tools" },
  { id: "kling-ai", name: "Kling AI", logo: "/tool-logos/kling-ai.png", category: "ai-tools" },
  { id: "google-veo", name: "Google VEO", logo: "/tool-logos/google-veo.png", category: "ai-tools" },
  { id: "sora", name: "Sora by OpenAI", logo: "/tool-logos/sora.png", category: "ai-tools" },
  { id: "heygen", name: "HeyGen", logo: "/tool-logos/heygen.png", category: "ai-tools" },
];

interface EditingToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTools: string[];
  onSave: (tools: string[]) => Promise<void>;
}

export function EditingToolsDialog({
  open,
  onOpenChange,
  selectedTools,
  onSave,
}: EditingToolsDialogProps) {
  const [selected, setSelected] = useState<string[]>(selectedTools);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(selectedTools);
    }
  }, [open, selectedTools]);

  const toggleTool = (toolId: string) => {
    setSelected((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selected);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const videoEditingTools = EDITING_TOOLS.filter((t) => t.category === "video-editing");
  const aiTools = EDITING_TOOLS.filter((t) => t.category === "ai-tools");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden bg-background dark:bg-[#0c0c0c]">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b border-border">
          <DialogTitle className="text-lg font-semibold tracking-[-0.5px]">
            Editing Tools
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-0.5 tracking-[-0.3px]">
            Select the video editing and AI tools you use
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 py-5 space-y-6">
            {/* Video Editing Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground tracking-[-0.3px]">
                Video Editing
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {videoEditingTools.map((tool) => (
                  <ToolButton
                    key={tool.id}
                    tool={tool}
                    isSelected={selected.includes(tool.id)}
                    onClick={() => toggleTool(tool.id)}
                  />
                ))}
              </div>
            </div>

            {/* AI Tools Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground tracking-[-0.3px]">
                AI Tools
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {aiTools.map((tool) => (
                  <ToolButton
                    key={tool.id}
                    tool={tool}
                    isSelected={selected.includes(tool.id)}
                    onClick={() => toggleTool(tool.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
          <span className="text-sm text-muted-foreground tracking-[-0.3px]">
            {selected.length} selected
          </span>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-9 px-4 tracking-[-0.3px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-5 min-w-[90px] tracking-[-0.3px]"
              style={{ backgroundColor: "#f5ca6e", borderTop: "1px solid #fbe0aa", color: "#000" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ToolButtonProps {
  tool: EditingTool;
  isSelected: boolean;
  onClick: () => void;
}

function ToolButton({ tool, isSelected, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all",
        "hover:bg-muted/50",
        isSelected
          ? "border-primary bg-primary/5 dark:bg-primary/10"
          : "border-border bg-background dark:bg-[#161616]"
      )}
    >
      {isSelected && (
        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-2 h-2 text-primary-foreground" />
        </div>
      )}
      <img
        src={tool.logo}
        alt={tool.name}
        className="w-7 h-7 object-contain rounded"
      />
      <span className="text-[10px] font-medium text-center leading-tight tracking-[-0.2px] line-clamp-2">
        {tool.name}
      </span>
    </button>
  );
}
