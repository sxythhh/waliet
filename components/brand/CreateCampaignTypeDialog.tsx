import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Users, Zap } from "lucide-react";
import { Icon } from "@iconify/react";
import { CreateTaskDialog } from "./CreateTaskDialog";

interface CreateCampaignTypeDialogProps {
  onSelectClipping?: (blueprintId?: string) => void;
  onSelectManaged?: (blueprintId?: string) => void;
  onSelectBoost?: () => void;
  onSelectJobPost?: () => void;
  trigger?: React.ReactNode;
  brandId?: string;
  subscriptionPlan?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultBlueprintId?: string;
  onSuccess?: () => void;
}

export function CreateCampaignTypeDialog({
  trigger,
  brandId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: CreateCampaignTypeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showTaskWizard, setShowTaskWizard] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const handleSimpleTaskClick = () => {
    setSelectedTaskType("simple");
    setOpen(false);
    setShowTaskWizard(true);
  };

  const handleRecurringTaskClick = () => {
    setSelectedTaskType("recurring");
    setOpen(false);
    setShowTaskWizard(true);
  };

  const handleTaskWizardClose = () => {
    setShowTaskWizard(false);
    setSelectedTaskType(null);
  };

  const handleTaskSuccess = () => {
    handleTaskWizardClose();
    onSuccess?.();
  };

  const taskTypes = [
    {
      id: "simple",
      name: "Simple Task",
      description: "One-time task with a fixed reward",
      icon: Briefcase,
      color: "#f5ca6f",
      borderColor: "rgba(245, 202, 111, 0.4)",
      onClick: handleSimpleTaskClick,
    },
    {
      id: "recurring",
      name: "Recurring Task",
      description: "Ongoing tasks with multiple submissions",
      icon: Zap,
      color: "#1ea75e",
      borderColor: "rgba(100, 220, 150, 0.6)",
      onClick: handleRecurringTaskClick,
    },
    {
      id: "hiring",
      name: "Hiring Post",
      description: "Find and hire creators for ongoing work",
      icon: Users,
      color: "#7c3aed",
      borderColor: "rgba(180, 130, 255, 0.6)",
      onClick: handleRecurringTaskClick,
      hidden: true, // Hidden for now
    },
  ];

  const dialogContent = (
    <DialogContent className="sm:max-w-[420px] bg-background border-none shadow-2xl p-6">
      <div className="space-y-5">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold font-inter tracking-[-0.5px] text-foreground">
            New Task
          </h2>
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
            Choose what type of task you want to create
          </p>
        </div>

        {/* Task Type Selection */}
        <div className="space-y-2">
          {taskTypes
            .filter((t) => !t.hidden)
            .map((taskType) => {
              const IconComponent = taskType.icon;
              return (
                <button
                  key={taskType.id}
                  onClick={taskType.onClick}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-left group"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border-t-2"
                    style={{
                      backgroundColor: taskType.color,
                      borderTopColor: taskType.borderColor,
                    }}
                  >
                    <IconComponent className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground font-inter tracking-[-0.5px] text-sm block">
                      {taskType.name}
                    </span>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] mt-0.5">
                      {taskType.description}
                    </p>
                  </div>
                </button>
              );
            })}
        </div>

        {/* Help Footer */}
        <div className="pt-1">
          <button
            onClick={() => window.open("https://waliet.io/help", "_blank")}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors font-inter tracking-[-0.3px]"
          >
            <Icon icon="material-symbols:help-outline" className="h-4 w-4" />
            Need help getting started?
          </button>
        </div>
      </div>
    </DialogContent>
  );

  return (
    <>
      {/* Type Selection Dialog */}
      {controlledOpen !== undefined ? (
        <Dialog open={open} onOpenChange={setOpen}>
          {dialogContent}
        </Dialog>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            {trigger || (
              <Button className="gap-2 font-inter tracking-[-0.5px] transition-shadow duration-300 ease-in-out hover:shadow-[0_0_0_3px_rgba(245,202,111,0.4)] border-t border-primary/50">
                <Plus className="h-4 w-4" />
                Create Task
              </Button>
            )}
          </DialogTrigger>
          {dialogContent}
        </Dialog>
      )}

      {/* Task Creation Wizard */}
      {brandId && (
        <CreateTaskDialog
          open={showTaskWizard}
          onOpenChange={handleTaskWizardClose}
          businessId={brandId}
          onSuccess={handleTaskSuccess}
        />
      )}
    </>
  );
}
