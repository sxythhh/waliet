import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Upload, DollarSign, Video, Users, ArrowRight, ArrowLeft, Check, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";

interface CreateBountyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onSuccess: () => void;
}

const STEPS = [
  { id: 1, label: "Compensation" },
  { id: 2, label: "Content" },
  { id: 3, label: "Details" }
];

const platforms = [
  { id: "tiktok", name: "TikTok", logo: tiktokLogo },
  { id: "instagram", name: "Instagram", logo: instagramLogo },
  { id: "youtube", name: "YouTube", logo: youtubeLogo }
];

export function CreateBountyDialog({ open, onOpenChange, brandId, onSuccess }: CreateBountyDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["tiktok"]);
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
    min_followers: "",
    max_followers: "",
    payment_schedule: "monthly" as "weekly" | "biweekly" | "monthly",
    additional_requirements: "",
    posting_frequency: "",
    review_process: "",
    blueprint_embed_url: ""
  });

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

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.monthly_retainer || !formData.payment_schedule) {
        toast.error("Please fill in compensation details");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.videos_per_month || !formData.max_accepted_creators || selectedPlatforms.length === 0) {
        toast.error("Please fill in content requirements");
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.monthly_retainer || !formData.videos_per_month || 
        !formData.content_style_requirements || !formData.max_accepted_creators) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
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

      const fullRequirements = `
PLATFORMS: ${selectedPlatforms.join(", ")}

CONTENT STYLE:
${formData.content_style_requirements}

${formData.posting_frequency ? `POSTING FREQUENCY:\n${formData.posting_frequency}\n\n` : ''}
${formData.additional_requirements ? `ADDITIONAL REQUIREMENTS:\n${formData.additional_requirements}\n\n` : ''}
${formData.review_process ? `REVIEW PROCESS:\n${formData.review_process}\n\n` : ''}
${formData.min_followers ? `MIN FOLLOWERS: ${formData.min_followers}` : ''}
${formData.max_followers ? ` | MAX FOLLOWERS: ${formData.max_followers}` : ''}
${formData.payment_schedule ? `\n\nPAYMENT SCHEDULE: ${formData.payment_schedule}` : ''}
      `.trim();

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
          blueprint_embed_url: formData.blueprint_embed_url || null
        });

      if (error) throw error;

      toast.success("Boost campaign created successfully!");
      onSuccess();
      onOpenChange(false);
      
      // Reset form
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
        min_followers: "",
        max_followers: "",
        payment_schedule: "monthly",
        additional_requirements: "",
        posting_frequency: "",
        review_process: "",
        blueprint_embed_url: ""
      });
      setBannerFile(null);
      setBannerPreview(null);
      setSelectedPlatforms(["tiktok"]);
      setCurrentStep(1);
    } catch (error: any) {
      console.error("Error creating boost:", error);
      toast.error(error.message || "Failed to create boost campaign");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden bg-[#050505] border-[#1a1a1a] p-0">
        {/* Progress Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#1a1a1a]">
          <h2 className="text-xl font-bold text-white tracking-[-0.5px] mb-4">Create Boost Campaign</h2>
          
          {/* Step Indicators */}
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                      currentStep >= step.id
                        ? "bg-primary text-white"
                        : "bg-[#1a1a1a] text-muted-foreground"
                    )}
                  >
                    {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium tracking-[-0.5px] hidden sm:block",
                      currentStep >= step.id ? "text-white" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-8 sm:w-12 h-[2px] mx-2",
                      currentStep > step.id ? "bg-primary" : "bg-[#1a1a1a]"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col h-[calc(90vh-180px)]">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* Step 1: Compensation */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white tracking-[-0.5px] mb-1">Compensation Details</h3>
                  <p className="text-sm text-muted-foreground">Set up the payment structure for your creators</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white tracking-[-0.5px]">Monthly Retainer *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.monthly_retainer}
                        onChange={(e) => setFormData({ ...formData, monthly_retainer: e.target.value })}
                        placeholder="500.00"
                        className="pl-9 h-11 bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white tracking-[-0.5px]">Payment Schedule *</Label>
                    <Select
                      value={formData.payment_schedule}
                      onValueChange={(value: any) => setFormData({ ...formData, payment_schedule: value })}
                    >
                      <SelectTrigger className="h-11 bg-[#0a0a0a] border-[#1a1a1a] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0a] border-[#1a1a1a]">
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white tracking-[-0.5px]">Minimum Followers</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.min_followers}
                      onChange={(e) => setFormData({ ...formData, min_followers: e.target.value })}
                      placeholder="10,000"
                      className="h-11 bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-muted-foreground/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white tracking-[-0.5px]">Maximum Followers</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.max_followers}
                      onChange={(e) => setFormData({ ...formData, max_followers: e.target.value })}
                      placeholder="100,000"
                      className="h-11 bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-muted-foreground/50"
                    />
                    <p className="text-xs text-muted-foreground">Leave empty for no limit</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Content Requirements */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white tracking-[-0.5px] mb-1">Content Requirements</h3>
                  <p className="text-sm text-muted-foreground">Define what content you expect from creators</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white tracking-[-0.5px]">Videos Per Month *</Label>
                    <div className="relative">
                      <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="1"
                        value={formData.videos_per_month}
                        onChange={(e) => setFormData({ ...formData, videos_per_month: e.target.value })}
                        placeholder="4"
                        className="pl-9 h-11 bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white tracking-[-0.5px]">Maximum Creators *</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="1"
                        value={formData.max_accepted_creators}
                        onChange={(e) => setFormData({ ...formData, max_accepted_creators: e.target.value })}
                        placeholder="5"
                        className="pl-9 h-11 bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Number of creators to hire</p>
                  </div>
                </div>

                {/* Platforms */}
                <div className="space-y-3">
                  <Label className="text-white tracking-[-0.5px]">Target Platforms *</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {platforms.map((platform) => {
                      const isSelected = selectedPlatforms.includes(platform.id);
                      return (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => togglePlatform(platform.id)}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-[#1a1a1a] hover:border-[#2a2a2a] bg-[#0a0a0a]"
                          )}
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors",
                              isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <img src={platform.logo} alt={platform.name} className="w-5 h-5 object-contain" />
                          <span className="text-sm font-medium text-white tracking-[-0.5px]">{platform.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white tracking-[-0.5px]">Content Style & Format *</Label>
                  <Textarea
                    value={formData.content_style_requirements}
                    onChange={(e) => setFormData({ ...formData, content_style_requirements: e.target.value })}
                    placeholder="Describe content style, format, themes, tone, and any specific creative requirements..."
                    className="min-h-[100px] bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-muted-foreground/50 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white tracking-[-0.5px]">Posting Frequency</Label>
                  <Input
                    value={formData.posting_frequency}
                    onChange={(e) => setFormData({ ...formData, posting_frequency: e.target.value })}
                    placeholder="e.g., 1 video per week, Monday-Wednesday preferred"
                    className="h-11 bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Campaign Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white tracking-[-0.5px] mb-1">Campaign Details</h3>
                  <p className="text-sm text-muted-foreground">Add the final details for your boost campaign</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-white tracking-[-0.5px]">Campaign Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Monthly Content Creator Position"
                    className="h-11 bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-muted-foreground/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white tracking-[-0.5px]">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this boost entails..."
                    className="min-h-[80px] bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-muted-foreground/50 resize-none"
                  />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white tracking-[-0.5px]">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-11 justify-start text-left font-normal bg-[#0a0a0a] border-[#1a1a1a] hover:bg-[#0f0f0f]",
                            !formData.start_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.start_date ? format(formData.start_date, "MMM d, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-[#0a0a0a] border-[#1a1a1a]">
                        <Calendar
                          mode="single"
                          selected={formData.start_date}
                          onSelect={(date) => setFormData({ ...formData, start_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white tracking-[-0.5px]">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-11 justify-start text-left font-normal bg-[#0a0a0a] border-[#1a1a1a] hover:bg-[#0f0f0f]",
                            !formData.end_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.end_date ? format(formData.end_date, "MMM d, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-[#0a0a0a] border-[#1a1a1a]">
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

                {/* Banner Upload */}
                <div className="space-y-2">
                  <Label className="text-white tracking-[-0.5px]">Campaign Banner</Label>
                  {bannerPreview ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={bannerPreview} alt="Banner preview" className="w-full h-32 object-cover" />
                      <button
                        type="button"
                        onClick={removeBanner}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-[#1a1a1a] hover:border-[#2a2a2a] bg-[#0a0a0a] cursor-pointer transition-colors"
                    >
                      <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click to upload banner</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white tracking-[-0.5px]">Blueprint Embed URL</Label>
                  <Input
                    value={formData.blueprint_embed_url}
                    onChange={(e) => setFormData({ ...formData, blueprint_embed_url: e.target.value })}
                    placeholder="https://virality.cc/resources/your-guidelines"
                    className="h-11 bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-muted-foreground/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Will be embedded as an iframe on the public boost page
                  </p>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-white tracking-[-0.5px]">Campaign Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "draft" | "active") => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="h-11 bg-[#0a0a0a] border-[#1a1a1a] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0a] border-[#1a1a1a]">
                      <SelectItem value="active">Active (visible to creators)</SelectItem>
                      <SelectItem value="draft">Draft (not visible)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-[#1a1a1a] bg-[#050505]">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={currentStep === 1 ? () => onOpenChange(false) : handleBack}
                className="text-muted-foreground hover:text-white"
              >
                {currentStep === 1 ? (
                  "Cancel"
                ) : (
                  <>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </>
                )}
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={creating} className="gap-2">
                  {creating ? "Creating..." : "Create Boost Campaign"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}