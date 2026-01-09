import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Creator {
  id: string;
  username: string | null;
  full_name: string | null;
}

interface CreateCampaignLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  campaignId?: string;
  boostId?: string;
  onSuccess: () => void;
}

export function CreateCampaignLinkDialog({
  open,
  onOpenChange,
  brandId,
  campaignId,
  boostId,
  onSuccess,
}: CreateCampaignLinkDialogProps) {
  const [loading, setLoading] = useState(false);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [utmOpen, setUtmOpen] = useState(false);

  const [formData, setFormData] = useState({
    destinationUrl: "",
    title: "",
    description: "",
    assignedTo: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
  });

  useEffect(() => {
    if (open) {
      fetchCreators();
    }
  }, [open, campaignId, boostId]);

  const fetchCreators = async () => {
    try {
      // Fetch creators who are in the campaign/boost
      if (campaignId) {
        const { data } = await supabase
          .from("social_account_campaigns")
          .select(`
            social_accounts!inner(
              user_id,
              profiles:user_id(id, username, full_name)
            )
          `)
          .eq("campaign_id", campaignId)
          .eq("status", "active");

        const uniqueCreators = new Map<string, Creator>();
        data?.forEach((item: any) => {
          const profile = item.social_accounts?.profiles;
          if (profile && !uniqueCreators.has(profile.id)) {
            uniqueCreators.set(profile.id, profile);
          }
        });
        setCreators(Array.from(uniqueCreators.values()));
      } else if (boostId) {
        const { data } = await supabase
          .from("bounty_applications")
          .select(`
            user_id,
            profiles:user_id(id, username, full_name)
          `)
          .eq("bounty_campaign_id", boostId)
          .eq("status", "accepted");

        const uniqueCreators = new Map<string, Creator>();
        data?.forEach((item: any) => {
          const profile = item.profiles;
          if (profile && !uniqueCreators.has(profile.id)) {
            uniqueCreators.set(profile.id, profile);
          }
        });
        setCreators(Array.from(uniqueCreators.values()));
      }
    } catch (error) {
      console.error("Error fetching creators:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.destinationUrl) {
      toast.error("Destination URL is required");
      return;
    }

    // Validate URL
    try {
      new URL(formData.destinationUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("create-campaign-link", {
        body: {
          brandId,
          campaignId: campaignId || null,
          boostId: boostId || null,
          assignedTo: formData.assignedTo || null,
          destinationUrl: formData.destinationUrl,
          title: formData.title || null,
          description: formData.description || null,
          utmSource: formData.utmSource || null,
          utmMedium: formData.utmMedium || null,
          utmCampaign: formData.utmCampaign || null,
          utmContent: formData.utmContent || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success("Link created successfully");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating link:", error);
      toast.error(error.message || "Failed to create link");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      destinationUrl: "",
      title: "",
      description: "",
      assignedTo: "",
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      utmContent: "",
    });
    setUtmOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Campaign Link</DialogTitle>
          <DialogDescription>
            Create a trackable link to share with creators
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="destinationUrl">Destination URL *</Label>
            <Input
              id="destinationUrl"
              type="url"
              placeholder="https://example.com/product"
              value={formData.destinationUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, destinationUrl: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Link Title</Label>
            <Input
              id="title"
              placeholder="e.g., Holiday Sale Link"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description for this link..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          {creators.length > 0 && (
            <div className="space-y-2">
              <Label>Assign to Creator</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a creator (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      {creator.username || creator.full_name || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* UTM Parameters */}
          <Collapsible open={utmOpen} onOpenChange={setUtmOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                UTM Parameters
                <ChevronDown className={`h-4 w-4 transition-transform ${utmOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="utmSource" className="text-xs">Source</Label>
                  <Input
                    id="utmSource"
                    placeholder="e.g., instagram"
                    value={formData.utmSource}
                    onChange={(e) => setFormData(prev => ({ ...prev, utmSource: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="utmMedium" className="text-xs">Medium</Label>
                  <Input
                    id="utmMedium"
                    placeholder="e.g., social"
                    value={formData.utmMedium}
                    onChange={(e) => setFormData(prev => ({ ...prev, utmMedium: e.target.value }))}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="utmCampaign" className="text-xs">Campaign</Label>
                  <Input
                    id="utmCampaign"
                    placeholder="e.g., holiday_sale"
                    value={formData.utmCampaign}
                    onChange={(e) => setFormData(prev => ({ ...prev, utmCampaign: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="utmContent" className="text-xs">Content</Label>
                  <Input
                    id="utmContent"
                    placeholder="e.g., banner_ad"
                    value={formData.utmContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, utmContent: e.target.value }))}
                    className="h-8"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
