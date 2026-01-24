import * as React from "react";
import { ChevronDown, ChevronLeft, BookOpen, FileText, Send, HelpCircle, MessageCircle, Check, Circle, PlayCircle, Hash, Verified, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useCampaignDetails, CampaignDetailsSectionType } from "./CampaignDetailsSidebarProvider";
import { OptimizedImage } from "@/components/OptimizedImage";

interface TrainingModule {
  id: string;
  title: string;
  required: boolean;
  order_index: number;
}

interface CampaignDetailsLeftSidebarProps {
  modules: TrainingModule[];
  completedModuleIds: Set<string>;
  progress: number;
  discordUrl?: string | null;
  submissionCount?: number;
  brandName?: string;
  brandLogoUrl?: string | null;
  isVerified?: boolean;
  campaignTitle?: string;
  className?: string;
}

interface SidebarSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function SidebarSection({ title, icon, defaultOpen = true, children }: SidebarSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-1">
      <CollapsibleTrigger asChild>
        <button className="flex items-center w-full px-2 py-1 text-[11px] font-semibold text-muted-foreground/60 hover:text-muted-foreground transition-colors uppercase tracking-widest">
          <ChevronDown className={cn("h-3 w-3 mr-1 flex-shrink-0 transition-transform", !isOpen && "-rotate-90")} />
          {icon && <span className="mr-1.5">{icon}</span>}
          {title}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-0.5">{children}</CollapsibleContent>
    </Collapsible>
  );
}

interface SidebarItemProps {
  label: string;
  type: CampaignDetailsSectionType;
  moduleId?: string;
  icon?: React.ReactNode;
  isCompleted?: boolean;
  isRequired?: boolean;
  isActive?: boolean;
  badge?: string | number;
}

function SidebarItem({ label, type, moduleId, icon, isCompleted, isRequired, isActive, badge }: SidebarItemProps) {
  const { activeSection, setActiveSection } = useCampaignDetails();

  const isCurrentlyActive = isActive !== undefined
    ? isActive
    : activeSection.type === type && activeSection.moduleId === moduleId;

  const handleClick = () => {
    setActiveSection({ type, moduleId });
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center w-full px-2 py-1.5 text-[14px] rounded-[4px] transition-all group relative",
        isCurrentlyActive
          ? "bg-muted/50 text-foreground"
          : "text-muted-foreground hover:text-foreground/80 hover:bg-muted/30"
      )}
    >
      {/* Icon */}
      <span className={cn(
        "mr-2 flex-shrink-0 transition-colors",
        isCurrentlyActive ? "text-foreground" : "text-muted-foreground/60 group-hover:text-muted-foreground"
      )}>
        {icon ? icon : isCompleted ? (
          <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-green-400" />
          </div>
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/40" />
        )}
      </span>

      {/* Label */}
      <span className="flex-1 text-left truncate font-medium">{label}</span>

      {/* Badge or Required indicator */}
      {badge !== undefined && (
        <span className="text-[11px] font-medium bg-primary/20 text-primary px-1.5 py-0.5 rounded-full ml-1">
          {badge}
        </span>
      )}
      {isRequired && !isCompleted && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-2 animate-pulse" />
      )}
    </button>
  );
}

export function CampaignDetailsLeftSidebar({
  modules,
  completedModuleIds,
  progress,
  discordUrl,
  submissionCount = 0,
  brandName = "Campaign",
  brandLogoUrl,
  isVerified,
  campaignTitle,
  className,
}: CampaignDetailsLeftSidebarProps) {
  const { leftSidebarCollapsed, setLeftSidebarCollapsed, isMobile, setMobileNavOpen } = useCampaignDetails();

  // Sort modules by order_index
  const sortedModules = React.useMemo(
    () => [...modules].sort((a, b) => a.order_index - b.order_index),
    [modules]
  );

  const completedCount = sortedModules.filter((m) => completedModuleIds.has(m.id)).length;
  const hasTrainingModules = sortedModules.length > 0;

  // Collapsed state for desktop
  if (leftSidebarCollapsed && !isMobile) {
    return (
      <aside className={cn("w-[60px] flex-shrink-0 bg-card border-r border-border/50", className)}>
        <div className="flex flex-col items-center py-3 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-muted/30 hover:bg-muted/50 mb-2"
            onClick={() => setLeftSidebarCollapsed(false)}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Brand avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/50 to-primary overflow-hidden flex items-center justify-center">
            {brandLogoUrl ? (
              <OptimizedImage src={brandLogoUrl} alt={brandName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-sm">{brandName.charAt(0)}</span>
            )}
          </div>

          <div className="w-8 h-[2px] bg-muted/50 my-2 rounded-full" />

          {/* Section icons */}
          {hasTrainingModules && (
            <div className="relative p-2 rounded-lg hover:bg-muted/30 cursor-pointer group">
              <BookOpen className="h-5 w-5 text-muted-foreground/60 group-hover:text-muted-foreground" />
              {progress < 100 && (
                <div className="absolute top-1 right-1 h-2 w-2 bg-amber-500 rounded-full" />
              )}
            </div>
          )}
          <div className="p-2 rounded-lg hover:bg-muted/30 cursor-pointer group">
            <FileText className="h-5 w-5 text-muted-foreground/60 group-hover:text-muted-foreground" />
          </div>
          <div className="p-2 rounded-lg hover:bg-muted/30 cursor-pointer group relative">
            <Send className="h-5 w-5 text-muted-foreground/60 group-hover:text-muted-foreground" />
            {submissionCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center px-1">
                {submissionCount}
              </span>
            )}
          </div>
          <div className="p-2 rounded-lg hover:bg-muted/30 cursor-pointer group">
            <HelpCircle className="h-5 w-5 text-muted-foreground/60 group-hover:text-muted-foreground" />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "w-60 flex-shrink-0 bg-card overflow-y-auto flex flex-col",
        !isMobile && "border-r border-border/50",
        className
      )}
    >
      {/* Header with brand identity */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Brand logo */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/60 to-primary overflow-hidden flex-shrink-0 flex items-center justify-center shadow-lg">
              {brandLogoUrl ? (
                <OptimizedImage src={brandLogoUrl} alt={brandName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-sm">{brandName.charAt(0)}</span>
              )}
            </div>

            {/* Brand name & campaign title */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[13px] font-semibold text-foreground truncate">{brandName}</span>
                {isVerified && <Verified className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
              </div>
              {campaignTitle && (
                <p className="text-[11px] text-muted-foreground/60 truncate">{campaignTitle}</p>
              )}
            </div>
          </div>

          {/* Collapse button - desktop only */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0 hover:bg-muted/50 rounded-md"
              onClick={() => setLeftSidebarCollapsed(true)}
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground/60" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation content */}
      <div className="flex-1 p-2 space-y-4">
        {/* Training Modules Section */}
        {hasTrainingModules && (
          <div>
            <SidebarSection title="Training">
              {/* Progress bar */}
              <div className="px-2 mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-muted-foreground/60">{completedCount}/{sortedModules.length} complete</span>
                  <span className="text-[11px] text-muted-foreground/60">{Math.round(progress)}%</span>
                </div>
                <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      progress === 100 ? "bg-green-500" : "bg-primary"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                {sortedModules.map((module, index) => (
                  <SidebarItem
                    key={module.id}
                    label={module.title}
                    type="training"
                    moduleId={module.id}
                    icon={
                      completedModuleIds.has(module.id) ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-green-400" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center">
                          <span className="text-[9px] text-muted-foreground/60 font-medium">{index + 1}</span>
                        </div>
                      )
                    }
                    isCompleted={completedModuleIds.has(module.id)}
                    isRequired={module.required}
                  />
                ))}
              </div>
            </SidebarSection>
          </div>
        )}

        {/* Campaign Section */}
        <div>
          <SidebarSection title="Campaign">
            <div className="space-y-0.5">
              <SidebarItem
                label="Overview"
                type="overview"
                icon={<Hash className="h-4 w-4" />}
              />
              <SidebarItem
                label="Guidelines"
                type="guidelines"
                icon={<FileText className="h-4 w-4" />}
              />
            </div>
          </SidebarSection>
        </div>

        {/* Submissions Section */}
        <div>
          <SidebarSection title="Submissions">
            <div className="space-y-0.5">
              <SidebarItem
                label="My Videos"
                type="submissions"
                icon={<PlayCircle className="h-4 w-4" />}
                badge={submissionCount > 0 ? submissionCount : undefined}
              />
            </div>
          </SidebarSection>
        </div>

        {/* Help Section */}
        <div>
          <SidebarSection title="Help">
            <div className="space-y-0.5">
              <SidebarItem
                label="Get Support"
                type="support"
                icon={<HelpCircle className="h-4 w-4" />}
              />
              {discordUrl && (
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => isMobile && setMobileNavOpen(false)}
                  className="flex items-center w-full px-2 py-1.5 text-[14px] text-muted-foreground hover:text-foreground/80 hover:bg-muted/30 rounded-[4px] transition-all group"
                >
                  <MessageCircle className="h-4 w-4 mr-2 text-muted-foreground/60 group-hover:text-muted-foreground" />
                  <span className="flex-1 font-medium">Discord</span>
                  <svg className="h-3 w-3 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </a>
              )}
            </div>
          </SidebarSection>
        </div>
      </div>

      {/* Bottom section - quick info */}
      <div className="p-3 border-t border-border/50 mt-auto">
        <div className="px-2 py-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              progress === 100 ? "bg-green-500" : "bg-amber-500 animate-pulse"
            )} />
            <span className="text-[12px] text-muted-foreground font-medium">
              {progress === 100 ? "Training complete" : "Training in progress"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
