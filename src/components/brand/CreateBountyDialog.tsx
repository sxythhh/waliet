import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Upload, DollarSign, Video, Users, FileText } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateBountyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onSuccess: () => void;
}

export function CreateBountyDialog({ open, onOpenChange, brandId, onSuccess }: CreateBountyDialogProps) {
  const [creating, setCreating] = useState(false);
  const [bannerFile, setbannerFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    monthly_retainer: "",
    videos_per_month: "",
    content_style_requirements: "",
    max_accepted_creators: "",
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    status: "active" as "draft" | "active"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.monthly_retainer || !formData.videos_per_month || 
        !formData.content_style_requirements || !formData.max_accepted_creators) {
      toast.error("Please fill in all required fields");
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

      const { error } = await supabase
        .from('bounty_campaigns')
        .insert({
          brand_id: brandId,
          title: formData.title,
          description: formData.description || null,
          monthly_retainer: parseFloat(formData.monthly_retainer),
          videos_per_month: parseInt(formData.videos_per_month),
          content_style_requirements: formData.content_style_requirements,
          max_accepted_creators: parseInt(formData.max_accepted_creators),
          start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : null,
          end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
          banner_url,
          status: formData.status
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
        status: "active"
      });
      setbannerFile(null);
    } catch (error: any) {
      console.error("Error creating boost:", error);
      toast.error(error.message || "Failed to create boost campaign");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#202020] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Boost Campaign</DialogTitle>
          <DialogDescription className="text-white/60">
            Create a retainer-based campaign where creators apply for monthly positions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-white">Campaign Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Monthly Content Creator Position"
                className="bg-[#191919] border-white/10 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this boost entails..."
                className="bg-[#191919] border-white/10 text-white min-h-[100px]"
              />
            </div>
          </div>

          {/* Compensation & Requirements */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="monthly_retainer" className="text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Monthly Retainer *
              </Label>
              <Input
                id="monthly_retainer"
                type="number"
                min="0"
                step="0.01"
                value={formData.monthly_retainer}
                onChange={(e) => setFormData({ ...formData, monthly_retainer: e.target.value })}
                placeholder="500.00"
                className="bg-[#191919] border-white/10 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="videos_per_month" className="text-white flex items-center gap-2">
                <Video className="h-4 w-4" />
                Videos Per Month *
              </Label>
              <Input
                id="videos_per_month"
                type="number"
                min="1"
                value={formData.videos_per_month}
                onChange={(e) => setFormData({ ...formData, videos_per_month: e.target.value })}
                placeholder="4"
                className="bg-[#191919] border-white/10 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="content_style" className="text-white flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content Style Requirements *
            </Label>
            <Textarea
              id="content_style"
              value={formData.content_style_requirements}
              onChange={(e) => setFormData({ ...formData, content_style_requirements: e.target.value })}
              placeholder="Describe the content style, format, themes, and any specific requirements..."
              className="bg-[#191919] border-white/10 text-white min-h-[120px]"
              required
            />
          </div>

          <div>
            <Label htmlFor="max_creators" className="text-white flex items-center gap-2">
              <Users className="h-4 w-4" />
              Maximum Creators to Accept *
            </Label>
            <Input
              id="max_creators"
              type="number"
              min="1"
              value={formData.max_accepted_creators}
              onChange={(e) => setFormData({ ...formData, max_accepted_creators: e.target.value })}
              placeholder="5"
              className="bg-[#191919] border-white/10 text-white"
              required
            />
            <p className="text-xs text-white/50 mt-1">
              Number of creators you plan to hire for this bounty
            </p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-[#191919] border-white/10 text-white hover:bg-white/5",
                      !formData.start_date && "text-white/40"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(formData.start_date, "MMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#2a2a2a] border-white/10">
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
              <Label className="text-white">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-[#191919] border-white/10 text-white hover:bg-white/5",
                      !formData.end_date && "text-white/40"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_date ? format(formData.end_date, "MMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#2a2a2a] border-white/10">
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
            <Label className="text-white flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Campaign Banner
            </Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setbannerFile(e.target.files?.[0] || null)}
              className="bg-[#191919] border-white/10 text-white"
            />
            {bannerFile && (
              <p className="text-xs text-green-500 mt-1">✓ {bannerFile.name} selected</p>
            )}
          </div>

          {/* Status */}
          <div>
            <Label className="text-white">Campaign Status</Label>
            <Select value={formData.status} onValueChange={(value: "draft" | "active") => setFormData({ ...formData, status: value })}>
              <SelectTrigger className="bg-[#191919] border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-white/10">
                <SelectItem value="draft">Draft (not visible to creators)</SelectItem>
                <SelectItem value="active">Active (visible to creators)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {creating ? "Creating..." : "Create Bounty Campaign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}