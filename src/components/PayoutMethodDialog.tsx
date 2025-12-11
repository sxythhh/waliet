import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Check } from "lucide-react";
import paypalLogo from "@/assets/paypal-logo.svg";
import ethereumLogo from "@/assets/ethereum-logo.png";
import optimismLogo from "@/assets/optimism-logo.png";
import solanaLogo from "@/assets/solana-logo.png";
import polygonLogo from "@/assets/polygon-logo.png";
import usdcLogo from "@/assets/usdc-logo.png";

interface PayoutMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (method: string, details: any) => void;
  currentMethodCount: number;
}

const cryptoNetworks = [
  { id: "ethereum", name: "Ethereum", logo: ethereumLogo },
  { id: "optimism", name: "Optimism", logo: optimismLogo },
  { id: "solana", name: "Solana", logo: solanaLogo },
  { id: "polygon", name: "Polygon", logo: polygonLogo },
];

export default function PayoutMethodDialog({
  open,
  onOpenChange,
  onSave,
  currentMethodCount
}: PayoutMethodDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<"crypto" | "paypal">("crypto");
  const [selectedNetwork, setSelectedNetwork] = useState(cryptoNetworks[0].id);
  const [walletAddress, setWalletAddress] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");

  const handleSave = () => {
    if (selectedMethod === "crypto") {
      if (!walletAddress) return;
      onSave("crypto", {
        currency: "usdc",
        network: selectedNetwork,
        address: walletAddress
      });
    } else if (selectedMethod === "paypal") {
      if (!paypalEmail) return;
      onSave("paypal", { email: paypalEmail });
    }

    setWalletAddress("");
    setPaypalEmail("");
    onOpenChange(false);
  };

  const isMaxMethodsReached = currentMethodCount >= 3;
  const isDisabled = (selectedMethod === "crypto" && !walletAddress) || 
                     (selectedMethod === "paypal" && !paypalEmail);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 bg-background border-border overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {isMaxMethodsReached ? "Maximum Methods Reached" : "Add Payout Method"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isMaxMethodsReached 
              ? "You've reached the maximum of 3 payout methods." 
              : "Choose how you'd like to receive your earnings."}
          </p>
        </div>

        {!isMaxMethodsReached && (
          <>
            {/* Method Selection */}
            <div className="px-6 pb-5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedMethod("crypto")}
                  className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 ${
                    selectedMethod === "crypto"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30 hover:border-muted-foreground/30 hover:bg-muted/50"
                  }`}
                >
                  {selectedMethod === "crypto" && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedMethod === "crypto" ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <Wallet className={`w-5 h-5 ${selectedMethod === "crypto" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`text-sm font-medium ${selectedMethod === "crypto" ? "text-foreground" : "text-muted-foreground"}`}>
                    Crypto Wallet
                  </span>
                </button>

                <button
                  onClick={() => setSelectedMethod("paypal")}
                  className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 ${
                    selectedMethod === "paypal"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30 hover:border-muted-foreground/30 hover:bg-muted/50"
                  }`}
                >
                  {selectedMethod === "paypal" && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedMethod === "paypal" ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <img src={paypalLogo} alt="PayPal" className="w-5 h-5" />
                  </div>
                  <span className={`text-sm font-medium ${selectedMethod === "paypal" ? "text-foreground" : "text-muted-foreground"}`}>
                    PayPal
                  </span>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* Form Content */}
            <div className="px-6 py-5 space-y-5">
              {selectedMethod === "crypto" && (
                <>
                  {/* Currency Display */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <img src={usdcLogo} alt="USDC" className="w-8 h-8" />
                    <div>
                      <p className="text-sm font-medium">USDC</p>
                      <p className="text-xs text-muted-foreground">USD Coin</p>
                    </div>
                  </div>

                  {/* Network Selection */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Network
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {cryptoNetworks.map((network) => (
                        <button
                          key={network.id}
                          type="button"
                          onClick={() => setSelectedNetwork(network.id)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200 ${
                            selectedNetwork === network.id
                              ? "bg-primary/10 ring-1 ring-primary"
                              : "bg-muted/50 hover:bg-muted"
                          }`}
                        >
                          <img src={network.logo} alt={network.name} className="w-6 h-6" />
                          <span className={`text-xs font-medium ${
                            selectedNetwork === network.id ? "text-primary" : "text-muted-foreground"
                          }`}>
                            {network.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wallet Address */}
                  <div className="space-y-2.5">
                    <label htmlFor="wallet-address" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Wallet Address
                    </label>
                    <Input
                      id="wallet-address"
                      placeholder="0x..."
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="h-11 bg-muted/50 border-transparent focus:border-primary focus:bg-background placeholder:text-muted-foreground/50"
                    />
                  </div>
                </>
              )}

              {selectedMethod === "paypal" && (
                <div className="space-y-2.5">
                  <label htmlFor="paypal-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    PayPal Email
                  </label>
                  <Input
                    id="paypal-email"
                    type="email"
                    placeholder="your@email.com"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    className="h-11 bg-muted/50 border-transparent focus:border-primary focus:bg-background placeholder:text-muted-foreground/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Make sure this matches your PayPal account email.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/30 border-t border-border flex gap-3">
              <Button
                variant="ghost"
                className="flex-1 h-10"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-10"
                onClick={handleSave}
                disabled={isDisabled}
              >
                Add Method
              </Button>
            </div>
          </>
        )}

        {isMaxMethodsReached && (
          <div className="px-6 py-4 bg-muted/30 border-t border-border">
            <Button
              variant="outline"
              className="w-full h-10"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
