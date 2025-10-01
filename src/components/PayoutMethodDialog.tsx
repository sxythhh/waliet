import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, CreditCard } from "lucide-react";
import { SiPaypal } from "react-icons/si";

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

        <div className="space-y-6 py-4">
          <div>
            <Label className="text-base mb-3 block">Select your payout method</Label>
            <div className="flex gap-3">
              <Button
                variant={selectedMethod === "crypto" ? "default" : "outline"}
                className="flex-1 h-14"
                onClick={() => setSelectedMethod("crypto")}
              >
                <Wallet className="mr-2 h-5 w-5" />
                Crypto
              </Button>
              <Button
                variant={selectedMethod === "paypal" ? "default" : "outline"}
                className="flex-1 h-14"
                onClick={() => setSelectedMethod("paypal")}
              >
                <SiPaypal className="mr-2 h-5 w-5" />
                PayPal
              </Button>
            </div>
          </div>

          {selectedMethod === "crypto" ? (
            <>
              <div>
                <Label className="text-base mb-3 block">Network</Label>
                <div className="flex flex-wrap gap-2">
                  {cryptoNetworks.map((network) => (
                    <Button
                      key={network.id}
                      variant={selectedNetwork === network.id ? "default" : "outline"}
                      className="h-12"
                      onClick={() => setSelectedNetwork(network.id)}
                    >
                      {network.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base mb-2 block">Wallet Address</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Enter your wallet address"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="pl-10 h-12 bg-background"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <Label className="text-base mb-2 block">PayPal Email</Label>
              <div className="relative">
                <SiPaypal className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  className="pl-10 h-12 bg-background"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="default"
              className="flex-1 h-12"
              onClick={handleSave}
              disabled={
                selectedMethod === "crypto" ? !walletAddress : !paypalEmail
              }
            >
              Add Method
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
