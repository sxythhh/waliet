import * as React from "react";
import { useCampaignDetails } from "./CampaignDetailsSidebarProvider";
import { CampaignBanner } from "./CampaignBanner";
import { cn } from "@/lib/utils";

interface TrainingModule {
  id: string;
  title: string;
  content: string;
  video_url: string | null;
  quiz: any[] | null;
  order_index: number;
  required: boolean;
}

interface CampaignDetailsMainContentProps {
  // Campaign data
  campaignId: string;
  campaignTitle: string;
  bannerUrl?: string | null;
  brandLogoUrl?: string | null;
  brandName: string;
  brandColor?: string | null;
  isVerified?: boolean;
  subtitle?: string;

  // Training data
  modules: TrainingModule[];
  completedModuleIds: Set<string>;
  onModuleComplete: (moduleId: string) => void;

  // Content sections
  overviewContent: React.ReactNode;
  guidelinesContent: React.ReactNode;
  submissionsContent: React.ReactNode;
  supportContent: React.ReactNode;

  className?: string;
}

export function CampaignDetailsMainContent({
  campaignId,
  campaignTitle,
  bannerUrl,
  brandLogoUrl,
  brandName,
  brandColor,
  isVerified,
  subtitle,
  modules,
  completedModuleIds,
  onModuleComplete,
  overviewContent,
  guidelinesContent,
  submissionsContent,
  supportContent,
  className,
}: CampaignDetailsMainContentProps) {
  const { activeSection } = useCampaignDetails();

  // Get current module if viewing training
  const currentModule = React.useMemo(() => {
    if (activeSection.type === "training" && activeSection.moduleId) {
      return modules.find((m) => m.id === activeSection.moduleId);
    }
    return null;
  }, [activeSection, modules]);

  const renderContent = () => {
    switch (activeSection.type) {
      case "training":
        if (currentModule) {
          return (
            <TrainingModuleView
              module={currentModule}
              isCompleted={completedModuleIds.has(currentModule.id)}
              onComplete={() => onModuleComplete(currentModule.id)}
            />
          );
        }
        return overviewContent;
      case "guidelines":
        return guidelinesContent;
      case "submissions":
        return submissionsContent;
      case "support":
        return supportContent;
      case "overview":
      default:
        return overviewContent;
    }
  };

  return (
    <main className={cn("flex-1 overflow-y-auto", className)}>
      {/* Banner - always visible at top */}
      <div className="p-4 pb-0">
        <CampaignBanner
          bannerUrl={bannerUrl}
          brandLogoUrl={brandLogoUrl}
          brandName={brandName}
          brandColor={brandColor}
          isVerified={isVerified}
          campaignTitle={campaignTitle}
          subtitle={subtitle}
        />
      </div>

      {/* Dynamic content area */}
      <div className="p-4">{renderContent()}</div>
    </main>
  );
}

// Training Module View Component
interface TrainingModuleViewProps {
  module: TrainingModule;
  isCompleted: boolean;
  onComplete: () => void;
}

function TrainingModuleView({ module, isCompleted, onComplete }: TrainingModuleViewProps) {
  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold font-inter tracking-[-0.5px]">{module.title}</h2>
          {module.required && (
            <span className="text-xs text-amber-500 font-medium">Required</span>
          )}
        </div>
        {isCompleted && (
          <span className="flex items-center gap-1 text-sm text-green-500 font-medium">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Completed
          </span>
        )}
      </div>

      {/* Video if available */}
      {module.video_url && (
        <div className="aspect-video rounded-xl overflow-hidden bg-muted">
          <iframe
            src={module.video_url}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={module.title}
          />
        </div>
      )}

      {/* Module Content */}
      {module.content && (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: module.content }}
        />
      )}

      {/* Quiz section would go here if module.quiz exists */}
      {module.quiz && module.quiz.length > 0 && (
        <div className="p-4 bg-muted rounded-xl">
          <p className="text-sm text-muted-foreground">
            Quiz available - complete to mark this module as done
          </p>
        </div>
      )}

      {/* Complete button (if not already completed and no quiz) */}
      {!isCompleted && (!module.quiz || module.quiz.length === 0) && (
        <button
          onClick={onComplete}
          className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Mark as Complete
        </button>
      )}
    </div>
  );
}
