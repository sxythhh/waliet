import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import paypalLogo from "@/assets/paypal-logo.svg";
import ethereumLogo from "@/assets/ethereum-logo.png";
import optimismLogo from "@/assets/optimism-logo.png";
import solanaLogo from "@/assets/solana-logo.png";
import polygonLogo from "@/assets/polygon-logo.png";
import usdcLogo from "@/assets/usdc-logo.png";
import walletIcon from "@/assets/wallet-active.svg";
import { Building2, Smartphone } from "lucide-react";

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
  const [selectedMethod, setSelectedMethod] = useState<"crypto" | "paypal" | "bank" | "upi">("crypto");
  const [selectedNetwork, setSelectedNetwork] = useState(cryptoNetworks[0].id);
  const [walletAddress, setWalletAddress] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [upiId, setUpiId] = useState("");
  const { toast } = useToast();

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
    } else if (selectedMethod === "bank") {
      if (!bankName || !accountNumber || !routingNumber || !accountHolderName) return;
      onSave("bank", {
        bankName,
        accountNumber,
        routingNumber,
        accountHolderName
      });
    } else if (selectedMethod === "upi") {
      if (!upiId) return;
      onSave("upi", { upi_id: upiId });
    }

    setWalletAddress("");
    setPaypalEmail("");
    setBankName("");
    setAccountNumber("");
    setRoutingNumber("");
    setAccountHolderName("");
    setUpiId("");
    onOpenChange(false);
  };

  const isMaxMethodsReached = currentMethodCount >= 3;
  const isDisabled = (selectedMethod === "crypto" && !walletAddress) || 
                     (selectedMethod === "paypal" && !paypalEmail) ||
                     (selectedMethod === "bank" && (!bankName || !accountNumber || !routingNumber || !accountHolderName)) ||
                     (selectedMethod === "upi" && !upiId);

  const selectedNetworkData = cryptoNetworks.find(n => n.id === selectedNetwork);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 bg-background border-border overflow-hidden font-inter tracking-[-0.5px]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold">
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
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedMethod("crypto")}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-transparent transition-all duration-200 ${
                    selectedMethod === "crypto"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    selectedMethod === "crypto" ? "bg-primary-foreground/20" : "bg-muted"
                  }`}>
                    <img src={walletIcon} alt="Wallet" className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">
                    Crypto
                  </span>
                </button>

                <button
                  onClick={() => setSelectedMethod("paypal")}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-transparent transition-all duration-200 ${
                    selectedMethod === "paypal"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    selectedMethod === "paypal" ? "bg-primary-foreground/20" : "bg-muted"
                  }`}>
                    <img src={paypalLogo} alt="PayPal" className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">
                    PayPal
                  </span>
                </button>

                <button
                  onClick={() => setSelectedMethod("bank")}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-transparent transition-all duration-200 ${
                    selectedMethod === "bank"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    selectedMethod === "bank" ? "bg-primary-foreground/20" : "bg-muted"
                  }`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">
                    Bank
                  </span>
                </button>

                <button
                  onClick={() => setSelectedMethod("upi")}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-transparent transition-all duration-200 ${
                    selectedMethod === "upi"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    selectedMethod === "upi" ? "bg-primary-foreground/20" : "bg-muted"
                  }`}>
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">
                    UPI
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

                  <div className="space-y-2.5">
                    <label className="text-xs font-medium text-foreground font-inter tracking-[-0.5px]">
                      Network
                    </label>
                    <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                      <SelectTrigger className="h-11 bg-muted/50 border-transparent focus:ring-0 font-inter tracking-[-0.5px]">
                        <SelectValue>
                          {selectedNetworkData && (
                            <div className="flex items-center gap-2">
                              <img src={selectedNetworkData.logo} alt={selectedNetworkData.name} className="w-5 h-5" />
                              <span>{selectedNetworkData.name}</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {cryptoNetworks.map((network) => (
                          <SelectItem key={network.id} value={network.id} className="font-inter tracking-[-0.5px]">
                            <div className="flex items-center gap-2">
                              <img src={network.logo} alt={network.name} className="w-5 h-5" />
                              <span>{network.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Wallet Address */}
                  <div className="space-y-2.5">
                    <label htmlFor="wallet-address" className="text-xs font-medium text-foreground font-inter tracking-[-0.5px]">
                      Wallet Address
                    </label>
                    <Input
                      id="wallet-address"
                      placeholder="0x..."
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="h-11 bg-muted/50 border-transparent focus:border-transparent focus:bg-background placeholder:text-muted-foreground/50 font-inter tracking-[-0.5px]"
                    />
                  </div>

                  {/* Add Method Button */}
                  <Button
                    className="w-full h-10 font-inter tracking-[-0.5px] mt-2"
                    onClick={handleSave}
                    disabled={!walletAddress}
                  >
                    Add Method
                  </Button>
                </>
              )}

              {selectedMethod === "paypal" && (
                <>
                  <div className="space-y-2.5">
                    <label htmlFor="paypal-email" className="text-xs font-medium text-foreground font-inter tracking-[-0.5px]">
                      PayPal Email
                    </label>
                    <Input
                      id="paypal-email"
                      type="email"
                      placeholder="your@email.com"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      className="h-11 bg-muted/50 border-transparent focus:border-transparent focus:bg-background placeholder:text-muted-foreground/50 font-inter tracking-[-0.5px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Make sure this matches your PayPal account email.
                    </p>
                  </div>

                  {/* Add Method Button */}
                  <Button
                    className="w-full h-10 font-inter tracking-[-0.5px] mt-2"
                    onClick={handleSave}
                    disabled={!paypalEmail}
                  >
                    Add Method
                  </Button>
                </>
              )}

              {selectedMethod === "bank" && (
                <>
                  <div className="space-y-2.5">
                    <label htmlFor="account-holder" className="text-xs font-medium text-foreground font-inter tracking-[-0.5px]">
                      Account Holder Name
                    </label>
                    <Input
                      id="account-holder"
                      placeholder="John Doe"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      className="h-11 bg-muted/50 border-transparent focus:border-transparent focus:bg-background placeholder:text-muted-foreground/50 font-inter tracking-[-0.5px]"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <label htmlFor="bank-name" className="text-xs font-medium text-foreground font-inter tracking-[-0.5px]">
                      Bank Name
                    </label>
                    <Input
                      id="bank-name"
                      placeholder="Chase Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="h-11 bg-muted/50 border-transparent focus:border-transparent focus:bg-background placeholder:text-muted-foreground/50 font-inter tracking-[-0.5px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2.5">
                      <label htmlFor="account-number" className="text-xs font-medium text-foreground font-inter tracking-[-0.5px]">
                        Account Number
                      </label>
                      <Input
                        id="account-number"
                        placeholder="123456789"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="h-11 bg-muted/50 border-transparent focus:border-transparent focus:bg-background placeholder:text-muted-foreground/50 font-inter tracking-[-0.5px]"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label htmlFor="routing-number" className="text-xs font-medium text-foreground font-inter tracking-[-0.5px]">
                        Routing Number
                      </label>
                      <Input
                        id="routing-number"
                        placeholder="021000021"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                        className="h-11 bg-muted/50 border-transparent focus:border-transparent focus:bg-background placeholder:text-muted-foreground/50 font-inter tracking-[-0.5px]"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Minimum withdrawal for bank transfers is $250.
                  </p>

                  {/* Add Method Button */}
                  <Button
                    className="w-full h-10 font-inter tracking-[-0.5px] mt-2"
                    onClick={handleSave}
                    disabled={!bankName || !accountNumber || !routingNumber || !accountHolderName}
                  >
                    Add Method
                  </Button>
                </>
              )}

              {selectedMethod === "upi" && (
                <>
                  <div className="space-y-2.5">
                    <label htmlFor="upi-id" className="text-xs font-medium text-foreground font-inter tracking-[-0.5px]">
                      UPI ID
                    </label>
                    <Input
                      id="upi-id"
                      placeholder="yourname@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="h-11 bg-muted/50 border-transparent focus:border-transparent focus:bg-background placeholder:text-muted-foreground/50 font-inter tracking-[-0.5px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your UPI ID (e.g., yourname@paytm, yourname@gpay).
                    </p>
                  </div>

                  {/* Add Method Button */}
                  <Button
                    className="w-full h-10 font-inter tracking-[-0.5px] mt-2"
                    onClick={handleSave}
                    disabled={!upiId}
                  >
                    Add Method
                  </Button>
                </>
              )}
            </div>
          </>
        )}

        {isMaxMethodsReached && (
          <div className="px-6 py-4 bg-muted/30 border-t border-border">
            <Button
              variant="outline"
              className="w-full h-10 font-inter tracking-[-0.5px]"
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
