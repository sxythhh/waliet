import { User, Smartphone, Scissors } from "lucide-react";
import { Icon } from "@iconify/react";

interface TemplateStyle {
  id: string;
  title: string;
  gradient: string;
  icon: React.ReactNode;
}

const TEMPLATE_STYLES: TemplateStyle[] = [
  {
    id: "slideshows",
    title: "Slideshows",
    gradient: "from-violet-500/20 to-purple-600/20",
    icon: <Icon icon="material-symbols:auto-awesome-mosaic" className="h-8 w-8 text-violet-400" />,
  },
  {
    id: "lifestyle",
    title: "Lifestyle + Personality",
    gradient: "from-blue-500/20 to-cyan-500/20",
    icon: <User className="h-8 w-8 text-blue-400" />,
  },
  {
    id: "faceless",
    title: "Faceless UGC",
    gradient: "from-emerald-500/20 to-green-500/20",
    icon: <Smartphone className="h-8 w-8 text-emerald-400" />,
  },
  {
    id: "watermark",
    title: "Watermark + Clipping",
    gradient: "from-orange-500/20 to-amber-500/20",
    icon: <Scissors className="h-8 w-8 text-orange-400" />,
  },
];

interface BlueprintOnboardingProps {
  brandId: string;
  onSelectTemplate: (templateId: string) => void;
}

export function BlueprintOnboarding({
  brandId,
  onSelectTemplate,
}: BlueprintOnboardingProps) {

  return (
    <div className="space-y-4">
      {/* Template Styles Section */}
      <div className="rounded-2xl border border-border/50 bg-card/30 p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TEMPLATE_STYLES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              className="group relative rounded-xl border border-dashed border-border/50 bg-muted/20 overflow-hidden transition-all hover:border-border hover:bg-muted/40"
            >
              {/* Gradient background with icon */}
              <div
                className={`aspect-[4/3] flex items-center justify-center bg-gradient-to-br ${template.gradient}`}
              >
                {template.icon}
              </div>
              {/* Title */}
              <div className="p-2.5 border-t border-border/30">
                <p className="text-xs font-medium text-foreground font-inter tracking-[-0.2px] truncate">
                  {template.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
