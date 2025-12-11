import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import wordmarkLogo from "@/assets/wordmark.ai.png";
import viralityLogo from "@/assets/virality-logo.webp";
import viralityGhostLogo from "@/assets/virality-ghost-logo.png";
import { DollarSign, TrendingUp, Wallet as WalletIcon, Plus, Trash2, CreditCard, ArrowUpRight, ChevronDown, ArrowDownLeft, Clock, X, Copy, Check, Eye, EyeOff, Hourglass, ArrowRightLeft, ChevronLeft, ChevronRight, Share2, Upload, RefreshCw, Gift, Star, Building2, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PayoutMethodDialog from "@/components/PayoutMethodDialog";
import { Separator } from "@/components/ui/separator";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Bar, BarChart } from "recharts";
import { format, subDays, subMonths, subYears, startOfWeek } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ethereumLogo from "@/assets/ethereum-logo.png";
import optimismLogo from "@/assets/optimism-logo.png";
import solanaLogo from "@/assets/solana-logo.png";
import polygonLogo from "@/assets/polygon-logo.png";
import usdcLogo from "@/assets/usdc-logo.png";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo-new.png";
import youtubeLogo from "@/assets/youtube-logo-new.png";
import paypalLogo from "@/assets/paypal-logo.svg";
import walletActiveIcon from "@/assets/wallet-active.svg";
import checkCircleFilledIcon from "@/assets/check-circle-filled.svg";
import { Skeleton } from "@/components/ui/skeleton";
import { P2PTransferDialog } from "@/components/P2PTransferDialog";
interface WalletData {
  id: string;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  payout_method: string | null;
  payout_details: any;
}
interface PayoutMethod {
  id: string;
  method: string;
  details: any;
}
interface EarningsDataPoint {
  date: string;
  amount: number;
}
interface WithdrawalDataPoint {
  date: string;
  earnings: number;
  withdrawals: number;
}
interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'referral' | 'balance_correction' | 'transfer_sent' | 'transfer_received';
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
  } | null;
}
type TimePeriod = '3D' | '1W' | '1M' | '3M' | '1Y' | 'TW';
export function WalletTab() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsDataPoint[]>([]);
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalDataPoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('3D');
  const [earningsChartOffset, setEarningsChartOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<string>("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionSheetOpen, setTransactionSheetOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [p2pTransferDialogOpen, setP2pTransferDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [availableCampaigns, setAvailableCampaigns] = useState<Array<{
    id: string;
    title: string;
    brand_name: string;
  }>>([]);
  const [earningsChartPeriod, setEarningsChartPeriod] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("");
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchWallet();

    // Set up real-time listener for payout requests
    const channel = supabase.channel('payout-updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'payout_requests'
    }, payload => {
      console.log('Payout request updated:', payload);
      // Refetch wallet and transactions when payout request changes
      fetchWallet();
      fetchTransactions();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    if (wallet) {
      fetchEarningsData();
      fetchWithdrawalData();
      fetchTransactions();
    }
  }, [timePeriod, wallet, earningsChartOffset, earningsChartPeriod]);
  const getDateRange = () => {
    const now = new Date();
    switch (timePeriod) {
      case '3D':
        return {
          start: subDays(now, 3),
          end: now
        };
      case '1W':
        return {
          start: subDays(now, 7),
          end: now
        };
      case '1M':
        return {
          start: subMonths(now, 1),
          end: now
        };
      case '3M':
        return {
          start: subMonths(now, 3),
          end: now
        };
      case '1Y':
        return {
          start: subYears(now, 1),
          end: now
        };
      case 'TW':
        return {
          start: startOfWeek(now),
          end: now
        };
      default:
        return {
          start: subMonths(now, 1),
          end: now
        };
    }
  };
  const fetchEarningsData = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const now = new Date();
    let start: Date;
    let days: number;

    // Calculate date range based on selected period
    switch (earningsChartPeriod) {
      case '1D':
        start = subDays(now, 1);
        days = 1;
        break;
      case '1W':
        start = subDays(now, 7);
        days = 7;
        break;
      case '1M':
        start = subMonths(now, 1);
        days = 30;
        break;
      case 'ALL':
      default:
        // Get all transactions to determine the earliest date
        const {
          data: allTxns
        } = await supabase.from("wallet_transactions").select("created_at").eq("user_id", session.user.id).order("created_at", {
          ascending: true
        }).limit(1);
        if (allTxns && allTxns.length > 0) {
          start = new Date(allTxns[0].created_at);
          days = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          start = subMonths(now, 1);
          days = 30;
        }
        break;
    }

    // Get all earning transactions from the beginning
    const {
      data: allTransactions
    } = await supabase.from("wallet_transactions").select("amount, created_at, type").eq("user_id", session.user.id).gte("created_at", start.toISOString()).order("created_at", {
      ascending: true
    });
    const dataPoints: EarningsDataPoint[] = [];
    let cumulativeEarnings = 0;

    // Generate data points
    const pointCount = Math.min(days, 30); // Max 30 points for performance
    const interval = Math.max(1, Math.floor(days / pointCount));
    for (let i = 0; i <= pointCount; i++) {
      const currentDate = new Date(start.getTime() + i * interval * 24 * 60 * 60 * 1000);
      if (currentDate > now) break;
      const dateStr = format(currentDate, earningsChartPeriod === '1D' ? 'HH:mm' : 'MMM dd');

      // Calculate cumulative earnings up to this date (only positive transactions)
      if (allTransactions) {
        allTransactions.forEach(txn => {
          const txnDate = new Date(txn.created_at);
          if (txnDate <= currentDate && txnDate > new Date(start.getTime() + (i - 1) * interval * 24 * 60 * 60 * 1000)) {
            const amount = Number(txn.amount) || 0;
            // Only count earnings (positive amounts)
            if (['earning', 'admin_adjustment', 'bonus', 'refund', 'transfer_received'].includes(txn.type) && amount > 0) {
              cumulativeEarnings += amount;
            }
          }
        });
      }
      dataPoints.push({
        date: dateStr,
        amount: Number(cumulativeEarnings.toFixed(2))
      });
    }

    // Ensure the last point shows current total earned
    if (dataPoints.length > 0 && wallet && earningsChartPeriod === 'ALL') {
      dataPoints[dataPoints.length - 1].amount = Number(wallet.total_earned.toFixed(2));
    }
    setEarningsData(dataPoints);
  };
  const fetchWithdrawalData = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;

    // Calculate date range for 7 days with offset
    const now = new Date();
    const end = subDays(now, earningsChartOffset * 7);
    const start = subDays(end, 7);

    // Fetch all wallet transactions
    const {
      data: walletTransactions
    } = await supabase.from("wallet_transactions").select("amount, created_at, type").eq("user_id", session.user.id).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()).order("created_at", {
      ascending: true
    });
    const dataPoints: WithdrawalDataPoint[] = [];
    for (let i = 0; i <= 7; i++) {
      const currentDate = subDays(end, 7 - i);
      const dateStr = format(currentDate, 'MMM dd');
      let earningsAmount = 0;
      let withdrawalsAmount = 0;
      if (walletTransactions) {
        walletTransactions.forEach(txn => {
          const txnDate = new Date(txn.created_at);
          if (format(txnDate, 'MMM dd') === dateStr) {
            if (['earning', 'admin_adjustment', 'bonus', 'refund', 'transfer_received'].includes(txn.type)) {
              earningsAmount += Number(txn.amount) || 0;
            } else if (txn.type === 'withdrawal' || txn.type === 'transfer_sent') {
              withdrawalsAmount += Number(txn.amount) || 0;
            }
          }
        });
      }
      dataPoints.push({
        date: dateStr,
        earnings: Number(earningsAmount.toFixed(2)),
        withdrawals: Number(withdrawalsAmount.toFixed(2))
      });
    }
    setWithdrawalData(dataPoints);
  };
  const fetchTransactions = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch wallet transactions
    const {
      data: walletTransactions
    } = await supabase.from("wallet_transactions").select("*").eq("user_id", session.user.id).order("created_at", {
      ascending: false
    });

    // Fetch payout requests to get full payout details
    const {
      data: payoutRequests
    } = await supabase.from("payout_requests").select("*").eq("user_id", session.user.id);

    // Extract unique campaign IDs from earnings transactions
    const campaignIds = walletTransactions?.filter(txn => {
      const metadata = txn.metadata as any;
      return txn.type === 'earning' && metadata?.campaign_id;
    }).map(txn => (txn.metadata as any).campaign_id).filter((id, index, self) => id && self.indexOf(id) === index) || [];

    // Fetch campaign details if we have campaign IDs
    let campaignsMap = new Map();
    if (campaignIds.length > 0) {
      const {
        data: campaigns
      } = await supabase.from("campaigns").select("id, title, brand_name, brand_logo_url, brands(logo_url)").in("id", campaignIds);
      campaigns?.forEach(campaign => {
        campaignsMap.set(campaign.id, {
          ...campaign,
          // Use brands.logo_url as fallback if brand_logo_url is null
          brand_logo_url: campaign.brand_logo_url || (campaign.brands as any)?.logo_url
        });
      });
    }

    // Calculate total pending and in-transit withdrawals
    const pendingAmount = payoutRequests?.filter(pr => pr.status === 'pending' || pr.status === 'in_transit').reduce((sum, pr) => sum + Number(pr.amount), 0) || 0;
    setPendingWithdrawals(pendingAmount);

    // Extract unique campaigns for filter dropdown
    const uniqueCampaigns = Array.from(campaignsMap.values()).map(c => ({
      id: c.id,
      title: c.title,
      brand_name: c.brand_name
    }));
    setAvailableCampaigns(uniqueCampaigns);
    const allTransactions: Transaction[] = [];
    if (walletTransactions) {
      walletTransactions.forEach(txn => {
        const metadata = txn.metadata as any;
        let source = '';
        let destination = '';
        let payoutDetails = null;

        // Try to match with payout request to get full details
        if (txn.type === 'withdrawal' && payoutRequests) {
          const matchingPayout = payoutRequests.find(pr => Math.abs(new Date(pr.requested_at).getTime() - new Date(txn.created_at).getTime()) < 5000 && Number(pr.amount) === Number(txn.amount));
          if (matchingPayout) {
            payoutDetails = matchingPayout.payout_details;
            // Add rejection reason if available
            if (matchingPayout.rejection_reason) {
              const metadataObj = typeof metadata === 'object' && metadata !== null ? metadata : {};
              txn.metadata = {
                ...metadataObj,
                rejection_reason: matchingPayout.rejection_reason
              };
            }
          }
        }
        switch (txn.type) {
          case 'admin_adjustment':
            source = 'Virality Admin';
            destination = 'Wallet';
            break;
          case 'earning':
            source = 'Campaign Submission';
            destination = 'Wallet';
            break;
          case 'withdrawal':
            const payoutMethod = metadata?.payout_method;
            if (payoutMethod === 'paypal') {
              destination = 'PayPal';
            } else if (payoutMethod === 'crypto') {
              destination = `Crypto (${metadata?.network || 'ETH'})`;
            } else if (payoutMethod === 'bank') {
              destination = 'Bank Transfer';
            } else if (payoutMethod === 'wise') {
              destination = 'Wise';
            } else if (payoutMethod === 'revolut') {
              destination = 'Revolut';
            } else if (payoutMethod === 'tips') {
              destination = 'TIPS';
            } else {
              destination = payoutMethod || 'Unknown';
            }
            break;
          case 'bonus':
            source = 'Bonus Payment';
            destination = 'Wallet';
            break;
          case 'refund':
            source = 'Refund';
            destination = 'Wallet';
            break;
          case 'transfer_sent':
            source = 'Wallet';
            destination = `@${metadata?.recipient_username || 'User'}`;
            break;
          case 'transfer_received':
            source = `@${metadata?.sender_username || 'User'}`;
            destination = 'Wallet';
            break;
        }
        allTransactions.push({
          id: txn.id,
          type: txn.type === 'balance_correction' ? 'balance_correction' : txn.type === 'transfer_sent' ? 'transfer_sent' : txn.type === 'transfer_received' ? 'transfer_received' : txn.type === 'admin_adjustment' || txn.type === 'earning' || txn.type === 'bonus' || txn.type === 'refund' ? 'earning' : 'withdrawal',
          amount: Number(txn.amount) || 0,
          date: new Date(txn.created_at),
          destination,
          source: source || txn.description || '',
          status: txn.status,
          rejection_reason: (txn.metadata as any)?.rejection_reason,
          metadata: Object.assign({}, txn.metadata as any, {
            payoutDetails
          }),
          campaign: metadata?.campaign_id ? campaignsMap.get(metadata.campaign_id) || null : null
        });
      });
    }
    setTransactions(allTransactions);
  };
  const fetchWallet = async () => {
    setLoading(true);
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const {
      data,
      error
    } = await supabase.from("wallets").select("*").eq("user_id", session.user.id).single();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch wallet data"
      });
    } else {
      setWallet(data);
      if (data?.payout_details) {
        const methods = Array.isArray(data.payout_details) ? data.payout_details : [data.payout_details];
        setPayoutMethods(methods.map((m: any, i: number) => ({
          id: `method-${i}`,
          method: m.method || data.payout_method,
          details: m.details || m
        })));
      }
    }
    setLoading(false);
  };
  const handleAddPayoutMethod = async (method: string, details: any) => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session || !wallet) return;
    if (payoutMethods.length >= 3) {
      toast({
        variant: "destructive",
        title: "Limit Reached",
        description: "You can only add up to 3 payout methods"
      });
      return;
    }
    const updatedMethods = [...payoutMethods, {
      id: `method-${Date.now()}`,
      method,
      details
    }];
    console.log("Adding payout method:", {
      method,
      details
    });
    console.log("Updated methods array:", updatedMethods);
    const payoutDetailsPayload = updatedMethods.map(m => ({
      method: m.method,
      details: m.details
    }));
    console.log("Payload to Supabase:", payoutDetailsPayload);
    const {
      error
    } = await supabase.from("wallets").update({
      payout_method: method,
      payout_details: payoutDetailsPayload
    }).eq("id", wallet.id);
    if (error) {
      console.error("Supabase error when adding payout method:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to add payout method: ${error.message}`
      });
    } else {
      console.log("Payout method added successfully");
      toast({
        title: "Success",
        description: "Payout method added successfully"
      });
      fetchWallet();
    }
  };
  const handleDeleteMethod = async (methodId: string) => {
    if (!wallet) return;
    const updatedMethods = payoutMethods.filter(m => m.id !== methodId);
    const {
      error
    } = await supabase.from("wallets").update({
      payout_method: updatedMethods.length > 0 ? updatedMethods[0].method : null,
      payout_details: updatedMethods.length > 0 ? updatedMethods.map(m => ({
        method: m.method,
        details: m.details
      })) : null
    }).eq("id", wallet.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove payout method"
      });
    } else {
      toast({
        title: "Success",
        description: "Payout method removed"
      });
      fetchWallet();
    }
  };
  const handleSetDefaultMethod = async (methodId: string) => {
    if (!wallet) return;
    const methodIndex = payoutMethods.findIndex(m => m.id === methodId);
    if (methodIndex === -1 || methodIndex === 0) return; // Already default or not found

    const selectedMethod = payoutMethods[methodIndex];

    // Block UPI from being set as default
    if (selectedMethod.method === 'upi') {
      toast({
        variant: "destructive",
        title: "Temporarily Disabled",
        description: "UPI payouts are temporarily disabled. Please use another payment method."
      });
      return;
    }
    const updatedMethods = [...payoutMethods];
    const [method] = updatedMethods.splice(methodIndex, 1);
    updatedMethods.unshift(method);
    const {
      error
    } = await supabase.from("wallets").update({
      payout_method: method.method,
      payout_details: updatedMethods.map(m => ({
        method: m.method,
        details: m.details
      }))
    }).eq("id", wallet.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to set default method"
      });
    } else {
      toast({
        title: "Success",
        description: "Default payment method updated"
      });
      fetchWallet();
    }
  };
  const handleRequestPayout = async () => {
    if (!wallet?.balance || wallet.balance < 20) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "Minimum payout amount is $20"
      });
      return;
    }
    if (payoutMethods.length === 0) {
      toast({
        variant: "destructive",
        title: "No Payout Method",
        description: "Please add a payout method first"
      });
      return;
    }
    setSelectedPayoutMethod(payoutMethods[0].id);
    setPayoutAmount(wallet.balance.toString());
    setPayoutDialogOpen(true);
  };
  const generateTransactionImage = async (transaction: Transaction) => {
    try {
      // Load and convert Virality logo to base64
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = viralityGhostLogo;
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
      });

      // Convert Virality logo to base64
      const logoCanvas = document.createElement('canvas');
      logoCanvas.width = logoImg.width;
      logoCanvas.height = logoImg.height;
      const logoCtx = logoCanvas.getContext('2d');
      if (logoCtx) {
        logoCtx.drawImage(logoImg, 0, 0);
      }
      const logoBase64 = logoCanvas.toDataURL('image/png');

      // Load and convert brand logo if available
      let brandLogoBase64 = '';
      if (transaction.campaign?.brand_logo_url) {
        try {
          const brandLogoImg = new Image();
          brandLogoImg.crossOrigin = "anonymous";
          brandLogoImg.src = transaction.campaign.brand_logo_url;
          await new Promise((resolve, reject) => {
            brandLogoImg.onload = resolve;
            brandLogoImg.onerror = () => resolve(null); // Continue without brand logo if it fails
          });
          const brandLogoCanvas = document.createElement('canvas');
          brandLogoCanvas.width = brandLogoImg.width;
          brandLogoCanvas.height = brandLogoImg.height;
          const brandLogoCtx = brandLogoCanvas.getContext('2d');
          if (brandLogoCtx) {
            brandLogoCtx.drawImage(brandLogoImg, 0, 0);
          }
          brandLogoBase64 = brandLogoCanvas.toDataURL('image/png');
        } catch (e) {
          console.log('Failed to load brand logo:', e);
        }
      }

      // Create SVG with higher resolution and black background
      const svg = `
        <svg width="1600" height="800" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <style>
            text { font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; letter-spacing: -0.5px; }
          </style>
          
          <!-- Black background -->
          <rect width="1600" height="800" fill="#000000" rx="40"/>
          
          <!-- Virality Logo -->
          <image href="${logoBase64}" x="80" y="60" width="80" height="80"/>
          <text x="180" y="120" font-size="48" font-weight="bold" fill="#fff">Virality</text>
          
          <!-- Transaction Type -->
          <text x="80" y="220" font-size="32" fill="#888">Transaction Type</text>
          <text x="80" y="280" font-size="48" font-weight="bold" fill="#fff">
            ${transaction.type === 'earning' ? 'Payment' : transaction.type === 'transfer_sent' ? 'Transfer Sent' : transaction.type === 'transfer_received' ? 'Transfer Received' : 'Withdrawal'}
          </text>
          
          <!-- Amount -->
          <text x="80" y="380" font-size="32" fill="#888">Amount</text>
          <text x="80" y="460" font-size="96" font-weight="bold" fill="${transaction.type === 'earning' || transaction.type === 'transfer_received' ? '#10b981' : '#ef4444'}">
            ${transaction.type === 'earning' || transaction.type === 'transfer_received' ? '+' : '-'}$${Math.abs(transaction.amount).toFixed(2)}
          </text>
          
          <!-- Date -->
          <text x="80" y="580" font-size="32" fill="#888">Date</text>
          <text x="80" y="640" font-size="36" fill="#fff">${format(transaction.date, 'MMMM dd, yyyy')}</text>
          
          <!-- Status Badge -->
          ${transaction.status ? `
            <rect x="80" y="680" width="240" height="60" fill="${transaction.status === 'completed' ? '#10b98120' : transaction.status === 'rejected' ? '#ef444420' : '#f59e0b20'}" rx="16"/>
            <text x="200" y="724" font-size="28" font-weight="600" fill="${transaction.status === 'completed' ? '#10b981' : transaction.status === 'rejected' ? '#ef4444' : '#f59e0b'}" text-anchor="middle">
              ${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </text>
          ` : ''}
          
          <!-- Campaign Info if available -->
          ${transaction.campaign ? `
            <text x="900" y="380" font-size="32" fill="#888">Campaign</text>
            ${brandLogoBase64 ? `<image href="${brandLogoBase64}" x="900" y="400" width="60" height="60" preserveAspectRatio="xMidYMid meet"/>` : ''}
            <text x="${brandLogoBase64 ? '975' : '900'}" y="445" font-size="36" font-weight="600" fill="#fff">${transaction.campaign.title}</text>
          ` : ''}
          
          <!-- Transaction ID -->
          <text x="1520" y="760" font-size="24" fill="#555" text-anchor="end">${transaction.id.slice(0, 8)}...${transaction.id.slice(-8)}</text>
        </svg>
      `;

      // Convert SVG to blob
      const svgBlob = new Blob([svg], {
        type: 'image/svg+xml;charset=utf-8'
      });

      // Create canvas to convert to PNG
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        // Convert to data URL and show dialog
        const imageDataUrl = canvas.toDataURL('image/png');
        setGeneratedImageUrl(imageDataUrl);
        setShareDialogOpen(true);
      };
      img.src = url;
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate transaction image"
      });
    }
  };
  const handleDownloadImage = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.download = `virality-transaction-${Date.now()}.png`;
    link.href = generatedImageUrl;
    link.click();
    toast({
      title: "Transaction Image Downloaded",
      description: "Your transaction image has been saved successfully"
    });
  };
  const handleShareOnX = () => {
    if (!generatedImageUrl) return;

    // Open Twitter share dialog
    const tweetText = encodeURIComponent("Check out my Virality transaction! 💰");
    const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    toast({
      title: "Share on X",
      description: "Opening X share dialog. You can attach the downloaded image to your post."
    });
  };
  const handleConfirmPayout = async () => {
    if (isSubmittingPayout) return; // Prevent duplicate submissions

    if (!wallet || !payoutAmount || Number(payoutAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid amount"
      });
      return;
    }
    const amount = Number(payoutAmount);
    const selectedMethod = payoutMethods.find(m => m.id === selectedPayoutMethod);
    if (!selectedMethod) return;

    // Block UPI withdrawals
    if (selectedMethod.method === 'upi') {
      toast({
        variant: "destructive",
        title: "Temporarily Disabled",
        description: "UPI payouts are temporarily disabled. Please use another payment method."
      });
      return;
    }

    // Bank minimum is $250
    const minimumAmount = selectedMethod.method === 'bank' ? 250 : 20;
    if (amount < minimumAmount) {
      toast({
        variant: "destructive",
        title: "Minimum Amount",
        description: `Minimum payout amount is $${minimumAmount}${selectedMethod.method === 'bank' ? ' for bank transfers' : ''}`
      });
      return;
    }
    if (amount > wallet.balance) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "Amount exceeds available balance"
      });
      return;
    }
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    if (!selectedMethod) return;

    // Set submitting state BEFORE any async operations to prevent race conditions
    setIsSubmittingPayout(true);

    // Check for existing pending/in-transit withdrawal requests
    const {
      data: existingRequests,
      error: checkError
    } = await supabase.from("payout_requests").select("id").eq("user_id", session.user.id).in("status", ["pending", "in_transit"]);
    if (checkError) {
      setIsSubmittingPayout(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify withdrawal status"
      });
      return;
    }
    if (existingRequests && existingRequests.length > 0) {
      setIsSubmittingPayout(false);
      toast({
        variant: "destructive",
        title: "Pending Withdrawal Exists",
        description: "You already have a pending withdrawal request. Please wait for it to be processed before requesting another."
      });
      return;
    }
    try {
      const balance_before = wallet.balance;
      const balance_after = wallet.balance - amount;

      // Create payout request
      const {
        error: payoutError
      } = await supabase.from("payout_requests").insert({
        user_id: session.user.id,
        amount: amount,
        payout_method: selectedMethod.method,
        payout_details: selectedMethod.details,
        status: 'pending'
      });
      if (payoutError) throw payoutError;

      // Create wallet transaction
      const {
        error: txnError
      } = await supabase.from("wallet_transactions").insert({
        user_id: session.user.id,
        amount: -amount,
        // Negative for withdrawals
        type: 'withdrawal',
        status: 'pending',
        description: `Withdrawal to ${selectedMethod.method === 'paypal' ? 'PayPal' : 'Crypto'}`,
        metadata: {
          payout_method: selectedMethod.method,
          network: selectedMethod.details.network || null,
          balance_before: balance_before,
          balance_after: balance_after
        },
        created_by: session.user.id
      });
      if (txnError) throw txnError;

      // Update wallet balance
      const {
        error: walletError
      } = await supabase.from("wallets").update({
        balance: wallet.balance - amount,
        total_withdrawn: wallet.total_withdrawn + amount
      }).eq("id", wallet.id);
      if (walletError) throw walletError;

      // Send Discord notification
      try {
        await supabase.functions.invoke('notify-withdrawal', {
          body: {
            username: session.user.user_metadata?.username || 'Unknown',
            email: session.user.email || 'Unknown',
            amount: amount,
            payout_method: selectedMethod.method,
            payout_details: selectedMethod.details,
            balance_before: balance_before,
            balance_after: balance_after,
            date: new Date().toISOString()
          }
        });
      } catch (notifError) {
        console.error('Failed to send Discord notification:', notifError);
      }
      toast({
        title: "Payout Requested",
        description: "Your payout request has been submitted and will be processed within 3-5 business days."
      });
      setPayoutDialogOpen(false);
      fetchWallet();
      fetchTransactions();
    } catch (error: any) {
      // Rollback wallet update if transaction failed
      const {
        error: rollbackError
      } = await supabase.from("wallets").update({
        balance: wallet.balance,
        total_withdrawn: wallet.total_withdrawn
      }).eq("id", wallet.id);
      if (rollbackError) {
        console.error('Failed to rollback wallet update:', rollbackError);
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit payout request"
      });
    } finally {
      setIsSubmittingPayout(false);
    }
  };
  if (loading) {
    return <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>;
  }
  const totalEarnings = earningsData.reduce((sum, point) => sum + point.amount, 0);
  const timePeriodLabels: Record<TimePeriod, string> = {
    '3D': '3 Days',
    '1W': '1 Week',
    '1M': '1 Month',
    '3M': '3 Months',
    '1Y': '1 Year',
    'TW': 'This Week'
  };
  return <div className="space-y-6 max-w-6xl mx-auto pt-6 font-inter tracking-[-0.5px]">

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
          <p className="text-sm text-muted-foreground mt-1">View your transactions and payment methods</p>
        </div>
      </div>

      {/* Payment Methods Section */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Payment Methods</h2>
          
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payoutMethods.map((method, index) => {
          const isDefault = index === 0;
          const getMethodLabel = () => {
            switch (method.method) {
              case "paypal":
                return "PayPal";
              case "crypto":
                return "Crypto";
              case "bank":
                return "Bank";
              case "upi":
                return "UPI";
              case "wise":
                return "Wise";
              case "revolut":
                return "Revolut";
              case "tips":
                return "TIPS";
              default:
                return method.method;
            }
          };
          const getMethodIcon = () => {
            switch (method.method) {
              case "paypal":
                return paypalLogo;
              case "crypto":
                return walletActiveIcon;
              case "bank":
                return null;
              // Will use Building2 icon
              case "upi":
                return null;
              // Will use Smartphone icon
              default:
                return null;
            }
          };
          const getMethodDetails = () => {
            switch (method.method) {
              case "paypal":
                return method.details.email;
              case "crypto":
                return `${method.details.address?.slice(0, 6)}...${method.details.address?.slice(-4)}`;
              case "bank":
                return `${method.details.bankName} - ****${method.details.accountNumber?.slice(-4)}`;
              case "wise":
                return method.details.email;
              case "revolut":
                return method.details.email;
              case "upi":
                return method.details.upi_id;
              case "tips":
                return method.details.username;
              default:
                return "N/A";
            }
          };
          const methodIcon = getMethodIcon();
          return <div key={method.id} className="group relative rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f] p-4 border border-border dark:border-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#e0e0e0] dark:bg-[#1a1a1a] flex items-center justify-center shrink-0">
                    {methodIcon ? <img src={methodIcon} alt={getMethodLabel()} className="w-5 h-5" /> : method.method === 'bank' ? <Building2 className="w-5 h-5 text-muted-foreground" /> : method.method === 'upi' ? <Smartphone className="w-5 h-5 text-muted-foreground" /> : <CreditCard className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground dark:text-white font-inter tracking-[-0.5px]">{getMethodLabel()}</p>
                      {isDefault && <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border-0 font-inter tracking-[-0.4px]">
                        Default
                      </Badge>}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate font-inter tracking-[-0.4px]">{getMethodDetails()}</p>
                    {method.method === 'crypto' && method.details?.network && <p className="text-[10px] text-neutral-500/70 mt-0.5 uppercase font-inter tracking-[-0.4px]">
                        {method.details.network}
                      </p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isDefault && <Button variant="ghost" size="icon" onClick={() => handleSetDefaultMethod(method.id)} className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary flex-shrink-0">
                        <Star className="h-4 w-4" />
                      </Button>}
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteMethod(method.id)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive flex-shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>;
        })}
          
          {/* Add Method Card */}
          {payoutMethods.length < 3 && <button onClick={() => setDialogOpen(true)} className="group rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f] hover:bg-[#e8e8e8] dark:hover:bg-[#141414] transition-colors p-4 min-h-[80px] border border-border dark:border-transparent">
              <div className="h-full flex items-center justify-center gap-2">
                <Plus className="h-4 w-4 text-neutral-500 group-hover:text-foreground dark:group-hover:text-white transition-colors" />
                <span className="text-sm text-neutral-500 group-hover:text-foreground dark:group-hover:text-white transition-colors font-inter tracking-[-0.4px]">
                  Add Method
                </span>
              </div>
            </button>}
        </div>
      </div>

      {/* Balance Cards - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lifetime Earnings Card */}
        <Card className="bg-card border-0">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground font-['Inter']" style={{
              letterSpacing: '-0.5px'
            }}>Your Earnings</p>
              <div className="flex bg-muted/50 rounded-md p-0.5 py-[4px] px-[5px]">
                {(['1D', '1W', '1M', 'ALL'] as const).map(period => <button key={period} onClick={() => setEarningsChartPeriod(period)} className={`px-2.5 py-1 text-xs font-medium font-['Inter'] rounded transition-all ${earningsChartPeriod === period ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} style={{
                letterSpacing: '-0.5px'
              }}>
                    {period}
                  </button>)}
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-3xl font-bold font-geist" style={{
              letterSpacing: '-0.3px'
            }}>
                {isBalanceVisible ? `$${wallet?.total_earned?.toFixed(2) || "0.00"}` : "••••••"}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setIsBalanceVisible(!isBalanceVisible)} className="h-8 w-8 p-0 hover:bg-muted">
                {isBalanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Mini Earnings Chart */}
            <div className="h-20 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsData}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <RechartsTooltip content={({
                  active,
                  payload
                }) => {
                  if (active && payload && payload.length) {
                    const value = typeof payload[0].value === 'number' ? payload[0].value : Number(payload[0].value);
                    return <div className="bg-popover border border-border rounded-lg shadow-lg p-3 font-geist tracking-tighter-custom">
                            <p className="text-xs text-muted-foreground mb-1">{payload[0].payload.date}</p>
                            <p className="text-sm font-semibold">${value.toFixed(2)}</p>
                          </div>;
                  }
                  return null;
                }} cursor={{
                  stroke: '#3b82f6',
                  strokeWidth: 1,
                  strokeDasharray: '3 3'
                }} />
                  <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fill="url(#earningsGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Current Balance Card */}
        <Card className="bg-card border-0">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 mb-2">
              
              <p className="text-sm font-medium text-muted-foreground font-['Inter']" style={{
              letterSpacing: '-0.5px'
            }}>Current Balance</p>
            </div>
            <p className="text-3xl font-bold font-geist mb-4" style={{
            letterSpacing: '-0.3px'
          }}>
              {isBalanceVisible ? `$${wallet?.balance?.toFixed(2) || "0.00"}` : "••••••"}
            </p>
            <Separator className="my-2" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Available Balance</span>
              <span className="text-base font-semibold">{isBalanceVisible ? `$${wallet?.balance?.toFixed(2) || "0.00"}` : "••••••"}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">In Transit</span>
              <span className="text-base font-semibold">{isBalanceVisible ? `$${pendingWithdrawals.toFixed(2)}` : "••••••"}</span>
            </div>
            <Button onClick={handleRequestPayout} className="w-full font-geist tracking-tighter-custom" disabled={!wallet || wallet.balance < 20 || !payoutMethods || payoutMethods.length === 0 || pendingWithdrawals > 0}>
              Withdraw Balance
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Transactions - Full Width */}
      <Card className="bg-card border-0">
        <CardHeader className="px-[24px] pt-4 pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 gap-3">
          <CardTitle className="text-lg font-semibold py-[10px]">Transactions</CardTitle>
          {transactions.length > 0 && <div className="hidden sm:flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-muted/50 border-0">
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="earning">Earnings</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="transfer_sent">Transfers Sent</SelectItem>
                  <SelectItem value="transfer_received">Transfers Received</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-muted/50 border-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              {availableCampaigns.length > 0 && <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-muted/50 border-0">
                    <SelectValue placeholder="Campaign" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">All Campaigns</SelectItem>
                    {availableCampaigns.map(campaign => <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.title}
                      </SelectItem>)}
                  </SelectContent>
                </Select>}
            </div>}
        </CardHeader>
        <CardContent className="p-4">
          {transactions.length === 0 ? <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div> : <>
              <div className="space-y-2">
                {transactions.filter(transaction => {
              if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
              if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
              if (campaignFilter !== "all" && (!transaction.campaign || transaction.campaign.id !== campaignFilter)) return false;
              return true;
            }).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(transaction => <div key={transaction.id} onClick={() => {
              setSelectedTransaction(transaction);
              setTransactionSheetOpen(true);
            }} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 dark:bg-[#0a0a0a] cursor-pointer hover:bg-muted/50 dark:hover:bg-[#0a0a0a]/80 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center overflow-hidden ${transaction.type === 'earning' && transaction.campaign?.brand_logo_url ? '' : transaction.type === 'earning' ? 'bg-green-500/15' : transaction.type === 'balance_correction' ? 'bg-orange-500/15' : transaction.type === 'referral' ? 'bg-purple-500/15' : transaction.type === 'transfer_received' ? 'bg-blue-500/15' : transaction.type === 'transfer_sent' ? 'bg-red-500/15' : 'bg-red-500/15'}`}>
                        {transaction.type === 'earning' && transaction.campaign?.brand_logo_url ? <img src={transaction.campaign.brand_logo_url} alt={transaction.campaign.brand_name || 'Brand'} className="w-full h-full object-cover" /> : transaction.type === 'earning' ? <ArrowDownLeft className="h-4 w-4 text-green-500" /> : transaction.type === 'balance_correction' ? <RefreshCw className="h-4 w-4 text-orange-500" /> : transaction.type === 'referral' ? <Gift className="h-4 w-4 text-purple-500" /> : transaction.type === 'transfer_received' ? <ArrowDownLeft className="h-4 w-4 text-blue-500" /> : transaction.type === 'transfer_sent' ? <ArrowUpRight className="h-4 w-4 text-red-500" /> : <ArrowUpRight className="h-4 w-4 text-red-500" />}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {transaction.type === 'earning' ? <>
                              Payment
                              {transaction.campaign && <span className="text-muted-foreground font-normal"> · {transaction.campaign.title}</span>}
                            </> : transaction.type === 'balance_correction' ? 'Balance Correction' : transaction.type === 'referral' ? 'Referral Bonus' : transaction.type === 'transfer_sent' ? 'Transfer Sent' : transaction.type === 'transfer_received' ? 'Transfer Received' : 'Withdrawal'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {(() => {
                        const now = new Date();
                        const diffInHours = Math.floor((now.getTime() - transaction.date.getTime()) / (1000 * 60 * 60));
                        if (diffInHours < 24) {
                          if (diffInHours < 1) {
                            const diffInMinutes = Math.floor((now.getTime() - transaction.date.getTime()) / (1000 * 60));
                            return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
                          }
                          return `${diffInHours}h ago`;
                        }
                        return format(transaction.date, 'MMM dd, yyyy');
                      })()}
                          </span>
                          <span className="text-muted-foreground/50">·</span>
                          {transaction.status && <span className={`text-xs flex items-center gap-1 ${transaction.status === 'completed' ? 'text-green-500' : transaction.status === 'in_transit' ? 'text-blue-500' : transaction.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'}`}>
                              {transaction.status === 'in_transit' && <Hourglass className="h-2.5 w-2.5" />}
                              {transaction.status === 'pending' && <Clock className="h-2.5 w-2.5" />}
                              {transaction.status === 'completed' && <Check className="h-2.5 w-2.5" />}
                              {transaction.status === 'rejected' && <X className="h-2.5 w-2.5" />}
                              {transaction.status === 'in_transit' ? 'In Transit' : transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1).toLowerCase()}
                            </span>}
                        </div>
                      </div>
                    </div>
                    
                    {/* Amount */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-sm font-semibold tabular-nums ${transaction.status === 'rejected' ? 'text-red-500' : transaction.status === 'pending' ? 'text-yellow-500' : transaction.type === 'earning' || transaction.type === 'transfer_received' ? 'text-green-500' : transaction.type === 'balance_correction' ? transaction.amount >= 0 ? 'text-green-500' : 'text-red-500' : 'text-red-500'}`}>
                        {transaction.type === 'earning' || transaction.type === 'transfer_received' ? '+' : transaction.amount < 0 ? '' : '+'}
                        ${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                      
                    </div>
                  </div>)}
              </div>
              
              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-3">
                <p className="text-xs text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, transactions.filter(transaction => {
                if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
                if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
                if (campaignFilter !== "all" && (!transaction.campaign || transaction.campaign.id !== campaignFilter)) return false;
                return true;
              }).length)} - {Math.min(currentPage * itemsPerPage, transactions.filter(transaction => {
                if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
                if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
                if (campaignFilter !== "all" && (!transaction.campaign || transaction.campaign.id !== campaignFilter)) return false;
                return true;
              }).length)} of {transactions.filter(transaction => {
                if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
                if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
                if (campaignFilter !== "all" && (!transaction.campaign || transaction.campaign.id !== campaignFilter)) return false;
                return true;
              }).length}
                </p>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="ghost" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="gap-1 flex-1 sm:flex-none text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage * itemsPerPage >= transactions.filter(transaction => {
                if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
                if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
                if (campaignFilter !== "all" && (!transaction.campaign || transaction.campaign.id !== campaignFilter)) return false;
                return true;
              }).length} className="gap-1 flex-1 sm:flex-none text-muted-foreground hover:text-foreground">
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>}
        </CardContent>
      </Card>

      {/* Balance Cards - Removed duplicate */}

      <PayoutMethodDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleAddPayoutMethod} currentMethodCount={payoutMethods.length} />

      {/* Payout Request Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Choose the amount and payment method for your withdrawal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payout-amount">Amount ($)</Label>
              <Input id="payout-amount" type="number" min={(() => {
              const method = payoutMethods.find(m => m.id === selectedPayoutMethod);
              return method?.method === 'bank' ? 250 : 20;
            })()} step="0.01" max={wallet?.balance || 0} placeholder={(() => {
              const method = payoutMethods.find(m => m.id === selectedPayoutMethod);
              return method?.method === 'bank' ? '250.00' : '20.00';
            })()} value={payoutAmount} onChange={e => setPayoutAmount(e.target.value.replace(',', '.'))} className="bg-muted border-transparent placeholder:text-muted-foreground h-14 text-lg font-medium focus-visible:ring-primary/50" />
              <div className="flex gap-2 flex-wrap">
                {(() => {
                const method = payoutMethods.find(m => m.id === selectedPayoutMethod);
                const amounts = method?.method === 'bank' ? [250, 500, 1000] : [20, 50, 100, 500];
                return amounts.map(amount => <Button key={amount} type="button" variant="ghost" size="sm" onClick={() => setPayoutAmount(amount.toString())} disabled={wallet?.balance ? wallet.balance < amount : true} className="bg-muted hover:bg-accent">
                      ${amount}
                    </Button>);
              })()}
              </div>
              <p className="text-xs text-muted-foreground">
                {(() => {
                const method = payoutMethods.find(m => m.id === selectedPayoutMethod);
                const minimum = method?.method === 'bank' ? '$250.00' : '$20.00';
                return `Minimum: ${minimum} • Available: $${wallet?.balance?.toFixed(2) || "0.00"}`;
              })()}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout-method">Payment Method</Label>
              <Select value={selectedPayoutMethod} onValueChange={setSelectedPayoutMethod}>
                <SelectTrigger id="payout-method" className="bg-muted border-transparent h-14 text-lg">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {payoutMethods.map(method => {
                  const getMethodLabel = () => {
                    switch (method.method) {
                      case "paypal":
                        return "PayPal";
                      case "crypto":
                        return "Crypto";
                      case "bank":
                        return "Bank";
                      case "upi":
                        return "UPI (Disabled)";
                      case "wise":
                        return "Wise";
                      case "revolut":
                        return "Revolut";
                      case "tips":
                        return "TIPS";
                      default:
                        return method.method;
                    }
                  };
                  const getMethodDetails = () => {
                    switch (method.method) {
                      case "paypal":
                        return method.details.email;
                      case "crypto":
                        return `${method.details.address?.slice(0, 8)}...${method.details.address?.slice(-6)}`;
                      case "bank":
                        return `${method.details.bankName}`;
                      case "upi":
                        return method.details.upi_id;
                      case "wise":
                        return method.details.email;
                      case "revolut":
                        return method.details.email;
                      case "tips":
                        return method.details.username;
                      default:
                        return "N/A";
                    }
                  };
                  const getNetworkLogo = () => {
                    if (method.method !== "crypto") return null;
                    const network = method.details?.network?.toLowerCase();
                    if (network === 'ethereum') return ethereumLogo;
                    if (network === 'optimism') return optimismLogo;
                    if (network === 'solana') return solanaLogo;
                    if (network === 'polygon') return polygonLogo;
                    return null;
                  };
                  const networkLogo = getNetworkLogo();
                  return <SelectItem key={method.id} value={method.id}>
                        <div className="flex items-center gap-2">
                          {networkLogo && <img src={networkLogo} alt="Network logo" className="h-4 w-4" />}
                          <span>{getMethodLabel()} - {getMethodDetails()}</span>
                        </div>
                      </SelectItem>;
                })}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg text-sm bg-neutral-900/0">
              {(() => {
              const selectedMethod = payoutMethods.find(m => m.id === selectedPayoutMethod);
              const isPayPal = selectedMethod?.method === 'paypal';
              const isUpi = selectedMethod?.method === 'upi';
              const isBank = selectedMethod?.method === 'bank';
              if (isUpi) {
                return <>
                  <p className="text-destructive font-medium">UPI payouts are temporarily disabled</p>
                  <p className="text-xs text-muted-foreground">Please select another payment method</p>
                </>;
              }
              if (isBank) {
                return <>
                  <p className="text-muted-foreground">3-5 business day wait time</p>
                  <p className="text-xs text-muted-foreground mb-2">Minimum withdrawal: $250</p>
                  <p className="font-medium">$1 + 0.75% fee</p>
                </>;
              }
              if (isPayPal) {
                return <>
                  <p className="text-muted-foreground">24h wait time</p>
                </>;
              }
              return <>
                <p className="text-muted-foreground">2-3 business day wait time</p>
                <p className="text-xs text-muted-foreground mb-2">(Payouts will not be operated on Saturday & Sunday)</p>
                <p className="font-medium">$1 + 0.75% fee</p>
              </>;
            })()}
            </div>

            {/* Fee Breakdown and Net Amount */}
            {payoutAmount && (() => {
            const amount = parseFloat(payoutAmount);
            const selectedMethod = payoutMethods.find(m => m.id === selectedPayoutMethod);
            const isPayPal = selectedMethod?.method === 'paypal';
            const isUpi = selectedMethod?.method === 'upi';
            const isBank = selectedMethod?.method === 'bank';
            const minimumAmount = isBank ? 250 : 20;

            // Don't show fee breakdown for PayPal or UPI
            if (isPayPal || isUpi || amount < minimumAmount) {
              return null;
            }

            // For crypto/bank, show fee breakdown
            const percentageFee = amount * 0.0075;
            const afterPercentage = amount - percentageFee;
            const netAmount = afterPercentage - 1;
            const feeAmount = percentageFee + 1;
            return <div className="p-4 bg-card rounded-lg border border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Withdrawal amount</span>
                    <span className="font-medium">${amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processing fee</span>
                    <span className="font-medium text-red-400">-${feeAmount.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="font-semibold">You'll receive</span>
                    <span className="font-bold text-lg text-primary">${netAmount.toFixed(2)}</span>
                  </div>
                </div>;
          })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)} disabled={isSubmittingPayout}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayout} disabled={isSubmittingPayout}>
              {isSubmittingPayout ? "Processing..." : "Confirm Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Receipt Sheet */}
      <Sheet open={transactionSheetOpen} onOpenChange={setTransactionSheetOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto border-l-0">
          {selectedTransaction && <div className="flex flex-col h-full">
              {/* Hero Header with Amount */}
              <div className="px-6 pt-8 pb-6 text-center border-b border-[#242424]/0">
                <div className={`text-4xl font-bold tracking-tight mb-2 ${selectedTransaction.type === 'earning' || selectedTransaction.type === 'transfer_received' || selectedTransaction.type === 'referral' ? 'text-green-500' : selectedTransaction.type === 'balance_correction' ? 'text-orange-500' : 'text-red-500'}`}>
                  {selectedTransaction.type === 'earning' || selectedTransaction.type === 'transfer_received' || selectedTransaction.type === 'referral' ? '+' : selectedTransaction.amount < 0 ? '-' : ''}${Math.abs(selectedTransaction.amount).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  {format(selectedTransaction.date, 'MMM dd, yyyy • h:mm a')}
                </div>
                {selectedTransaction.status && (selectedTransaction.status === 'completed' ? <Badge className="capitalize font-inter tracking-[-0.5px] border-t-2 border-t-[#4f89ff] bg-[#2060df] hover:bg-[#2060df]/90 text-white border-none">
                      <img src={checkCircleFilledIcon} alt="" className="h-3 w-3 mr-1" />
                      {selectedTransaction.status}
                    </Badge> : <Badge variant={selectedTransaction.status === 'rejected' ? 'destructive' : selectedTransaction.status === 'in_transit' ? 'default' : 'secondary'} className="capitalize">
                      {selectedTransaction.status === 'in_transit' && <Hourglass className="h-3 w-3 mr-1" />}
                      {selectedTransaction.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {selectedTransaction.status === 'in_transit' ? 'In Transit' : selectedTransaction.status}
                    </Badge>)}
              </div>

              {/* Content */}
              <div className="flex-1 p-6 space-y-5 border-black/0">
                {/* Campaign/Source Card for earnings */}
                {selectedTransaction.type === 'earning' && selectedTransaction.campaign && <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-[#080808]/0">
                      {selectedTransaction.campaign.brand_logo_url ? <img src={selectedTransaction.campaign.brand_logo_url} alt={selectedTransaction.campaign.brand_name} className="w-full h-full object-cover" /> : <DollarSign className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{selectedTransaction.campaign.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{selectedTransaction.campaign.brand_name}</div>
                    </div>
                  </div>}

                {/* Platform & Views Row for earnings */}
                {selectedTransaction.type === 'earning' && selectedTransaction.metadata && (selectedTransaction.metadata.account_username || selectedTransaction.metadata.views !== undefined) && <div className="grid grid-cols-2 gap-3">
                    {selectedTransaction.metadata.account_username && <div className="p-3 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-2 mb-1">
                          {(() => {
                    const platform = selectedTransaction.metadata.platform?.toLowerCase();
                    const platformIcon = platform === 'tiktok' ? tiktokLogo : platform === 'instagram' ? instagramLogo : platform === 'youtube' ? youtubeLogo : null;
                    return platformIcon ? <img src={platformIcon} alt={platform} className="w-4 h-4" /> : null;
                  })()}
                          <span className="text-xs text-muted-foreground">Account</span>
                        </div>
                        <div className="text-sm font-medium truncate">@{selectedTransaction.metadata.account_username}</div>
                      </div>}
                    {selectedTransaction.metadata.views !== undefined && <div className="p-3 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Views</span>
                        </div>
                        <div className="text-sm font-medium">{selectedTransaction.metadata.views.toLocaleString()}</div>
                      </div>}
                  </div>}

                {/* Rejection Reason */}
                {selectedTransaction.status === 'rejected' && selectedTransaction.rejection_reason && <div className="p-3 bg-destructive/10 rounded-xl">
                    <div className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-destructive mb-1">Rejection Reason</div>
                        <p className="text-sm text-muted-foreground">{selectedTransaction.rejection_reason}</p>
                      </div>
                    </div>
                  </div>}

                {/* Transfer Details - P2P */}
                {(selectedTransaction.type === 'transfer_sent' || selectedTransaction.type === 'transfer_received') && selectedTransaction.metadata && <div className="p-3 rounded-xl bg-muted/30 space-y-2">
                    {selectedTransaction.type === 'transfer_sent' && selectedTransaction.metadata.recipient_username && <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Sent To</span>
                        <span className="text-sm font-medium">@{selectedTransaction.metadata.recipient_username}</span>
                      </div>}
                    {selectedTransaction.type === 'transfer_received' && selectedTransaction.metadata.sender_username && <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">From</span>
                        <span className="text-sm font-medium">@{selectedTransaction.metadata.sender_username}</span>
                      </div>}
                    {selectedTransaction.metadata.note && <div className="pt-2 border-t border-border/50">
                        <div className="text-xs text-muted-foreground mb-1">Note</div>
                        <div className="text-sm">{selectedTransaction.metadata.note}</div>
                      </div>}
                  </div>}

                {/* Details List */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="text-sm font-medium">
                      {selectedTransaction.type === 'earning' ? 'Earnings' : selectedTransaction.type === 'referral' ? 'Referral Bonus' : selectedTransaction.type === 'balance_correction' ? 'Balance Correction' : selectedTransaction.type === 'transfer_sent' ? 'Transfer Sent' : selectedTransaction.type === 'transfer_received' ? 'Transfer Received' : 'Withdrawal'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">Transaction ID</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-mono text-muted-foreground">
                        {selectedTransaction.id.slice(0, 6)}...{selectedTransaction.id.slice(-4)}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    navigator.clipboard.writeText(selectedTransaction.id);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                    toast({
                      description: "Transaction ID copied"
                    });
                  }}>
                        {copiedId ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  {selectedTransaction.source && <div className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-muted-foreground">From</span>
                      <span className="text-sm font-medium text-right max-w-[180px] truncate">{selectedTransaction.source}</span>
                    </div>}

                  {selectedTransaction.destination && <div className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-muted-foreground">To</span>
                      <span className="text-sm font-medium text-right max-w-[180px] truncate">
                        {(() => {
                    const details = selectedTransaction.metadata?.payoutDetails;
                    if (details?.address) return `${details.address.slice(0, 6)}...${details.address.slice(-4)}`;
                    if (details?.email) return details.email;
                    if (details?.account_number) return `•••• ${details.account_number.slice(-4)}`;
                    return selectedTransaction.destination;
                  })()}
                      </span>
                    </div>}
                </div>

                {/* Payout Method Details */}
                {selectedTransaction.type === 'withdrawal' && selectedTransaction.metadata && (() => {
              return <div className="space-y-1 pt-4">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Payout Details</div>
                      
                      {selectedTransaction.metadata.payout_method && <div className="flex items-center justify-between py-2.5">
                          <span className="text-sm text-muted-foreground">Method</span>
                          <span className="text-sm font-medium capitalize">{selectedTransaction.metadata.payout_method}</span>
                        </div>}
                      
                      {selectedTransaction.metadata.network && (() => {
                  const network = selectedTransaction.metadata.network.toLowerCase();
                  const getNetworkLogo = () => {
                    if (network === 'ethereum') return ethereumLogo;
                    if (network === 'optimism') return optimismLogo;
                    if (network === 'solana') return solanaLogo;
                    if (network === 'polygon') return polygonLogo;
                    return null;
                  };
                  const networkLogo = getNetworkLogo();
                  return <div className="flex items-center justify-between py-2.5">
                            <span className="text-sm text-muted-foreground">Network</span>
                            <div className="flex items-center gap-1.5">
                              {networkLogo && <img src={networkLogo} alt="Network" className="h-4 w-4" />}
                              <span className="text-sm font-medium capitalize">{selectedTransaction.metadata.network}</span>
                            </div>
                          </div>;
                })()}
                      
                      {selectedTransaction.metadata.payoutDetails?.address && <div className="flex items-center justify-between py-2.5">
                          <span className="text-sm text-muted-foreground">Address</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-mono">{selectedTransaction.metadata.payoutDetails.address.slice(0, 6)}...{selectedTransaction.metadata.payoutDetails.address.slice(-4)}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                      navigator.clipboard.writeText(selectedTransaction.metadata.payoutDetails.address);
                      toast({
                        description: "Address copied"
                      });
                    }}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>}
                      
                      {selectedTransaction.metadata.payoutDetails?.currency && <div className="flex items-center justify-between py-2.5">
                          <span className="text-sm text-muted-foreground">Currency</span>
                          <span className="text-sm font-medium uppercase">{selectedTransaction.metadata.payoutDetails.currency}</span>
                        </div>}
                      
                      {selectedTransaction.metadata.payoutDetails?.email && <div className="flex items-center justify-between py-2.5">
                          <span className="text-sm text-muted-foreground">PayPal</span>
                          <span className="text-sm font-medium">{selectedTransaction.metadata.payoutDetails.email}</span>
                        </div>}
                    </div>;
            })()}
              </div>
            </div>}
        </SheetContent>
      </Sheet>

      {/* P2P Transfer Dialog */}
      <P2PTransferDialog open={p2pTransferDialogOpen} onOpenChange={setP2pTransferDialogOpen} currentBalance={wallet?.balance || 0} onTransferComplete={() => {
      fetchWallet();
      fetchTransactions();
    }} />

      {/* Share Transaction Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share Transaction</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Generated Image */}
            {generatedImageUrl && <div className="rounded-lg overflow-hidden border border-border">
                <img src={generatedImageUrl} alt="Transaction" className="w-full h-auto" />
              </div>}
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleDownloadImage} className="gap-2">
                <Copy className="h-4 w-4" />
                Download Image
              </Button>
              <Button onClick={handleShareOnX} className="gap-2 bg-black hover:bg-black/90 text-white">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}