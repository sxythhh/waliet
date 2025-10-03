import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, CreditCard } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import wiseLogo from "@/assets/wise-logo.svg";
import wiseLogoBlue from "@/assets/wise-logo-blue.svg";
import paypalLogo from "@/assets/paypal-logo.svg";
import ethereumLogo from "@/assets/ethereum-logo.png";
import optimismLogo from "@/assets/optimism-logo.png";
import solanaLogo from "@/assets/solana-logo.png";
import polygonLogo from "@/assets/polygon-logo.png";
import usdtLogo from "@/assets/usdt-logo.png";
import usdcLogo from "@/assets/usdc-logo.png";

interface PayoutMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (method: string, details: any) => void;
  currentMethodCount: number;
}

const cryptoCurrencies = [
  { id: "usdt", name: "USDT", logo: usdtLogo },
  { id: "usdc", name: "USDC", logo: usdcLogo },
];

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
  currentMethodCount,
}: PayoutMethodDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<"crypto" | "paypal" | "wise" | "revolut">("crypto");
  const [selectedCurrency, setSelectedCurrency] = useState(cryptoCurrencies[0].id);
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
  const [revolutTag, setRevolutTag] = useState("");

  const handleSave = () => {
    if (selectedMethod === "crypto") {
      if (!walletAddress) return;
      onSave("crypto", {
        currency: selectedCurrency,
        network: selectedNetwork,
        address: walletAddress,
      });
    } else if (selectedMethod === "paypal") {
      if (!paypalEmail) return;
      onSave("paypal", {
        email: paypalEmail,
      });
    } else if (selectedMethod === "wise") {
      if (!wiseEmail) return;
      onSave("wise", {
        email: wiseEmail,
      });
    } else if (selectedMethod === "revolut") {
      if (!revolutTag) return;
      onSave("revolut", {
        revtag: revolutTag,
      });
    }
    
    // Reset all fields
    setWalletAddress("");
    setPaypalEmail("");
    setWiseEmail("");
    setRevolutTag("");
    onOpenChange(false);
  };

  const isMaxMethodsReached = currentMethodCount >= 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-[#0a0a0a] border-[#1a1a1a] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-[#1a1a1a] pb-6">
          <DialogTitle className="text-3xl font-bold">Payout Methods</DialogTitle>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Configure how you want to receive payments
            </p>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]">
              {currentMethodCount}/3 Added
            </span>
          </div>
          {isMaxMethodsReached && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">
                Maximum limit reached. Remove a method to add a new one.
              </p>
            </div>
          )}
        </DialogHeader>

        {!isMaxMethodsReached && (
          <div className="flex gap-6 pt-6">
            {/* Payment Method Sidebar */}
            <div className="w-48 flex-shrink-0 space-y-2">
              <p className="font-medium text-muted-foreground mb-4 px-3" style={{ fontSize: '11px', letterSpacing: '-0.5px' }}>
                SELECT METHOD
              </p>
              {[
                { id: "crypto", icon: Wallet, label: "Crypto Wallet", isLogo: false },
                { id: "paypal", icon: paypalLogo, label: "PayPal", isLogo: true },
                { id: "wise", icon: wiseLogo, iconActive: wiseLogoBlue, label: "Wise", isLogo: true },
                { id: "revolut", icon: CreditCard, label: "Revolut", isLogo: false },
              ].map((method) => {
                const Icon = method.icon;
                const isActive = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-[#1a1a1a]"
                        : "bg-[#0f0f0f] hover:bg-[#151515]"
                    }`}
                  >
                    {method.isLogo ? (
                      <img 
                        src={(isActive && method.iconActive ? method.iconActive : Icon) as string} 
                        alt={method.label} 
                        className="h-4 w-4" 
                      />
                    ) : (
                      <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    )}
                    <span className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-[#0f0f0f] rounded-xl p-6">
              {selectedMethod === "crypto" && (
                <div className="space-y-6">
                  <div>
                    <Label className="font-medium text-muted-foreground mb-4 block" style={{ fontSize: '11px', letterSpacing: '-0.5px' }}>
                      SELECT CURRENCY
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {cryptoCurrencies.map((currency) => (
                        <button
                          key={currency.id}
                          type="button"
                          onClick={() => setSelectedCurrency(currency.id)}
                          className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all border flex items-center gap-2 justify-center ${
                            selectedCurrency === currency.id
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-[#1a1a1a] text-muted-foreground border-[#2a2a2a] hover:border-[#3a3a3a]"
                          }`}
                        >
                          <img src={currency.logo} alt={currency.name} className="h-5 w-5" />
                          {currency.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="font-medium text-muted-foreground mb-3 block" style={{ fontSize: '11px', letterSpacing: '-0.5px' }}>
                      SELECT NETWORK
                    </Label>
                    <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                      <SelectTrigger className="h-12 bg-[#1a1a1a] border-[#2a2a2a]">
                        <SelectValue>
                          {selectedNetwork && (
                            <div className="flex items-center gap-3">
                              <img 
                                src={cryptoNetworks.find(n => n.id === selectedNetwork)?.logo} 
                                alt={cryptoNetworks.find(n => n.id === selectedNetwork)?.name}
                                className="h-5 w-5"
                              />
                              <span>{cryptoNetworks.find(n => n.id === selectedNetwork)?.name}</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                        {cryptoNetworks.map((network) => (
                          <SelectItem key={network.id} value={network.id} className="focus:bg-[#2a2a2a]">
                            <div className="flex items-center gap-3">
                              <img src={network.logo} alt={network.name} className="h-5 w-5" />
                              <span>{network.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="wallet-address" className="font-medium text-muted-foreground" style={{ fontSize: '11px', letterSpacing: '-0.5px' }}>
                      WALLET ADDRESS
                    </Label>
                    <Input
                      id="wallet-address"
                      placeholder="Enter your wallet address"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="h-12 bg-[#1a1a1a] border-[#2a2a2a] focus:bg-[#0f0f0f] focus:border-[#3a3a3a]"
                    />
                  </div>
                </div>
              )}

              {selectedMethod === "paypal" && (
                <div className="space-y-3">
                  <Label htmlFor="paypal-email" className="font-medium text-muted-foreground" style={{ fontSize: '11px', letterSpacing: '-0.5px' }}>
                    PAYPAL EMAIL
                  </Label>
                  <Input
                    id="paypal-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    className="h-12 bg-[#1a1a1a] border-[#2a2a2a] focus:bg-[#0f0f0f] focus:border-[#3a3a3a]"
                  />
                </div>
              )}

              {selectedMethod === "wise" && (
                <div className="space-y-3">
                  <Label htmlFor="wise-email" className="font-medium text-muted-foreground" style={{ fontSize: '11px', letterSpacing: '-0.5px' }}>
                    WISE EMAIL
                  </Label>
                  <Input
                    id="wise-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={wiseEmail}
                    onChange={(e) => setWiseEmail(e.target.value)}
                    className="h-12 bg-[#1a1a1a] border-[#2a2a2a] focus:bg-[#0f0f0f] focus:border-[#3a3a3a]"
                  />
                </div>
              )}

              {selectedMethod === "revolut" && (
                <div className="space-y-3">
                  <Label htmlFor="revolut-tag" className="font-medium text-muted-foreground" style={{ fontSize: '11px', letterSpacing: '-0.5px' }}>
                    REVTAG
                  </Label>
                  <Input
                    id="revolut-tag"
                    placeholder="@yourtag"
                    value={revolutTag}
                    onChange={(e) => setRevolutTag(e.target.value)}
                    className="h-12 bg-[#1a1a1a] border-[#2a2a2a] focus:bg-[#0f0f0f] focus:border-[#3a3a3a]"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {!isMaxMethodsReached && (
          <div className="flex gap-3 pt-6 border-t border-[#1a1a1a]">
            <Button
              variant="outline"
              className="flex-1 h-12 bg-[#0f0f0f] border-[#2a2a2a] hover:bg-[#1a1a1a]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 bg-primary hover:bg-primary/90"
              onClick={handleSave}
              disabled={
                (selectedMethod === "crypto" && !walletAddress) ||
                (selectedMethod === "paypal" && !paypalEmail) ||
                (selectedMethod === "wise" && !wiseEmail) ||
                (selectedMethod === "revolut" && !revolutTag)
              }
            >
              Add Method
            </Button>
          </div>
        )}

        {isMaxMethodsReached && (
          <div className="flex justify-end pt-4 border-t border-[#1a1a1a]">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-[#0f0f0f] border-[#2a2a2a] hover:bg-[#1a1a1a]"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
