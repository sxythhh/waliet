import { PaymentMethodCard } from "./PaymentMethodCard";
import { PaymentMethod, PaymentMethodConfig } from "./types";

// Payment method configurations - crypto first
const paymentMethods: PaymentMethodConfig[] = [
  {
    id: "crypto",
    title: "Crypto Deposit",
    description: "USDC on multiple networks",
    feeLabel: "0% fee",
    materialIcon: "toll",
  },
  {
    id: "card",
    title: "Pay with Card",
    description: "Visa, Mastercard, Amex",
    feeLabel: "3% + $0.30",
    materialIcon: "credit_card",
  },
  {
    id: "personal",
    title: "From Personal Wallet",
    description: "Transfer from your balance",
    feeLabel: "Free",
    materialIcon: "savings",
    estimatedTime: "Instant",
  },
  {
    id: "wire",
    title: "Wire Transfer",
    description: "ACH or wire from your bank",
    feeLabel: "0% fee",
    materialIcon: "compare_arrows",
    estimatedTime: "1-3 days",
  },
];

interface PaymentMethodsGridProps {
  onSelectMethod: (method: PaymentMethod) => void;
  personalBalance?: number;
}

export function PaymentMethodsGrid({
  onSelectMethod,
  personalBalance = 0,
}: PaymentMethodsGridProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground font-inter tracking-[-0.3px]">
        Add Funds
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {paymentMethods.map((method) => (
          <PaymentMethodCard
            key={method.id}
            config={method}
            onClick={() => onSelectMethod(method.id)}
            disabled={method.id === "personal" && personalBalance <= 0}
          />
        ))}
      </div>
    </div>
  );
}
