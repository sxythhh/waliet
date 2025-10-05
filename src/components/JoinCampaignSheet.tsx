import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  description: string;
  brand_name: string;
  brand_logo_url: string;
  budget: number;
  budget_used?: number;
  rpm_rate: number;
  status: string;
  start_date: string | null;
  banner_url: string | null;
  platforms: string[];
  slug: string;
  guidelines: string | null;
  application_questions: string[];
  brands?: {
    logo_url: string;
  };
}

interface JoinCampaignSheetProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinCampaignSheet({ campaign, open, onOpenChange }: JoinCampaignSheetProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const loadSocialAccounts = async () => {
    if (!campaign) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to join campaigns");
      return;
    }

    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id)
      .in("platform", campaign.platforms.map(p => p.toLowerCase()));

    setSocialAccounts(accounts || []);
  };

  const handleSubmit = async () => {
    if (!campaign || !selectedAccount) {
      toast.error("Please select a social account");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to join campaigns");
      return;
    }

    // Validate application questions
    if (campaign.application_questions?.length > 0) {
      const unansweredQuestions = campaign.application_questions.filter(
        (q, idx) => !answers[idx]?.trim()
      );
      if (unansweredQuestions.length > 0) {
        toast.error("Please answer all application questions");
        return;
      }
    }

    setSubmitting(true);

    try {
      const account = socialAccounts.find(a => a.id === selectedAccount);
      
      const { error } = await supabase
        .from("campaign_submissions")
        .insert({
          campaign_id: campaign.id,
          creator_id: user.id,
          platform: account.platform,
          content_url: account.account_link || "",
          status: "pending",
        });

      if (error) throw error;

      toast.success("Application submitted successfully!");
      onOpenChange(false);
      navigate("/dashboard?tab=campaigns");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (!campaign) return null;

  const budgetRemaining = campaign.budget - (campaign.budget_used || 0);
  const budgetPercentage = campaign.budget > 0 ? ((campaign.budget_used || 0) / campaign.budget) * 100 : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:max-w-lg overflow-y-auto"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          loadSocialAccounts();
        }}
      >
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Join Campaign</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Campaign Banner */}
          {campaign.banner_url && (
            <div className="relative w-full h-40 rounded-lg overflow-hidden">
              <img
                src={campaign.banner_url}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Brand Info */}
          <div className="flex items-start gap-3">
            {campaign.brand_logo_url && (
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-border">
                <img
                  src={campaign.brand_logo_url}
                  alt={campaign.brand_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{campaign.title}</h3>
              <p className="text-sm text-muted-foreground">{campaign.brand_name}</p>
            </div>
          </div>

          {/* Description */}
          {campaign.description && (
            <div>
              <p className="text-sm text-muted-foreground">{campaign.description}</p>
            </div>
          )}

          {/* Budget & RPM */}
          <div className="rounded-lg p-4 space-y-3 bg-muted/50">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium">Budget Progress</span>
              <span className="text-xs text-muted-foreground">
                ${(campaign.budget_used || 0).toLocaleString()} / ${campaign.budget.toLocaleString()}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-background">
              <div
                className="h-full bg-primary transition-all duration-700"
                style={{ width: `${budgetPercentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <div>
                <p className="text-xs text-muted-foreground">RPM Rate</p>
                <p className="text-lg font-bold">${campaign.rpm_rate}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-lg font-bold">${budgetRemaining.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Guidelines */}
          {campaign.guidelines && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Guidelines</h4>
              <p className="text-sm text-muted-foreground">{campaign.guidelines}</p>
            </div>
          )}

          {/* Allowed Platforms */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Allowed Platforms</h4>
            <div className="flex gap-2 flex-wrap">
              {campaign.platforms.map((platform) => (
                <span
                  key={platform}
                  className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>

          {/* Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="account">Select Social Account *</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger id="account">
                <SelectValue placeholder="Choose an account..." />
              </SelectTrigger>
              <SelectContent>
                {socialAccounts.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No accounts found for this campaign's platforms
                  </div>
                ) : (
                  socialAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.username} ({account.platform})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Application Questions */}
          {campaign.application_questions?.map((question, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`question-${index}`}>
                {question} *
              </Label>
              <Textarea
                id={`question-${index}`}
                value={answers[index] || ""}
                onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })}
                placeholder="Your answer..."
                rows={3}
              />
            </div>
          ))}

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting || !selectedAccount}
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
