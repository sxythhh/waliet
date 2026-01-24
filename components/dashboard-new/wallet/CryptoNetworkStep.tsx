"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CryptoNetwork } from "./types";

// Network configurations
const networks: Array<{
  id: CryptoNetwork;
  name: string;
  symbol: string;
  iconUrl: string;
  speed: string;
  isPopular?: boolean;
}> = [
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    iconUrl: "https://cryptologos.cc/logos/solana-sol-logo.svg",
    speed: "~1 sec",
    isPopular: true,
  },
  {
    id: "base",
    name: "Base",
    symbol: "BASE",
    iconUrl: "/BaseLogo.png",
    speed: "~2 sec",
    isPopular: true,
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    iconUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.svg",
    speed: "~15 sec",
  },
  {
    id: "polygon",
    name: "Polygon",
    symbol: "MATIC",
    iconUrl: "https://cryptologos.cc/logos/polygon-matic-logo.svg",
    speed: "~2 sec",
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    symbol: "ARB",
    iconUrl: "https://cryptologos.cc/logos/arbitrum-arb-logo.svg",
    speed: "~2 sec",
  },
  {
    id: "optimism",
    name: "Optimism",
    symbol: "OP",
    iconUrl: "https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg",
    speed: "~2 sec",
  },
];

interface CryptoNetworkStepProps {
  selectedNetwork: CryptoNetwork | null;
  onSelectNetwork: (network: CryptoNetwork) => void;
  isLoading?: boolean;
}

export function CryptoNetworkStep({
  selectedNetwork,
  onSelectNetwork,
  isLoading = false,
}: CryptoNetworkStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground tracking-[-0.3px]">
        All deposits are in USDC. Select the network you&apos;ll be sending from.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {networks.map((network) => {
          const isSelected = selectedNetwork === network.id;
          const isLoadingThis = isSelected && isLoading;

          return (
            <button
              key={network.id}
              onClick={() => onSelectNetwork(network.id)}
              disabled={isLoading}
              className={cn(
                "p-3 rounded-xl border border-border/50 bg-card text-left",
                "transition-colors duration-150",
                "hover:bg-muted/50",
                "focus:outline-none",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isLoadingThis && "bg-muted/50"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Network Icon */}
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {isLoadingThis ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <img
                      src={network.iconUrl}
                      alt={network.name}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                </div>

                {/* Network Info */}
                <div>
                  <p className="text-sm font-medium tracking-[-0.3px] text-foreground">
                    {network.name}
                  </p>
                  <p className="text-xs text-muted-foreground tracking-[-0.3px]">
                    {network.speed} confirmation
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Make sure to send only USDC on the selected network
      </p>
    </div>
  );
}
