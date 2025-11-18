import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Upload, DollarSign, Video, Users, FileText, Target, CheckSquare } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

interface CreateBountyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onSuccess: () => void;
}

export function CreateBountyDialog({ open, onOpenChange, brandId, onSuccess }: CreateBountyDialogProps) {
  const [creating, setCreating] = useState(false);
  const [bannerFile, setbannerFile] = useState<File | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
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

  const platforms = [
    { id: "tiktok", name: "TikTok" },
    { id: "instagram", name: "Instagram" },
    { id: "youtube", name: "YouTube" },
    { id: "twitter", name: "Twitter/X" }
  ];

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
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

      // Upload banner if provided
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

      // Combine all requirements into content_style_requirements
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

      toast.success("Bounty campaign created successfully!");
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
      setbannerFile(null);
      setSelectedPlatforms([]);
    } catch (error: any) {
      console.error("Error creating boost:", error);
      toast.error(error.message || "Failed to create boost campaign");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-popover border">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Boost Campaign</DialogTitle>
          <DialogDescription>
            Create a retainer-based campaign where creators apply for monthly positions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Campaign Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Monthly Content Creator Position"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this boost entails..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <Separator />

          {/* Platforms */}
          <div>
            <Label className="mb-3 block">Required Platforms *</Label>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map((platform) => (
                <div
                  key={platform.id}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={platform.id}
                    checked={selectedPlatforms.includes(platform.id)}
                    onCheckedChange={() => togglePlatform(platform.id)}
                  />
                  <label
                    htmlFor={platform.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {platform.name}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Select all platforms where content will be posted
            </p>
          </div>

          <Separator />

          {/* Compensation & Requirements */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Compensation Details
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthly_retainer">Monthly Retainer *</Label>
                <Input
                  id="monthly_retainer"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_retainer}
                  onChange={(e) => setFormData({ ...formData, monthly_retainer: e.target.value })}
                  placeholder="500.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="payment_schedule">Payment Schedule *</Label>
                <Select
                  value={formData.payment_schedule}
                  onValueChange={(value: any) => setFormData({ ...formData, payment_schedule: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Content Requirements */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Video className="h-4 w-4" />
              Content Requirements
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="videos_per_month">Videos Per Month *</Label>
                <Input
                  id="videos_per_month"
                  type="number"
                  min="1"
                  value={formData.videos_per_month}
                  onChange={(e) => setFormData({ ...formData, videos_per_month: e.target.value })}
                  placeholder="4"
                  required
                />
              </div>

              <div>
                <Label htmlFor="max_creators">Maximum Creators *</Label>
                <Input
                  id="max_creators"
                  type="number"
                  min="1"
                  value={formData.max_accepted_creators}
                  onChange={(e) => setFormData({ ...formData, max_accepted_creators: e.target.value })}
                  placeholder="5"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Number of creators to hire
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="content_style">Content Style & Format *</Label>
              <Textarea
                id="content_style"
                value={formData.content_style_requirements}
                onChange={(e) => setFormData({ ...formData, content_style_requirements: e.target.value })}
                placeholder="Describe content style, format, themes, tone, and any specific creative requirements..."
                className="min-h-[100px]"
                required
              />
            </div>

            <div>
              <Label htmlFor="posting_frequency">Posting Frequency</Label>
              <Input
                id="posting_frequency"
                value={formData.posting_frequency}
                onChange={(e) => setFormData({ ...formData, posting_frequency: e.target.value })}
                placeholder="e.g., 1 video per week, Monday-Wednesday preferred"
              />
            </div>

            <div>
              <Label htmlFor="review_process">Content Review Process</Label>
              <Textarea
                id="review_process"
                value={formData.review_process}
                onChange={(e) => setFormData({ ...formData, review_process: e.target.value })}
                placeholder="Describe how content will be reviewed and approved before posting..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          <Separator />

          {/* Creator Requirements */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" />
              Creator Requirements
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_followers">Minimum Followers</Label>
                <Input
                  id="min_followers"
                  type="number"
                  min="0"
                  value={formData.min_followers}
                  onChange={(e) => setFormData({ ...formData, min_followers: e.target.value })}
                  placeholder="10000"
                />
              </div>

              <div>
                <Label htmlFor="max_followers">Maximum Followers</Label>
                <Input
                  id="max_followers"
                  type="number"
                  min="0"
                  value={formData.max_followers}
                  onChange={(e) => setFormData({ ...formData, max_followers: e.target.value })}
                  placeholder="100000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for no limit
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="additional_requirements">Additional Requirements</Label>
              <Textarea
                id="additional_requirements"
                value={formData.additional_requirements}
                onChange={(e) => setFormData({ ...formData, additional_requirements: e.target.value })}
                placeholder="Any other requirements (location, language, equipment, previous experience, etc.)"
                className="min-h-[80px]"
              />
            </div>

            <div>
              <Label htmlFor="blueprint_embed_url">Blueprint Embed URL</Label>
              <Input
                id="blueprint_embed_url"
                value={formData.blueprint_embed_url}
                onChange={(e) => setFormData({ ...formData, blueprint_embed_url: e.target.value })}
                placeholder="https://virality.cc/resources/your-guidelines"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Full URL with https:// - will be embedded as an iframe on the public boost page
              </p>
            </div>
          </div>

          <Separator />

          {/* Campaign Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Campaign Settings
            </h3>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_date ? format(formData.start_date, "MMM d, yyyy") : "Select date"}
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

              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.end_date ? format(formData.end_date, "MMM d, yyyy") : "Select date"}
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

            {/* Banner Upload */}
            <div>
              <Label className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Campaign Banner
              </Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setbannerFile(e.target.files?.[0] || null)}
              />
              {bannerFile && (
                <p className="text-xs text-success mt-1">✓ {bannerFile.name} selected</p>
              )}
            </div>

            {/* Status */}
            <div>
              <Label>Campaign Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "draft" | "active") => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (not visible to creators)</SelectItem>
                  <SelectItem value="active">Active (visible to creators)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Boost Campaign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}