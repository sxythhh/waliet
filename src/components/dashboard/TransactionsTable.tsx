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
  type: 'earning' | 'withdrawal' | 'referral' | 'balance_correction' | 'transfer_sent' | 'transfer_received' | 'boost_earning' | 'transfer_out';
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
}

export function TransactionsTable({
  transactions,
  onTransactionClick,
  showPagination = true,
  itemsPerPage = 10,
  maxItems,
  maxHeight,
  className = ""
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

  return (
    <div className={className}>
      <div
        className="border border-[#dce1eb] dark:border-[#141414] rounded-xl overflow-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-b-0">
            <TableRow className="border-b border-[#dce1eb] dark:border-[#141414] hover:bg-transparent dark:bg-[#0e0e0e]">
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
                className="cursor-pointer hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors border-[#dce1eb] dark:border-[#141414]"
              >
                {/* Source */}
                <TableCell className="py-4">
                  {transaction.boost?.brand_name ? (
                    <div
                      className="flex items-center gap-2 hover:underline cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        if (transaction.boost?.brand_slug) {
                          navigate(`/b/${transaction.boost.brand_slug}`);
                        }
                      }}
                    >
                      {transaction.boost?.brand_logo_url ? (
                        <div className="w-6 h-6 rounded-[7px] overflow-hidden flex-shrink-0">
                          <img src={transaction.boost.brand_logo_url} alt={transaction.boost.brand_name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-[7px] bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-foreground font-medium">
                            {transaction.boost.brand_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium">{transaction.boost.brand_name}</span>
                    </div>
                  ) : transaction.campaign?.brand_name ? (
                    <div
                      className="flex items-center gap-2 hover:underline cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        if (transaction.campaign?.brand_slug) {
                          navigate(`/b/${transaction.campaign.brand_slug}`);
                        }
                      }}
                    >
                      {transaction.campaign?.brand_logo_url ? (
                        <div className="w-6 h-6 rounded-[7px] overflow-hidden flex-shrink-0">
                          <img src={transaction.campaign.brand_logo_url} alt={transaction.campaign.brand_name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-[7px] bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-foreground font-medium">
                            {transaction.campaign.brand_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium">{transaction.campaign.brand_name}</span>
                    </div>
                  ) : transaction.type === 'transfer_received' && (transaction.sender || transaction.metadata?.sender_username) ? (
                    <div
                      className="flex items-center gap-2 hover:underline cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/@${transaction.sender?.username || transaction.metadata.sender_username}`);
                      }}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={transaction.sender?.avatar_url || undefined} alt={transaction.sender?.username || transaction.metadata?.sender_username} />
                        <AvatarFallback className="text-xs">
                          {(transaction.sender?.username || transaction.metadata?.sender_username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">@{transaction.sender?.username || transaction.metadata.sender_username}</span>
                    </div>
                  ) : transaction.type === 'withdrawal' || transaction.type === 'transfer_sent' || transaction.type === 'transfer_out' ? (
                    <span className="text-sm text-foreground">Wallet</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">{transaction.source || '-'}</span>
                  )}
                </TableCell>

                {/* Destination */}
                <TableCell className="py-4">
                  {transaction.type === 'transfer_sent' && transaction.recipient ? (
                    <div
                      className="flex items-center gap-2 hover:underline cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/@${transaction.recipient?.username}`);
                      }}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={transaction.recipient.avatar_url || undefined} alt={transaction.recipient.username} />
                        <AvatarFallback className="text-xs">
                          {transaction.recipient.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">@{transaction.recipient.username}</span>
                    </div>
                  ) : transaction.type === 'transfer_sent' && transaction.metadata?.recipient_username ? (
                    <div
                      className="flex items-center gap-2 hover:underline cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/@${transaction.metadata.recipient_username}`);
                      }}
                    >
                      <span className="text-sm font-medium">@{transaction.metadata.recipient_username}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-foreground">
                      {transaction.destination || 'Wallet'}
                    </span>
                  )}
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
                  <span className={transaction.type === 'withdrawal' || transaction.type === 'transfer_sent' || transaction.type === 'transfer_out' ? '' : 'text-emerald-500'}>
                    {transaction.type === 'withdrawal' || transaction.type === 'transfer_sent' || transaction.type === 'transfer_out' ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                  </span>
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
