import { useEffect, useState, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, DollarSign, TrendingUp, Eye, Upload, Plus, Instagram, Youtube, CheckCircle2, Copy, Link2, X, Trash2, AlertCircle, BadgeCheck, Clock, XCircle, Calendar, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { SubmitDemographicsDialog } from "@/components/SubmitDemographicsDialog";
import { ManageCampaignsDialog } from "@/components/ManageCampaignsDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  total_earnings: number;
  trust_score: number;
  demographics_score: number;
  views_score: number;
  country: string | null;
  city: string | null;
  phone_number: string | null;
}
interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  account_link: string | null;
  follower_count: number;
  is_verified: boolean;
  connected_at: string;
  connected_campaigns?: Array<{
    connection_id: string;
    campaign: {
      id: string;
      title: string;
      brand_name: string;
      brand_logo_url: string | null;
    };
  }>;
  demographic_submissions?: Array<{
    id: string;
    tier1_percentage: number;
    status: string;
    score: number | null;
    submitted_at: string;
  }>;
}
interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  brands?: {
    logo_url: string;
  } | null;
}
export function ProfileTab() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [joinedCampaigns, setJoinedCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showManageCampaignsDialog, setShowManageCampaignsDialog] = useState(false);
  const [selectedAccountForManaging, setSelectedAccountForManaging] = useState<{
    id: string;
    username: string;
    platform: string;
  } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [showDemographicsDialog, setShowDemographicsDialog] = useState(false);
  const [selectedAccountForDemographics, setSelectedAccountForDemographics] = useState<{
    id: string;
    platform: string;
    username: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchProfile();
    fetchSocialAccounts();
    fetchJoinedCampaigns();
  }, []);
  const fetchProfile = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    setLoading(true);
    const {
      data: profileData
    } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (profileData) {
      setProfile(profileData);
    }
    setLoading(false);
  };
  const fetchSocialAccounts = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch social accounts with their connected campaigns through the junction table
    const {
      data: accounts
    } = await supabase.from("social_accounts").select(`
        *,
        demographic_submissions(
          id,
          tier1_percentage,
          status,
          score,
          submitted_at
        )
      `).eq("user_id", session.user.id).eq("is_verified", true).order("connected_at", {
      ascending: false
    });
    if (accounts) {
      // Fetch connected campaigns for each account
      const accountsWithCampaigns = await Promise.all(accounts.map(async account => {
        const {
          data: connections
        } = await supabase.from("social_account_campaigns").select(`
              id,
              campaigns(
                id,
                title,
                brand_name,
                brand_logo_url,
                brands(logo_url)
              )
            `).eq("social_account_id", account.id);
        return {
          ...account,
          connected_campaigns: connections?.map(conn => ({
            connection_id: conn.id,
            campaign: {
              id: conn.campaigns.id,
              title: conn.campaigns.title,
              brand_name: conn.campaigns.brand_name,
              brand_logo_url: conn.campaigns.brand_logo_url || conn.campaigns.brands?.logo_url
            }
          })) || []
        };
      }));
      setSocialAccounts(accountsWithCampaigns);
    }
  };
  const fetchJoinedCampaigns = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const {
      data
    } = await supabase.from("campaign_submissions").select("campaign_id, campaigns(id, title, brand_name, brand_logo_url, brands(logo_url))").eq("creator_id", session.user.id);
    if (data) {
      // Deduplicate campaigns by ID
      const uniqueCampaignsMap = new Map();
      data.filter(item => item.campaigns).forEach(item => {
        if (!uniqueCampaignsMap.has(item.campaigns.id)) {
          uniqueCampaignsMap.set(item.campaigns.id, {
            id: item.campaigns.id,
            title: item.campaigns.title,
            brand_name: item.campaigns.brand_name,
            brand_logo_url: item.campaigns.brand_logo_url,
            brands: item.campaigns.brands
          });
        }
      });
      setJoinedCampaigns(Array.from(uniqueCampaignsMap.values()));
    }
  };
  // Remove the old link/unlink functions - now handled by ManageCampaignsDialog
  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      const {
        error
      } = await supabase.from('social_accounts').delete().eq('id', accountToDelete);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Account deleted successfully"
      });
      fetchSocialAccounts();
      setShowDeleteDialog(false);
      setAccountToDelete(null);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete account"
      });
    }
  };
  const getLinkedCampaign = (campaignId: string | null) => {
    if (!campaignId) return null;
    return joinedCampaigns.find(c => c.id === campaignId);
  };
  const getPlatformIcon = (platform: string) => {
    const iconClass = "h-4 w-4";
    switch (platform.toLowerCase()) {
      case "tiktok":
        return <img src={tiktokLogo} alt="TikTok" className={iconClass} />;
      case "instagram":
        return <img src={instagramLogo} alt="Instagram" className={iconClass} />;
      case "youtube":
        return <img src={youtubeLogo} alt="YouTube" className={iconClass} />;
      default:
        return null;
    }
  };
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload an image file"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Image must be less than 5MB"
      });
      return;
    }
    setUploading(true);
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}/avatar.${fileExt}`;

    // Upload new avatar with upsert to overwrite existing file
    const {
      error: uploadError,
      data
    } = await supabase.storage.from('avatars').upload(fileName, file, {
      upsert: true
    });
    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: uploadError.message
      });
      setUploading(false);
      return;
    }

    // Get public URL with cache-busting timestamp
    const {
      data: {
        publicUrl
      }
    } = supabase.storage.from('avatars').getPublicUrl(fileName);

    // Add timestamp to prevent browser caching
    const publicUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

    // Update profile with new avatar URL
    const {
      error: updateError
    } = await supabase.from('profiles').update({
      avatar_url: publicUrl // Store without timestamp in DB
    }).eq('id', session.user.id);
    setUploading(false);
    if (updateError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile picture"
      });
    } else {
      // Update local state with timestamp for immediate display
      setProfile({
        ...profile,
        avatar_url: publicUrlWithTimestamp
      });
      toast({
        title: "Success",
        description: "Profile picture updated successfully"
      });
    }
  };
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to update your profile"
        });
        setSaving(false);
        return;
      }

      // Check for duplicate username if username changed
      if (profile.username) {
        const {
          data: existingProfile
        } = await supabase.from("profiles").select("id").eq("username", profile.username).neq("id", session.user.id).maybeSingle();
        if (existingProfile) {
          setSaving(false);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Username already taken"
          });
          return;
        }
      }

      // Clean avatar URL (remove timestamp parameter if exists)
      const cleanAvatarUrl = profile.avatar_url?.split('?')[0] || profile.avatar_url;
      const {
        error
      } = await supabase.from("profiles").update({
        username: profile.username,
        full_name: profile.full_name,
        bio: profile.bio,
        country: profile.country,
        city: profile.city,
        phone_number: profile.phone_number,
        avatar_url: cleanAvatarUrl
      }).eq("id", session.user.id);
      if (error) {
        console.error('Profile update error:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update profile"
        });
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully"
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred"
      });
    } finally {
      setSaving(false);
    }
  };
  const profileUrl = `${window.location.origin}/${profile?.username}`;
  if (loading || !profile) {
    return <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>;
  }
  return <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto px-4 sm:px-0">
      {/* Connected Accounts */}
      <Card className="bg-card border-0">
        <CardHeader className="py-0 my-0 px-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6">
            <div>
              <CardTitle className="text-lg">Connected Accounts</CardTitle>
              <CardDescription>Link your verified accounts to campaigns</CardDescription>
            </div>
            <Button onClick={() => setShowAddAccountDialog(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
            {socialAccounts.length === 0 ? <div className="text-center py-12 text-muted-foreground">
              <p className="text-base font-medium">No verified accounts yet</p>
              <p className="text-sm mt-2">Add and verify your social media accounts to start earning</p>
            </div> : <div className="space-y-3">
              {socialAccounts.map(account => {
            const connectedCampaigns = account.connected_campaigns || [];
            const latestDemographicSubmission = account.demographic_submissions?.[0];
            const demographicStatus = latestDemographicSubmission?.status;

            // Calculate next submission date (7 days from last submission)
            const getNextSubmissionDate = () => {
              if (!latestDemographicSubmission?.submitted_at) return null;
              const submittedDate = new Date(latestDemographicSubmission.submitted_at);
              const nextDate = new Date(submittedDate);
              nextDate.setDate(nextDate.getDate() + 7);
              return nextDate;
            };
            const nextSubmissionDate = getNextSubmissionDate();
            const daysUntilNext = nextSubmissionDate ? Math.ceil((nextSubmissionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

            // Format the submission timestamp
            const getSubmissionTimestamp = () => {
              if (!latestDemographicSubmission?.submitted_at) return null;
              const submittedDate = new Date(latestDemographicSubmission.submitted_at);
              const now = new Date();
              const hoursDiff = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);

              // If less than 24 hours, show relative time
              if (hoursDiff < 24) {
                return formatDistanceToNow(submittedDate, {
                  addSuffix: true
                });
              }
              // Otherwise show full date and time
              return format(submittedDate, "MMM d, yyyy 'at' h:mm a");
            };
            const submissionTimestamp = getSubmissionTimestamp();
            return <div key={account.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border bg-[#0d0d0d]">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex flex-col gap-1">
                        <div onClick={() => account.account_link && window.open(account.account_link, '_blank')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-[#282828]/50 w-fit cursor-pointer group">
                          {getPlatformIcon(account.platform)}
                          <span className="font-medium group-hover:underline">{account.username}</span>
                          {demographicStatus === 'approved' && <BadgeCheck className="h-3.5 w-3.5 text-success fill-success/20" />}
                          {demographicStatus === 'pending' && <Clock className="h-3.5 w-3.5 text-warning fill-warning/20" />}
                          {demographicStatus === 'rejected' && <XCircle className="h-3.5 w-3.5 text-destructive fill-destructive/20" />}
                          {!demographicStatus && <AlertCircle className="h-3.5 w-3.5 text-destructive fill-destructive/20" />}
                        </div>
                        {submissionTimestamp}
                      </div>
                      
                      {/* Display connected campaigns */}
                      {connectedCampaigns.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">
                          {connectedCampaigns.map(({
                    campaign
                  }) => <div key={campaign.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-card text-xs">
                              {campaign.brand_logo_url && <img src={campaign.brand_logo_url} alt={campaign.brand_name} className="w-4 h-4 rounded object-cover" />}
                              <span className="font-medium">{campaign.title}</span>
                            </div>)}
                        </div>}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {demographicStatus === 'approved' && daysUntilNext !== null ? <Button variant="secondary" size="sm" disabled className="h-8 gap-1.5 w-full sm:w-auto whitespace-nowrap bg-muted/50 text-muted-foreground border-0 cursor-not-allowed">
                          <Calendar className="h-3.5 w-3.5" />
                          Next in {daysUntilNext} days
                        </Button> : demographicStatus === 'pending' ? <Button variant="secondary" size="sm" disabled className="h-8 gap-1.5 w-full sm:w-auto whitespace-nowrap bg-muted/50 text-muted-foreground border-0 cursor-not-allowed">
                          Pending Review
                        </Button> : demographicStatus === 'rejected' ? <Button variant="secondary" size="sm" onClick={() => {
                  setSelectedAccountForDemographics({
                    id: account.id,
                    platform: account.platform,
                    username: account.username
                  });
                  setShowDemographicsDialog(true);
                }} className="h-8 gap-1.5 w-full sm:w-auto whitespace-nowrap bg-red-500 hover:bg-red-600 text-white border-0">
                          Resubmit Demographics
                        </Button> : <Button variant="secondary" size="sm" onClick={() => {
                  setSelectedAccountForDemographics({
                    id: account.id,
                    platform: account.platform,
                    username: account.username
                  });
                  setShowDemographicsDialog(true);
                }} className="h-8 gap-1.5 w-full sm:w-auto whitespace-nowrap bg-red-500 hover:bg-red-600 text-white border-0">
                          Submit Demographics
                        </Button>}
                       
                      <Button variant="default" size="sm" onClick={() => {
                  setSelectedAccountForManaging({
                    id: account.id,
                    username: account.username,
                    platform: account.platform
                  });
                  setShowManageCampaignsDialog(true);
                }} className="h-8 gap-1 w-full sm:w-auto whitespace-nowrap">
                        <Settings className="h-3 w-3" />
                        Manage Campaigns
                      </Button>
                      
                      <Button variant="ghost" size="sm" onClick={() => {
                  setAccountToDelete(account.id);
                  setShowDeleteDialog(true);
                }} className="h-8 gap-1 w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3 w-3" />
                        <span className="sm:hidden">Delete</span>
                      </Button>
                    </div>
                  </div>;
          })}
            </div>}
        </CardContent>
      </Card>

      {/* Public Profile Link */}
      

      {/* Stats Overview */}
      

      {/* Edit Profile */}
      <Card className="bg-card border-0">
        <CardHeader>
          <CardTitle className="text-lg">Edit Profile</CardTitle>
          <CardDescription>Update your public profile information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Avatar Upload Section */}
            <div className="space-y-3">
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="text-2xl bg-muted font-semibold">
                    {profile.full_name?.[0] || profile.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">Profile Picture</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a professional photo. JPG, PNG or GIF. Max 5MB.
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2 bg-muted/50 hover:bg-muted/70 border-0">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Change Photo"}
                  </Button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-3">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                  <Input id="username" value={profile.username} onChange={e => setProfile({
                  ...profile,
                  username: e.target.value
                })} placeholder="username" className="bg-background focus-visible:ring-0 focus-visible:ring-offset-0 text-sm" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">Display Name</Label>
                  <Input id="fullName" value={profile.full_name || ""} onChange={e => setProfile({
                  ...profile,
                  full_name: e.target.value
                })} placeholder="John Doe" className="bg-background focus-visible:ring-0 focus-visible:ring-offset-0 text-sm" />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                  <Input id="phone" type="tel" value={profile.phone_number || ""} onChange={e => setProfile({
                  ...profile,
                  phone_number: e.target.value
                })} placeholder="+1 (555) 000-0000" className="bg-background focus-visible:ring-0 focus-visible:ring-offset-0 text-sm" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium">Country</Label>
                  <Input id="country" value={profile.country || ""} onChange={e => setProfile({
                  ...profile,
                  country: e.target.value
                })} placeholder="United States" className="bg-background focus-visible:ring-0 focus-visible:ring-offset-0 text-sm" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="city" className="text-sm font-medium">City</Label>
                  <Input id="city" value={profile.city || ""} onChange={e => setProfile({
                  ...profile,
                  city: e.target.value
                })} placeholder="New York" className="bg-background focus-visible:ring-0 focus-visible:ring-offset-0 text-sm" />
                </div>
              </div>
            </div>

            {/* About */}
            <div className="space-y-4">
              
              
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t py-0">
              <Button type="button" variant="outline" onClick={async () => {
              await supabase.auth.signOut();
              navigate('/auth');
            }} className="gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-500 border-transparent">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
              <Button type="submit" disabled={saving} size="lg" className="gap-2 min-w-[140px]">
                {saving ? <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving...
                  </> : <>
                    Save Changes
                  </>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AddSocialAccountDialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog} onSuccess={fetchSocialAccounts} />

      {/* Demographics Dialog */}
      {selectedAccountForDemographics && <SubmitDemographicsDialog open={showDemographicsDialog} onOpenChange={setShowDemographicsDialog} onSuccess={fetchSocialAccounts} socialAccountId={selectedAccountForDemographics.id} platform={selectedAccountForDemographics.platform} username={selectedAccountForDemographics.username} />}

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this account? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
            setShowDeleteDialog(false);
            setAccountToDelete(null);
          }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Campaigns Dialog */}
      {selectedAccountForManaging && <ManageCampaignsDialog open={showManageCampaignsDialog} onOpenChange={setShowManageCampaignsDialog} accountId={selectedAccountForManaging.id} accountUsername={selectedAccountForManaging.username} accountPlatform={selectedAccountForManaging.platform} onUpdate={fetchSocialAccounts} />}
    </div>;
}