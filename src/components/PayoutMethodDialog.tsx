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
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 px-3">
                Select Method
              </p>
              {[
                { id: "crypto", icon: Wallet, label: "Crypto Wallet" },
                { id: "paypal", icon: CreditCard, label: "PayPal" },
                { id: "bank", icon: CreditCard, label: "Bank Transfer" },
                { id: "wise", icon: CreditCard, label: "Wise" },
                { id: "revolut", icon: CreditCard, label: "Revolut" },
                { id: "tips", icon: CreditCard, label: "TIPS" },
              ].map((method) => {
                const Icon = method.icon;
                const isActive = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-[#1a1a1a] border border-primary/30"
                        : "bg-[#0f0f0f] border border-[#1a1a1a] hover:border-[#2a2a2a]"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-[#0f0f0f] rounded-xl border border-[#1a1a1a] p-6">
              {selectedMethod === "crypto" && (
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 block">
                      Select Network
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      {cryptoNetworks.map((network) => (
                        <button
                          key={network.id}
                          type="button"
                          onClick={() => setSelectedNetwork(network.id)}
                          className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all border ${
                            selectedNetwork === network.id
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-[#1a1a1a] text-muted-foreground border-[#2a2a2a] hover:border-[#3a3a3a]"
                          }`}
                        >
                          {network.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="wallet-address" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Wallet Address
                    </Label>
                    <Input
                      id="wallet-address"
                      placeholder="Enter your wallet address"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="h-12 bg-[#1a1a1a] border-[#2a2a2a] focus:border-primary/50"
                    />
                  </div>
                </div>
              )}

              {selectedMethod === "paypal" && (
                <div className="space-y-3">
                  <Label htmlFor="paypal-email" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    PayPal Email
                  </Label>
                  <Input
                    id="paypal-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    className="h-12 bg-[#1a1a1a] border-[#2a2a2a] focus:border-primary/50"
                  />
                </div>
              )}

              {selectedMethod === "bank" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="bank-name" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Bank Name
                    </Label>
                    <Input
                      id="bank-name"
                      placeholder="Enter bank name"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="h-12 bg-[#1a1a1a] border-[#2a2a2a] focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="account-holder" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Account Holder Name
                    </Label>
                    <Input
                      id="account-holder"
                      placeholder="Full name on account"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      className="h-12 bg-[#1a1a1a] border-[#2a2a2a] focus:border-primary/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label htmlFor="account-number" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Account Number
                      </Label>
                      <Input
                        id="account-number"
                        placeholder="Account #"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="h-12 bg-[#1a1a1a] border-[#2a2a2a] focus:border-primary/50"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="routing-number" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Routing Number
                      </Label>
                      <Input
                        id="routing-number"
                        placeholder="Routing #"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                        className="h-12 bg-[#1a1a1a] border-[#2a2a2a] focus:border-primary/50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedMethod === "wise" && (
                <div className="space-y-3">
                  <Label htmlFor="wise-email" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Wise Email
                  </Label>
                  <Input
                    id="wise-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={wiseEmail}
                    onChange={(e) => setWiseEmail(e.target.value)}
                    className="h-12 bg-[#1a1a1a] border-[#2a2a2a] focus:border-primary/50"
                  />
                </div>
              )}

              {selectedMethod === "revolut" && (
                <div className="space-y-3">
                  <Label htmlFor="revolut-email" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Revolut Email
                  </Label>
                  <Input
                    id="revolut-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={revolutEmail}
                    onChange={(e) => setRevolutEmail(e.target.value)}
                    className="h-12 bg-[#1a1a1a] border-[#2a2a2a] focus:border-primary/50"
                  />
                </div>
              )}

              {selectedMethod === "tips" && (
                <div className="space-y-3">
                  <Label htmlFor="tips-username" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    TIPS Username
                  </Label>
                  <Input
                    id="tips-username"
                    placeholder="Enter your TIPS username"
                    value={tipsUsername}
                    onChange={(e) => setTipsUsername(e.target.value)}
                    className="h-12 bg-[#1a1a1a] border-[#2a2a2a] focus:border-primary/50"
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
                (selectedMethod === "bank" && (!bankName || !accountNumber || !routingNumber || !accountHolderName)) ||
                (selectedMethod === "wise" && !wiseEmail) ||
                (selectedMethod === "revolut" && !revolutEmail) ||
                (selectedMethod === "tips" && !tipsUsername)
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
