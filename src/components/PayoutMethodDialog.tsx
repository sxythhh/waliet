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
}: PayoutMethodDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<"crypto" | "paypal">("crypto");
  const [selectedNetwork, setSelectedNetwork] = useState(cryptoNetworks[0].id);
  const [walletAddress, setWalletAddress] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");

  const handleSave = () => {
    if (selectedMethod === "crypto") {
      if (!walletAddress) return;
      onSave("crypto", {
        network: selectedNetwork,
        address: walletAddress,
      });
    } else {
      if (!paypalEmail) return;
      onSave("paypal", {
        email: paypalEmail,
      });
    }
    setWalletAddress("");
    setPaypalEmail("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl">Your Payout Methods</DialogTitle>
          <p className="text-muted-foreground">Get ready to receive your payouts!</p>
        </DialogHeader>

        <Tabs defaultValue="crypto" value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as "crypto" | "paypal")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="crypto" className="gap-2">
              <Wallet className="h-4 w-4" />
              Crypto
            </TabsTrigger>
            <TabsTrigger value="paypal" className="gap-2">
              <CreditCard className="h-4 w-4" />
              PayPal
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
                selectedMethod === "crypto" ? !walletAddress : !paypalEmail
              }
            >
              Add Method
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
