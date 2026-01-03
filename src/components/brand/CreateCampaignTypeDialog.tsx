import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, ChevronLeft, Zap, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import clippingIcon from "@/assets/clipping-icon.svg";
import boostIcon from "@/assets/boost-icon.svg";
import blueprintsIcon from "@/assets/blueprints-inactive.svg";
import noteStackIcon from "@/assets/icons/note-stack.svg";
import { CAMPAIGN_TEMPLATES, CampaignTemplate } from "./CampaignCreationWizard";
import { useBrandUsage } from "@/hooks/useBrandUsage";
interface Blueprint {
  id: string;
  title: string;
}
interface CreateCampaignTypeDialogProps {
  onSelectClipping: (blueprintId?: string, template?: CampaignTemplate) => void;
  onSelectManaged: (blueprintId?: string) => void;
  onSelectBoost?: () => void;
  onSelectJobPost?: () => void;
  trigger?: React.ReactNode;
  brandId?: string;
  subscriptionPlan?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultBlueprintId?: string;
}
export function CreateCampaignTypeDialog({
  onSelectClipping,
  onSelectManaged,
  onSelectBoost,
  onSelectJobPost,
  trigger,
  brandId,
  subscriptionPlan,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultBlueprintId
}: CreateCampaignTypeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { canCreateCampaign, canCreateBoost, campaignsUsed, campaignsLimit, boostsUsed, boostsLimit } = useBrandUsage(brandId, subscriptionPlan);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [selectedBlueprint, setSelectedBlueprint] = useState(defaultBlueprintId || "");
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showTemplates, setShowTemplates] = useState(false);
  useEffect(() => {
    if (defaultBlueprintId) {
      setSelectedBlueprint(defaultBlueprintId);
    }
  }, [defaultBlueprintId]);
  useEffect(() => {
    if (open && brandId) {
      fetchBlueprints();
    }
    // Reset template view when dialog opens
    if (open) {
      setShowTemplates(false);
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
  const handleTemplateSelect = (template: CampaignTemplate) => {
    setOpen(false);
    onSelectClipping(selectedBlueprint || undefined, template);
  };
  const handleBoostClick = () => {
    setOpen(false);
    onSelectBoost?.();
  };
  const handleJobPostClick = () => {
    setOpen(false);
    onSelectJobPost?.();
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
      <DialogContent className="sm:max-w-[440px] bg-background border-none shadow-2xl p-6">
        <div className="space-y-5">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {showTemplates && (
                <button onClick={() => setShowTemplates(false)} className="p-1 hover:bg-muted rounded-md transition-colors">
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              <h2 className="text-lg font-semibold font-inter tracking-[-0.5px] text-foreground">
                {showTemplates ? "Quick Start Templates" : "New Campaign"}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              {showTemplates ? "Choose a template to pre-fill campaign settings" : "Choose your campaign type to get started"}
            </p>
          </div>

          {/* Template Selection View */}
          {showTemplates ? (
            <div className="space-y-2">
              {CAMPAIGN_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#7e47ff] flex items-center justify-center shrink-0">
                    <img src={noteStackIcon} alt="" className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground font-inter tracking-[-0.5px] text-sm">
                        {template.name}
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-inter tracking-[-0.5px]">
                        ${template.defaults.rpm_rate} CPM
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground/70 font-inter tracking-[-0.5px]">
                        ${Number(template.defaults.budget).toLocaleString()} budget
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">•</span>
                      <span className="text-[10px] text-muted-foreground/70 font-inter tracking-[-0.5px] capitalize">
                        {template.defaults.allowed_platforms.join(', ')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <>
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

              {/* Quick Start Templates Button */}
              {hasBlueprints && (
                <button
                  onClick={() => setShowTemplates(true)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#7e47ff] flex items-center justify-center shrink-0">
                    <img src={noteStackIcon} alt="" className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground font-inter tracking-[-0.5px] text-sm block">
                      Quick Start Templates
                    </span>
                    <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      Choose from pre-built campaign setups
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              )}

              {/* Campaign Type Selection */}
              <div className="space-y-3">


                <div className="space-y-2">
                  {/* Clipping Option */}
                  <button onClick={handleClippingClick} disabled={!hasBlueprints || !canCreateCampaign} className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                      backgroundColor: '#a7751e'
                    }}>
                      <img alt="Clipping" className="h-5 w-5" src="/lovable-uploads/348a9219-b53a-4497-a2a3-967c3bbf6d01.png" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground font-inter tracking-[-0.5px] text-sm block">
                        Clipping
                      </span>
                      {!canCreateCampaign ? (
                        <p className="text-xs text-amber-500 font-inter tracking-[-0.5px] mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Limit reached ({campaignsUsed}/{campaignsLimit})
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                          Pay per view with fixed CPM rates
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Boost Option */}
                  <button onClick={handleBoostClick} disabled={!canCreateBoost} className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                      backgroundColor: '#1ea75e'
                    }}>
                      <img alt="Boost" className="h-5 w-5" src={boostIcon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground font-inter tracking-[-0.5px] text-sm block">
                        Boost
                      </span>
                      {!canCreateBoost ? (
                        <p className="text-xs text-amber-500 font-inter tracking-[-0.5px] mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Limit reached ({boostsUsed}/{boostsLimit})
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                          Monthly retainer with fixed creator slots
                        </p>
                      )}
                </div>
              </button>

                  {/* Job Post Option */}
                  <button onClick={handleJobPostClick} className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-left group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                      backgroundColor: '#7c3aed'
                    }}>
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground font-inter tracking-[-0.5px] text-sm block">
                        Job Post
                      </span>
                      <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                        Hire for specific roles like editors or strategists
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>;
  }
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2 font-geist font-normal tracking-[-0.5px] transition-shadow duration-300 ease-in-out hover:shadow-[0_0_0_3px_rgba(0,85,255,0.55)] border-t border-[#d0d0d0] dark:border-[#4b85f7]">
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] bg-background border-none shadow-2xl p-6">
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
            
            
            <div className="space-y-2">
              {/* Clipping Option */}
              <button onClick={handleClippingClick} disabled={!hasBlueprints || !canCreateCampaign} className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                backgroundColor: '#a7751e'
              }}>
                  <img src={clippingIcon} alt="Clipping" className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground font-inter tracking-[-0.5px] text-sm block">
                    Clipping
                  </span>
                  {!canCreateCampaign ? (
                    <p className="text-xs text-amber-500 font-inter tracking-[-0.5px] mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Limit reached ({campaignsUsed}/{campaignsLimit})
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                      Pay per view with fixed CPM rates
                    </p>
                  )}
                </div>
              </button>

              {/* Boost Option */}
              <button onClick={handleBoostClick} disabled={!canCreateBoost} className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                backgroundColor: '#1ea75e'
              }}>
                  <img alt="Boost" className="h-5 w-5" src={boostIcon} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground font-inter tracking-[-0.5px] text-sm block">
                    Boost
                  </span>
                  {!canCreateBoost ? (
                    <p className="text-xs text-amber-500 font-inter tracking-[-0.5px] mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Limit reached ({boostsUsed}/{boostsLimit})
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                      Monthly retainer with fixed creator slots
                    </p>
                  )}
                </div>
              </button>

              {/* Job Post Option */}
              <button onClick={handleJobPostClick} className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-left group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                backgroundColor: '#7c3aed'
              }}>
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground font-inter tracking-[-0.5px] text-sm block">
                    Job Post
                  </span>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                    Hire for specific roles like editors or strategists
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}