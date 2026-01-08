import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Upload, Check, Trash2, X, Plus, Pause, Play, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ApplicationQuestionsEditor } from "./ApplicationQuestionsEditor";
import { ApplicationQuestion } from "@/types/applicationQuestions";
import { PublicFormSettingsSection } from "./PublicFormSettingsSection";
import { PublicFormSettings, DEFAULT_PUBLIC_FORM_SETTINGS } from "@/types/publicFormSettings";

interface Blueprint {
  id: string;
  title: string;
}

interface EditBountyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bountyId: string;
  onSuccess: () => void;
}

interface BountyData {
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements: string;
  max_accepted_creators: number;
  start_date: string | null;
  end_date: string | null;
  banner_url: string | null;
  status: string;
  blueprint_embed_url: string | null;
  blueprint_id: string | null;
  brand_id: string;
  is_private: boolean;
  tags: string[] | null;
  shortimize_collection_name: string | null;
  application_questions: ApplicationQuestion[] | null;
  slug: string | null;
  public_application_enabled: boolean;
  public_form_settings: PublicFormSettings | null;
}

const labelStyle = { fontFamily: 'Inter', letterSpacing: '-0.5px' } as const;
const inputStyle = { fontFamily: 'Inter', letterSpacing: '-0.5px' } as const;

export function EditBountyDialog({ open, onOpenChange, bountyId, onSuccess }: EditBountyDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [deleteBlockReason, setDeleteBlockReason] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState<BountyData>({
    title: "",
    description: "",
    monthly_retainer: 0,
    videos_per_month: 0,
    content_style_requirements: "",
    max_accepted_creators: 0,
    start_date: null,
    end_date: null,
    banner_url: null,
    status: "active",
    blueprint_embed_url: null,
    blueprint_id: null,
    brand_id: "",
    is_private: false,
    tags: null,
    shortimize_collection_name: null,
    application_questions: null,
    slug: null,
    public_application_enabled: false,
    public_form_settings: null
  });
  const [publicFormEnabled, setPublicFormEnabled] = useState(false);
  const [publicFormSettings, setPublicFormSettings] = useState<PublicFormSettings>(DEFAULT_PUBLIC_FORM_SETTINGS);
  const [applicationQuestions, setApplicationQuestions] = useState<ApplicationQuestion[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (open && bountyId) {
      fetchBountyData();
    }
  }, [open, bountyId]);

  const fetchBountyData = async () => {
    try {
      const { data, error } = await supabase
        .from("bounty_campaigns")
        .select("*")
        .eq("id", bountyId)
        .single();

      if (error) throw error;

      setFormData(data);
      setSelectedBlueprintId(data.blueprint_id || "none");
      if (data.start_date) setStartDate(new Date(data.start_date));
      if (data.end_date) setEndDate(new Date(data.end_date));
      setTags(data.tags || []);
      setApplicationQuestions(data.application_questions || []);
      setPublicFormEnabled(data.public_application_enabled || false);
      setPublicFormSettings(data.public_form_settings || DEFAULT_PUBLIC_FORM_SETTINGS);
      
      // Fetch blueprints and subscription status for the brand
      if (data.brand_id) {
        const [{ data: bpData }, { data: brandData }] = await Promise.all([
          supabase
            .from('blueprints')
            .select('id, title')
            .eq('brand_id', data.brand_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('brands')
            .select('subscription_status')
            .eq('id', data.brand_id)
            .single()
        ]);
        setBlueprints(bpData || []);
        setSubscriptionStatus(brandData?.subscription_status || null);
      }

      // Check if boost can be deleted
      const [{ count: pendingCount }, { count: acceptedCount }] = await Promise.all([
        supabase
          .from('bounty_applications')
          .select('*', { count: 'exact', head: true })
          .eq('bounty_campaign_id', bountyId)
          .eq('status', 'pending'),
        supabase
          .from('bounty_applications')
          .select('*', { count: 'exact', head: true })
          .eq('bounty_campaign_id', bountyId)
          .eq('status', 'accepted')
      ]);

      if ((pendingCount ?? 0) > 0) {
        setCanDelete(false);
        setDeleteBlockReason(`Cannot delete: ${pendingCount} pending application(s)`);
      } else if ((acceptedCount ?? 0) > 0) {
        setCanDelete(false);
        setDeleteBlockReason(`Cannot delete: ${acceptedCount} active creator(s)`);
      } else {
        setCanDelete(true);
        setDeleteBlockReason(null);
      }
    } catch (error: any) {
      console.error("Error fetching bounty:", error);
      toast.error("Failed to load bounty data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.monthly_retainer || !formData.videos_per_month || 
        !formData.content_style_requirements || !formData.max_accepted_creators) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      let banner_url = formData.banner_url;

      // Upload new banner if provided
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `${bountyId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('campaign-banners')
          .upload(fileName, bannerFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('campaign-banners')
          .getPublicUrl(fileName);
        banner_url = publicUrl;
      }

      const { error } = await supabase
        .from('bounty_campaigns')
        .update({
          title: formData.title,
          description: formData.description || null,
          monthly_retainer: formData.monthly_retainer,
          videos_per_month: formData.videos_per_month,
          content_style_requirements: formData.content_style_requirements,
          max_accepted_creators: formData.max_accepted_creators,
          start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          banner_url,
          status: formData.status,
          blueprint_embed_url: formData.blueprint_embed_url || null,
          blueprint_id: selectedBlueprintId && selectedBlueprintId !== "none" ? selectedBlueprintId : null,
          is_private: formData.is_private,
          tags: tags.length > 0 ? tags : null,
          shortimize_collection_name: formData.shortimize_collection_name || null,
          application_questions: applicationQuestions.length > 0 ? applicationQuestions as unknown as any : null,
          public_application_enabled: publicFormEnabled,
          public_form_settings: publicFormSettings as unknown as any
        })
        .eq('id', bountyId);

      if (error) throw error;

      toast.success("Boost campaign updated successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating boost:", error);
      toast.error(error.message || "Failed to update boost campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error(deleteBlockReason || "Cannot delete this boost");
      return;
    }

    setDeleting(true);
    try {
      // Delete any rejected applications first
      await supabase
        .from('bounty_applications')
        .delete()
        .eq('bounty_campaign_id', bountyId)
        .eq('status', 'rejected');

      // Delete the boost
      const { error } = await supabase
        .from('bounty_campaigns')
        .delete()
        .eq('id', bountyId);

      if (error) throw error;

      toast.success("Boost deleted successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error deleting boost:", error);
      toast.error(error.message || "Failed to delete boost");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto border-0 bg-background p-0">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-semibold" style={labelStyle}>
              Edit Boost
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label style={labelStyle} className="text-xs text-muted-foreground">Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Campaign title"
                  className="border-0 bg-muted/50 h-11"
                  style={inputStyle}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label style={labelStyle} className="text-xs text-muted-foreground">Description</Label>
                <Textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief overview..."
                  className="border-0 bg-muted/50 min-h-[80px] resize-none"
                  style={inputStyle}
                />
              </div>

              {/* Application Questions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  <Label style={labelStyle} className="text-xs text-muted-foreground">Application Questions</Label>
                  <span className="text-xs text-muted-foreground" style={labelStyle}>(Optional)</span>
                </div>

                <ApplicationQuestionsEditor
                  questions={applicationQuestions}
                  onChange={setApplicationQuestions}
                  maxQuestions={10}
                />

                <p className="text-xs text-muted-foreground" style={labelStyle}>
                  Add text, dropdown, video, or image questions for applicants.
                </p>
              </div>

              {/* Banner */}
              <div className="space-y-2">
                <Label style={labelStyle} className="text-xs text-muted-foreground">Banner</Label>
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                    className="border-0 bg-muted/50 h-11 file:bg-transparent file:border-0 file:text-sm"
                    style={inputStyle}
                  />
                  <Upload className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                {formData.banner_url && !bannerFile && (
                  <p className="text-xs text-muted-foreground" style={labelStyle}>Current banner uploaded</p>
                )}
              </div>

              {/* Blueprint */}
              <div className="space-y-2">
                <Label style={labelStyle} className="text-xs text-muted-foreground">Blueprint</Label>
                <Select value={selectedBlueprintId} onValueChange={setSelectedBlueprintId}>
                  <SelectTrigger className="border-0 bg-muted/50 h-11" style={inputStyle}>
                    <SelectValue placeholder="Select a blueprint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" style={inputStyle}>No blueprint</SelectItem>
                    {blueprints.map((bp) => (
                      <SelectItem key={bp.id} value={bp.id} style={inputStyle}>{bp.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground" style={labelStyle}>
                  Creators will see this blueprint when viewing directions
                </p>
              </div>

              {/* Shortimize Video Collection */}
              <div className="space-y-2">
                <Label style={labelStyle} className="text-xs text-muted-foreground">Video Tracking Collection</Label>
                <Input
                  value={formData.shortimize_collection_name || ""}
                  onChange={(e) => setFormData({ ...formData, shortimize_collection_name: e.target.value })}
                  placeholder="e.g., Boost Videos"
                  className="border-0 bg-muted/50 h-11"
                  style={inputStyle}
                />
                <p className="text-xs text-muted-foreground" style={labelStyle}>
                  Approved videos will be automatically tracked in this Shortimize collection
                </p>
              </div>

              {/* Timeline Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label style={labelStyle} className="text-xs text-muted-foreground">Start date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-left font-normal h-11 bg-muted/50 hover:bg-muted/70 border-0",
                          !startDate && "text-muted-foreground"
                        )}
                        style={inputStyle}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label style={labelStyle} className="text-xs text-muted-foreground">End date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-left font-normal h-11 bg-muted/50 hover:bg-muted/70 border-0",
                          !endDate && "text-muted-foreground"
                        )}
                        style={inputStyle}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label style={labelStyle} className="text-xs text-muted-foreground">Status</Label>
                {formData.status === 'draft' && subscriptionStatus !== 'active' ? (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm font-medium" style={labelStyle}>Draft Mode</p>
                    <p className="text-xs text-muted-foreground" style={labelStyle}>
                      Activate your subscription to launch this boost.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={formData.status}
                    onValueChange={async (value) => {
                      // Prevent changing to active if no subscription
                      if (value === 'active' && subscriptionStatus !== 'active') {
                        toast.error('Activate your subscription to launch this boost');
                        return;
                      }

                      const previousStatus = formData.status;

                      // Handle pausing - auto-waitlist pending applications
                      if (value === 'paused' && previousStatus !== 'paused') {
                        const { error: waitlistError } = await (supabase as any)
                          .from('bounty_applications')
                          .update({
                            status: 'waitlisted',
                            auto_waitlisted_from_pause: true
                          })
                          .eq('bounty_campaign_id', bountyId)
                          .eq('status', 'pending');

                        if (waitlistError) {
                          console.error('Error auto-waitlisting applications:', waitlistError);
                        }
                      }

                      // Handle resuming - restore auto-waitlisted applications to pending
                      if (previousStatus === 'paused' && value === 'active') {
                        const { error: restoreError } = await (supabase as any)
                          .from('bounty_applications')
                          .update({
                            status: 'pending',
                            auto_waitlisted_from_pause: false
                          })
                          .eq('bounty_campaign_id', bountyId)
                          .eq('auto_waitlisted_from_pause', true);

                        if (restoreError) {
                          console.error('Error restoring applications:', restoreError);
                        }
                      }

                      setFormData({ ...formData, status: value });
                    }}
                  >
                    <SelectTrigger className="border-0 bg-muted/50 h-11" style={inputStyle}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft" style={inputStyle}>Draft</SelectItem>
                      <SelectItem value="active" style={inputStyle} disabled={subscriptionStatus !== 'active'}>
                        Active {subscriptionStatus !== 'active' && '(Subscription required)'}
                      </SelectItem>
                      <SelectItem value="paused" style={inputStyle}>
                        <span className="flex items-center gap-2">
                          <Pause className="h-3 w-3" />
                          Paused
                        </span>
                      </SelectItem>
                      <SelectItem value="ended" style={inputStyle}>Ended</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label style={labelStyle} className="text-xs text-muted-foreground">Tags</Label>
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
                    className="border-0 bg-muted/50 h-11 flex-1"
                    style={inputStyle}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 px-3 bg-muted/50 hover:bg-muted"
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
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="pl-2 pr-1 py-1 gap-1 text-xs"
                        style={inputStyle}
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
                <p className="text-xs text-muted-foreground" style={labelStyle}>
                  Add tags to help categorize this boost (e.g., "Gaming", "Tech", "Lifestyle")
                </p>
              </div>

              {/* Private Toggle */}
              <div
                onClick={() => setFormData({ ...formData, is_private: !formData.is_private })}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${formData.is_private ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                  {formData.is_private && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-medium" style={labelStyle}>Private Boost</p>
                  <p className="text-xs text-muted-foreground" style={labelStyle}>Only accessible via direct link</p>
                </div>
              </div>

              {/* Public Form Settings */}
              <PublicFormSettingsSection
                enabled={publicFormEnabled}
                settings={publicFormSettings}
                onEnabledChange={setPublicFormEnabled}
                onSettingsChange={setPublicFormSettings}
                boostSlug={formData.slug}
              />

              {/* Actions */}
              <div className="flex gap-2 justify-between pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={saving || deleting}
                      className={cn(
                        "h-10 text-destructive hover:text-destructive hover:bg-destructive/10",
                        !canDelete && "opacity-50 cursor-not-allowed"
                      )}
                      style={labelStyle}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle style={labelStyle}>Delete Boost</AlertDialogTitle>
                      <AlertDialogDescription style={labelStyle}>
                        {canDelete 
                          ? "Are you sure you want to delete this boost? This action cannot be undone."
                          : deleteBlockReason}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel style={labelStyle}>Cancel</AlertDialogCancel>
                      {canDelete && (
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          style={labelStyle}
                        >
                          {deleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      )}
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    disabled={saving || deleting}
                    className="h-10"
                    style={labelStyle}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving || deleting} 
                    className="h-10 bg-foreground text-background hover:bg-foreground/90"
                    style={labelStyle}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
