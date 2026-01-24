// Payment methods
export type PaymentMethod = "crypto" | "card" | "personal" | "wire";

// Deposit flow steps
export type DepositStep =
  | "idle"
  | "network"    // Crypto: select network
  | "amount"     // Card/Personal: enter amount
  | "confirm"    // Card/Personal: review fees
  | "address"    // Crypto/Wire: show address/details
  | "processing" // Waiting for external action
  | "success"    // Completed
  | "error";     // Failed

// Crypto networks
export type CryptoNetwork =
  | "solana"
  | "base"
  | "ethereum"
  | "polygon"
  | "arbitrum"
  | "optimism";

// Payment method configuration
export interface PaymentMethodConfig {
  id: PaymentMethod;
  title: string;
  description: string;
  feeLabel: string;
  materialIcon: string;
  estimatedTime?: string;
}

// Fee calculation
export interface FeeCalculation {
  depositAmount: number;
  processingFee: number;
  totalCharged: number;
  youReceive: number;
  feePercentage: string;
}

// Deposit flow state
export interface DepositFlowState {
  method: PaymentMethod | null;
  step: DepositStep;
  amount: number;
  network: CryptoNetwork | null;
  error: string | null;
  isLoading: boolean;
}

// Deposit flow actions
export type DepositFlowAction =
  | { type: "SELECT_METHOD"; method: PaymentMethod }
  | { type: "SET_AMOUNT"; amount: number }
  | { type: "SET_NETWORK"; network: CryptoNetwork }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "SET_ERROR"; error: string }
  | { type: "SUCCESS" }
  | { type: "RESET" };

// Transaction with enhanced display
export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  description: string | null;
  created_at: string;
  metadata?: {
    checkout_url?: string;
    tx_signature?: string;
    network?: string;
    source?: string;
  } | null;
}

// Pending deposit for tracking
export interface PendingDeposit {
  id: string;
  type: "crypto_deposit" | "deposit" | "topup";
  amount: number;
  status: "pending" | "confirmed";
  created_at: string;
  network?: string;
  tx_signature?: string;
}

// Wallet balance data
export interface WalletData {
  balance: number;
  pending_balance: number;
  currency: string;
}

// Crypto deposit address
export interface CryptoAddress {
  address: string;
  network: CryptoNetwork;
  qrCodeUrl?: string;
}

// Wire transfer details
export interface WireDetails {
  accountNumber: string;
  routingNumber: string;
  bankName?: string;
}
