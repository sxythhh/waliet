import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Search, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InviteTeammatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  onInvitesSent: () => void;
}

interface SearchedUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export function InviteTeammatesDialog({ open, onOpenChange, teamId, teamName, onInvitesSent }: InviteTeammatesDialogProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const { toast } = useToast();

  const addEmail = () => {
    setEmails([...emails, ""]);
  };

  const removeEmail = (index: number) => {
    if (emails.length === 1) return;
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, email")
      .ilike("username", `%${query}%`)
      .limit(5);

    if (!error && data) {
      setSearchResults(data);
    }
    setSearching(false);
  };

  const handleSelectUser = (user: SearchedUser) => {
    setSelectedUser(user);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSendInvites = async () => {
    const validEmails = emails.filter(email => email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
    
    if (validEmails.length === 0) {
      toast({
        variant: "destructive",
        title: "No valid emails",
        description: "Please enter at least one valid email address."
      });
      return;
    }

    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }

    const invitations = validEmails.map(email => ({
      team_id: teamId,
      email: email.trim().toLowerCase(),
      invited_by: user.id
    }));

    const { error } = await supabase.from("referral_team_invitations").insert(invitations);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error sending invites",
        description: error.message
      });
    } else {
      toast({
        title: "Invitations sent!",
        description: `${validEmails.length} invitation(s) sent successfully.`
      });
      onInvitesSent();
      onOpenChange(false);
      setEmails([""]);
    }

    setSending(false);
  };

  const handleSendUserInvite = async () => {
    if (!selectedUser?.email) {
      toast({
        variant: "destructive",
        title: "No email found",
        description: "This user doesn't have an email address on file."
      });
      return;
    }

    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }

    const { error } = await supabase.from("referral_team_invitations").insert({
      team_id: teamId,
      email: selectedUser.email.toLowerCase(),
      invited_by: user.id
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error sending invite",
        description: error.message
      });
    } else {
      toast({
        title: "Invitation sent!",
        description: `Invitation sent to ${selectedUser.username}.`
      });
      onInvitesSent();
      onOpenChange(false);
      setSelectedUser(null);
    }

    setSending(false);
  };

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setEmails([""]);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUser(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
            Invite Teammates
          </DialogTitle>
          <DialogDescription>
            Invite members to join <span className="font-semibold text-foreground">{teamName}</span>.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="search" className="mt-2">
          <TabsList className="w-full grid grid-cols-2 bg-muted/50">
            <TabsTrigger value="search" className="text-sm">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Search Users
            </TabsTrigger>
            <TabsTrigger value="email" className="text-sm">
              <User className="w-3.5 h-3.5 mr-1.5" />
              By Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 mt-4">
            {selectedUser ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback>{selectedUser.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{selectedUser.full_name || selectedUser.username}</p>
                    <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedUser(null)}
                    className="h-8 w-8 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  onClick={handleSendUserInvite}
                  disabled={sending || !selectedUser.email}
                  className="w-full bg-[#2060df] hover:bg-[#2060df]/90 border-t border-[#4b85f7]"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </Button>

                {!selectedUser.email && (
                  <p className="text-xs text-amber-500 text-center">
                    This user doesn't have an email on file.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username..."
                    value={searchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    className="pl-9 bg-muted/30 border-border"
                  />
                </div>

                {searching && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!searching && searchResults.length > 0 && (
                  <div className="space-y-1">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.full_name || user.username}
                          </p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div className="text-center py-8">
                    <User className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No users found</p>
                  </div>
                )}

                {!searching && searchQuery.length < 2 && (
                  <div className="text-center py-8">
                    <Search className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Type at least 2 characters to search
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-3">
              {emails.map((email, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 bg-muted/30 border-border"
                  />
                  {emails.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEmail(index)}
                      className="h-10 w-10 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addEmail}
                className="gap-2 w-full"
              >
                <Plus className="h-4 w-4" />
                Add another email
              </Button>
            </div>

            <Button
              onClick={handleSendInvites}
              disabled={sending}
              className="w-full bg-[#2060df] hover:bg-[#2060df]/90 border-t border-[#4b85f7]"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitations"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
