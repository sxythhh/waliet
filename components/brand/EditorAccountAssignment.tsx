import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Users, Link2 } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EditorAccountAssignmentProps {
  boostId: string;
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Editor {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface SocialAccount {
  id: string;
  platform: "tiktok" | "instagram" | "youtube";
  account_handle: string;
  account_name: string | null;
  is_active: boolean;
}

interface Assignment {
  user_id: string;
  social_account_id: string;
}

const PLATFORM_CONFIG = {
  tiktok: { icon: "logos:tiktok-icon", label: "TikTok" },
  instagram: { icon: "skill-icons:instagram", label: "Instagram" },
  youtube: { icon: "logos:youtube-icon", label: "YouTube" },
};

export function EditorAccountAssignment({
  boostId,
  brandId,
  open,
  onOpenChange,
}: EditorAccountAssignmentProps) {
  const [editors, setEditors] = useState<Editor[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [originalAssignments, setOriginalAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, boostId, brandId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch accepted editors for this boost
      const { data: applications, error: appError } = await supabase
        .from("bounty_applications")
        .select(`
          user_id,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("bounty_campaign_id", boostId)
        .eq("status", "accepted");

      if (appError) throw appError;

      const editorsList: Editor[] = (applications || [])
        .filter((app: any) => app.profiles)
        .map((app: any) => ({
          id: app.user_id,
          user_id: app.user_id,
          username: app.profiles.username,
          full_name: app.profiles.full_name,
          avatar_url: app.profiles.avatar_url,
        }));

      setEditors(editorsList);

      // Fetch social accounts for this brand
      const { data: accounts, error: accountsError } = await supabase
        .from("brand_social_accounts")
        .select("*")
        .eq("brand_id", brandId)
        .eq("is_active", true)
        .order("platform");

      if (accountsError) throw accountsError;
      setSocialAccounts((accounts as SocialAccount[]) || []);

      // Fetch existing assignments
      const { data: existingAssignments, error: assignmentsError } = await supabase
        .from("boost_editor_accounts")
        .select("user_id, social_account_id")
        .eq("boost_id", boostId)
        .eq("is_active", true);

      if (assignmentsError) throw assignmentsError;

      const assignmentsList = (existingAssignments || []).map((a: any) => ({
        user_id: a.user_id,
        social_account_id: a.social_account_id,
      }));

      setAssignments(assignmentsList);
      setOriginalAssignments(assignmentsList);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignment = (userId: string, accountId: string) => {
    setAssignments((prev) => {
      const exists = prev.some(
        (a) => a.user_id === userId && a.social_account_id === accountId
      );

      if (exists) {
        return prev.filter(
          (a) => !(a.user_id === userId && a.social_account_id === accountId)
        );
      } else {
        return [...prev, { user_id: userId, social_account_id: accountId }];
      }
    });
  };

  const isAssigned = (userId: string, accountId: string) => {
    return assignments.some(
      (a) => a.user_id === userId && a.social_account_id === accountId
    );
  };

  const hasChanges = () => {
    if (assignments.length !== originalAssignments.length) return true;

    return !assignments.every((a) =>
      originalAssignments.some(
        (o) => o.user_id === a.user_id && o.social_account_id === a.social_account_id
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find assignments to add and remove
      const toAdd = assignments.filter(
        (a) =>
          !originalAssignments.some(
            (o) => o.user_id === a.user_id && o.social_account_id === a.social_account_id
          )
      );

      const toRemove = originalAssignments.filter(
        (o) =>
          !assignments.some(
            (a) => a.user_id === o.user_id && a.social_account_id === o.social_account_id
          )
      );

      // Remove assignments
      if (toRemove.length > 0) {
        for (const remove of toRemove) {
          await supabase
            .from("boost_editor_accounts")
            .delete()
            .eq("boost_id", boostId)
            .eq("user_id", remove.user_id)
            .eq("social_account_id", remove.social_account_id);
        }
      }

      // Add new assignments
      if (toAdd.length > 0) {
        const { error } = await supabase.from("boost_editor_accounts").insert(
          toAdd.map((a) => ({
            boost_id: boostId,
            user_id: a.user_id,
            social_account_id: a.social_account_id,
            assigned_by: user.id,
          }))
        );

        if (error) throw error;
      }

      toast.success("Assignments saved successfully");
      setOriginalAssignments([...assignments]);
      onOpenChange(false);
    } catch (err) {
      console.error("Error saving assignments:", err);
      toast.error("Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  const getEditorAssignmentCount = (userId: string) => {
    return assignments.filter((a) => a.user_id === userId).length;
  };

  const getAccountAssignmentCount = (accountId: string) => {
    return assignments.filter((a) => a.social_account_id === accountId).length;
  };

  // Group accounts by platform
  const accountsByPlatform = Object.entries(PLATFORM_CONFIG).map(([platform, config]) => ({
    platform,
    config,
    accounts: socialAccounts.filter((a) => a.platform === platform),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Editors to Accounts</DialogTitle>
          <DialogDescription>
            Assign editors to specific social accounts. Editors will only be able to submit videos for their assigned accounts.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : editors.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-medium text-foreground mb-2">No Editors</h4>
            <p className="text-sm text-muted-foreground">
              Accept some applications first to assign editors to accounts
            </p>
          </div>
        ) : socialAccounts.length === 0 ? (
          <div className="text-center py-8">
            <Link2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-medium text-foreground mb-2">No Social Accounts</h4>
            <p className="text-sm text-muted-foreground">
              Add social accounts in brand settings first
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-4">
            <Accordion type="multiple" defaultValue={editors.map((e) => e.id)}>
              {editors.map((editor) => (
                <AccordionItem key={editor.id} value={editor.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={editor.avatar_url || undefined} />
                        <AvatarFallback>
                          {editor.username?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="font-medium text-foreground">
                          {editor.full_name || editor.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{editor.username}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {getEditorAssignmentCount(editor.id)} accounts
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pl-11">
                      {accountsByPlatform.map(({ platform, config, accounts }) => (
                        accounts.length > 0 && (
                          <div key={platform}>
                            <div className="flex items-center gap-2 mb-2">
                              <Icon icon={config.icon} className="w-4 h-4" />
                              <span className="text-sm font-medium text-muted-foreground">
                                {config.label}
                              </span>
                            </div>
                            <div className="grid gap-2">
                              {accounts.map((account) => (
                                <label
                                  key={account.id}
                                  className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors",
                                    isAssigned(editor.id, account.id)
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:bg-muted/50"
                                  )}
                                >
                                  <Checkbox
                                    checked={isAssigned(editor.id, account.id)}
                                    onCheckedChange={() =>
                                      toggleAssignment(editor.id, account.id)
                                    }
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">
                                      @{account.account_handle}
                                    </p>
                                    {account.account_name && (
                                      <p className="text-xs text-muted-foreground">
                                        {account.account_name}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {getAccountAssignmentCount(account.id)} editors
                                  </Badge>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Assignments"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
