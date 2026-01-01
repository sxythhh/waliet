import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, ArrowRight, Check, Lock, FileText, Plus, X, HelpCircle, Wallet } from "lucide-react";
import { ViewBonusesConfig } from "./ViewBonusesConfig";
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
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
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
    content_distribution: "creators_own_page" as "creators_own_page" | "branded_accounts",
    position_type: "" as string,
    custom_position: "" as string,
    availability_requirement: "" as string,
    work_location: "" as string,
    shortimize_collection_name: "" as string,
    view_bonuses_enabled: false,
    view_bonus_tiers: [] as { bonus_type: 'milestone' | 'cpm'; view_threshold: number; min_views?: number; bonus_amount: number; cpm_rate?: number }[],
    discord_guild_id: "" as string,
    discord_role_id: "" as string,
    experience_level: "any" as "any" | "beginner" | "intermediate" | "advanced",
    content_type: "both" as "short_form" | "long_form" | "both",
    categories: [] as string[],
    skills: [] as string[]
  });
  const [newQuestion, setNewQuestion] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [skillInput, setSkillInput] = useState("");

  const CATEGORY_SUGGESTIONS = [
    "Gaming", "Tech", "Lifestyle", "Fashion", "Beauty", "Fitness", "Food",
    "Travel", "Music", "Education", "Finance", "Entertainment", "Sports",
    "Health", "Parenting", "Pets", "Home", "Auto", "Art", "Comedy"
  ];

  const SKILL_SUGGESTIONS = [
    "Video Editing", "Storytelling", "On-Camera Presence", "Voice Over",
    "Motion Graphics", "Photography", "Copywriting", "Live Streaming",
    "Product Reviews", "Tutorials", "Comedy", "ASMR", "Unboxing", "Vlogs"
  ];

  // Fetch brand's available balance and subscription status
  useEffect(() => {
    const fetchBrandData = async () => {
      if (open && brandId) {
        setLoadingBalance(true);
        try {
          const {
            data: {
              session
            }
          } = await supabase.auth.getSession();
          if (!session) return;

          // Fetch balance - use total balance (whop + virality)
          const {
            data,
            error
          } = await supabase.functions.invoke('get-brand-balance', {
            body: {
              brand_id: brandId
            }
          });
          if (error) throw error;
          // Use total balance (balance) instead of just virality_balance
          setAvailableBalance(data?.balance || 0);

          // Fetch subscription status
          const {
            data: brandData
          } = await supabase.from('brands').select('subscription_status').eq('id', brandId).single();
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

      // Calculate total cost and validate against balance
      const monthlyRetainer = parseFloat(formData.monthly_retainer) || 0;
      const maxCreators = parseInt(formData.max_accepted_creators) || 0;
      const totalBudgetNeeded = monthlyRetainer * maxCreators;
      if (totalBudgetNeeded > availableBalance) {
        toast.error(`Total budget ($${totalBudgetNeeded.toLocaleString('en-US', {
          minimumFractionDigits: 2
        })}) exceeds available balance of $${availableBalance.toLocaleString('en-US', {
          minimumFractionDigits: 2
        })}`);
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
      // Determine status based on subscription
      const boostStatus = subscriptionStatus === 'active' ? 'active' : 'draft';

      // Determine final position type
      const finalPositionType = formData.position_type === 'Other' 
        ? formData.custom_position 
        : formData.position_type;

      // Generate slug from title
      const baseSlug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
      const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

      const {
        data: bountyData,
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
        status: boostStatus,
        blueprint_embed_url: formData.blueprint_embed_url || null,
        blueprint_id: selectedBlueprintId && selectedBlueprintId !== "none" ? selectedBlueprintId : null,
        is_private: formData.is_private,
        application_questions: formData.application_questions.length > 0 ? formData.application_questions : null,
        content_distribution: formData.content_distribution,
        position_type: finalPositionType || null,
        availability_requirement: formData.availability_requirement || null,
        work_location: formData.work_location || null,
        slug: uniqueSlug,
        shortimize_collection_name: formData.shortimize_collection_name || null,
        view_bonuses_enabled: formData.view_bonuses_enabled,
        tags: tags.length > 0 ? tags : null,
        discord_guild_id: formData.discord_guild_id || null,
        discord_role_id: formData.discord_role_id || null,
        experience_level: formData.experience_level || 'any',
        content_type: formData.content_type || 'both',
        categories: formData.categories.length > 0 ? formData.categories : null,
        skills: formData.skills.length > 0 ? formData.skills : null
      }).select().single();
      if (error) throw error;

      // Insert view bonus tiers if enabled
      if (formData.view_bonuses_enabled && formData.view_bonus_tiers.length > 0 && bountyData) {
        const tiersToInsert = formData.view_bonus_tiers.map(tier => ({
          bounty_campaign_id: bountyData.id,
          view_threshold: tier.view_threshold,
          bonus_amount: tier.bonus_amount,
          bonus_type: tier.bonus_type,
          cpm_rate: tier.cpm_rate || null,
          min_views: tier.min_views || null
        }));
        
        await supabase.from('boost_view_bonuses').insert(tiersToInsert);
      }

      if (subscriptionStatus === 'active') {
        toast.success("Boost created and launched!");
      } else {
        toast.success("Boost saved as draft. Activate your subscription to launch it.");
      }
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
      content_distribution: "creators_own_page",
      position_type: "",
      custom_position: "",
      availability_requirement: "",
      work_location: "",
      shortimize_collection_name: "",
      view_bonuses_enabled: false,
      view_bonus_tiers: [],
      discord_guild_id: "",
      discord_role_id: "",
      experience_level: "any",
      content_type: "both",
      categories: [],
      skills: []
    });
    setNewQuestion("");
    setTagInput("");
    setTags([]);
    setCategoryInput("");
    setSkillInput("");
    setBannerFile(null);
    setBannerPreview(null);
    setSelectedBlueprintId("");
    setCurrentStep(1);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[540px] w-[95vw] max-h-[85vh] bg-background border-border p-0 overflow-hidden flex flex-col">

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 py-0">
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
                {/* Available Balance Display */}
                

                {/* Left Column - Compensation */}
                <div className="space-y-6">
                  {/* Compensation Card */}
                  <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
                      <h3 className="text-sm font-medium text-foreground font-inter tracking-[-0.3px]">Compensation</h3>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      {/* Payment Amount - Primary Input */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                          Payment per {formData.payment_schedule === 'weekly' ? 'week' : formData.payment_schedule === 'biweekly' ? '2 weeks' : 'month'}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-medium font-geist">$</span>
                          <Input 
                            type="number" 
                            min="10" 
                            max="10000" 
                            value={formData.monthly_retainer} 
                            onChange={e => setFormData({...formData, monthly_retainer: e.target.value})} 
                            placeholder="500" 
                            className="pl-9 h-12 border border-border/50 text-xl font-semibold font-geist tracking-[-0.5px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50" 
                          />
                        </div>
                      </div>

                      {/* Schedule Selector */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Pay frequency</Label>
                        <Select value={formData.payment_schedule} onValueChange={(value: any) => setFormData({...formData, payment_schedule: value})}>
                          <SelectTrigger className="h-10 bg-background border border-border/50 font-inter tracking-[-0.3px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly" className="font-inter tracking-[-0.3px]">Weekly</SelectItem>
                            <SelectItem value="biweekly" className="font-inter tracking-[-0.3px]">Bi-weekly</SelectItem>
                            <SelectItem value="monthly" className="font-inter tracking-[-0.3px]">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Videos & Creators Row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                            Videos required
                          </Label>
                          <Input 
                            type="number" 
                            min="1" 
                            value={formData.videos_per_month} 
                            onChange={e => setFormData({...formData, videos_per_month: e.target.value})} 
                            placeholder="4" 
                            className="h-10 bg-background border border-border/50 font-geist tracking-[-0.3px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                            Max creators
                          </Label>
                          <Input 
                            type="number" 
                            min="1" 
                            value={formData.max_accepted_creators} 
                            onChange={e => setFormData({...formData, max_accepted_creators: e.target.value})} 
                            placeholder="5" 
                            className="h-10 bg-background border border-border/50 font-geist tracking-[-0.3px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Budget Summary Card */}
                  <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
                      <h3 className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">Budget Summary</h3>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      {/* Per Video Rate */}
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Per video rate</span>
                        <span className="text-base font-semibold text-foreground font-inter tracking-[-0.5px]">
                          ${formData.monthly_retainer && formData.videos_per_month && parseInt(formData.videos_per_month) > 0 
                            ? (parseFloat(formData.monthly_retainer) / parseInt(formData.videos_per_month)).toFixed(2) 
                            : '0.00'}
                        </span>
                      </div>
                      
                      <div className="h-px bg-border/50" />
                      
                      {/* Total Budget */}
                      {(() => {
                        const monthlyRetainer = parseFloat(formData.monthly_retainer) || 0;
                        const maxCreators = parseInt(formData.max_accepted_creators) || 0;
                        const totalBudget = monthlyRetainer * maxCreators;
                        const exceedsBalance = totalBudget > availableBalance;
                        
                        return (
                          <div className={`flex items-center justify-between py-2 px-3 -mx-3 rounded-lg ${exceedsBalance ? 'bg-destructive/10' : ''}`}>
                            <div>
                              <span className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">Total budget</span>
                              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                                ${monthlyRetainer.toFixed(0)} × {maxCreators} creator{maxCreators !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`text-xl font-bold font-inter tracking-[-0.5px] ${exceedsBalance ? 'text-destructive' : 'text-foreground'}`}>
                                ${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              {exceedsBalance && (
                                <p className="text-xs text-destructive font-medium font-inter tracking-[-0.5px] mt-0.5">Exceeds balance</p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Right Column - Settings & Dates */}
                <div className="space-y-5">
                  {/* Content Distribution - Moved to top with redesign */}
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Content Distribution</Label>
                    <div className="flex rounded-lg border border-border/50 overflow-hidden bg-muted/30">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, content_distribution: "creators_own_page"})}
                        className={cn(
                          "flex-1 py-2.5 px-3 text-sm font-medium font-inter tracking-[-0.5px] transition-all",
                          formData.content_distribution === "creators_own_page"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        Creator's Page
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, content_distribution: "branded_accounts"})}
                        className={cn(
                          "flex-1 py-2.5 px-3 text-sm font-medium font-inter tracking-[-0.5px] transition-all",
                          formData.content_distribution === "branded_accounts"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        Branded Accounts
                      </button>
                    </div>
                  </div>


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

                  {/* Shortimize Collection Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Video Tracking Collection</Label>
                    <Input 
                      value={formData.shortimize_collection_name} 
                      onChange={e => setFormData({ ...formData, shortimize_collection_name: e.target.value })}
                      placeholder="e.g., Boost Videos" 
                      className="h-11 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px]" 
                    />
                    <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">Approved videos will be tracked in this Shortimize collection</p>
                  </div>

                  {/* View Bonuses Config */}
                  <div className="space-y-1.5">
                    <ViewBonusesConfig
                      tiers={formData.view_bonus_tiers}
                      onTiersChange={(newTiers) => setFormData({ 
                        ...formData, 
                        view_bonus_tiers: newTiers,
                        view_bonuses_enabled: newTiers.length > 0
                      })}
                    />
                  </div>

                  {/* Discord Integration */}
                  <div className="space-y-3 p-4 rounded-xl bg-muted/20">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Discord Integration</Label>
                      <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">(Optional)</span>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">Server ID</Label>
                        <Input 
                          value={formData.discord_guild_id} 
                          onChange={e => setFormData({ ...formData, discord_guild_id: e.target.value })}
                          placeholder="e.g., 1234567890123456789" 
                          className="h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px] text-sm" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">Role ID</Label>
                        <Input 
                          value={formData.discord_role_id} 
                          onChange={e => setFormData({ ...formData, discord_role_id: e.target.value })}
                          placeholder="e.g., 1234567890123456789" 
                          className="h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px] text-sm" 
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">
                      When an application is accepted, the user will be added to your Discord server and assigned this role. 
                      Enable Developer Mode in Discord to copy IDs (right-click → Copy ID).
                    </p>
                  </div>

                  <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setFormData({
                      ...formData,
                      is_private: !formData.is_private
                    })}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200",
                      formData.is_private 
                        ? "bg-primary border-primary" 
                        : "border-muted-foreground/40 group-hover:border-muted-foreground/60"
                    )}>
                      {formData.is_private && (
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      )}
                    </div>
                    <Label className="text-sm text-foreground cursor-pointer font-inter tracking-[-0.5px]">
                      Make this boost private
                    </Label>
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
                {formData.application_questions.length > 0 && <div className="space-y-2">
                    {formData.application_questions.map((question, index) => <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                        <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px] shrink-0">Q{index + 1}.</span>
                        <span className="text-sm text-foreground font-inter tracking-[-0.5px] flex-1">{question}</span>
                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => {
                  const updated = formData.application_questions.filter((_, i) => i !== index);
                  setFormData({
                    ...formData,
                    application_questions: updated
                  });
                }}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>)}
                  </div>}
                
                {/* Add New Question */}
                <div className="flex gap-2">
                  <Input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Enter a question for applicants..." className="h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px] flex-1" onKeyDown={e => {
                if (e.key === 'Enter' && newQuestion.trim()) {
                  e.preventDefault();
                  setFormData({
                    ...formData,
                    application_questions: [...formData.application_questions, newQuestion.trim()]
                  });
                  setNewQuestion("");
                }
              }} />
                  <Button type="button" variant="secondary" size="sm" className="h-10 px-3 font-inter tracking-[-0.5px]" disabled={!newQuestion.trim()} onClick={() => {
                if (newQuestion.trim()) {
                  setFormData({
                    ...formData,
                    application_questions: [...formData.application_questions, newQuestion.trim()]
                  });
                  setNewQuestion("");
                }
              }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  Add questions that creators must answer when applying to this boost.
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-3">
                <Label className="text-xs text-foreground font-inter tracking-[-0.5px]">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = tagInput.trim();
                        if (trimmed && !tags.includes(trimmed)) {
                          setTags([...tags, trimmed]);
                          setTagInput("");
                        }
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                    className="h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px] flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-10 px-3 font-inter tracking-[-0.5px]"
                    disabled={!tagInput.trim()}
                    onClick={() => {
                      const trimmed = tagInput.trim();
                      if (trimmed && !tags.includes(trimmed)) {
                        setTags([...tags, trimmed]);
                        setTagInput("");
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="pl-2 pr-1 py-1 gap-1 text-xs font-inter tracking-[-0.5px]"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setTags(tags.filter((_, i) => i !== index))}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  Add tags to help categorize this boost (e.g., "Gaming", "Tech", "Lifestyle")
                </p>
              </div>

              {/* Creator Requirements Section */}
              <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
                  <h3 className="text-sm font-medium text-foreground font-inter tracking-[-0.3px]">Creator Requirements</h3>
                </div>

                <div className="p-4 space-y-4">
                  {/* Experience Level & Content Type Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Experience Level</Label>
                      <Select value={formData.experience_level} onValueChange={(value: any) => setFormData({...formData, experience_level: value})}>
                        <SelectTrigger className="h-10 bg-background border border-border/50 font-inter tracking-[-0.3px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any" className="font-inter tracking-[-0.3px]">Any Level</SelectItem>
                          <SelectItem value="beginner" className="font-inter tracking-[-0.3px]">Beginner</SelectItem>
                          <SelectItem value="intermediate" className="font-inter tracking-[-0.3px]">Intermediate</SelectItem>
                          <SelectItem value="advanced" className="font-inter tracking-[-0.3px]">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Content Type</Label>
                      <Select value={formData.content_type} onValueChange={(value: any) => setFormData({...formData, content_type: value})}>
                        <SelectTrigger className="h-10 bg-background border border-border/50 font-inter tracking-[-0.3px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both" className="font-inter tracking-[-0.3px]">Any Format</SelectItem>
                          <SelectItem value="short_form" className="font-inter tracking-[-0.3px]">Short Form</SelectItem>
                          <SelectItem value="long_form" className="font-inter tracking-[-0.3px]">Long Form</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Categories / Niches</Label>
                    <div className="flex gap-2">
                      <Input
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const trimmed = categoryInput.trim();
                            if (trimmed && !formData.categories.includes(trimmed)) {
                              setFormData({...formData, categories: [...formData.categories, trimmed]});
                              setCategoryInput("");
                            }
                          }
                        }}
                        placeholder="Add category..."
                        className="h-9 bg-background border border-border/50 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.3px] flex-1 text-sm"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-9 px-2.5"
                        disabled={!categoryInput.trim()}
                        onClick={() => {
                          const trimmed = categoryInput.trim();
                          if (trimmed && !formData.categories.includes(trimmed)) {
                            setFormData({...formData, categories: [...formData.categories, trimmed]});
                            setCategoryInput("");
                          }
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {/* Quick add suggestions */}
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_SUGGESTIONS.filter(c => !formData.categories.includes(c)).slice(0, 6).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({...formData, categories: [...formData.categories, cat]})}
                          className="px-2 py-0.5 text-[10px] rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-inter tracking-[-0.3px]"
                        >
                          + {cat}
                        </button>
                      ))}
                    </div>
                    {formData.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {formData.categories.map((cat, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="pl-2 pr-1 py-0.5 gap-1 text-xs font-inter tracking-[-0.3px]"
                          >
                            {cat}
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, categories: formData.categories.filter((_, i) => i !== index)})}
                              className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Skills Needed</Label>
                    <div className="flex gap-2">
                      <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const trimmed = skillInput.trim();
                            if (trimmed && !formData.skills.includes(trimmed)) {
                              setFormData({...formData, skills: [...formData.skills, trimmed]});
                              setSkillInput("");
                            }
                          }
                        }}
                        placeholder="Add skill..."
                        className="h-9 bg-background border border-border/50 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.3px] flex-1 text-sm"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-9 px-2.5"
                        disabled={!skillInput.trim()}
                        onClick={() => {
                          const trimmed = skillInput.trim();
                          if (trimmed && !formData.skills.includes(trimmed)) {
                            setFormData({...formData, skills: [...formData.skills, trimmed]});
                            setSkillInput("");
                          }
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {/* Quick add suggestions */}
                    <div className="flex flex-wrap gap-1.5">
                      {SKILL_SUGGESTIONS.filter(s => !formData.skills.includes(s)).slice(0, 5).map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => setFormData({...formData, skills: [...formData.skills, skill]})}
                          className="px-2 py-0.5 text-[10px] rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-inter tracking-[-0.3px]"
                        >
                          + {skill}
                        </button>
                      ))}
                    </div>
                    {formData.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {formData.skills.map((skill, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="pl-2 pr-1 py-0.5 gap-1 text-xs font-inter tracking-[-0.3px]"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, skills: formData.skills.filter((_, i) => i !== index)})}
                              className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

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