import { UserContext, TicketStatus } from "@/types/tickets";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

interface TicketUserContextProps {
  userContext: UserContext | null;
  loading?: boolean;
  onClose?: () => void;
  onViewProfile?: (userId: string) => void;
  onViewTicket?: (ticketId: string) => void;
}

export function TicketUserContext({
  userContext,
  loading,
  onClose,
  onViewProfile,
  onViewTicket,
}: TicketUserContextProps) {
  if (loading) {
    return (
      <div className="h-full flex flex-col border-l border-border bg-background">
        <div className="p-3 border-b border-border">
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="p-3 space-y-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="space-y-1.5">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-2.5 w-28 bg-muted rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-8 w-full bg-muted rounded" />
            <div className="h-8 w-full bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!userContext) {
    return (
      <div className="h-full flex flex-col border-l border-border bg-background">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Context</span>
          {onClose && (
            <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
              Close
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            Select a ticket to view user context
          </p>
        </div>
      </div>
    );
  }

  const { profile, wallet, social_accounts, ticket_history, recent_transactions } = userContext;

  return (
    <div className="h-full flex flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Context</span>
        {onClose && (
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            Close
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Profile Header */}
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                {profile.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.full_name || profile.username}</p>
              <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
              {onViewProfile && (
                <button
                  onClick={() => onViewProfile(profile.id)}
                  className="text-[10px] text-muted-foreground hover:text-foreground mt-0.5"
                >
                  View profile
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Trust</span>
              <span className="font-medium">
                {profile.trust_score !== undefined ? `${profile.trust_score}%` : "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Demographics</span>
              <span className="font-medium">
                {profile.demographics_score !== undefined ? `${profile.demographics_score}%` : "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Earnings</span>
              <span className="font-medium">${(profile.total_earnings || 0).toFixed(2)}</span>
            </div>
            {wallet && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Balance</span>
                <span className="font-medium">${wallet.balance.toFixed(2)}</span>
              </div>
            )}
            {profile.created_at && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Joined</span>
                <span>{format(new Date(profile.created_at), "MMM yyyy")}</span>
              </div>
            )}
            {profile.country && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Country</span>
                <span>{profile.country}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Email</span>
              <span className="truncate max-w-[120px]" title={profile.email}>
                {profile.email}
              </span>
            </div>
          </div>

          {/* Social Accounts */}
          {social_accounts && social_accounts.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Accounts
              </h4>
              <div className="space-y-1">
                {social_accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 text-xs"
                  >
                    <span className="capitalize">{account.platform}</span>
                    <span className="text-muted-foreground">
                      {account.follower_count?.toLocaleString() || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ticket History */}
          {ticket_history && ticket_history.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                History
              </h4>
              <div className="space-y-1">
                {ticket_history.slice(0, 5).map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => onViewTicket?.(ticket.id)}
                    className="w-full text-left py-1.5 px-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-muted-foreground text-[10px]">
                        {ticket.ticket_number}
                      </span>
                      <span className="text-muted-foreground capitalize">
                        {ticket.status}
                      </span>
                    </div>
                    <p className="truncate mt-0.5">{ticket.subject}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          {recent_transactions && recent_transactions.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Transactions
              </h4>
              <div className="space-y-1">
                {recent_transactions.slice(0, 5).map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 text-xs"
                  >
                    <div>
                      <p className="capitalize">{txn.type.replace("_", " ")}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(txn.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <span className="font-medium">${txn.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
