import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Upload, Lock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

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
}

const labelStyle = { fontFamily: 'Inter', letterSpacing: '-0.5px' } as const;
const inputStyle = { fontFamily: 'Inter', letterSpacing: '-0.5px' } as const;

export function EditBountyDialog({ open, onOpenChange, bountyId, onSuccess }: EditBountyDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      setSelectedBlueprintId(data.blueprint_id || "none");
      if (data.start_date) setStartDate(new Date(data.start_date));
      if (data.end_date) setEndDate(new Date(data.end_date));
      
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

              {/* Compensation Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label style={labelStyle} className="text-xs text-muted-foreground">Monthly ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monthly_retainer}
                    onChange={(e) => setFormData({ ...formData, monthly_retainer: parseFloat(e.target.value) })}
                    className="border-0 bg-muted/50 h-11"
                    style={inputStyle}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label style={labelStyle} className="text-xs text-muted-foreground">Videos/month</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.videos_per_month}
                    onChange={(e) => setFormData({ ...formData, videos_per_month: parseInt(e.target.value) })}
                    className="border-0 bg-muted/50 h-11"
                    style={inputStyle}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label style={labelStyle} className="text-xs text-muted-foreground">Max creators</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.max_accepted_creators}
                    onChange={(e) => setFormData({ ...formData, max_accepted_creators: parseInt(e.target.value) })}
                    className="border-0 bg-muted/50 h-11"
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              {/* Content Requirements */}
              <div className="space-y-2">
                <Label style={labelStyle} className="text-xs text-muted-foreground">Content requirements</Label>
                <Textarea
                  value={formData.content_style_requirements}
                  onChange={(e) => setFormData({ ...formData, content_style_requirements: e.target.value })}
                  placeholder="Describe content style, format, themes..."
                  className="border-0 bg-muted/50 min-h-[80px] resize-none"
                  style={inputStyle}
                  required
                />
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
                    onValueChange={(value) => {
                      // Prevent changing to active if no subscription
                      if (value === 'active' && subscriptionStatus !== 'active') {
                        toast.error('Activate your subscription to launch this boost');
                        return;
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
                      <SelectItem value="ended" style={inputStyle}>Ended</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Private Toggle */}
              <div 
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30 cursor-pointer"
                onClick={() => setFormData({ ...formData, is_private: !formData.is_private })}
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium" style={labelStyle}>Private</p>
                    <p className="text-xs text-muted-foreground" style={labelStyle}>Only accessible via direct link</p>
                  </div>
                </div>
                <Checkbox
                  checked={formData.is_private}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked === true })}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="h-10"
                  style={labelStyle}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving} 
                  className="h-10 bg-foreground text-background hover:bg-foreground/90"
                  style={labelStyle}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
