import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, ArrowUp, Plus } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useTheme } from "next-themes";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoBlack from "@/assets/instagram-logo-new.png";
import youtubeLogoBlack from "@/assets/youtube-logo-new.png";
import emptyAccountsImage from "@/assets/empty-accounts.png";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
interface Campaign {
  id: string;
  title: string;
  description: string;
  campaign_type?: string | null;
  category?: string | null;
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
  requires_application?: boolean;
  preview_url?: string | null;
  is_infinite_budget?: boolean;
  brands?: {
    logo_url: string;
  };
}
interface JoinCampaignSheetProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function JoinCampaignSheet({
  campaign,
  open,
  onOpenChange
}: JoinCampaignSheetProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{
    [key: string]: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const navigate = useNavigate();
  const {
    theme
  } = useTheme();

  // Helper to parse links in text
  const parseTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4f89ff] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Check authentication when sheet opens
  useEffect(() => {
    if (open) {
      checkAuthentication();
      loadSocialAccounts();
    }
  }, [open]);
  const checkAuthentication = async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    } catch (error) {
      console.error("Error checking authentication:", error);
      setIsLoggedIn(false);
    }
  };
  const getPlatformIcon = (platform: string) => {
    const systemIsLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const isLightMode = theme === "light" || theme === "system" && systemIsLight;
    switch (platform.toLowerCase()) {
      case "tiktok":
        return isLightMode ? tiktokLogoBlack : tiktokLogo;
      case "instagram":
        return isLightMode ? instagramLogoBlack : instagramLogo;
      case "youtube":
        return isLightMode ? youtubeLogoBlack : youtubeLogo;
      default:
        return null;
    }
  };
  const loadSocialAccounts = async () => {
    if (!campaign) return;

    // Reset answers when loading accounts for a new campaign
    setAnswers({});
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }

    // Get all user's social accounts that match the campaign's platforms
    const {
      data: accounts
    } = await supabase.from("social_accounts").select("*").eq("user_id", user.id).in("platform", campaign.platforms.map(p => p.toLowerCase()));

    // Get active (non-withdrawn) submissions to filter out platforms
    const {
      data: activeSubmissions
    } = await supabase.from("campaign_submissions").select("platform").eq("campaign_id", campaign.id).eq("creator_id", user.id).neq("status", "withdrawn");
    const activePlatforms = new Set(activeSubmissions?.map(s => s.platform) || []);

    // Filter out accounts with active submissions for this campaign
    const availableAccounts = accounts?.filter(acc => !activePlatforms.has(acc.platform)) || [];
    setSocialAccounts(availableAccounts);
  };
  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]);
  };
  const handleSubmit = async () => {
    console.log('=== SUBMIT STARTED ===');
    console.log('Campaign:', campaign);
    console.log('Selected Accounts:', selectedAccounts);
    console.log('Answers:', answers);
    if (!campaign || selectedAccounts.length === 0) {
      console.log('Validation failed: No campaign or accounts');
      toast.error("Please select at least one social account");
      return;
    }
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      console.log('Validation failed: No user');
      toast.error("Please sign in to join campaigns");
      return;
    }

    // Validate application questions only if campaign requires application
    const questions = Array.isArray(campaign.application_questions) ? campaign.application_questions : [];
    console.log('Application questions:', questions);
    console.log('Requires application:', campaign.requires_application);
    if (campaign.requires_application !== false && questions.length > 0) {
      const unansweredQuestions = questions.filter((q, idx) => {
        const answer = answers[idx];
        return !answer || answer.trim().length === 0;
      });
      console.log('Unanswered questions:', unansweredQuestions);
      if (unansweredQuestions.length > 0) {
        console.log('Validation failed: Unanswered questions');
        toast.error("Please answer all application questions");
        return;
      }
    }
    console.log('All validations passed, starting submission...');
    setSubmitting(true);
    try {
      // Determine submission status based on campaign type
      const submissionStatus = campaign.requires_application === false ? "approved" : "pending";
      console.log('Submission status:', submissionStatus);

      // Delete any withdrawn submissions to start fresh
      await supabase.from("campaign_submissions").delete().eq("campaign_id", campaign.id).eq("creator_id", user.id).eq("status", "withdrawn");

      // Check for existing submissions first (excluding withdrawn)
      const {
        data: existingData
      } = await supabase.from("campaign_submissions").select("platform").eq("campaign_id", campaign.id).eq("creator_id", user.id).neq("status", "withdrawn");
      console.log('Existing submissions:', existingData);
      const existingPlatforms = new Set(existingData?.map(s => s.platform) || []);

      // Track if any submissions were actually created
      let submissionsCreated = 0;
      const submittedAccountsData: Array<{
        platform: string;
        username: string;
        account_link: string;
      }> = [];

      // Process each selected account
      for (const accountId of selectedAccounts) {
        const account = socialAccounts.find(a => a.id === accountId);
        console.log('Processing account:', account);

        // Skip if already submitted for this platform
        if (existingPlatforms.has(account.platform)) {
          console.log('Skipping - already submitted for platform:', account.platform);
          continue;
        }

        // Format application answers
        const formattedAnswers = campaign.application_questions?.map((question, index) => ({
          question,
          answer: answers[index] || ""
        })) || [];
        const contentUrl = account.account_link || `pending-${Date.now()}-${accountId}`;

        // Create new submission
        const submissionData = {
          campaign_id: campaign.id,
          creator_id: user.id,
          platform: account.platform,
          content_url: contentUrl,
          status: submissionStatus,
          application_answers: formattedAnswers
        };
        console.log('Inserting submission:', submissionData);
        const {
          error: submissionError
        } = await supabase.from("campaign_submissions").insert(submissionData);
        if (submissionError) {
          console.error('Submission error:', submissionError);
          throw submissionError;
        }

        // Link the social account to the campaign (check if active link exists first)
        const {
          data: existingLink
        } = await supabase.from("social_account_campaigns").select("id, status").eq("social_account_id", accountId).eq("campaign_id", campaign.id).maybeSingle();
        if (!existingLink) {
          // Create new link
          const linkData = {
            social_account_id: accountId,
            campaign_id: campaign.id,
            user_id: user.id,
            status: 'active'
          };
          console.log('Linking account:', linkData);
          const {
            error: linkError
          } = await supabase.from("social_account_campaigns").insert(linkData);
          if (linkError) {
            console.error('Link error:', linkError);
            throw linkError;
          }
        } else if (existingLink.status !== 'active') {
          // Reactivate disconnected link
          const {
            error: updateError
          } = await supabase.from("social_account_campaigns").update({
            status: 'active',
            disconnected_at: null
          }).eq("id", existingLink.id);
          if (updateError) {
            console.error('Update error:', updateError);
            throw updateError;
          }
        }
        submissionsCreated++;
        submittedAccountsData.push({
          platform: account.platform,
          username: account.username,
          account_link: account.account_link || contentUrl
        });
      }

      // Track accounts in Shortimize if auto-approved
      if (!campaign.requires_application && submissionsCreated > 0) {
        try {
          console.log('Tracking accounts in Shortimize...');
          const {
            error: trackError
          } = await supabase.functions.invoke('track-campaign-user', {
            body: {
              campaignId: campaign.id,
              userId: user.id
            }
          });
          if (trackError) {
            console.error('Error tracking accounts:', trackError);
          } else {
            console.log('Successfully tracked accounts in Shortimize');
          }
        } catch (error) {
          console.error('Error calling track function:', error);
        }
      }

      // Send Discord notification if submissions were created
      if (submissionsCreated > 0) {
        try {
          console.log('Preparing to send Discord notification...');

          // Get user profile
          const {
            data: profile,
            error: profileError
          } = await supabase.from('profiles').select('username, email').eq('id', user.id).single();
          if (profileError) {
            console.error('Profile fetch error:', profileError);
          }

          // Get brand data including slug and logo
          const {
            data: brandData,
            error: brandError
          } = await supabase.from('brands').select('slug').eq('name', campaign.brand_name).single();
          if (brandError) {
            console.error('Brand fetch error:', brandError);
          }
          const brandSlug = brandData?.slug || '';
          console.log('Brand slug:', brandSlug);
          const formattedAnswers = campaign.application_questions?.map((question, index) => ({
            question,
            answer: answers[index] || ""
          })) || [];
          console.log('Invoking edge function with data:', {
            username: profile?.username,
            campaign_name: campaign.title,
            brand_slug: brandSlug,
            accounts_count: submittedAccountsData.length
          });
          const {
            data: functionData,
            error: functionError
          } = await supabase.functions.invoke('notify-campaign-application', {
            body: {
              username: profile?.username || 'Unknown',
              email: profile?.email || 'Unknown',
              campaign_name: campaign.title,
              campaign_slug: campaign.slug,
              brand_name: campaign.brand_name,
              brand_slug: brandSlug,
              brand_logo_url: campaign.brand_logo_url || '',
              social_accounts: submittedAccountsData,
              application_answers: formattedAnswers,
              submitted_at: new Date().toISOString()
            }
          });
          if (functionError) {
            console.error('Edge function error:', functionError);
          } else {
            console.log('Discord notification sent successfully:', functionData);
          }
        } catch (webhookError) {
          console.error('Failed to send Discord notification:', webhookError);
          // Don't fail the submission if webhook fails
        }
      }
      console.log('=== SUBMISSION COMPLETE ===');
      console.log('Submissions created:', submissionsCreated);

      // Show appropriate message based on what happened
      if (submissionsCreated === 0) {
        toast.info("You've already applied to this campaign with the selected account(s)");
        onOpenChange(false);
        return;
      }
      const accountText = submissionsCreated === 1 ? "account is" : "accounts are";
      const successMessage = campaign.requires_application === false ? `Successfully joined the campaign! ${submissionsCreated} ${accountText} now connected.` : `Application submitted successfully! ${submissionsCreated} ${accountText} now connected to this campaign.`;
      toast.success(successMessage);
      onOpenChange(false);
      navigate("/dashboard?tab=campaigns");
    } catch (error: any) {
      console.error('=== SUBMISSION FAILED ===');
      console.error('Error details:', error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };
  if (!campaign) return null;
  const budgetRemaining = campaign.budget - (campaign.budget_used || 0);
  const budgetPercentage = campaign.budget > 0 ? (campaign.budget_used || 0) / campaign.budget * 100 : 0;
  return <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        

        <div className="mt-6 space-y-6">
          {/* Campaign Banner */}
          {campaign.banner_url && <div className="relative w-full h-40 rounded-lg overflow-hidden">
              <OptimizedImage src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover" />
            </div>}

          {/* Brand Info */}
          <div className="flex items-start gap-3">
            {campaign.brand_logo_url && <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-border">
                <img src={campaign.brand_logo_url} alt={campaign.brand_name} className="w-full h-full object-cover" />
              </div>}
            <div className="flex-1">
              <h3 className="font-semibold text-2xl">{campaign.title}</h3>
              <p className="text-sm text-muted-foreground">{campaign.brand_name}</p>
              {(campaign.campaign_type || campaign.category || campaign.platforms) && <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {campaign.campaign_type && <span className="px-3 py-1.5 text-[11px] font-medium bg-[#2060df]/15 text-[#4f89ff] rounded-full" style={{
                fontFamily: 'Inter',
                letterSpacing: '-0.5px'
              }}>
                      {campaign.campaign_type.charAt(0).toUpperCase() + campaign.campaign_type.slice(1)}
                    </span>}
                  {campaign.category && <span className="px-3 py-1.5 text-[11px] font-medium bg-muted/50 text-muted-foreground rounded-full" style={{
                fontFamily: 'Inter',
                letterSpacing: '-0.5px'
              }}>
                      {campaign.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>}
                  {campaign.platforms.length > 0 && <span className="px-2.5 py-1.5 flex items-center gap-1 bg-muted/30 rounded-full">
                    {campaign.platforms.map(platform => {
                  const platformIcon = getPlatformIcon(platform);
                  return platformIcon ? <img key={platform} src={platformIcon} alt={platform} className="w-4 h-4 opacity-70" /> : null;
                })}
                  </span>}
                </div>}
            </div>
          </div>

          {/* Description with expandable "Show more" */}
          {campaign.description && (
            <div className="space-y-2">
              <div className="relative">
                <div 
                  className={`text-sm text-foreground/90 leading-relaxed overflow-hidden transition-all whitespace-pre-line ${
                    descriptionExpanded ? '' : 'max-h-[100px]'
                  }`}
                  style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                >
                  {parseTextWithLinks(campaign.description)}
                </div>
                {!descriptionExpanded && campaign.description.length > 200 && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
              </div>
              {campaign.description.length > 200 && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                  >
                    {descriptionExpanded ? 'Show less' : 'Show more'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Budget & RPM */}
          {!campaign.is_infinite_budget}

          {/* Campaign Preview Button - only show if preview_url exists */}
          {campaign.preview_url && <Button variant="outline" className="w-full h-12 bg-muted border-0 hover:bg-muted/60 transition-colors" onClick={() => window.open(campaign.preview_url!, '_blank')}>
              <ArrowUp className="w-4 h-4 mr-2" />
              <span className="font-medium">View Campaign Details</span>
            </Button>}

          {/* Account Selection or Create Account - only show for campaigns requiring application */}
          {!isLoggedIn ? (
            <div className="space-y-3">
              <div className="p-6 rounded-lg bg-muted/50 text-center space-y-4">
                <p className="text-sm font-medium text-foreground">Join this campaign</p>
                <p className="text-xs text-muted-foreground">Create an account to start earning from your content</p>
                <Button onClick={() => {
                  onOpenChange(false);
                  navigate('/auth');
                }} className="w-full">
                  Create Account
                </Button>
              </div>
            </div>
          ) : campaign.requires_application !== false ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Select Social Accounts *</Label>
              </div>
              {socialAccounts.length === 0 ? (
                <div className="p-6 rounded-lg bg-muted/50 text-center space-y-3">
                  <img src={emptyAccountsImage} alt="No accounts" className="w-20 h-20 mx-auto opacity-80 object-cover" />
                  <p className="text-sm font-medium text-foreground">No available accounts</p>
                  <Button onClick={() => setShowAddAccountDialog(true)} size="sm" className="border-0" style={{ backgroundColor: '#1F1F1F' }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Account
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  {socialAccounts.map(account => {
                    const platformIcon = getPlatformIcon(account.platform);
                    const isSelected = selectedAccounts.includes(account.id);
                    return (
                      <button 
                        key={account.id} 
                        type="button" 
                        onClick={() => toggleAccountSelection(account.id)} 
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${isSelected ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-muted-foreground/50 bg-card"}`}
                      >
                        {platformIcon && (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-blue-500" : "bg-muted"}`}>
                            <img src={platformIcon} alt={account.platform} className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">{account.username}</p>
                          <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {/* Application Questions - only show if logged in and campaign requires application */}
          {isLoggedIn && campaign.requires_application !== false && Array.isArray(campaign.application_questions) && campaign.application_questions.map((question, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`question-${index}`}>
                {question} *
              </Label>
              <Textarea 
                id={`question-${index}`} 
                value={answers[index] || ""} 
                onChange={e => setAnswers({
                  ...answers,
                  [index]: e.target.value
                })} 
                placeholder="Your answer..." 
                rows={3} 
                className="min-h-[60px] border-2 border-transparent focus-visible:border-[#2663EB] focus-visible:shadow-none transition-none" 
              />
            </div>
          ))}

          {/* Submit Button - only show if logged in */}
          {isLoggedIn && (
            <div className="pt-4">
              <Button 
                className="w-full text-white border-t"
                style={{ 
                  fontFamily: 'Geist', 
                  letterSpacing: '-0.5px',
                  backgroundColor: '#2060df',
                  borderTopColor: '#4f89ff'
                }}
                onClick={handleSubmit} 
                disabled={submitting || (campaign.requires_application !== false && selectedAccounts.length === 0)}
              >
                {submitting 
                  ? campaign.requires_application === false ? "Joining..." : "Submitting..." 
                  : campaign.requires_application === false ? "Join Campaign" : "Submit Application"
                }
              </Button>
            </div>
          )}
        </div>
      </SheetContent>

      <AddSocialAccountDialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog} onSuccess={loadSocialAccounts} />
    </Sheet>;
}