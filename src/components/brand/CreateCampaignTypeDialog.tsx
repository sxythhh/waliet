import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Crown, FileText, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

interface Blueprint {
  id: string;
  title: string;
}

interface CreateCampaignTypeDialogProps {
  onSelectClipping: (blueprintId?: string) => void;
  onSelectManaged: (blueprintId?: string) => void;
  onSelectBoost?: () => void;
  trigger?: React.ReactNode;
  brandId?: string;
}

export function CreateCampaignTypeDialog({ 
  onSelectClipping, 
  onSelectManaged,
  onSelectBoost,
  trigger,
  brandId
}: CreateCampaignTypeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState("");
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (open && brandId) {
      fetchBlueprints();
    }
  }, [open, brandId]);

  const fetchBlueprints = async () => {
    if (!brandId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("blueprints")
      .select("id, title")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setBlueprints(data);
      if (data.length > 0) {
        setSelectedBlueprint(data[0].id);
      }
    }
    setLoading(false);
  };

  const handleClippingClick = () => {
    setOpen(false);
    onSelectClipping(selectedBlueprint || undefined);
  };

  const handleManagedClick = () => {
    setOpen(false);
    onSelectManaged(selectedBlueprint || undefined);
  };

  const handleBoostClick = () => {
    setOpen(false);
    onSelectBoost?.();
  };

  const handleCreateBlueprint = () => {
    setOpen(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", "blueprints");
    setSearchParams(newParams);
  };

  const hasBlueprints = blueprints.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            className="gap-2 font-geist tracking-[-0.5px] transition-shadow duration-300 ease-in-out hover:shadow-[0_0_0_3px_rgba(0,85,255,0.55)] border-t border-[#d0d0d0] dark:border-[#4b85f7]"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] bg-[#f5f5f5] dark:bg-[#050505] border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create New Campaign</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-2">
          {/* Blueprint Select */}
          {loading ? (
            <div className="h-12 bg-muted dark:bg-[#141414] rounded-md animate-pulse" />
          ) : hasBlueprints ? (
            <Select value={selectedBlueprint} onValueChange={setSelectedBlueprint}>
              <SelectTrigger className="w-full bg-muted dark:bg-[#141414] border-transparent h-12">
                <SelectValue placeholder="Select a blueprint" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#141414] border-border">
                {blueprints.map((blueprint) => (
                  <SelectItem key={blueprint.id} value={blueprint.id}>
                    {blueprint.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-muted dark:bg-[#141414] text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">No blueprints yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                Create a blueprint first to define your campaign brief
              </p>
              <Button onClick={handleCreateBlueprint} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Blueprint
              </Button>
            </div>
          )}

          {/* Campaign Workflow Selection */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground tracking-[-0.5px]">Select a Campaign Workflow</p>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Clipping Option */}
              <button
                onClick={handleClippingClick}
                disabled={!hasBlueprints}
                className="flex flex-col items-start p-4 rounded-xl bg-muted dark:bg-[#141414] border-transparent hover:bg-muted/70 dark:hover:bg-[#1a1a1a] transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#a7751e', borderTop: '2px solid #dda038' }}
                  >
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold tracking-[-0.5px] text-sm">Clipping</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed tracking-[-0.5px]">
                  Pay a fixed CPM. Select your budget, payment terms, and requirements.
                </p>
              </button>

              {/* Managed Option */}
              <button
                onClick={handleManagedClick}
                disabled={!hasBlueprints}
                className="flex flex-col items-start p-4 rounded-xl bg-muted dark:bg-[#141414] border-transparent hover:bg-muted/70 dark:hover:bg-[#1a1a1a] transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#1e5aa7', borderTop: '2px solid #3888dd' }}
                  >
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold tracking-[-0.5px] text-sm">Managed</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed tracking-[-0.5px]">
                  Fully done-for-you campaign implementation and management
                </p>
              </button>

              {/* Boost Option */}
              <button
                onClick={handleBoostClick}
                className="flex flex-col items-start p-4 rounded-xl bg-muted dark:bg-[#141414] border-transparent hover:bg-muted/70 dark:hover:bg-[#1a1a1a] transition-all text-left group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#7e1ea7', borderTop: '2px solid #a738dd' }}
                  >
                    <Rocket className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold tracking-[-0.5px] text-sm">Boost</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed tracking-[-0.5px]">
                  Retainer-based campaign with monthly creator positions
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