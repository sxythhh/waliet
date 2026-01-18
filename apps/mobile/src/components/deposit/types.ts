// Payment methods
export type PaymentMethod = 'crypto' | 'card' | 'personal' | 'wire';

// Deposit flow steps
export type DepositStep =
  | 'idle'
  | 'method'     // Select payment method
  | 'network'    // Crypto: select network
  | 'amount'     // Card/Personal: enter amount
  | 'confirm'    // Card/Personal: review fees
  | 'address'    // Crypto/Wire: show address/details
  | 'processing' // Waiting for external action
  | 'success'    // Completed
  | 'error';     // Failed

// Crypto networks
export type CryptoNetwork =
  | 'solana'
  | 'base'
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism';

// Payment method configuration
export interface PaymentMethodConfig {
  id: PaymentMethod;
  title: string;
  description: string;
  feeLabel: string;
  icon: string;
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

// Network configuration
export interface NetworkConfig {
  id: CryptoNetwork;
  name: string;
  symbol: string;
  iconUrl: string;
  speed: string;
  isPopular?: boolean;
}

// Deposit flow state
export interface DepositFlowState {
  method: PaymentMethod | null;
  step: DepositStep;
  amount: number;
  network: CryptoNetwork | null;
  error: string | null;
  isLoading: boolean;
  depositAddress: string | null;
  checkoutUrl: string | null;
  transactionId: string | null;
}

// Wire transfer details
export interface WireDetails {
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  bankAddress?: string;
  reference?: string;
}

// Payment method configs
export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'crypto',
    title: 'Crypto Deposit',
    description: 'USDC on multiple networks',
    feeLabel: '0% fee',
    icon: 'bitcoin',
  },
  {
    id: 'card',
    title: 'Pay with Card',
    description: 'Visa, Mastercard, Amex',
    feeLabel: '3% + $0.30',
    icon: 'credit-card',
  },
  {
    id: 'personal',
    title: 'From Personal Wallet',
    description: 'Transfer from your balance',
    feeLabel: 'Free',
    icon: 'wallet',
    estimatedTime: 'Instant',
  },
  {
    id: 'wire',
    title: 'Wire Transfer',
    description: 'ACH or wire from your bank',
    feeLabel: '0% fee',
    icon: 'bank-transfer',
    estimatedTime: '1-3 days',
  },
];

// Crypto network configs
export const CRYPTO_NETWORKS: NetworkConfig[] = [
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    iconUrl: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
    speed: '~1 sec',
    isPopular: true,
  },
  {
    id: 'base',
    name: 'Base',
    symbol: 'BASE',
    iconUrl: 'https://raw.githubusercontent.com/base-org/brand-kit/main/logo/symbol/Base_Symbol_Blue.svg',
    speed: '~2 sec',
    isPopular: true,
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    iconUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    speed: '~15 sec',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    iconUrl: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
    speed: '~2 sec',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ARB',
    iconUrl: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
    speed: '~2 sec',
  },
  {
    id: 'optimism',
    name: 'Optimism',
    symbol: 'OP',
    iconUrl: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg',
    speed: '~2 sec',
  },
];

// Wire transfer details (static for now)
export const WIRE_DETAILS: WireDetails = {
  accountName: 'Virality Inc.',
  accountNumber: '1234567890',
  routingNumber: '026009593',
  bankName: 'Bank of America',
  bankAddress: '100 N Tryon St, Charlotte, NC 28255',
};
