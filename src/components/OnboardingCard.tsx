import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import creatorIcon from "@/assets/creator-icon.svg";
import brandIcon from "@/assets/brand-icon.svg";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface OnboardingCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingCard({ open, onOpenChange }: OnboardingCardProps) {
  const [, setSearchParams] = useSearchParams();
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);

  const handleCreatorSelect = () => {
    setSearchParams({ tab: "profile", workspace: "creator" });
    onOpenChange(false);
  };

  const handleBrandSelect = () => {
    onOpenChange(false);
    setShowCreateBrandDialog(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px] p-6 gap-0">
          <h2 className="font-['Geist'] text-lg font-semibold tracking-[-0.5px] text-foreground mb-4">
            I am joining as..
          </h2>
          
          <div className="space-y-3">
            {/* Creator Option */}
            <button
              onClick={handleCreatorSelect}
              className="w-full flex items-center gap-4 p-4 rounded-lg bg-[#2060de] hover:bg-[#1a50c8] transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <img src={creatorIcon} alt="" className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-['Geist'] text-[15px] font-medium tracking-[-0.5px] text-white">
                  Creator
                </p>
                <p className="font-['Inter'] text-[13px] tracking-[-0.5px] text-white/70">
                  Discover opportunities and get paid
                </p>
              </div>
            </button>

            {/* Brand Option */}
            <button
              onClick={handleBrandSelect}
              className="w-full flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group border border-border/50"
            >
              <div className="w-10 h-10 rounded-lg bg-[#2060de] flex items-center justify-center flex-shrink-0">
                <img src={brandIcon} alt="" className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-['Geist'] text-[15px] font-medium tracking-[-0.5px] text-foreground">
                  Brand
                </p>
                <p className="font-['Inter'] text-[13px] tracking-[-0.5px] text-muted-foreground">
                  Hire creators and launch campaigns
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateBrandDialog 
        open={showCreateBrandDialog} 
        onOpenChange={setShowCreateBrandDialog} 
        hideTrigger 
      />
    </>
  );
}
