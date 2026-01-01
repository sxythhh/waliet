import { UserContext, TicketStatus } from "@/types/tickets";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import {
  User,
  Mail,
  Wallet,
  Clock,
  Shield,
  Globe,
  ExternalLink,
  MessageSquare,
  CreditCard,
  X,
} from "lucide-react";
import { statusStyles } from "./constants";

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
        <div className="p-4 border-b border-border">
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-10 w-full bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!userContext) {
    return (
      <div className="h-full flex flex-col border-l border-border bg-background">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-medium">User Context</h3>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Select a ticket to view user context
          </p>
        </div>
      </div>
    );
  }

  const { profile, wallet, social_accounts, ticket_history, recent_transactions } = userContext;

  // Trust score color
  const getTrustColor = (score?: number) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="h-full flex flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <h3 className="text-sm font-medium">User Context</h3>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Profile Header */}
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback>
                {profile.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{profile.full_name || profile.username}</p>
              <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
              {onViewProfile && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => onViewProfile(profile.id)}
                >
                  View Profile <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Quick Stats */}
          <div className="space-y-3">
            {/* Trust Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Trust Score</span>
              </div>
              <span className={cn("font-semibold", getTrustColor(profile.trust_score))}>
                {profile.trust_score !== undefined ? `${profile.trust_score}%` : "N/A"}
              </span>
            </div>

            {/* Demographics Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Demographics</span>
              </div>
              <span className="font-medium">
                {profile.demographics_score !== undefined ? `${profile.demographics_score}%` : "N/A"}
              </span>
            </div>

            {/* Total Earnings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <span>Total Earnings</span>
              </div>
              <span className="font-medium">
                ${(profile.total_earnings || 0).toFixed(2)}
              </span>
            </div>

            {/* Wallet Balance */}
            {wallet && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span>Balance</span>
                </div>
                <span className="font-medium text-emerald-500">
                  ${wallet.balance.toFixed(2)}
                </span>
              </div>
            )}

            {/* Member Since */}
            {profile.created_at && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Member Since</span>
                </div>
                <span className="text-sm">
                  {format(new Date(profile.created_at), "MMM yyyy")}
                </span>
              </div>
            )}

            {/* Country */}
            {profile.country && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>Country</span>
                </div>
                <span className="text-sm">{profile.country}</span>
              </div>
            )}

            {/* Email */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </div>
              <span className="text-sm truncate max-w-[140px]" title={profile.email}>
                {profile.email}
              </span>
            </div>
          </div>

          {/* Social Accounts */}
          {social_accounts && social_accounts.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Connected Accounts
                </h4>
                <div className="space-y-2">
                  {social_accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm capitalize">{account.platform}</span>
                        {account.is_verified && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {account.follower_count?.toLocaleString() || "—"} followers
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Ticket History */}
          {ticket_history && ticket_history.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Previous Tickets
                </h4>
                <div className="space-y-2">
                  {ticket_history.slice(0, 5).map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => onViewTicket?.(ticket.id)}
                      className="w-full text-left p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {ticket.ticket_number}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1 py-0", statusStyles[ticket.status as TicketStatus])}
                        >
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="text-sm truncate mt-1">{ticket.subject}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Recent Transactions */}
          {recent_transactions && recent_transactions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Recent Transactions
                </h4>
                <div className="space-y-2">
                  {recent_transactions.slice(0, 5).map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div>
                        <p className="text-sm capitalize">{txn.type.replace("_", " ")}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(txn.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-medium",
                          txn.type.includes("earn") || txn.type.includes("credit")
                            ? "text-emerald-500"
                            : "text-foreground"
                        )}>
                          ${txn.amount.toFixed(2)}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1 py-0",
                            txn.status === "completed"
                              ? "text-emerald-500 border-emerald-500/30"
                              : "text-muted-foreground"
                          )}
                        >
                          {txn.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
