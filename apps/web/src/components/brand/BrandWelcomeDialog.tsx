import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BrandWelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandName: string;
  onGetStarted: () => void;
}

const NEXT_STEPS = [
  { id: 1, label: "Create your first campaign", href: "#create-campaign" },
  { id: 2, label: "Add funds to your brand wallet", href: "#add-funds" },
  { id: 3, label: "Invite team members to collaborate", href: "#invite-team" },
  { id: 4, label: "Set up payout preferences", href: "#payout-settings" },
];

export function BrandWelcomeDialog({
  open,
  onOpenChange,
  brandName,
  onGetStarted,
}: BrandWelcomeDialogProps) {
  const handleGetStarted = () => {
    onOpenChange(false);
    onGetStarted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-card border-0 p-0 overflow-hidden rounded-2xl">
        {/* Hero Image */}
        <div className="relative w-full h-[200px] bg-gradient-to-br from-purple-100 via-pink-50 to-yellow-50 dark:from-purple-900/20 dark:via-pink-900/10 dark:to-yellow-900/10 overflow-hidden">
          <img
            src="/brand-welcome-hero.png"
            alt="Welcome"
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* Content */}
        <div className="px-6 pt-5 pb-6">
          {/* Title */}
          <h2 className="text-xl font-semibold tracking-[-0.5px] font-inter text-foreground">
            Welcome to your brand workspace
          </h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-2">
            You're now ready to start working with creators and growing your brand on autopilot.
          </p>

          {/* Next Steps */}
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-4">
            To get started, here are some next steps:
          </p>

          <div className="mt-3 space-y-2.5">
            {NEXT_STEPS.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <span
                  className="material-symbols-rounded text-blue-500 text-[20px] flex-shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span className="text-sm font-inter tracking-[-0.3px] text-foreground">
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleGetStarted}
            className="w-full mt-6 h-11 bg-blue-500 text-white hover:bg-blue-600 rounded-lg font-inter font-medium tracking-[-0.3px] text-sm"
          >
            Get started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
