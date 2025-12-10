import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Crown } from "lucide-react";

interface CreateCampaignTypeDialogProps {
  onSelectClipping: () => void;
  onSelectManaged: () => void;
  trigger?: React.ReactNode;
}

export function CreateCampaignTypeDialog({ 
  onSelectClipping, 
  onSelectManaged,
  trigger 
}: CreateCampaignTypeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState("new");

  const handleClippingClick = () => {
    setOpen(false);
    onSelectClipping();
  };

  const handleManagedClick = () => {
    setOpen(false);
    onSelectManaged();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            className="gap-2 font-geist tracking-[-0.5px] transition-shadow duration-300 ease-in-out hover:shadow-[0_0_0_3px_rgba(0,85,255,0.55)]"
            style={{ borderTop: '1px solid #4b85f7' }}
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] bg-[#0a0a0a] border-transparent">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create New Campaign</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-2">
          {/* Blueprint Select */}
          <Select value={selectedBlueprint} onValueChange={setSelectedBlueprint}>
            <SelectTrigger className="w-full bg-[#141414] border-transparent h-12">
              <SelectValue placeholder="Select a blueprint" />
            </SelectTrigger>
            <SelectContent className="bg-[#141414] border-transparent">
              <SelectItem value="new">New Blueprint</SelectItem>
            </SelectContent>
          </Select>

          {/* Campaign Workflow Selection */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Select a Campaign Workflow</p>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Clipping Option */}
              <button
                onClick={handleClippingClick}
                className="flex flex-col items-start p-4 rounded-xl bg-[#141414] border-transparent hover:bg-[#1a1a1a] transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#a7751e', borderTop: '2px solid #dda038' }}
                  >
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold">Clipping</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pay a fixed CPM. Select your budget, payment terms, and requirements.
                </p>
              </button>

              {/* Managed Option */}
              <button
                onClick={handleManagedClick}
                className="flex flex-col items-start p-4 rounded-xl bg-[#141414] border-transparent hover:bg-[#1a1a1a] transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#1e5aa7', borderTop: '2px solid #3888dd' }}
                  >
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold">Managed</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fully done-for-you campaign implementation and management
                </p>
              </button>
            </div>
          </div>

          {/* Cancel Button */}
          <div className="flex justify-end">
            <Button 
              variant="secondary" 
              onClick={() => setOpen(false)}
              className="px-8"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}