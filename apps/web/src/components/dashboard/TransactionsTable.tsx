import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Clock, Hourglass, X, ChevronLeft, ChevronRight } from "lucide-react";

export interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'referral' | 'balance_correction' | 'transfer_sent' | 'transfer_received' | 'boost_earning' | 'transfer_out' | 'transfer_in';
  amount: number;
  date: Date;
  destination?: string;
  source?: string;
  status?: string;
  rejection_reason?: string;
  metadata?: any;
  campaign?: {
    id: string;
    title: string;
    brand_name: string;
    brand_logo_url: string | null;
    brand_slug?: string;
  } | null;
  boost?: {
    id: string;
    title: string;
    brand_name: string;
    brand_logo_url: string | null;
    brand_slug?: string;
  } | null;
  recipient?: {
    username: string;
    avatar_url: string | null;
  } | null;
  sender?: {
    username: string;
    avatar_url: string | null;
  } | null;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  onTransactionClick?: (transaction: Transaction) => void;
  showPagination?: boolean;
  itemsPerPage?: number;
  maxItems?: number;
  maxHeight?: string;
  className?: string;
  variant?: 'default' | 'compact';
}

export function TransactionsTable({
  transactions,
  onTransactionClick,
  showPagination = true,
  itemsPerPage = 10,
  maxItems,
  maxHeight,
  className = "",
  variant = "default"
}: TransactionsTableProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const displayTransactions = maxItems ? transactions.slice(0, maxItems) : transactions;
  const paginatedTransactions = showPagination
    ? displayTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : displayTransactions;

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">No transactions yet</p>
      </div>
    );
  }

  // Compact variant - redesigned list view for dashboard home
  if (variant === 'compact') {
    return (
      <div className={className}>
        <div
          className={`divide-y divide-border/50 ${maxHeight ? 'overflow-auto' : ''}`}
          style={maxHeight ? { maxHeight } : undefined}
        >
          {paginatedTransactions.map(transaction => {
            const brandName = transaction.boost?.brand_name || transaction.campaign?.brand_name;
            const brandLogo = transaction.boost?.brand_logo_url || transaction.campaign?.brand_logo_url;
            const isOutgoing = transaction.type === 'withdrawal' || transaction.type === 'transfer_sent' || transaction.type === 'transfer_out' || (transaction.type === 'balance_correction' && transaction.amount < 0);
            const isTransfer = transaction.type === 'transfer_sent' || transaction.type === 'transfer_received' || transaction.type === 'transfer_in' || transaction.type === 'transfer_out';
            const isIncomingTransfer = transaction.type === 'transfer_received' || transaction.type === 'transfer_in';
            const isOutgoingTransfer = transaction.type === 'transfer_sent' || transaction.type === 'transfer_out';

            // Get display name based on transaction type
            const displayName = brandName ||
              (isIncomingTransfer ? `@${transaction.sender?.username || transaction.metadata?.sender_username || 'user'}` :
              isOutgoingTransfer ? `@${transaction.recipient?.username || transaction.metadata?.recipient_username || 'user'}` :
              transaction.type === 'withdrawal' ? 'Withdrawal' :
              transaction.type === 'referral' ? 'Referral Bonus' :
              transaction.type === 'balance_correction' ? 'Balance Adjustment' :
              'Transaction');

            // Get subtitle based on transaction type
            const subtitle = transaction.type === 'earning' || transaction.type === 'boost_earning'
              ? 'Campaign payout'
              : transaction.type === 'withdrawal'
              ? 'To bank account'
              : isOutgoingTransfer
              ? 'Sent'
              : isIncomingTransfer
              ? 'Received'
              : transaction.type === 'referral'
              ? 'Bonus'
              : format(transaction.date, 'MMM d');

            return (
              <div
                key={transaction.id}
                onClick={() => onTransactionClick?.(transaction)}
                className="group flex items-center gap-4 py-3.5 px-1 cursor-pointer transition-all duration-200 hover:bg-muted/30 -mx-1 first:pt-1 last:pb-1"
              >
                {/* Source Icon with subtle shadow */}
                <div className="flex-shrink-0 relative">
                  {brandLogo ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-border/50 shadow-sm transition-shadow duration-200 group-hover:shadow-md">
                      <img src={brandLogo} alt={brandName || ''} className="w-full h-full object-cover" />
                    </div>
                  ) : isTransfer && isIncomingTransfer ? (
                    <Avatar className="h-10 w-10 ring-1 ring-border/50 shadow-sm transition-shadow duration-200 group-hover:shadow-md">
                      <AvatarImage src={transaction.sender?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-muted to-muted/50 text-muted-foreground">
                        {(transaction.sender?.username || transaction.metadata?.sender_username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : isTransfer && isOutgoingTransfer ? (
                    <Avatar className="h-10 w-10 ring-1 ring-border/50 shadow-sm transition-shadow duration-200 group-hover:shadow-md">
                      <AvatarImage src={transaction.recipient?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-muted to-muted/50 text-muted-foreground">
                        {(transaction.recipient?.username || transaction.metadata?.recipient_username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted to-muted/60 ring-1 ring-border/50 shadow-sm flex items-center justify-center transition-shadow duration-200 group-hover:shadow-md">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {brandName ? brandName.charAt(0).toUpperCase() : '$'}
                      </span>
                    </div>
                  )}
                  {/* Status dot indicator */}
                  {transaction.status && transaction.status !== 'completed' && (
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                      transaction.status === 'pending' ? 'bg-amber-500' :
                      transaction.status === 'in_transit' ? 'bg-blue-500' :
                      transaction.status === 'rejected' ? 'bg-red-500' : 'bg-muted'
                    }`} />
                  )}
                </div>

                {/* Source Name & Subtitle */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-tight tracking-tight">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <span>{subtitle}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{format(transaction.date, 'MMM d')}</span>
                  </p>
                </div>

                {/* Amount with better typography */}
                <div className="flex-shrink-0 text-right">
                  <span className={`text-sm font-semibold tabular-nums tracking-tight ${
                    isOutgoing
                      ? 'text-foreground'
                      : 'text-emerald-600 dark:text-emerald-500'
                  }`}>
                    {isOutgoing ? '−' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                  </span>
                  {transaction.status === 'completed' && (
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] text-muted-foreground">Paid</span>
                    </div>
                  )}
                  {transaction.status === 'pending' && (
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-amber-500" />
                      <span className="text-[10px] text-muted-foreground">Pending</span>
                    </div>
                  )}
                  {transaction.status === 'in_transit' && (
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <Hourglass className="h-3 w-3 text-blue-500" />
                      <span className="text-[10px] text-muted-foreground">In Transit</span>
                    </div>
                  )}
                  {transaction.status === 'rejected' && (
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <X className="h-3 w-3 text-red-500" />
                      <span className="text-[10px] text-muted-foreground">Rejected</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination for compact - refined styling */}
        {showPagination && displayTransactions.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground tabular-nums">
              {Math.min((currentPage - 1) * itemsPerPage + 1, displayTransactions.length)}–{Math.min(currentPage * itemsPerPage, displayTransactions.length)} of {displayTransactions.length}
            </p>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 rounded-lg transition-all duration-200 hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage * itemsPerPage >= displayTransactions.length}
                className="h-8 w-8 rounded-lg transition-all duration-200 hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default table variant
  return (
    <div className={className}>
      <div
        className="border border-border dark:border-[#141414] rounded-xl overflow-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-b-0">
            <TableRow className="border-b border-border dark:border-[#141414] hover:bg-transparent dark:bg-[#0e0e0e]">
              <TableHead className="text-foreground font-medium text-sm h-12 bg-card">Source</TableHead>
              <TableHead className="text-foreground font-medium text-sm h-12 bg-card">Destination</TableHead>
              <TableHead className="text-foreground font-medium text-sm h-12 bg-card">Status</TableHead>
              <TableHead className="text-foreground font-medium text-sm h-12 bg-card">Processed</TableHead>
              <TableHead className="text-foreground font-medium text-sm h-12 text-right bg-card">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.map(transaction => (
              <TableRow
                key={transaction.id}
                onClick={() => onTransactionClick?.(transaction)}
                className="cursor-pointer hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors border-border dark:border-[#141414]"
              >
                {/* Source */}
                <TableCell className="py-4">
                  {(() => {
                    // Earnings from brand (campaign or boost)
                    if ((transaction.type === 'earning' || transaction.type === 'boost_earning') && (transaction.boost?.brand_name || transaction.campaign?.brand_name)) {
                      const brand = transaction.boost || transaction.campaign;
                      return (
                        <div
                          className="flex items-center gap-2 hover:underline cursor-pointer"
                          onClick={e => {
                            e.stopPropagation();
                            if (brand?.brand_slug) navigate(`/b/${brand.brand_slug}`);
                          }}
                        >
                          {brand?.brand_logo_url ? (
                            <div className="w-6 h-6 rounded-[7px] overflow-hidden flex-shrink-0">
                              <img src={brand.brand_logo_url} alt={brand.brand_name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-[7px] bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-foreground font-medium">
                                {brand?.brand_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-sm font-medium">{brand?.brand_name}</span>
                        </div>
                      );
                    }
                    // Incoming transfer - show sender
                    if ((transaction.type === 'transfer_received' || transaction.type === 'transfer_in') && (transaction.sender || transaction.metadata?.sender_username)) {
                      return (
                        <div
                          className="flex items-center gap-2 hover:underline cursor-pointer"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/@${transaction.sender?.username || transaction.metadata.sender_username}`);
                          }}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={transaction.sender?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(transaction.sender?.username || transaction.metadata?.sender_username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">@{transaction.sender?.username || transaction.metadata.sender_username}</span>
                        </div>
                      );
                    }
                    // Outgoing (withdrawal, transfer_sent) - source is wallet
                    if (transaction.type === 'withdrawal' || transaction.type === 'transfer_sent' || transaction.type === 'transfer_out') {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-[7px] bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-foreground font-medium">💳</span>
                          </div>
                          <span className="text-sm font-medium">Wallet</span>
                        </div>
                      );
                    }
                    // Referral bonus
                    if (transaction.type === 'referral') {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-[7px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs">🎁</span>
                          </div>
                          <span className="text-sm font-medium">Referral Bonus</span>
                        </div>
                      );
                    }
                    // Balance correction
                    if (transaction.type === 'balance_correction') {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-[7px] bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xs">⚙️</span>
                          </div>
                          <span className="text-sm font-medium">Adjustment</span>
                        </div>
                      );
                    }
                    return <span className="text-sm text-muted-foreground">{transaction.source || '-'}</span>;
                  })()}
                </TableCell>

                {/* Destination */}
                <TableCell className="py-4">
                  {(() => {
                    // Outgoing transfer - show recipient
                    if ((transaction.type === 'transfer_sent' || transaction.type === 'transfer_out') && (transaction.recipient || transaction.metadata?.recipient_username)) {
                      return (
                        <div
                          className="flex items-center gap-2 hover:underline cursor-pointer"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/@${transaction.recipient?.username || transaction.metadata.recipient_username}`);
                          }}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={transaction.recipient?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(transaction.recipient?.username || transaction.metadata?.recipient_username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">@{transaction.recipient?.username || transaction.metadata.recipient_username}</span>
                        </div>
                      );
                    }
                    // Withdrawal - show withdrawal method/address
                    if (transaction.type === 'withdrawal') {
                      const withdrawalDest = transaction.destination || transaction.metadata?.withdrawal_address || transaction.metadata?.withdrawal_method;
                      if (withdrawalDest) {
                        // Truncate long addresses
                        const displayDest = withdrawalDest.length > 20
                          ? `${withdrawalDest.slice(0, 8)}...${withdrawalDest.slice(-6)}`
                          : withdrawalDest;
                        return (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-xs">🏦</span>
                            </div>
                            <span className="text-sm font-medium font-mono">{displayDest}</span>
                          </div>
                        );
                      }
                      return <span className="text-sm text-muted-foreground">External</span>;
                    }
                    // Incoming (earnings, transfers received) - destination is wallet
                    if (transaction.type === 'earning' || transaction.type === 'boost_earning' || transaction.type === 'transfer_received' || transaction.type === 'transfer_in' || transaction.type === 'referral') {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-[7px] bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xs">💳</span>
                          </div>
                          <span className="text-sm font-medium">Wallet</span>
                        </div>
                      );
                    }
                    // Balance correction
                    if (transaction.type === 'balance_correction') {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-[7px] bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xs">💳</span>
                          </div>
                          <span className="text-sm font-medium">Wallet</span>
                        </div>
                      );
                    }
                    return <span className="text-sm text-foreground">{transaction.destination || 'Wallet'}</span>;
                  })()}
                </TableCell>

                {/* Status */}
                <TableCell className="py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    transaction.status === 'completed' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                    transaction.status === 'pending' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                    transaction.status === 'in_transit' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                    transaction.status === 'rejected' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {transaction.status === 'completed' && <Check className="h-3 w-3" />}
                    {transaction.status === 'pending' && <Clock className="h-3 w-3" />}
                    {transaction.status === 'in_transit' && <Hourglass className="h-3 w-3" />}
                    {transaction.status === 'rejected' && <X className="h-3 w-3" />}
                    {transaction.status === 'completed' ? 'Completed' :
                      transaction.status === 'pending' ? 'Pending' :
                      transaction.status === 'in_transit' ? 'In Transit' :
                      transaction.status === 'rejected' ? 'Rejected' :
                      transaction.status?.charAt(0).toUpperCase() + transaction.status?.slice(1)}
                  </span>
                </TableCell>

                {/* Processed */}
                <TableCell className="py-4 text-sm text-muted-foreground">
                  {transaction.status === 'completed' ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="underline decoration-dotted cursor-pointer hover:text-foreground">
                            {format(transaction.date, 'MMM d')}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-popover border border-border rounded-xl shadow-xl p-3 max-w-[200px]">
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground">Payment Completed</p>
                            <p className="text-sm font-medium">{format(transaction.date, 'MMMM d, yyyy')}</p>
                            <p className="text-xs text-muted-foreground">{format(transaction.date, 'h:mm a')}</p>
                            <div className="flex items-center gap-1.5 pt-1 border-t border-border mt-1">
                              <Check className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-green-500">Successfully processed</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : transaction.status === 'rejected' ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="underline decoration-dotted cursor-pointer hover:text-foreground text-red-500">
                            {format(transaction.date, 'MMM d')}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-popover border border-border rounded-xl shadow-xl p-3 max-w-[240px]">
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground">Rejected</p>
                            <p className="text-sm font-medium">{format(transaction.date, 'MMMM d, yyyy')}</p>
                            <p className="text-xs text-muted-foreground">{format(transaction.date, 'h:mm a')}</p>
                            {transaction.rejection_reason && (
                              <div className="pt-1 border-t border-border mt-1">
                                <p className="text-xs text-red-500">Reason: {transaction.rejection_reason}</p>
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : '-'}
                </TableCell>

                {/* Amount */}
                <TableCell className="py-4 text-right">
                  {(() => {
                    const isDeduction = transaction.type === 'withdrawal' || transaction.type === 'transfer_sent' || transaction.type === 'transfer_out' || (transaction.type === 'balance_correction' && transaction.amount < 0) || (transaction.type !== 'transfer_in' && transaction.type !== 'transfer_received' && transaction.amount < 0);
                    return (
                      <span className={isDeduction ? '' : 'text-emerald-500'}>
                        {isDeduction ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    );
                  })()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {showPagination && displayTransactions.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#dadce2]/0">
          <p className="text-sm text-muted-foreground">
            Viewing {Math.min((currentPage - 1) * itemsPerPage + 1, displayTransactions.length)}-{Math.min(currentPage * itemsPerPage, displayTransactions.length)} of {displayTransactions.length} transactions
          </p>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage * itemsPerPage >= displayTransactions.length}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
