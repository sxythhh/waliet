import { ArrowRight, CheckCircle2 } from "lucide-react";
import DescriptionRounded from "@mui/icons-material/DescriptionRounded";
import EventRounded from "@mui/icons-material/EventRounded";
import RocketLaunchRounded from "@mui/icons-material/RocketLaunchRounded";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  completed?: boolean;
  onClick?: () => void;
  href?: string;
}

interface BrandOnboardingStepsProps {
  onDraftBlueprint?: () => void;
  onScheduleCall?: () => void;
  onLaunchOpportunity?: () => void;
  completedSteps?: string[];
  className?: string;
}

export function BrandOnboardingSteps({
  onDraftBlueprint,
  onScheduleCall,
  onLaunchOpportunity,
  completedSteps = [],
  className,
}: BrandOnboardingStepsProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get("workspace") || "creator";

  const steps: OnboardingStep[] = [
    {
      id: "blueprint",
      title: "Draft Content Blueprint",
      description: "Define your content strategy, brand guidelines, and what makes great content for your brand.",
      icon: <DescriptionRounded sx={{ fontSize: 20 }} />,
      action: "Create Blueprint",
      completed: completedSteps.includes("blueprint"),
      onClick: onDraftBlueprint || (() => navigate(`/dashboard?workspace=${workspace}&tab=blueprints`)),
    },
    {
      id: "call",
      title: "Schedule a Call",
      description: "Connect with our team to discuss your goals and get personalized recommendations.",
      icon: <EventRounded sx={{ fontSize: 20 }} />,
      action: "Book a Call",
      completed: completedSteps.includes("call"),
      href: "https://virality.gg/contact",
      onClick: onScheduleCall,
    },
    {
      id: "opportunity",
      title: "Launch an Opportunity",
      description: "Create your first campaign or bounty to start connecting with talented creators.",
      icon: <RocketLaunchRounded sx={{ fontSize: 20 }} />,
      action: "Get Started",
      completed: completedSteps.includes("opportunity"),
      onClick: onLaunchOpportunity,
    },
  ];

  const handleStepClick = (step: OnboardingStep) => {
    if (step.href) {
      window.open(step.href, "_blank", "noopener,noreferrer");
    }
    step.onClick?.();
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "group relative overflow-hidden transition-all duration-200 cursor-pointer",
              "bg-white dark:bg-[#111111] rounded-xl",
              "hover:bg-slate-50 dark:hover:bg-[#151515]",
              step.completed && "bg-primary/5"
            )}
            onClick={() => handleStepClick(step)}
          >
            <div className="p-4 flex flex-col h-full min-h-[140px]">
              {/* Icon */}
              <div className="mb-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    "transition-colors duration-200",
                    step.completed
                      ? "bg-primary/10 text-primary"
                      : "bg-slate-100 dark:bg-[#1a1a1a] text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-[18px] w-[18px]" />
                  ) : (
                    step.icon
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="flex-1 mb-3">
                <h3 className="text-sm font-semibold text-foreground mb-1 font-inter tracking-[-0.4px]">
                  {step.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-inter tracking-[-0.3px] line-clamp-2">
                  {step.description}
                </p>
              </div>

              {/* Action Link */}
              <div className="flex items-center justify-between mt-auto">
                <span className={cn(
                  "text-xs font-medium font-inter tracking-[-0.3px] transition-colors",
                  step.completed
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {step.completed ? "View" : step.action}
                </span>
                <ArrowRight className={cn(
                  "h-3.5 w-3.5 transition-all duration-200",
                  "text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5",
                  step.completed && "text-primary"
                )} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
