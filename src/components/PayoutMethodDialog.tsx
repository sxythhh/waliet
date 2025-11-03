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
  const [selectedMethod, setSelectedMethod] = useState<"crypto" | "paypal" | "wise" | "revolut" | "debit" | "upi">("crypto");
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

  // Revolut fields
  const [revolutTag, setRevolutTag] = useState("");

  // Debit card fields
  const [cardNumber, setCardNumber] = useState("");
  const [legalName, setLegalName] = useState("");
  const [address, setAddress] = useState("");
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
    } else if (selectedMethod === "revolut") {
      if (!revolutTag) return;
      onSave("revolut", {
        revtag: revolutTag
      });
    } else if (selectedMethod === "debit") {
      if (!cardNumber || !legalName || !address) return;
      onSave("debit", {
        cardNumber,
        legalName,
        address
      });
    }

    // Reset all fields
    setWalletAddress("");
    setPaypalEmail("");
    setUpiId("");
    setRevolutTag("");
    setCardNumber("");
    setLegalName("");
    setAddress("");
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
            <div className="w-full sm:w-52 flex-shrink-0 space-y-2">
              <p className="font-semibold text-xs text-muted-foreground mb-5 px-1 tracking-wider uppercase">
                Payment Methods
              </p>
              <div className="space-y-2">
                {[{
              id: "crypto",
              icon: Wallet,
              label: "Crypto Wallet",
              description: "USDC on multiple chains",
              isLogo: false
            }, {
              id: "paypal",
              icon: paypalLogo,
              iconActive: paypalLogoBlue,
              label: "PayPal",
              description: "Fast & secure",
              isLogo: true
            }, {
              id: "upi",
              icon: Landmark,
              label: "UPI",
              description: "Instant transfers",
              isLogo: false
            }, {
              id: "revolut",
              icon: Landmark,
              label: "Revolut",
              description: "Modern banking",
              isLogo: false
            }, {
              id: "debit",
              icon: CreditCard,
              label: "Debit Card",
              description: "Direct to card",
              isLogo: false
            }].map(method => {
              const Icon = method.icon;
              const isActive = selectedMethod === method.id;
              return <button key={method.id} onClick={() => setSelectedMethod(method.id as any)} className={`w-full group relative overflow-hidden rounded-xl transition-all duration-300 ${isActive ? "bg-primary/10 border-2 border-primary/30 shadow-lg shadow-primary/10" : "bg-card/50 border-2 border-border/50 hover:border-primary/20 hover:shadow-md hover:bg-card"}`}>
                      <div className="flex items-start gap-3 px-4 py-3.5">
                        <div className={`mt-0.5 rounded-lg p-2 transition-all duration-300 ${isActive ? "bg-primary/20" : "bg-muted/50 group-hover:bg-muted"}`}>
                          {method.isLogo ? <img src={(isActive && method.iconActive ? method.iconActive : Icon) as string} alt={method.label} className="h-5 w-5" /> : <Icon className={`h-5 w-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />}
                        </div>
                        <div className="flex-1 text-left">
                          <div className={`text-sm font-semibold transition-colors ${isActive ? "text-primary" : "text-foreground"}`}>
                            {method.label}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {method.description}
                          </div>
                        </div>
                        {isActive && <div className="absolute right-2 top-2">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          </div>}
                      </div>
                    </button>;
            })}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-gradient-to-br from-card/50 to-card rounded-2xl border-2 border-border/50 p-8 shadow-xl">
              {selectedMethod === "crypto" && <div className="space-y-7">
                  <div>
                    <Label className="font-semibold text-xs text-muted-foreground mb-4 block tracking-wider uppercase">
                      Select Currency
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {cryptoCurrencies.map(currency => <button key={currency.id} type="button" onClick={() => setSelectedCurrency(currency.id)} className={`group relative overflow-hidden px-5 py-4 rounded-xl text-sm font-bold transition-all duration-300 border-2 flex items-center gap-3 justify-center ${selectedCurrency === currency.id ? "bg-primary/10 text-primary border-primary/40 shadow-lg shadow-primary/10" : "bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/20 hover:shadow-md hover:bg-muted"}`}>
                          <img src={currency.logo} alt={currency.name} className="h-6 w-6" />
                          {currency.name}
                          {selectedCurrency === currency.id && <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />}
                        </button>)}
                    </div>
                  </div>

                  <div>
                    <Label className="font-semibold text-xs text-muted-foreground mb-4 block tracking-wider uppercase">
                      Select Network
                    </Label>
                    <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                      <SelectTrigger className="h-14 bg-muted/50 border-2 border-border/50 hover:border-primary/20 rounded-xl transition-all">
                        <SelectValue>
                          {selectedNetwork && <div className="flex items-center gap-3">
                              <img src={cryptoNetworks.find(n => n.id === selectedNetwork)?.logo} alt={cryptoNetworks.find(n => n.id === selectedNetwork)?.name} className="h-6 w-6" />
                              <span className="font-semibold">{cryptoNetworks.find(n => n.id === selectedNetwork)?.name}</span>
                            </div>}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card border-2 border-border/50 rounded-xl">
                        {cryptoNetworks.map(network => <SelectItem key={network.id} value={network.id} className="focus:bg-primary/10 rounded-lg my-1">
                            <div className="flex items-center gap-3">
                              <img src={network.logo} alt={network.name} className="h-6 w-6" />
                              <span className="font-semibold">{network.name}</span>
                            </div>
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="wallet-address" className="font-semibold text-xs text-muted-foreground tracking-wider uppercase">
                      Wallet Address
                    </Label>
                    <Input id="wallet-address" placeholder="Enter your wallet address" value={walletAddress} onChange={e => setWalletAddress(e.target.value)} className="h-14 bg-muted/50 border-2 border-border/50 focus:border-primary/40 rounded-xl font-medium placeholder:text-muted-foreground/50 transition-all" />
                  </div>
                </div>}

              {selectedMethod === "paypal" && <div className="space-y-4">
                  <Label htmlFor="paypal-email" className="font-semibold text-xs text-muted-foreground tracking-wider uppercase">
                    PayPal Email
                  </Label>
                  <Input id="paypal-email" type="email" placeholder="your.email@example.com" value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)} className="h-14 bg-muted/50 border-2 border-border/50 focus:border-primary/40 rounded-xl font-medium placeholder:text-muted-foreground/50 transition-all" />
                </div>}

              {selectedMethod === "upi" && <div className="space-y-4">
                  <Label htmlFor="upi-id" className="font-semibold text-xs text-muted-foreground tracking-wider uppercase">
                    UPI ID
                  </Label>
                  <Input id="upi-id" type="text" placeholder="yourname@okaxis" value={upiId} onChange={e => setUpiId(e.target.value)} className="h-14 bg-muted/50 border-2 border-border/50 focus:border-primary/40 rounded-xl font-medium placeholder:text-muted-foreground/50 transition-all" />
                </div>}

              {selectedMethod === "revolut" && <div className="space-y-4">
                  <Label htmlFor="revolut-tag" className="font-semibold text-xs text-muted-foreground tracking-wider uppercase">
                    RevTag
                  </Label>
                  <Input id="revolut-tag" placeholder="@yourtag" value={revolutTag} onChange={e => setRevolutTag(e.target.value)} className="h-14 bg-muted/50 border-2 border-border/50 focus:border-primary/40 rounded-xl font-medium placeholder:text-muted-foreground/50 transition-all" />
                </div>}

              {selectedMethod === "debit" && <div className="space-y-5">
                  <div className="space-y-4">
                    <Label htmlFor="card-number" className="font-semibold text-xs text-muted-foreground tracking-wider uppercase">
                      Card Number
                    </Label>
                    <Input id="card-number" placeholder="Enter your debit card number" value={cardNumber} onChange={e => setCardNumber(e.target.value)} className="h-14 bg-muted/50 border-2 border-border/50 focus:border-primary/40 rounded-xl font-medium placeholder:text-muted-foreground/50 transition-all" />
                  </div>
                  <div className="space-y-4">
                    <Label htmlFor="legal-name" className="font-semibold text-xs text-muted-foreground tracking-wider uppercase">
                      Legal Name
                    </Label>
                    <Input id="legal-name" placeholder="Full name as it appears on card" value={legalName} onChange={e => setLegalName(e.target.value)} className="h-14 bg-muted/50 border-2 border-border/50 focus:border-primary/40 rounded-xl font-medium placeholder:text-muted-foreground/50 transition-all" />
                  </div>
                  <div className="space-y-4">
                    <Label htmlFor="address" className="font-semibold text-xs text-muted-foreground tracking-wider uppercase">
                      Address
                    </Label>
                    <Input id="address" placeholder="Your full billing address" value={address} onChange={e => setAddress(e.target.value)} className="h-14 bg-muted/50 border-2 border-border/50 focus:border-primary/40 rounded-xl font-medium placeholder:text-muted-foreground/50 transition-all" />
                  </div>
                </div>}
            </div>
          </div>}

        {!isMaxMethodsReached && <div className="flex gap-3 pt-8 border-t-2 border-border/50">
            <Button variant="outline" className="flex-1 h-12 bg-background border-2 border-border/50 hover:bg-muted hover:border-primary/20 rounded-xl font-semibold transition-all" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1 h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all" onClick={handleSave} disabled={selectedMethod === "crypto" && !walletAddress || selectedMethod === "paypal" && !paypalEmail || selectedMethod === "upi" && !upiId || selectedMethod === "revolut" && !revolutTag || selectedMethod === "debit" && (!cardNumber || !legalName || !address)}>
              Add Method
            </Button>
          </div>}

        {isMaxMethodsReached && <div className="flex justify-end pt-4 border-t-2 border-border/50">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-background border-2 border-border/50 hover:bg-muted rounded-xl font-semibold">
              Close
            </Button>
          </div>}
      </DialogContent>
    </Dialog>;
}