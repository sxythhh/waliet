import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import creatorIcon from "@/assets/creator-icon.svg";
import brandIcon from "@/assets/brand-icon.svg";
import { CreateBrandDialog } from "@/components/CreateBrandDialog";

interface OnboardingCardProps {
  onSelect?: () => void;
  inline?: boolean;
}

export function OnboardingCard({ onSelect, inline = false }: OnboardingCardProps) {
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);

  const handleCreatorSelect = () => {
    onSelect?.();
    setSearchParams({ tab: "profile", workspace: "creator" });
  };

  const handleBrandSelect = () => {
    onSelect?.();
    // Store in sessionStorage so dashboard knows to prompt brand creation
    sessionStorage.setItem('pendingBrandCreation', 'true');
    navigate("/auth");
  };

  const cardContent = (
    <div className="w-full max-w-[440px]">
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
          className="w-full flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group"
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
    </div>
  );

  return (
    <>
      {cardContent}
      <CreateBrandDialog 
        open={showCreateBrandDialog} 
        onOpenChange={setShowCreateBrandDialog} 
        hideTrigger 
      />
    </>
  );
}
