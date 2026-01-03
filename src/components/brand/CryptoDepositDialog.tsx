import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, Loader2, RefreshCw, ExternalLink, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QRCode from "react-qr-code";

// Network logos
import solanaLogo from "@/assets/solana-logo.png";

interface CryptoDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName: string;
  onCoinbaseOnramp?: () => void;
}

interface DepositAddress {
  address: string;
  network: string;
  derivation_index: number;
}

interface RecentDeposit {
  id: string;
  decimal_amount: number;
  blockchain_network: string;
  status: string;
  tx_signature: string;
  created_at: string;
}

const NETWORKS = [
  { id: 'solana', name: 'Solana', logo: solanaLogo, color: '#9945FF', explorerUrl: 'https://solscan.io/tx/' },
  { id: 'base', name: 'Base', color: '#0052FF', explorerUrl: 'https://basescan.org/tx/' },
  { id: 'ethereum', name: 'Ethereum', color: '#627EEA', explorerUrl: 'https://etherscan.io/tx/' },
  { id: 'polygon', name: 'Polygon', color: '#8247E5', explorerUrl: 'https://polygonscan.com/tx/' },
  { id: 'arbitrum', name: 'Arbitrum', color: '#28A0F0', explorerUrl: 'https://arbiscan.io/tx/' },
  { id: 'optimism', name: 'Optimism', color: '#FF0420', explorerUrl: 'https://optimistic.etherscan.io/tx/' },
];

export function CryptoDepositDialog({
  open,
  onOpenChange,
  brandId,
  brandName,
  onCoinbaseOnramp,
}: CryptoDepositDialogProps) {
  const [selectedNetwork, setSelectedNetwork] = useState('solana');
  const [addresses, setAddresses] = useState<Record<string, DepositAddress>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [recentDeposits, setRecentDeposits] = useState<RecentDeposit[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);

  useEffect(() => {
    if (open) {
      // Load address for default network
      if (!addresses[selectedNetwork]) {
        fetchAddress(selectedNetwork);
      }
      fetchRecentDeposits();
    }
  }, [open, brandId]);

  useEffect(() => {
    // Load address when switching networks
    if (open && !addresses[selectedNetwork] && !loading[selectedNetwork]) {
      fetchAddress(selectedNetwork);
    }
  }, [selectedNetwork, open]);

  const fetchAddress = async (network: string) => {
    setLoading(prev => ({ ...prev, [network]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('generate-deposit-address', {
        body: { brand_id: brandId, network },
      });

      if (error) throw error;

      if (data?.success && data?.address) {
        setAddresses(prev => ({
          ...prev,
          [network]: {
            address: data.address,
            network: data.network,
            derivation_index: data.derivation_index,
          }
        }));
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error fetching deposit address:', error);
      toast.error(error?.message || 'Failed to generate deposit address');
    } finally {
      setLoading(prev => ({ ...prev, [network]: false }));
    }
  };

  const fetchRecentDeposits = async () => {
    setLoadingDeposits(true);
    try {
      const { data, error } = await supabase
        .from('crypto_deposits')
        .select('id, decimal_amount, blockchain_network, status, tx_signature, created_at')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentDeposits(data || []);
    } catch (error) {
      console.error('Error fetching deposits:', error);
    } finally {
      setLoadingDeposits(false);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const getNetworkInfo = (networkId: string) => {
    return NETWORKS.find(n => n.id === networkId) || NETWORKS[0];
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      credited: 'bg-green-500/10 text-green-500 border-green-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return styles[status] || styles.pending;
  };

  const currentNetwork = getNetworkInfo(selectedNetwork);
  const currentAddress = addresses[selectedNetwork];
  const isLoading = loading[selectedNetwork];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle
            className="text-lg font-semibold tracking-[-0.5px]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Deposit Crypto
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground tracking-[-0.3px]">
            Send USDC to fund {brandName}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Network Selection */}
          <div className="flex flex-wrap gap-2">
            {NETWORKS.map((network) => (
              <button
                key={network.id}
                onClick={() => setSelectedNetwork(network.id)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${selectedNetwork === network.id
                    ? 'bg-foreground text-background'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {network.name}
              </button>
            ))}
          </div>

          {/* QR Code and Address */}
          <div className="flex flex-col items-center space-y-4">
            {isLoading ? (
              <div className="w-48 h-48 bg-muted/50 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : currentAddress ? (
              <>
                <div
                  className="p-4 bg-white rounded-2xl"
                  style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                >
                  <QRCode
                    value={currentAddress.address}
                    size={180}
                    level="H"
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                  />
                </div>

                <div className="w-full">
                  <p
                    className="text-xs text-muted-foreground mb-2 text-center tracking-[-0.3px]"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {currentNetwork.name} Deposit Address (USDC)
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-mono text-foreground flex-1 break-all">
                      {currentAddress.address}
                    </p>
                    <button
                      onClick={() => copyToClipboard(currentAddress.address, 'address')}
                      className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                    >
                      {copiedField === 'address' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-48 h-48 bg-muted/50 rounded-2xl flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Failed to load</p>
              </div>
            )}
          </div>

          {/* Coinbase Onramp Button */}
          {onCoinbaseOnramp && (
            <div className="border-t border-border pt-4">
              <Button
                onClick={onCoinbaseOnramp}
                variant="outline"
                className="w-full gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Buy USDC with Card
              </Button>
            </div>
          )}

          {/* Warning */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p
              className="text-xs text-amber-600 dark:text-amber-400 tracking-[-0.3px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <strong>Important:</strong> Only send USDC on {currentNetwork.name}. Sending other tokens or using other networks may result in permanent loss of funds.
            </p>
          </div>

          {/* Recent Deposits */}
          {recentDeposits.length > 0 && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4
                  className="text-sm font-medium tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Recent Deposits
                </h4>
                <button
                  onClick={fetchRecentDeposits}
                  disabled={loadingDeposits}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loadingDeposits ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="space-y-2">
                {recentDeposits.map((deposit) => {
                  const network = getNetworkInfo(deposit.blockchain_network);
                  return (
                    <div
                      key={deposit.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: network.color }}
                        >
                          {network.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {formatAmount(deposit.decimal_amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(deposit.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadge(deposit.status)}`}
                        >
                          {deposit.status}
                        </span>
                        {deposit.tx_signature && (
                          <a
                            href={`${network.explorerUrl}${deposit.tx_signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
