import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, CreditCard } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface PayoutMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (method: string, details: any) => void;
  currentMethodCount: number;
}

const cryptoNetworks = [
  { id: "usdt-eth", name: "USDT (Eth)" },
  { id: "sol", name: "SOL" },
  { id: "ltc", name: "LTC" },
  { id: "eth", name: "ETH" },
  { id: "btc", name: "BTC" },
];

export default function PayoutMethodDialog({
  open,
  onOpenChange,
  onSave,
  currentMethodCount,
}: PayoutMethodDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<"crypto" | "paypal" | "bank" | "wise" | "revolut" | "tips">("crypto");
  const [selectedNetwork, setSelectedNetwork] = useState(cryptoNetworks[0].id);
  const [walletAddress, setWalletAddress] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  
  // Bank transfer fields
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  
  // Wise fields
  const [wiseEmail, setWiseEmail] = useState("");
  
  // Revolut fields
  const [revolutEmail, setRevolutEmail] = useState("");
  
  // TIPS fields
  const [tipsUsername, setTipsUsername] = useState("");

  const handleSave = () => {
    if (selectedMethod === "crypto") {
      if (!walletAddress) return;
      onSave("crypto", {
        network: selectedNetwork,
        address: walletAddress,
      });
    } else if (selectedMethod === "paypal") {
      if (!paypalEmail) return;
      onSave("paypal", {
        email: paypalEmail,
      });
    } else if (selectedMethod === "bank") {
      if (!bankName || !accountNumber || !routingNumber || !accountHolderName) return;
      onSave("bank", {
        bankName,
        accountNumber,
        routingNumber,
        accountHolderName,
      });
    } else if (selectedMethod === "wise") {
      if (!wiseEmail) return;
      onSave("wise", {
        email: wiseEmail,
      });
    } else if (selectedMethod === "revolut") {
      if (!revolutEmail) return;
      onSave("revolut", {
        email: revolutEmail,
      });
    } else if (selectedMethod === "tips") {
      if (!tipsUsername) return;
      onSave("tips", {
        username: tipsUsername,
      });
    }
    
    // Reset all fields
    setWalletAddress("");
    setPaypalEmail("");
    setBankName("");
    setAccountNumber("");
    setRoutingNumber("");
    setAccountHolderName("");
    setWiseEmail("");
    setRevolutEmail("");
    setTipsUsername("");
    onOpenChange(false);
  };

  const isMaxMethodsReached = currentMethodCount >= 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Your Payout Methods</DialogTitle>
          <p className="text-muted-foreground">
            Get ready to receive your payouts! ({currentMethodCount}/3 methods added)
          </p>
          {isMaxMethodsReached && (
            <p className="text-sm text-destructive">
              Maximum limit reached. Please remove a method to add a new one.
            </p>
          )}
        </DialogHeader>

        {!isMaxMethodsReached && (
          <Tabs defaultValue="crypto" value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="crypto" className="gap-1 text-xs">
                <Wallet className="h-3 w-3" />
                Crypto
              </TabsTrigger>
              <TabsTrigger value="paypal" className="gap-1 text-xs">
                <CreditCard className="h-3 w-3" />
                PayPal
              </TabsTrigger>
              <TabsTrigger value="bank" className="gap-1 text-xs">
                <CreditCard className="h-3 w-3" />
                Bank
              </TabsTrigger>
            </TabsList>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="wise" className="gap-1 text-xs">
                <CreditCard className="h-3 w-3" />
                Wise
              </TabsTrigger>
              <TabsTrigger value="revolut" className="gap-1 text-xs">
                <CreditCard className="h-3 w-3" />
                Revolut
              </TabsTrigger>
              <TabsTrigger value="tips" className="gap-1 text-xs">
                <CreditCard className="h-3 w-3" />
                TIPS
              </TabsTrigger>
            </TabsList>

          <TabsContent value="crypto" className="space-y-5 mt-0">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Network</Label>
              <div className="flex flex-wrap gap-2">
                {cryptoNetworks.map((network) => (
                  <button
                    key={network.id}
                    type="button"
                    onClick={() => setSelectedNetwork(network.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedNetwork === network.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {network.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet-address" className="text-sm font-medium">Wallet Address</Label>
              <Input
                id="wallet-address"
                placeholder="Enter your wallet address"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="h-11"
              />
            </div>
          </TabsContent>

          <TabsContent value="paypal" className="space-y-5 mt-0">
            <div className="space-y-2">
              <Label htmlFor="paypal-email" className="text-sm font-medium">PayPal Email</Label>
              <Input
                id="paypal-email"
                type="email"
                placeholder="your.email@example.com"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className="h-11"
              />
            </div>
          </TabsContent>

          <TabsContent value="bank" className="space-y-5 mt-0">
            <div className="space-y-2">
              <Label htmlFor="bank-name" className="text-sm font-medium">Bank Name</Label>
              <Input
                id="bank-name"
                placeholder="Enter bank name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-holder" className="text-sm font-medium">Account Holder Name</Label>
              <Input
                id="account-holder"
                placeholder="Full name on account"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-number" className="text-sm font-medium">Account Number</Label>
              <Input
                id="account-number"
                placeholder="Enter account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routing-number" className="text-sm font-medium">Routing Number</Label>
              <Input
                id="routing-number"
                placeholder="Enter routing number"
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.target.value)}
                className="h-11"
              />
            </div>
          </TabsContent>

          <TabsContent value="wise" className="space-y-5 mt-0">
            <div className="space-y-2">
              <Label htmlFor="wise-email" className="text-sm font-medium">Wise Email</Label>
              <Input
                id="wise-email"
                type="email"
                placeholder="your.email@example.com"
                value={wiseEmail}
                onChange={(e) => setWiseEmail(e.target.value)}
                className="h-11"
              />
            </div>
          </TabsContent>

          <TabsContent value="revolut" className="space-y-5 mt-0">
            <div className="space-y-2">
              <Label htmlFor="revolut-email" className="text-sm font-medium">Revolut Email</Label>
              <Input
                id="revolut-email"
                type="email"
                placeholder="your.email@example.com"
                value={revolutEmail}
                onChange={(e) => setRevolutEmail(e.target.value)}
                className="h-11"
              />
            </div>
          </TabsContent>

          <TabsContent value="tips" className="space-y-5 mt-0">
            <div className="space-y-2">
              <Label htmlFor="tips-username" className="text-sm font-medium">TIPS Username</Label>
              <Input
                id="tips-username"
                placeholder="Enter your TIPS username"
                value={tipsUsername}
                onChange={(e) => setTipsUsername(e.target.value)}
                className="h-11"
              />
            </div>
          </TabsContent>

          <div className="flex gap-3 pt-6 border-t mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={
                (selectedMethod === "crypto" && !walletAddress) ||
                (selectedMethod === "paypal" && !paypalEmail) ||
                (selectedMethod === "bank" && (!bankName || !accountNumber || !routingNumber || !accountHolderName)) ||
                (selectedMethod === "wise" && !wiseEmail) ||
                (selectedMethod === "revolut" && !revolutEmail) ||
                (selectedMethod === "tips" && !tipsUsername)
              }
            >
              Add Method
            </Button>
          </div>
        </Tabs>
        )}

        {isMaxMethodsReached && (
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
