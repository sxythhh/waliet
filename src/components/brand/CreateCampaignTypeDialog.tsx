import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import clippingIcon from "@/assets/clipping-icon.svg";
import boostIcon from "@/assets/boost-icon.svg";
import blueprintsIcon from "@/assets/blueprints-inactive.svg";
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultBlueprintId?: string;
}
export function CreateCampaignTypeDialog({
  onSelectClipping,
  onSelectManaged,
  onSelectBoost,
  trigger,
  brandId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultBlueprintId
}: CreateCampaignTypeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [selectedBlueprint, setSelectedBlueprint] = useState(defaultBlueprintId || "");
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  useEffect(() => {
    if (defaultBlueprintId) {
      setSelectedBlueprint(defaultBlueprintId);
    }
  }, [defaultBlueprintId]);
  
  useEffect(() => {
    if (open && brandId) {
      fetchBlueprints();
    }
  }, [open, brandId]);
  const fetchBlueprints = async () => {
    if (!brandId) return;
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("blueprints").select("id, title").eq("brand_id", brandId).order("created_at", {
      ascending: false
    });
    if (!error && data) {
      setBlueprints(data);
      // Only auto-select first if no default is provided
      if (data.length > 0 && !defaultBlueprintId) {
        setSelectedBlueprint(data[0].id);
      }
    }
    setLoading(false);
  };
  const handleClippingClick = () => {
    setOpen(false);
    onSelectClipping(selectedBlueprint || undefined);
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
  
  // If controlled, don't render trigger
  if (controlledOpen !== undefined) {
    return <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[440px] bg-background border-none shadow-2xl">
        <div className="space-y-5">
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold font-inter tracking-[-0.5px] text-foreground">
              New Campaign
            </h2>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              Choose your campaign type to get started
            </p>
          </div>
          
          {/* Blueprint Select */}
          {loading ? <div className="h-11 bg-muted/50 rounded-lg animate-pulse" /> : hasBlueprints ? <div className="space-y-2">
              
              <Select value={selectedBlueprint} onValueChange={setSelectedBlueprint}>
                <SelectTrigger className="w-full bg-muted/50 border-none h-11 rounded-lg">
                  <SelectValue placeholder="Select a blueprint" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-none shadow-lg">
                  {blueprints.map(blueprint => <SelectItem key={blueprint.id} value={blueprint.id}>
                      {blueprint.title}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div> : <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl bg-muted/30 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <img src={blueprintsIcon} alt="Blueprints" className="h-5 w-5 opacity-60" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1 font-inter tracking-[-0.5px]">No blueprints yet</p>
              <p className="text-xs text-muted-foreground mb-4 font-inter tracking-[-0.5px]">
                Create a blueprint first to define your campaign brief
              </p>
              <Button onClick={handleCreateBlueprint} size="sm" variant="secondary" className="gap-2 rounded-lg font-inter tracking-[-0.5px]">
                <Plus className="h-3.5 w-3.5" />
                Create Blueprint
              </Button>
            </div>}

          {/* Campaign Type Selection */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Campaign Type
            </label>
            
            <div className="space-y-2">
              {/* Clipping Option */}
              <button onClick={handleClippingClick} disabled={!hasBlueprints} className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                backgroundColor: '#a7751e'
              }}>
                  <img src={clippingIcon} alt="Clipping" className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground font-inter tracking-[-0.5px] text-sm block">
                    Clipping
                  </span>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                    Pay per view with fixed CPM rates
                  </p>
                </div>
              </button>

              {/* Boost Option */}
              <button onClick={handleBoostClick} className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-left group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                backgroundColor: '#1ea75e'
              }}>
                  <img alt="Boost" className="h-5 w-5" src="/lovable-uploads/a5e5e0b5-a5aa-4ed7-88da-c3e121539f10.png" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground font-inter tracking-[-0.5px] text-sm block">
                    Boost
                  </span>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                    Monthly retainer with fixed creator slots
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
  }
  
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2 font-geist tracking-[-0.5px] transition-shadow duration-300 ease-in-out hover:shadow-[0_0_0_3px_rgba(0,85,255,0.55)] border-t border-[#d0d0d0] dark:border-[#4b85f7]">
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] bg-background border-none shadow-2xl">
        <div className="space-y-5">
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold font-inter tracking-[-0.5px] text-foreground">
              New Campaign
            </h2>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              Choose your campaign type to get started
            </p>
          </div>
          
          {/* Blueprint Select */}
          {loading ? <div className="h-11 bg-muted/50 rounded-lg animate-pulse" /> : hasBlueprints ? <div className="space-y-2">
              
              <Select value={selectedBlueprint} onValueChange={setSelectedBlueprint}>
                <SelectTrigger className="w-full bg-muted/50 border-none h-11 rounded-lg">
                  <SelectValue placeholder="Select a blueprint" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-none shadow-lg">
                  {blueprints.map(blueprint => <SelectItem key={blueprint.id} value={blueprint.id}>
                      {blueprint.title}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div> : <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl bg-muted/30 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <img src={blueprintsIcon} alt="Blueprints" className="h-5 w-5 opacity-60" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1 font-inter tracking-[-0.5px]">No blueprints yet</p>
              <p className="text-xs text-muted-foreground mb-4 font-inter tracking-[-0.5px]">
                Create a blueprint first to define your campaign brief
              </p>
              <Button onClick={handleCreateBlueprint} size="sm" variant="secondary" className="gap-2 rounded-lg font-inter tracking-[-0.5px]">
                <Plus className="h-3.5 w-3.5" />
                Create Blueprint
              </Button>
            </div>}

          {/* Campaign Type Selection */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Campaign Type
            </label>
            
            <div className="space-y-2">
              {/* Clipping Option */}
              <button onClick={handleClippingClick} disabled={!hasBlueprints} className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                backgroundColor: '#a7751e'
              }}>
                  <img src={clippingIcon} alt="Clipping" className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground font-inter tracking-[-0.5px] text-sm block">
                    Clipping
                  </span>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                    Pay per view with fixed CPM rates
                  </p>
                </div>
              </button>

              {/* Boost Option */}
              <button onClick={handleBoostClick} className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-left group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                backgroundColor: '#1ea75e'
              }}>
                  <img alt="Boost" className="h-5 w-5" src="/lovable-uploads/a5e5e0b5-a5aa-4ed7-88da-c3e121539f10.png" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground font-inter tracking-[-0.5px] text-sm block">
                    Boost
                  </span>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                    Monthly retainer with fixed creator slots
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}