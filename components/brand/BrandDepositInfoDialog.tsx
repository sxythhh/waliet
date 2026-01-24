import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, Loader2, QrCode } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BrandDepositInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName: string;
}

interface DepositInfo {
  has_slash_wallet: boolean;
  slash_account_number: string | null;
  slash_routing_number: string | null;
}

// Hardcoded USDC deposit addresses
const CRYPTO_ADDRESSES = [
  { chain: 'arbitrum', address: '0x499a5919f33722ad03576Dd1630E5923f1001D0D' },
  { chain: 'base', address: '0xb1106dcD5D2aE6708754Ba7703802B617597b084' },
  { chain: 'ethereum', address: '0x165b9343797B527AE3B232d9942721c6C8ad75A0' },
  { chain: 'polygon', address: '0xFB9Cd89e26864716e04Eb63154a1BE42e24C9516' },
  { chain: 'solana', address: '75Axj8d1mVRKFBKZtG9sZq9wpjNNmHseHivDHooYucJh' },
];

export function BrandDepositInfoDialog({
  open,
  onOpenChange,
  brandId,
  brandName,
}: BrandDepositInfoDialogProps) {
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchDepositInfo();
    }
  }, [open, brandId]);

  const fetchDepositInfo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-brand-balance', {
        body: { brand_id: brandId },
      });

      if (error) throw error;
      setDepositInfo({
        has_slash_wallet: data?.has_slash_wallet || false,
        slash_account_number: data?.slash_account_number || null,
        slash_routing_number: data?.slash_routing_number || null,
      });
    } catch (error) {
      console.error('Error fetching deposit info:', error);
      toast.error('Failed to load deposit info');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSlashWallet = async () => {
    setSettingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-slash-wallet', {
        body: { brand_id: brandId },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Virtual account created successfully!');
        await fetchDepositInfo();
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error setting up Slash wallet:', error);
      toast.error(error?.message || 'Failed to set up virtual account');
    } finally {
      setSettingUp(false);
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

  const getChainDisplayName = (chain: string) => {
    const names: Record<string, string> = {
      'ethereum': 'Ethereum',
      'solana': 'Solana',
      'arbitrum': 'Arbitrum',
      'polygon': 'Polygon',
      'base': 'Base',
      'optimism': 'Optimism',
    };
    return names[chain.toLowerCase()] || chain;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle 
            className="text-lg font-semibold tracking-[-0.5px]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Deposit to {brandName}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !depositInfo?.has_slash_wallet ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 
                className="text-base font-semibold tracking-[-0.5px] mb-2"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Set Up Virtual Account
              </h3>
              <p 
                className="text-sm text-muted-foreground tracking-[-0.3px] mb-6 max-w-xs mx-auto"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Create a dedicated virtual account for wire transfers and crypto deposits.
              </p>
              <Button
                onClick={handleSetupSlashWallet}
                disabled={settingUp}
                className="bg-foreground text-background hover:bg-foreground/90 font-medium tracking-[-0.5px]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {settingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Create Virtual Account'
                )}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="wire" className="w-full">
              <TabsList className="w-full bg-transparent p-0 h-auto border-b border-border rounded-none mb-4">
                <TabsTrigger 
                  value="wire" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-foreground data-[state=active]:bg-transparent bg-transparent font-medium tracking-[-0.3px] pb-3"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Wire Transfer
                </TabsTrigger>
                <TabsTrigger 
                  value="crypto" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-foreground data-[state=active]:bg-transparent bg-transparent font-medium tracking-[-0.3px] pb-3"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Crypto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="wire" className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <div>
                    <p 
                      className="text-xs text-muted-foreground mb-1 tracking-[-0.3px]"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      Account Number
                    </p>
                    <div className="flex items-center justify-between">
                      <p 
                        className="text-base font-mono text-foreground"
                      >
                        {depositInfo.slash_account_number || '—'}
                      </p>
                      {depositInfo.slash_account_number && (
                        <button
                          onClick={() => copyToClipboard(depositInfo.slash_account_number!, 'account')}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          {copiedField === 'account' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p 
                      className="text-xs text-muted-foreground mb-1 tracking-[-0.3px]"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      Routing Number
                    </p>
                    <div className="flex items-center justify-between">
                      <p 
                        className="text-base font-mono text-foreground"
                      >
                        {depositInfo.slash_routing_number || '—'}
                      </p>
                      {depositInfo.slash_routing_number && (
                        <button
                          onClick={() => copyToClipboard(depositInfo.slash_routing_number!, 'routing')}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          {copiedField === 'routing' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p 
                  className="text-xs text-muted-foreground tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Wire transfers typically arrive within 1-3 business days. Use these details to send funds from your bank.
                </p>
              </TabsContent>

              <TabsContent value="crypto" className="space-y-4">
                <div className="space-y-3">
                  {CRYPTO_ADDRESSES.map((addr, index) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-lg">
                      <p 
                        className="text-xs text-muted-foreground mb-1 tracking-[-0.3px]"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        {getChainDisplayName(addr.chain)} (USDC)
                      </p>
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <p 
                          className="text-xs font-mono text-foreground truncate min-w-0 flex-1"
                        >
                          {addr.address}
                        </p>
                        <button
                          onClick={() => copyToClipboard(addr.address, `crypto-${index}`)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                        >
                          {copiedField === `crypto-${index}` ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p 
                  className="text-xs text-muted-foreground tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Only send USDC to these addresses. Sending other tokens may result in loss of funds.
                </p>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
