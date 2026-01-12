import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, ExternalLink } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BrandSocialAccountsTabProps {
  brandId: string;
}

interface SocialAccount {
  id: string;
  brand_id: string;
  platform: "tiktok" | "instagram" | "youtube";
  account_handle: string;
  account_name: string | null;
  account_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const PLATFORMS = [
  {
    id: "tiktok" as const,
    name: "TikTok",
    icon: "logos:tiktok-icon",
    color: "bg-black text-white",
    urlPrefix: "https://tiktok.com/@",
  },
  {
    id: "instagram" as const,
    name: "Instagram",
    icon: "skill-icons:instagram",
    color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    urlPrefix: "https://instagram.com/",
  },
  {
    id: "youtube" as const,
    name: "YouTube",
    icon: "logos:youtube-icon",
    color: "bg-red-600 text-white",
    urlPrefix: "https://youtube.com/@",
  },
];

export function BrandSocialAccountsTab({ brandId }: BrandSocialAccountsTabProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<SocialAccount | null>(null);
  const [editingAccount, setEditingAccount] = useState<SocialAccount | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [platform, setPlatform] = useState<"tiktok" | "instagram" | "youtube">("tiktok");
  const [accountHandle, setAccountHandle] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountUrl, setAccountUrl] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, [brandId]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("brand_social_accounts")
        .select("*")
        .eq("brand_id", brandId)
        .order("platform", { ascending: true })
        .order("account_handle", { ascending: true });

      if (error) throw error;
      setAccounts((data as SocialAccount[]) || []);
    } catch (err) {
      console.error("Error fetching social accounts:", err);
      toast.error("Failed to load social accounts");
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingAccount(null);
    setPlatform("tiktok");
    setAccountHandle("");
    setAccountName("");
    setAccountUrl("");
    setDialogOpen(true);
  };

  const openEditDialog = (account: SocialAccount) => {
    setEditingAccount(account);
    setPlatform(account.platform);
    setAccountHandle(account.account_handle);
    setAccountName(account.account_name || "");
    setAccountUrl(account.account_url || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!accountHandle.trim()) {
      toast.error("Please enter an account handle");
      return;
    }

    setSaving(true);
    try {
      const platformConfig = PLATFORMS.find((p) => p.id === platform);
      const finalUrl = accountUrl || (platformConfig ? `${platformConfig.urlPrefix}${accountHandle.replace("@", "")}` : "");

      if (editingAccount) {
        // Update existing account
        const { error } = await supabase
          .from("brand_social_accounts")
          .update({
            platform,
            account_handle: accountHandle.replace("@", ""),
            account_name: accountName || null,
            account_url: finalUrl || null,
          })
          .eq("id", editingAccount.id);

        if (error) throw error;
        toast.success("Account updated successfully");
      } else {
        // Create new account
        const { error } = await supabase.from("brand_social_accounts").insert({
          brand_id: brandId,
          platform,
          account_handle: accountHandle.replace("@", ""),
          account_name: accountName || null,
          account_url: finalUrl || null,
        });

        if (error) {
          if (error.code === "23505") {
            toast.error("This account already exists for this platform");
            return;
          }
          throw error;
        }
        toast.success("Account added successfully");
      }

      setDialogOpen(false);
      fetchAccounts();
    } catch (err) {
      console.error("Error saving account:", err);
      toast.error("Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;

    try {
      const { error } = await supabase
        .from("brand_social_accounts")
        .delete()
        .eq("id", accountToDelete.id);

      if (error) throw error;
      toast.success("Account deleted successfully");
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      fetchAccounts();
    } catch (err) {
      console.error("Error deleting account:", err);
      toast.error("Failed to delete account");
    }
  };

  const toggleActive = async (account: SocialAccount) => {
    try {
      const { error } = await supabase
        .from("brand_social_accounts")
        .update({ is_active: !account.is_active })
        .eq("id", account.id);

      if (error) throw error;
      toast.success(account.is_active ? "Account deactivated" : "Account activated");
      fetchAccounts();
    } catch (err) {
      console.error("Error toggling account:", err);
      toast.error("Failed to update account");
    }
  };

  const getPlatformConfig = (platformId: string) => {
    return PLATFORMS.find((p) => p.id === platformId) || PLATFORMS[0];
  };

  // Group accounts by platform
  const accountsByPlatform = PLATFORMS.map((platform) => ({
    platform,
    accounts: accounts.filter((a) => a.platform === platform.id),
  }));

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Social Accounts</h3>
          <p className="text-sm text-muted-foreground">
            Manage the social media accounts where videos will be posted
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <Icon icon="ph:share-network" className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="text-lg font-medium text-foreground mb-2">No Social Accounts</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Add your TikTok, Instagram, and YouTube accounts to assign to editors
          </p>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Account
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {accountsByPlatform.map(({ platform, accounts: platformAccounts }) => (
            <div key={platform.id}>
              <div className="flex items-center gap-2 mb-3">
                <Icon icon={platform.icon} className="w-5 h-5" />
                <h4 className="font-medium text-foreground">{platform.name}</h4>
                <Badge variant="secondary" className="text-xs">
                  {platformAccounts.length}
                </Badge>
              </div>

              {platformAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic pl-7">
                  No {platform.name} accounts added
                </p>
              ) : (
                <div className="grid gap-2 pl-7">
                  {platformAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        account.is_active
                          ? "bg-card border-border"
                          : "bg-muted/30 border-muted opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              @{account.account_handle}
                            </span>
                            {!account.is_active && (
                              <Badge variant="secondary" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          {account.account_name && (
                            <p className="text-sm text-muted-foreground">
                              {account.account_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {account.account_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-8 w-8"
                          >
                            <a
                              href={account.account_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(account)}
                          className="h-8 w-8"
                        >
                          <Icon
                            icon={account.is_active ? "ph:eye" : "ph:eye-slash"}
                            className="w-4 h-4"
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(account)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setAccountToDelete(account);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Account" : "Add Social Account"}
            </DialogTitle>
            <DialogDescription>
              {editingAccount
                ? "Update the details for this social account"
                : "Add a new social media account for video posting"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as typeof platform)}
                disabled={!!editingAccount}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <Icon icon={p.icon} className="w-4 h-4" />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="handle">Account Handle</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  @
                </span>
                <Input
                  id="handle"
                  value={accountHandle}
                  onChange={(e) => setAccountHandle(e.target.value.replace("@", ""))}
                  placeholder="username"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name (optional)</Label>
              <Input
                id="name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Account display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Profile URL (optional)</Label>
              <Input
                id="url"
                value={accountUrl}
                onChange={(e) => setAccountUrl(e.target.value)}
                placeholder={getPlatformConfig(platform).urlPrefix + "username"}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to auto-generate from handle
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingAccount ? "Update" : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete @{accountToDelete?.account_handle}? This will
              also remove any editor assignments for this account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
