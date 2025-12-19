import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, ArrowRight, Check, Lock, FileText, Plus, X, HelpCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
interface Blueprint {
  id: string;
  title: string;
  platforms?: string[] | null;
}
interface CreateBountyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName?: string;
  brandLogoUrl?: string;
  onSuccess?: () => void;
  initialBlueprintId?: string;
}
const STEPS = [{
  id: 1,
  label: "Compensation"
}, {
  id: 2,
  label: "Details"
}];
export function CreateBountyDialog({
  open,
  onOpenChange,
  brandId,
  brandName,
  brandLogoUrl,
  onSuccess,
  initialBlueprintId
}: CreateBountyDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get selected blueprint
  const selectedBlueprint = blueprints.find(bp => bp.id === selectedBlueprintId);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    monthly_retainer: "",
    videos_per_month: "",
    content_style_requirements: "",
    max_accepted_creators: "",
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    status: "active" as "draft" | "active",
    payment_schedule: "monthly" as "weekly" | "biweekly" | "monthly",
    blueprint_embed_url: "",
    is_private: false,
    application_questions: [] as string[],
    content_distribution: "creators_own_page" as "creators_own_page" | "branded_accounts"
  });
  const [newQuestion, setNewQuestion] = useState("");
  useEffect(() => {
    if (open && brandId) {
      fetchBlueprints();
    }
  }, [open, brandId]);
  useEffect(() => {
    if (initialBlueprintId && open) {
      setSelectedBlueprintId(initialBlueprintId);
    }
  }, [initialBlueprintId, open]);
  const fetchBlueprints = async () => {
    const {
      data
    } = await supabase.from('blueprints').select('id, title, platforms').eq('brand_id', brandId).order('created_at', {
      ascending: false
    });
    setBlueprints(data || []);
    // Set initial blueprint if provided and not already set
    if (initialBlueprintId && !selectedBlueprintId) {
      setSelectedBlueprintId(initialBlueprintId);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const removeBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const handleNext = async () => {
    if (currentStep === 1) {
      if (!formData.monthly_retainer || !formData.videos_per_month || !formData.max_accepted_creators) {
        toast.error("Please fill in all required fields");
        return;
      }
      setCurrentStep(2);
    }
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };
  const handleSubmit = async () => {
    if (!formData.title || !formData.monthly_retainer || !formData.videos_per_month || !formData.max_accepted_creators) {
      toast.error("Please fill in all required fields");
      return;
    }
    setCreating(true);
    try {
      let banner_url = null;
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `${brandId}/${Date.now()}.${fileExt}`;
        const {
          error: uploadError
        } = await supabase.storage.from('campaign-banners').upload(fileName, bannerFile);
        if (uploadError) throw uploadError;
        const {
          data: {
            publicUrl
          }
        } = supabase.storage.from('campaign-banners').getPublicUrl(fileName);
        banner_url = publicUrl;
      }

      // Get platforms from selected blueprint or default to all
      const blueprintPlatforms = selectedBlueprint?.platforms || ['tiktok', 'instagram', 'youtube'];
      const fullRequirements = `PLATFORMS: ${blueprintPlatforms.join(", ")}`;
      const {
        error
      } = await supabase.from('bounty_campaigns').insert({
        brand_id: brandId,
        title: formData.title,
        description: formData.description || null,
        monthly_retainer: parseFloat(formData.monthly_retainer),
        videos_per_month: parseInt(formData.videos_per_month),
        content_style_requirements: fullRequirements,
        max_accepted_creators: parseInt(formData.max_accepted_creators),
        start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : null,
        end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
        banner_url,
        status: formData.status,
        blueprint_embed_url: formData.blueprint_embed_url || null,
        blueprint_id: selectedBlueprintId && selectedBlueprintId !== "none" ? selectedBlueprintId : null,
        is_private: formData.is_private,
        application_questions: formData.application_questions.length > 0 ? formData.application_questions : null,
        content_distribution: formData.content_distribution
      });
      if (error) throw error;
      toast.success("Boost created successfully!");
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating boost:", error);
      toast.error(error.message || "Failed to create boost");
    } finally {
      setCreating(false);
    }
  };
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      monthly_retainer: "",
      videos_per_month: "",
      content_style_requirements: "",
      max_accepted_creators: "",
      start_date: undefined,
      end_date: undefined,
      status: "active",
      payment_schedule: "monthly",
      blueprint_embed_url: "",
      is_private: false,
      application_questions: [],
      content_distribution: "creators_own_page"
    });
    setNewQuestion("");
    setBannerFile(null);
    setBannerPreview(null);
    setSelectedBlueprintId("");
    setCurrentStep(1);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[540px] w-[95vw] max-h-[85vh] bg-background border-border p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground font-geist tracking-[-0.5px]">New Boost</h2>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">{brandName}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Compensation & Settings */}
          {currentStep === 1 && <div className="space-y-6">
              {/* Selected Blueprint Preview */}
              {selectedBlueprint && <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Using blueprint</p>
                      <p className="text-sm font-semibold text-foreground font-geist truncate">{selectedBlueprint.title}</p>
                    </div>
                    {selectedBlueprint.platforms && selectedBlueprint.platforms.length > 0 && <div className="flex items-center gap-1.5">
                        {selectedBlueprint.platforms.map(p => <Badge key={p} variant="secondary" className="text-xs capitalize font-inter tracking-[-0.5px]">
                            {p}
                          </Badge>)}
                      </div>}
                  </div>
                </div>}

              <div className="space-y-6">
                {/* Left Column - Compensation */}
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-foreground font-geist tracking-[-0.5px]">Compensation</h3>

                  {/* Payment Schedule - First */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Payment Schedule</Label>
                    <Select value={formData.payment_schedule} onValueChange={(value: any) => setFormData({
                  ...formData,
                  payment_schedule: value
                })}>
                      <SelectTrigger className="h-11 bg-muted/30 border-0 font-inter tracking-[-0.5px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly" className="font-inter tracking-[-0.5px]">Weekly</SelectItem>
                        <SelectItem value="biweekly" className="font-inter tracking-[-0.5px]">Bi-weekly</SelectItem>
                        <SelectItem value="monthly" className="font-inter tracking-[-0.5px]">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Amount with Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Payment Amount</Label>
                      <div className="relative w-24">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-inter">$</span>
                        <Input type="number" min="10" max="10000" value={formData.monthly_retainer} onChange={e => setFormData({
                      ...formData,
                      monthly_retainer: e.target.value
                    })} placeholder="500" className="pl-7 h-9 bg-muted/30 border-0 text-right pr-3 font-geist tracking-[-0.5px] text-sm" />
                      </div>
                    </div>
                    <Slider value={[parseFloat(formData.monthly_retainer) || 100]} onValueChange={value => setFormData({
                  ...formData,
                  monthly_retainer: value[0].toString()
                })} min={10} max={1000} step={10} className="w-full" />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">
                      <span>$10</span>
                      <span>$1,000+</span>
                    </div>
                  </div>

                  {/* Videos and Max Creators */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Videos per {formData.payment_schedule === 'weekly' ? 'Week' : formData.payment_schedule === 'biweekly' ? '2 Weeks' : 'Month'}</Label>
                      <Input type="number" min="1" value={formData.videos_per_month} onChange={e => setFormData({
                    ...formData,
                    videos_per_month: e.target.value
                  })} placeholder="4" className="h-11 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Max Creators</Label>
                      <Input type="number" min="1" value={formData.max_accepted_creators} onChange={e => setFormData({
                    ...formData,
                    max_accepted_creators: e.target.value
                  })} placeholder="5" className="h-11 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px]" />
                    </div>
                  </div>

                  {/* Per Video Payout Display */}
                  <div className="p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Per video payout</span>
                      </div>
                      <span className="text-lg font-semibold text-foreground font-geist tracking-[-0.5px]">
                        ${formData.monthly_retainer && formData.videos_per_month && parseInt(formData.videos_per_month) > 0 ? (parseFloat(formData.monthly_retainer) / parseInt(formData.videos_per_month)).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column - Settings & Dates */}
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-foreground font-geist tracking-[-0.5px]">Settings</h3>

                  {/* Blueprint Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Blueprint</Label>
                    <Select value={selectedBlueprintId} onValueChange={setSelectedBlueprintId}>
                      <SelectTrigger className="h-11 bg-muted/30 border-0 font-inter tracking-[-0.5px]">
                        <SelectValue placeholder="Select a blueprint" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="font-inter tracking-[-0.5px]">No blueprint</SelectItem>
                        {blueprints.map(bp => <SelectItem key={bp.id} value={bp.id} className="font-inter tracking-[-0.5px]">{bp.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setFormData({
                  ...formData,
                  is_private: !formData.is_private
                })}>
                      <div className="flex items-center gap-2.5">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm text-foreground cursor-pointer font-inter tracking-[-0.5px]">Private</Label>
                      </div>
                      <Switch checked={formData.is_private} onCheckedChange={checked => setFormData({
                    ...formData,
                    is_private: checked
                  })} />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setFormData({
                  ...formData,
                  status: formData.status === 'active' ? 'draft' : 'active'
                })}>
                      <div className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm text-foreground cursor-pointer font-inter tracking-[-0.5px]">Active</Label>
                      </div>
                      <Switch checked={formData.status === 'active'} onCheckedChange={checked => setFormData({
                    ...formData,
                    status: checked ? 'active' : 'draft'
                  })} />
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className={cn("w-full h-11 justify-start text-left font-normal bg-muted/30 hover:bg-muted/50 font-inter tracking-[-0.5px]", !formData.start_date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            <span className="text-sm">
                              {formData.start_date ? format(formData.start_date, "MMM d, yyyy") : "Optional"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={formData.start_date} onSelect={date => setFormData({
                        ...formData,
                        start_date: date
                      })} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className={cn("w-full h-11 justify-start text-left font-normal bg-muted/30 hover:bg-muted/50 font-inter tracking-[-0.5px]", !formData.end_date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            <span className="text-sm">
                              {formData.end_date ? format(formData.end_date, "MMM d, yyyy") : "Optional"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={formData.end_date} onSelect={date => setFormData({
                        ...formData,
                        end_date: date
                      })} disabled={date => formData.start_date ? date < formData.start_date : false} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Content Distribution */}
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Content Distribution</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={() => setFormData({ ...formData, content_distribution: "creators_own_page" })}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.content_distribution === "creators_own_page"
                            ? "border-primary bg-primary/5"
                            : "border-transparent bg-muted/50 hover:bg-muted/70"
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground font-inter tracking-[-0.5px]">Creator's Own Page</p>
                        <p className="text-xs text-muted-foreground mt-1">Creators post on their existing accounts</p>
                      </div>
                      <div
                        onClick={() => setFormData({ ...formData, content_distribution: "branded_accounts" })}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.content_distribution === "branded_accounts"
                            ? "border-primary bg-primary/5"
                            : "border-transparent bg-muted/50 hover:bg-muted/70"
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground font-inter tracking-[-0.5px]">Branded Accounts</p>
                        <p className="text-xs text-muted-foreground mt-1">Creators create new branded accounts</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>}

          {/* Step 2: Details */}
          {currentStep === 2 && <div className="space-y-6">
              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Boost Title</Label>
                <Input value={formData.title} onChange={e => setFormData({
              ...formData,
              title: e.target.value
            })} placeholder="e.g., Monthly Content Creator" className="h-11 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px]" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({
              ...formData,
              description: e.target.value
            })} placeholder="Describe what this boost entails..." className="min-h-[90px] bg-muted/30 border-0 resize-none focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px]" />
              </div>

              {/* Application Questions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Application Questions</Label>
                  <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">(Optional)</span>
                </div>
                
                {/* Existing Questions */}
                {formData.application_questions.length > 0 && (
                  <div className="space-y-2">
                    {formData.application_questions.map((question, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                        <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px] shrink-0">Q{index + 1}.</span>
                        <span className="text-sm text-foreground font-inter tracking-[-0.5px] flex-1">{question}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const updated = formData.application_questions.filter((_, i) => i !== index);
                            setFormData({ ...formData, application_questions: updated });
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add New Question */}
                <div className="flex gap-2">
                  <Input
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Enter a question for applicants..."
                    className="h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px] flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newQuestion.trim()) {
                        e.preventDefault();
                        setFormData({
                          ...formData,
                          application_questions: [...formData.application_questions, newQuestion.trim()]
                        });
                        setNewQuestion("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-10 px-3 font-inter tracking-[-0.5px]"
                    disabled={!newQuestion.trim()}
                    onClick={() => {
                      if (newQuestion.trim()) {
                        setFormData({
                          ...formData,
                          application_questions: [...formData.application_questions, newQuestion.trim()]
                        });
                        setNewQuestion("");
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  Add questions that creators must answer when applying to this boost.
                </p>
              </div>

              {/* Summary Card */}
              <div className="rounded-xl bg-muted/20 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground font-geist tracking-[-0.5px]">Summary</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg bg-background">
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Retainer</p>
                    <p className="text-sm font-semibold font-geist tracking-[-0.5px]">${formData.monthly_retainer || '0'}/mo</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background">
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Videos</p>
                    <p className="text-sm font-semibold font-geist tracking-[-0.5px]">{formData.videos_per_month || '0'}/mo</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background">
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Creators</p>
                    <p className="text-sm font-semibold font-geist tracking-[-0.5px]">{formData.max_accepted_creators || '0'} max</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background">
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Blueprint</p>
                    <p className="text-sm font-semibold font-geist tracking-[-0.5px] truncate">{selectedBlueprint?.title || 'None'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background">
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Questions</p>
                    <p className="text-sm font-semibold font-geist tracking-[-0.5px]">{formData.application_questions.length}</p>
                  </div>
                </div>
              </div>
            </div>}
        </div>

        <div className="px-6 py-4 flex items-center justify-between bg-background">
          <Button type="button" variant="ghost" size="sm" onClick={currentStep === 1 ? () => onOpenChange(false) : handleBack} className="font-inter tracking-[-0.5px]">
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 2 ? <Button type="button" size="sm" onClick={handleNext} className="min-w-[100px] gap-2 font-inter tracking-[-0.5px]">
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </Button> : <Button type="button" size="sm" onClick={handleSubmit} disabled={creating} className="min-w-[100px] font-inter tracking-[-0.5px]">
                {creating ? "Creating..." : "Create Boost"}
              </Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}