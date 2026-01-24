import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, UserPlus, ArrowRight, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  referral_code: string | null;
}

interface AddReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddReferralDialog({ open, onOpenChange, onSuccess }: AddReferralDialogProps) {
  const [referrerSearch, setReferrerSearch] = useState("");
  const [referredSearch, setReferredSearch] = useState("");
  const [referrerResults, setReferrerResults] = useState<User[]>([]);
  const [referredResults, setReferredResults] = useState<User[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<User | null>(null);
  const [selectedReferred, setSelectedReferred] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) {
      setReferrerSearch("");
      setReferredSearch("");
      setReferrerResults([]);
      setReferredResults([]);
      setSelectedReferrer(null);
      setSelectedReferred(null);
    }
  }, [open]);

  const searchUsers = async (query: string, type: 'referrer' | 'referred') => {
    if (query.length < 2) {
      if (type === 'referrer') setReferrerResults([]);
      else setReferredResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, referral_code")
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      if (type === 'referrer') {
        setReferrerResults(data || []);
      } else {
        // Exclude already selected referrer from referred results
        const filtered = (data || []).filter(u => u.id !== selectedReferrer?.id);
        setReferredResults(filtered);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (referrerSearch) searchUsers(referrerSearch, 'referrer');
    }, 300);
    return () => clearTimeout(timer);
  }, [referrerSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (referredSearch) searchUsers(referredSearch, 'referred');
    }, 300);
    return () => clearTimeout(timer);
  }, [referredSearch, selectedReferrer]);

  const handleCreateReferral = async () => {
    if (!selectedReferrer || !selectedReferred) return;

    setLoading(true);
    try {
      // Check if referral already exists
      const { data: existing } = await supabase
        .from("referrals")
        .select("id")
        .eq("referrer_id", selectedReferrer.id)
        .eq("referred_id", selectedReferred.id)
        .single();

      if (existing) {
        toast.error("This referral relationship already exists");
        setLoading(false);
        return;
      }

      // Check if user was already referred by someone else
      const { data: alreadyReferred } = await supabase
        .from("referrals")
        .select("id, referrer_id")
        .eq("referred_id", selectedReferred.id)
        .single();

      if (alreadyReferred) {
        toast.error("This user was already referred by another user");
        setLoading(false);
        return;
      }

      // Create the referral
      const { error } = await supabase
        .from("referrals")
        .insert({
          referrer_id: selectedReferrer.id,
          referred_id: selectedReferred.id,
          referral_code: selectedReferrer.referral_code || 'MANUAL',
          status: 'completed',
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update the referrer's successful_referrals count
      const { data: profile } = await supabase
        .from("profiles")
        .select("successful_referrals")
        .eq("id", selectedReferrer.id)
        .single();

      await supabase
        .from("profiles")
        .update({ 
          successful_referrals: (profile?.successful_referrals || 0) + 1
        })
        .eq("id", selectedReferrer.id);

      // Update referred_by on the referred user's profile
      await supabase
        .from("profiles")
        .update({ referred_by: selectedReferrer.id })
        .eq("id", selectedReferred.id);

      toast.success("Referral created successfully");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating referral:", error);
      toast.error("Failed to create referral");
    } finally {
      setLoading(false);
    }
  };

  const UserCard = ({ user, selected, onSelect }: { user: User; selected: boolean; onSelect: () => void }) => (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
        selected 
          ? "bg-primary/10 border border-primary/30" 
          : "hover:bg-muted/50 border border-transparent"
      }`}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
          {user.full_name || user.username}
        </p>
        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
      </div>
      {selected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
            <UserPlus className="h-5 w-5" />
            Add Referral
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
            Manually create a referral relationship between two users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Referrer Selection */}
          <div className="space-y-3">
            <Label style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
              Referrer (who referred)
            </Label>
            {selectedReferrer ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedReferrer.avatar_url || undefined} />
                    <AvatarFallback>{selectedReferrer.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{selectedReferrer.full_name || selectedReferrer.username}</p>
                    <p className="text-xs text-muted-foreground">@{selectedReferrer.username}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectedReferrer(null);
                    setReferrerSearch("");
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username or name..."
                    value={referrerSearch}
                    onChange={(e) => setReferrerSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {referrerResults.length > 0 && (
                  <ScrollArea className="h-[160px] rounded-lg border">
                    <div className="p-2 space-y-1">
                      {referrerResults.map((user) => (
                        <UserCard
                          key={user.id}
                          user={user}
                          selected={false}
                          onSelect={() => {
                            setSelectedReferrer(user);
                            setReferrerResults([]);
                          }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            )}
          </div>

          {/* Arrow */}
          {selectedReferrer && (
            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          )}

          {/* Referred Selection */}
          {selectedReferrer && (
            <div className="space-y-3">
              <Label style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                Referred user (who was referred)
              </Label>
              {selectedReferred ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedReferred.avatar_url || undefined} />
                      <AvatarFallback>{selectedReferred.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{selectedReferred.full_name || selectedReferred.username}</p>
                      <p className="text-xs text-muted-foreground">@{selectedReferred.username}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSelectedReferred(null);
                      setReferredSearch("");
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by username or name..."
                      value={referredSearch}
                      onChange={(e) => setReferredSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {referredResults.length > 0 && (
                    <ScrollArea className="h-[160px] rounded-lg border">
                      <div className="p-2 space-y-1">
                        {referredResults.map((user) => (
                          <UserCard
                            key={user.id}
                            user={user}
                            selected={false}
                            onSelect={() => {
                              setSelectedReferred(user);
                              setReferredResults([]);
                            }}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateReferral}
            disabled={loading || !selectedReferrer || !selectedReferred}
          >
            {loading ? "Creating..." : "Create Referral"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
