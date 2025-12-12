import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Upload, DollarSign, Video, Users, FileText, Lock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

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
  is_private: boolean;
}

export function EditBountyDialog({ open, onOpenChange, bountyId, onSuccess }: EditBountyDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
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
    is_private: false
  });
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

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
      if (data.start_date) setStartDate(new Date(data.start_date));
      if (data.end_date) setEndDate(new Date(data.end_date));
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
          is_private: formData.is_private
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Boost Campaign</DialogTitle>
          <DialogDescription>
            Update your boost campaign details
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Campaign Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Long-term Creator Partnership"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief overview of your boost campaign..."
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="banner">Campaign Banner</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="banner"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {formData.banner_url && !bannerFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current banner uploaded
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Compensation */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Compensation & Deliverables
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthly_retainer">Monthly Retainer ($) *</Label>
                  <Input
                    id="monthly_retainer"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monthly_retainer}
                    onChange={(e) => setFormData({ ...formData, monthly_retainer: parseFloat(e.target.value) })}
                    placeholder="500"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="videos_per_month">Videos Per Month *</Label>
                  <Input
                    id="videos_per_month"
                    type="number"
                    min="1"
                    value={formData.videos_per_month}
                    onChange={(e) => setFormData({ ...formData, videos_per_month: parseInt(e.target.value) })}
                    placeholder="10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="max_accepted_creators">Maximum Creators *</Label>
                <Input
                  id="max_accepted_creators"
                  type="number"
                  min="1"
                  value={formData.max_accepted_creators}
                  onChange={(e) => setFormData({ ...formData, max_accepted_creators: parseInt(e.target.value) })}
                  placeholder="5"
                  required
                />
              </div>
            </div>

            <Separator />

            {/* Content Requirements */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Content Requirements
              </h3>

              <div>
                <Label htmlFor="content_style">Content Style & Format *</Label>
                <Textarea
                  id="content_style"
                  value={formData.content_style_requirements}
                  onChange={(e) => setFormData({ ...formData, content_style_requirements: e.target.value })}
                  placeholder="Describe content style, format, themes, tone..."
                  className="min-h-[100px]"
                  required
                />
              </div>

              <div>
                <Label htmlFor="blueprint_embed_url">Blueprint Embed URL</Label>
                <Input
                  id="blueprint_embed_url"
                  value={formData.blueprint_embed_url || ""}
                  onChange={(e) => setFormData({ ...formData, blueprint_embed_url: e.target.value })}
                  placeholder="https://virality.cc/resources/your-guidelines"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Full URL with https:// - will be embedded as an iframe on the public boost page
                </p>
              </div>
            </div>

            <Separator />

            {/* Timeline */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Campaign Timeline
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
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
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
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
            </div>

            <Separator />

            {/* Private Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/10">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Private Boost</p>
                  <p className="text-xs text-muted-foreground">Only accessible via direct link</p>
                </div>
              </div>
              <Checkbox
                checked={formData.is_private}
                onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked === true })}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
