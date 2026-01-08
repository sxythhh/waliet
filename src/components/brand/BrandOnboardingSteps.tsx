import { ArrowRight, CheckCircle2 } from "lucide-react";
import DescriptionRounded from "@mui/icons-material/DescriptionRounded";
import EventRounded from "@mui/icons-material/EventRounded";
import RocketLaunchRounded from "@mui/icons-material/RocketLaunchRounded";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const steps: OnboardingStep[] = [
    {
      id: "blueprint",
      title: "Draft Content Blueprint",
      description: "Define your content strategy, brand guidelines, and what makes great content for your brand.",
      icon: <DescriptionRounded sx={{ fontSize: 20 }} />,
      action: "Create Blueprint",
      completed: completedSteps.includes("blueprint"),
      onClick: onDraftBlueprint,
    },
    {
      id: "call",
      title: "Schedule a Call",
      description: "Connect with our team to discuss your goals and get personalized recommendations.",
      icon: <EventRounded sx={{ fontSize: 20 }} />,
      action: "Book a Call",
      completed: completedSteps.includes("call"),
      href: "https://calendly.com/virality",
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
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground tracking-tight font-['Inter']">
          Get Started
        </h2>
        <p className="text-sm text-muted-foreground mt-1 font-['Inter'] tracking-[-0.3px]">
          Complete these steps to set up your brand for success
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step, index) => (
          <Card
            key={step.id}
            className={cn(
              "group relative overflow-hidden transition-all duration-300 cursor-pointer",
              "bg-white dark:bg-[#0e0e0e] border border-[#dedede] dark:border-transparent",
              step.completed && "bg-primary/5 border-primary/20"
            )}
            onClick={() => handleStepClick(step)}
          >
            <CardContent className="p-5 flex flex-col h-full min-h-[180px]">
              {/* Step Number & Icon */}
              <div className="flex items-center justify-between mb-4">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    "transition-colors duration-200",
                    step.completed
                      ? "bg-primary/10 text-primary"
                      : "bg-gray-100 dark:bg-[#121212] text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  )}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className="text-xs font-medium text-muted-foreground font-['Inter'] tracking-[-0.3px]">
                  Step {index + 1}
                </span>
              </div>

              {/* Title & Description */}
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground mb-1.5 font-['Inter'] tracking-[-0.4px]">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-['Inter'] tracking-[-0.3px]">
                  {step.description}
                </p>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-between h-9 px-3",
                    "text-sm font-medium",
                    "hover:bg-primary/10 hover:text-primary",
                    "transition-all duration-200",
                    step.completed && "text-primary"
                  )}
                >
                  <span className="font-['Inter'] tracking-[-0.3px]">
                    {step.completed ? "Completed" : step.action}
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
