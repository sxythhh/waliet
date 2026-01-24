import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Send, Clock, User } from "lucide-react";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
}

interface Creator {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  social_accounts?: SocialAccount[];
}

interface RequestAudienceInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  creator?: Creator;
  campaignId?: string;
  onSuccess?: () => void;
}

export function RequestAudienceInsightsDialog({
  open,
  onOpenChange,
  brandId,
  creator,
  campaignId,
  onSuccess
}: RequestAudienceInsightsDialogProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "tiktok":
        return <img src={tiktokLogoBlack} alt="TikTok" className="w-4 h-4" />;
      case "instagram":
        return <img src={instagramLogoBlack} alt="Instagram" className="w-4 h-4" />;
      case "youtube":
        return <img src={youtubeLogoBlack} alt="YouTube" className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    if (!creator) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No creator selected"
      });
      return;
    }

    setSending(true);
    try {
      // Check if there's already a pending request for this creator/account
      const { data: existingRequest } = await supabase
        .from('audience_insights_requests')
        .select('id')
        .eq('brand_id', brandId)
        .eq('creator_id', creator.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        toast({
          variant: "destructive",
          title: "Request Already Pending",
          description: "You already have a pending request for this creator"
        });
        setSending(false);
        return;
      }

      // Create the request
      const { error } = await supabase
        .from('audience_insights_requests')
        .insert({
          brand_id: brandId,
          creator_id: creator.id,
          social_account_id: selectedAccountId || null,
          campaign_id: campaignId || null,
          message: message.trim() || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Request Sent",
        description: `Audience insights request sent to @${creator.username}`
      });

      // Reset form
      setSelectedAccountId("");
      setMessage("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error sending request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send request"
      });
    } finally {
      setSending(false);
    }
  };

  if (!creator) return null;

  const accounts = creator.social_accounts || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-inter tracking-[-0.5px]">
            <BarChart3 className="h-5 w-5 text-primary" />
            Request Audience Insights
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.3px]">
            Ask this creator to share their audience insights
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Creator Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
            {creator.avatar_url ? (
              <img
                src={creator.avatar_url}
                alt={creator.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate font-inter tracking-[-0.3px]">
                @{creator.username}
              </p>
              {creator.full_name && (
                <p className="text-xs text-muted-foreground truncate">{creator.full_name}</p>
              )}
            </div>
          </div>

          {/* Social Account Selection (optional) */}
          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-inter tracking-[-0.3px]">
                Specific Account (optional)
              </Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Any account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any account</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(account.platform)}
                        <span>@{account.username}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave empty to request insights for any of their accounts
              </p>
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label className="text-sm font-inter tracking-[-0.3px]">
              Message (optional)
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note explaining why you'd like to see their audience insights..."
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>

          {/* Expiration Note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              This request will expire in 7 days if the creator doesn't respond
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSubmit}
              disabled={sending}
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
