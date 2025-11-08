import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Landmark, CreditCard } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import paypalLogo from "@/assets/paypal-logo-grey.svg";
import paypalLogoBlue from "@/assets/paypal-logo.svg";
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
const cryptoCurrencies = [{
  id: "usdc",
  name: "USDC",
  logo: usdcLogo
}];
const cryptoNetworks = [{
  id: "ethereum",
  name: "Ethereum",
  logo: ethereumLogo
}, {
  id: "optimism",
  name: "Optimism",
  logo: optimismLogo
}, {
  id: "solana",
  name: "Solana",
  logo: solanaLogo
}, {
  id: "polygon",
  name: "Polygon",
  logo: polygonLogo
}];
export default function PayoutMethodDialog({
  open,
  onOpenChange,
  onSave,
  currentMethodCount
}: PayoutMethodDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<"crypto" | "paypal" | "wise" | "upi">("crypto");
  const [selectedCurrency, setSelectedCurrency] = useState(cryptoCurrencies[0].id);
  const [selectedNetwork, setSelectedNetwork] = useState(cryptoNetworks[0].id);
  const [walletAddress, setWalletAddress] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [upiId, setUpiId] = useState("");

  // Bank transfer fields
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const handleSave = () => {
    if (selectedMethod === "crypto") {
      if (!walletAddress) return;
      onSave("crypto", {
        currency: selectedCurrency,
        network: selectedNetwork,
        address: walletAddress
      });
    } else if (selectedMethod === "paypal") {
      if (!paypalEmail) return;
      onSave("paypal", {
        email: paypalEmail
      });
    } else if (selectedMethod === "upi") {
      if (!upiId) return;
      onSave("upi", {
        upi_id: upiId
      });
    }

    // Reset all fields
    setWalletAddress("");
    setPaypalEmail("");
    setUpiId("");
    onOpenChange(false);
  };
  const isMaxMethodsReached = currentMethodCount >= 3;
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isMaxMethodsReached ? "Maximum Methods Reached" : "Add Payout Method"}
          </DialogTitle>
        </DialogHeader>

        {!isMaxMethodsReached && <div className="flex flex-col sm:flex-row gap-6 pt-6 py-[19px]">
            {/* Payment Method Sidebar */}
            <div className="w-full sm:w-48 flex-shrink-0 space-y-2">
              <p className="font-medium text-muted-foreground mb-4 px-3" style={{
            fontSize: '11px',
            letterSpacing: '-0.5px'
          }}>
                SELECT METHOD
              </p>
              {[{
            id: "crypto",
            icon: Wallet,
            label: "Crypto Wallet",
            isLogo: false
          }, {
            id: "paypal",
            icon: paypalLogo,
            iconActive: paypalLogoBlue,
            label: "PayPal",
            isLogo: true
          }, {
            id: "upi",
            icon: Landmark,
            label: "UPI",
            isLogo: false
          }].map(method => {
            const Icon = method.icon;
            const isActive = selectedMethod === method.id;
            return <button key={method.id} onClick={() => setSelectedMethod(method.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? "bg-muted" : "bg-background hover:bg-muted/50"}`}>
                    {method.isLogo ? <img src={(isActive && method.iconActive ? method.iconActive : Icon) as string} alt={method.label} className="h-4 w-4" /> : <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />}
                    <span className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {method.label}
                    </span>
                  </button>;
          })}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-background rounded-xl p-6">
              {selectedMethod === "crypto" && <div className="space-y-6">
                  <div>
                    <Label className="font-medium text-muted-foreground mb-4 block" style={{
                fontSize: '11px',
                letterSpacing: '-0.5px'
              }}>
                      SELECT CURRENCY
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {cryptoCurrencies.map(currency => <button key={currency.id} type="button" onClick={() => setSelectedCurrency(currency.id)} className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all border flex items-center gap-2 justify-center ${selectedCurrency === currency.id ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-transparent hover:border-transparent"}`}>
                          <img src={currency.logo} alt={currency.name} className="h-5 w-5" />
                          {currency.name}
                        </button>)}
                    </div>
                  </div>

                  <div>
                    <Label className="font-medium text-muted-foreground mb-3 block" style={{
                fontSize: '11px',
                letterSpacing: '-0.5px'
              }}>
                      SELECT NETWORK
                    </Label>
                    <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                      <SelectTrigger className="h-12 bg-muted border-transparent">
                        <SelectValue>
                          {selectedNetwork && <div className="flex items-center gap-3">
                              <img src={cryptoNetworks.find(n => n.id === selectedNetwork)?.logo} alt={cryptoNetworks.find(n => n.id === selectedNetwork)?.name} className="h-5 w-5" />
                              <span>{cryptoNetworks.find(n => n.id === selectedNetwork)?.name}</span>
                            </div>}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-transparent">
                        {cryptoNetworks.map(network => <SelectItem key={network.id} value={network.id} className="focus:bg-accent">
                            <div className="flex items-center gap-3">
                              <img src={network.logo} alt={network.name} className="h-5 w-5" />
                              <span>{network.name}</span>
                            </div>
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="wallet-address" className="font-medium text-muted-foreground" style={{
                fontSize: '11px',
                letterSpacing: '-0.5px'
              }}>
                      WALLET ADDRESS
                    </Label>
                    <Input id="wallet-address" placeholder="Enter your wallet address" value={walletAddress} onChange={e => setWalletAddress(e.target.value)} className="h-12 bg-muted border-transparent focus:bg-background focus:border-transparent" />
                  </div>
                </div>}

              {selectedMethod === "paypal" && <div className="space-y-3">
                  <Label htmlFor="paypal-email" className="font-medium text-muted-foreground" style={{
              fontSize: '11px',
              letterSpacing: '-0.5px'
            }}>
                    PAYPAL EMAIL
                  </Label>
                  <Input id="paypal-email" type="email" placeholder="your.email@example.com" value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)} className="h-12 bg-muted border-transparent focus:bg-background focus:border-transparent" />
                </div>}

              {selectedMethod === "upi" && <div className="space-y-3">
                  <Label htmlFor="upi-id" className="font-medium text-muted-foreground" style={{
              fontSize: '11px',
              letterSpacing: '-0.5px'
            }}>
                    UPI ID
                  </Label>
                  <Input id="upi-id" type="text" placeholder="yourname@okaxis" value={upiId} onChange={e => setUpiId(e.target.value)} className="h-12 bg-muted border-transparent focus:bg-background focus:border-transparent" />
                </div>}
            </div>
          </div>}

        {!isMaxMethodsReached && <div className="flex gap-3 pt-6 border-t border-border">
            <Button variant="outline" className="flex-1 h-12 bg-background border-border hover:bg-muted" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1 h-12 bg-primary hover:bg-primary/90" onClick={handleSave} disabled={selectedMethod === "crypto" && !walletAddress || selectedMethod === "paypal" && !paypalEmail || selectedMethod === "upi" && !upiId}>
              Add Method
            </Button>
          </div>}

        {isMaxMethodsReached && <div className="flex justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-background border-border hover:bg-muted">
              Close
            </Button>
          </div>}
      </DialogContent>
    </Dialog>;
}