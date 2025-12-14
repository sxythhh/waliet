import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Upload, DollarSign, Video, Users, ArrowRight, Check, X, Lock, Target, FileText } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";

interface Blueprint {
  id: string;
  title: string;
}

interface CreateBountyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName?: string;
  brandLogoUrl?: string;
  onSuccess: () => void;
}

const STEPS = [
  { id: 1, label: "Compensation" },
  { id: 2, label: "Details" }
];

const platforms = [
  { id: "tiktok", name: "TikTok", logo: tiktokLogo },
  { id: "instagram", name: "Instagram", logo: instagramLogo },
  { id: "youtube", name: "YouTube", logo: youtubeLogo }
];

export function CreateBountyDialog({ open, onOpenChange, brandId, brandName, brandLogoUrl, onSuccess }: CreateBountyDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["tiktok"]);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    is_private: false
  });

  useEffect(() => {
    if (open && brandId) {
      fetchBlueprints();
    }
  }, [open, brandId]);

  const fetchBlueprints = async () => {
    const { data } = await supabase
      .from('blueprints')
      .select('id, title')
      .eq('brand_id', brandId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    setBlueprints(data || []);
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
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
      if (selectedPlatforms.length === 0) {
        toast.error("Please select at least one platform");
        return;
      }
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.monthly_retainer || !formData.videos_per_month || 
        !formData.content_style_requirements || !formData.max_accepted_creators) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      let banner_url = null;

      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `${brandId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('campaign-banners')
          .upload(fileName, bannerFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('campaign-banners')
          .getPublicUrl(fileName);
        banner_url = publicUrl;
      }

      const fullRequirements = `PLATFORMS: ${selectedPlatforms.join(", ")}\n\nCONTENT STYLE:\n${formData.content_style_requirements}`;

      const { error } = await supabase
        .from('bounty_campaigns')
        .insert({
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
          blueprint_id: selectedBlueprintId || null,
          is_private: formData.is_private
        });

      if (error) throw error;

      toast.success("Boost created successfully!");
      onSuccess();
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
      is_private: false
    });
    setBannerFile(null);
    setBannerPreview(null);
    setSelectedPlatforms(["tiktok"]);
    setSelectedBlueprintId("");
    setCurrentStep(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] w-[95vw] max-h-[85vh] bg-background border-border p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={brandName} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">{brandName?.charAt(0) || "V"}</span>
              </div>
            )}
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-[-0.5px]">New Boost</h2>
              <p className="text-xs text-muted-foreground">{brandName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep > step.id
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    currentStep > step.id ? "bg-primary text-primary-foreground" : "bg-current/20"
                  }`}>
                    {currentStep > step.id ? <Check className="w-2.5 h-2.5" /> : step.id}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`w-8 h-px ${currentStep > step.id ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Compensation & Targeting */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Compensation */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Compensation</h3>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Monthly Retainer</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.monthly_retainer}
                      onChange={(e) => setFormData({ ...formData, monthly_retainer: e.target.value })}
                      placeholder="500"
                      className="pl-7 h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Videos/Month</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.videos_per_month}
                      onChange={(e) => setFormData({ ...formData, videos_per_month: e.target.value })}
                      placeholder="4"
                      className="h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Max Creators</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.max_accepted_creators}
                      onChange={(e) => setFormData({ ...formData, max_accepted_creators: e.target.value })}
                      placeholder="5"
                      className="h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Payment Schedule</Label>
                  <Select
                    value={formData.payment_schedule}
                    onValueChange={(value: any) => setFormData({ ...formData, payment_schedule: value })}
                  >
                    <SelectTrigger className="h-10 bg-muted/30 border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payout per video calculation */}
                {formData.monthly_retainer && formData.videos_per_month && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Per video payout</span>
                      <span className="text-sm font-semibold text-primary">
                        ${(parseFloat(formData.monthly_retainer) / parseInt(formData.videos_per_month)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Platforms & Access */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <Target className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Targeting</h3>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Platforms</Label>
                  <div className="flex gap-2">
                    {platforms.map(platform => {
                      const isSelected = selectedPlatforms.includes(platform.id);
                      return (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => togglePlatform(platform.id)}
                          className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                            isSelected
                              ? "bg-primary/10 ring-1 ring-primary/30"
                              : "bg-muted/30 hover:bg-muted/50"
                          }`}
                        >
                          <img src={platform.logo} alt={platform.name} className="w-5 h-5 object-contain" />
                          <span className="text-xs font-medium text-foreground">{platform.name}</span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                    <Label className="text-xs text-foreground cursor-pointer">Private</Label>
                    <Switch
                      checked={formData.is_private}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                    <Label className="text-xs text-foreground cursor-pointer">Active</Label>
                    <Switch
                      checked={formData.status === 'active'}
                      onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'draft' })}
                    />
                  </div>
                </div>

                {/* Date Range - Compact */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full h-10 justify-start text-left font-normal bg-muted/30 hover:bg-muted/50",
                            !formData.start_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          <span className="text-xs">
                            {formData.start_date ? format(formData.start_date, "MMM d") : "Optional"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.start_date}
                          onSelect={(date) => setFormData({ ...formData, start_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full h-10 justify-start text-left font-normal bg-muted/30 hover:bg-muted/50",
                            !formData.end_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          <span className="text-xs">
                            {formData.end_date ? format(formData.end_date, "MMM d") : "Optional"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.end_date}
                          onSelect={(date) => setFormData({ ...formData, end_date: date })}
                          disabled={(date) => formData.start_date ? date < formData.start_date : false}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <div className="space-y-5">
              {/* Banner Upload - Compact */}
              <div className="space-y-2">
                {bannerPreview ? (
                  <div className="relative h-32 rounded-xl overflow-hidden group">
                    <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={removeBanner}
                        className="gap-2"
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/30 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-center"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="text-center">
                      <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Upload banner image</p>
                    </div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>

              {/* Title & Blueprint */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Boost Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Monthly Content Creator"
                    className="h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Blueprint</Label>
                  <Select value={selectedBlueprintId} onValueChange={setSelectedBlueprintId}>
                    <SelectTrigger className="h-10 bg-muted/30 border-0">
                      <SelectValue placeholder="Select a blueprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No blueprint</SelectItem>
                      {blueprints.map((bp) => (
                        <SelectItem key={bp.id} value={bp.id}>{bp.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this boost entails..."
                  className="min-h-[80px] bg-muted/30 border-0 resize-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Content Style & Requirements</Label>
                <Textarea
                  value={formData.content_style_requirements}
                  onChange={(e) => setFormData({ ...formData, content_style_requirements: e.target.value })}
                  placeholder="Describe content style, format, themes, and any specific creative requirements..."
                  className="min-h-[100px] bg-muted/30 border-0 resize-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              {/* Summary Card */}
              <div className="rounded-lg bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Summary</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2 rounded-md bg-background">
                    <p className="text-xs text-muted-foreground">Retainer</p>
                    <p className="text-sm font-semibold">${formData.monthly_retainer || '0'}/mo</p>
                  </div>
                  <div className="p-2 rounded-md bg-background">
                    <p className="text-xs text-muted-foreground">Videos</p>
                    <p className="text-sm font-semibold">{formData.videos_per_month || '0'}/mo</p>
                  </div>
                  <div className="p-2 rounded-md bg-background">
                    <p className="text-xs text-muted-foreground">Creators</p>
                    <p className="text-sm font-semibold">{formData.max_accepted_creators || '0'} max</p>
                  </div>
                  <div className="p-2 rounded-md bg-background">
                    <p className="text-xs text-muted-foreground">Platforms</p>
                    <p className="text-sm font-semibold">{selectedPlatforms.length} selected</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-background">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={currentStep === 1 ? () => onOpenChange(false) : handleBack}
          >
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 2 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="min-w-[100px] gap-2"
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={creating}
                className="min-w-[100px]"
              >
                {creating ? "Creating..." : "Create Boost"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
