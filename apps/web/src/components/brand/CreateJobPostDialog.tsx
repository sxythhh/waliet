import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, ArrowRight, Check, Lock, FileText, Plus, X, Wallet } from "lucide-react";
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

interface CreateJobPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName?: string;
  brandLogoUrl?: string;
  onSuccess?: () => void;
  initialBlueprintId?: string;
}

const STEPS = [
  { id: 1, label: "Position" },
  { id: 2, label: "Compensation" },
  { id: 3, label: "Details" }
];

const POSITION_TYPES = [
  "Video Editor",
  "Thumbnail Designer",
  "Creative Director",
  "Channel Manager",
  "YouTube Strategist",
  "Scriptwriter",
  "YouTube Producer",
  "Other"
] as const;

const AVAILABILITY_OPTIONS = [
  { value: "part_time", label: "Available for Part-time jobs" },
  { value: "full_time", label: "Available for Full-time jobs" },
  { value: "projects_gigs", label: "Available for Projects and Gigs" }
] as const;

const WORK_LOCATION_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" }
] as const;

export function CreateJobPostDialog({
  open,
  onOpenChange,
  brandId,
  brandName,
  brandLogoUrl,
  onSuccess,
  initialBlueprintId
}: CreateJobPostDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>("");
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBlueprint = blueprints.find(bp => bp.id === selectedBlueprintId);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    monthly_retainer: "",
    videos_per_month: "",
    content_style_requirements: "",
    max_accepted_creators: "1",
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    status: "active" as "draft" | "active",
    payment_schedule: "monthly" as "weekly" | "biweekly" | "monthly",
    blueprint_embed_url: "",
    is_private: false,
    application_questions: [] as string[],
    content_distribution: "creators_own_page" as "creators_own_page" | "brand_accounts",
    position_type: "" as string,
    custom_position: "" as string,
    availability_requirement: "" as string,
    work_location: "" as string
  });
  const [newQuestion, setNewQuestion] = useState("");

  useEffect(() => {
    const fetchBrandData = async () => {
      if (open && brandId) {
        setLoadingBalance(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const { data, error } = await supabase.functions.invoke('get-brand-balance', {
            body: { brand_id: brandId }
          });
          if (error) throw error;
          setAvailableBalance(data?.virality_balance || 0);

          const { data: brandData } = await supabase.from('brands')
            .select('subscription_status')
            .eq('id', brandId)
            .single();
          setSubscriptionStatus(brandData?.subscription_status || null);
        } catch (error) {
          console.error('Error fetching brand data:', error);
        } finally {
          setLoadingBalance(false);
        }
      }
    };
    fetchBrandData();
  }, [open, brandId]);

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
    const { data } = await supabase.from('blueprints')
      .select('id, title, platforms')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });
    setBlueprints(data || []);
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
      if (!formData.position_type) {
        toast.error("Please select a position type");
        return;
      }
      if (formData.position_type === 'Other' && !formData.custom_position) {
        toast.error("Please enter a position title");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.monthly_retainer) {
        toast.error("Please enter a payment amount");
        return;
      }
      const monthlyRetainer = parseFloat(formData.monthly_retainer) || 0;
      const maxCreators = parseInt(formData.max_accepted_creators, 10) || 1;
      const totalBudgetNeeded = monthlyRetainer * maxCreators;

      if (totalBudgetNeeded > availableBalance) {
        toast.error(`Total budget ($${totalBudgetNeeded.toLocaleString('en-US', { minimumFractionDigits: 2 })}) exceeds available balance of $${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.monthly_retainer || !formData.position_type) {
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

      const blueprintPlatforms = selectedBlueprint?.platforms || ['tiktok', 'instagram', 'youtube'];
      const fullRequirements = `PLATFORMS: ${blueprintPlatforms.join(", ")}`;
      const boostStatus = subscriptionStatus === 'active' ? 'active' : 'draft';

      const finalPositionType = formData.position_type === 'Other'
        ? formData.custom_position
        : formData.position_type;

      const baseSlug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
      const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

      const { error } = await supabase.from('bounty_campaigns').insert({
        brand_id: brandId,
        title: formData.title,
        description: formData.description || null,
        monthly_retainer: parseFloat(formData.monthly_retainer),
        videos_per_month: parseInt(formData.videos_per_month, 10) || 1,
        content_style_requirements: fullRequirements,
        max_accepted_creators: parseInt(formData.max_accepted_creators, 10) || 1,
        start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : null,
        end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
        banner_url,
        status: boostStatus,
        blueprint_embed_url: formData.blueprint_embed_url || null,
        blueprint_id: selectedBlueprintId && selectedBlueprintId !== "none" ? selectedBlueprintId : null,
        is_private: formData.is_private,
        application_questions: formData.application_questions.length > 0 ? formData.application_questions : null,
        content_distribution: formData.content_distribution,
        position_type: finalPositionType || null,
        availability_requirement: formData.availability_requirement || null,
        work_location: formData.work_location || null,
        slug: uniqueSlug
      });

      if (error) throw error;
      if (subscriptionStatus === 'active') {
        toast.success("Job post created and launched!");
      } else {
        toast.success("Job post saved as draft. Activate your subscription to launch it.");
      }
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating job post:", error);
      toast.error(error.message || "Failed to create job post");
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
      max_accepted_creators: "1",
      start_date: undefined,
      end_date: undefined,
      status: "active",
      payment_schedule: "monthly",
      blueprint_embed_url: "",
      is_private: false,
      application_questions: [],
      content_distribution: "creators_own_page",
      position_type: "",
      custom_position: "",
      availability_requirement: "",
      work_location: ""
    });
    setNewQuestion("");
    setBannerFile(null);
    setBannerPreview(null);
    setSelectedBlueprintId("");
    setCurrentStep(1);
  };

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setFormData({
        ...formData,
        application_questions: [...formData.application_questions, newQuestion.trim()]
      });
      setNewQuestion("");
    }
  };

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      application_questions: formData.application_questions.filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[540px] w-[95vw] max-h-[85vh] bg-background border-border p-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 py-0">
          {/* Step 1: Position */}
          {currentStep === 1 && (
            <div className="space-y-6 pt-4">
              {/* Position Type */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">What type of position is this?</Label>
                <div className="space-y-2">
                  {POSITION_TYPES.map(position => (
                    <div
                      key={position}
                      onClick={() => setFormData({
                        ...formData,
                        position_type: position,
                        custom_position: position === 'Other' ? formData.custom_position : ''
                      })}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all",
                        formData.position_type === position
                          ? "bg-primary/10 border border-primary"
                          : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        formData.position_type === position
                          ? "border-primary"
                          : "border-muted-foreground/40"
                      )}>
                        {formData.position_type === position && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">
                        {position === 'Other' ? 'I am hiring for a different position' : position}
                      </span>
                    </div>
                  ))}
                </div>

                {formData.position_type === 'Other' && (
                  <div className="pt-2">
                    <Input
                      value={formData.custom_position}
                      onChange={e => setFormData({
                        ...formData,
                        custom_position: e.target.value
                      })}
                      placeholder="Enter position title..."
                      className="h-11 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px]"
                    />
                  </div>
                )}
              </div>

              {/* Availability Requirement */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">What is the availability requirement?</Label>
                <div className="space-y-2">
                  {AVAILABILITY_OPTIONS.map(option => (
                    <div
                      key={option.value}
                      onClick={() => setFormData({
                        ...formData,
                        availability_requirement: option.value
                      })}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all",
                        formData.availability_requirement === option.value
                          ? "bg-primary/10 border border-primary"
                          : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        formData.availability_requirement === option.value
                          ? "border-primary"
                          : "border-muted-foreground/40"
                      )}>
                        {formData.availability_requirement === option.value && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Work Location */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">Work location preference</Label>
                <div className="space-y-2">
                  {WORK_LOCATION_OPTIONS.map(option => (
                    <div
                      key={option.value}
                      onClick={() => setFormData({
                        ...formData,
                        work_location: option.value
                      })}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all",
                        formData.work_location === option.value
                          ? "bg-primary/10 border border-primary"
                          : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        formData.work_location === option.value
                          ? "border-primary"
                          : "border-muted-foreground/40"
                      )}>
                        {formData.work_location === option.value && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Compensation */}
          {currentStep === 2 && (
            <div className="space-y-6 pt-4">
              {selectedBlueprint && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Using blueprint</p>
                      <p className="text-sm font-semibold text-foreground font-geist truncate">{selectedBlueprint.title}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                {/* Payment Schedule */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Payment Schedule</Label>
                  <Select
                    value={formData.payment_schedule}
                    onValueChange={(value: any) => setFormData({ ...formData, payment_schedule: value })}
                  >
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

                {/* Payment Amount */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Payment Amount</Label>
                    <div className="relative w-24">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-inter">$</span>
                      <Input
                        type="number"
                        min="10"
                        max="10000"
                        value={formData.monthly_retainer}
                        onChange={e => setFormData({ ...formData, monthly_retainer: e.target.value })}
                        placeholder="500"
                        className="pl-7 h-9 bg-muted/30 border-0 text-right pr-3 font-geist tracking-[-0.5px] text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Max Hires */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Number of Hires</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.max_accepted_creators}
                    onChange={e => setFormData({ ...formData, max_accepted_creators: e.target.value })}
                    placeholder="1"
                    className="h-11 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px]"
                  />
                </div>

                {/* Total Budget Display */}
                {(() => {
                  const monthlyRetainer = parseFloat(formData.monthly_retainer) || 0;
                  const maxCreators = parseInt(formData.max_accepted_creators, 10) || 1;
                  const totalBudget = monthlyRetainer * maxCreators;
                  const exceedsBalance = totalBudget > availableBalance;

                  return (
                    <div className={`p-4 rounded-xl ${exceedsBalance ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted/30'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Total budget needed</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-semibold font-geist tracking-[-0.5px] ${exceedsBalance ? 'text-destructive' : 'text-foreground'}`}>
                            ${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Balance: ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Blueprint Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Linked Blueprint (optional)</Label>
                  <Select value={selectedBlueprintId} onValueChange={setSelectedBlueprintId}>
                    <SelectTrigger className="h-11 bg-muted/30 border-0 font-inter tracking-[-0.5px]">
                      <SelectValue placeholder="Select a blueprint..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="font-inter tracking-[-0.5px]">No blueprint</SelectItem>
                      {blueprints.map(blueprint => (
                        <SelectItem key={blueprint.id} value={blueprint.id} className="font-inter tracking-[-0.5px]">
                          {blueprint.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {currentStep === 3 && (
            <div className="space-y-6 pt-4">
              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Job Title</Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Video Editor for Gaming Channel"
                  className="h-11 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the role and responsibilities..."
                  className="min-h-[120px] bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px] resize-none"
                />
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">Private Job Post</p>
                    <p className="text-xs text-muted-foreground">Only accessible via direct link</p>
                  </div>
                </div>
                <Switch
                  checked={formData.is_private}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked })}
                />
              </div>

              {/* Application Questions */}
              <div className="space-y-3">
                <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Application Questions (optional)</Label>
                <div className="space-y-2">
                  {formData.application_questions.map((question, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                      <span className="flex-1 text-sm text-foreground font-inter tracking-[-0.5px]">{question}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeQuestion(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newQuestion}
                      onChange={e => setNewQuestion(e.target.value)}
                      placeholder="Add a question for applicants..."
                      className="h-10 bg-muted/30 border-0 font-inter tracking-[-0.5px]"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={addQuestion}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Start Date (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-11 bg-muted/30 border-0",
                          !formData.start_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? format(formData.start_date, "MMM d, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.start_date}
                        onSelect={(date) => setFormData({ ...formData, start_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">End Date (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-11 bg-muted/30 border-0",
                          !formData.end_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_date ? format(formData.end_date, "MMM d, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.end_date}
                        onSelect={(date) => setFormData({ ...formData, end_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border bg-background">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep > step.id
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                )}>
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "w-8 h-0.5 transition-all",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => currentStep === 1 ? onOpenChange(false) : handleBack()}
              className="font-inter tracking-[-0.5px]"
            >
              {currentStep === 1 ? "Cancel" : "Back"}
            </Button>

            {currentStep < 3 ? (
              <Button onClick={handleNext} className="gap-2 font-inter tracking-[-0.5px]">
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={creating} className="gap-2 font-inter tracking-[-0.5px]">
                {creating ? "Creating..." : "Create Job Post"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
