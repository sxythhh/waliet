"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CryptoNetwork } from "./types";

// Network display names
const networkNames: Record<CryptoNetwork, string> = {
  solana: "Solana",
  base: "Base",
  ethereum: "Ethereum",
  polygon: "Polygon",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
};

interface CryptoAddressStepProps {
  network: CryptoNetwork;
  address: string;
  qrCodeUrl?: string;
}

export function CryptoAddressStep({
  network,
  address,
  qrCodeUrl,
}: CryptoAddressStepProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-5">
      {/* QR Code - Above Address */}
      <div className="flex justify-center">
        {qrCodeUrl ? (
          <div className="p-3 bg-white rounded-xl">
            <img
              src={qrCodeUrl}
              alt="Deposit QR Code"
              className="w-32 h-32"
            />
          </div>
        ) : (
          <div className="w-40 h-40 flex items-center justify-center rounded-xl border border-border/50 bg-muted/30">
            <span className="material-symbols-rounded text-[40px] text-muted-foreground">
              qr_code_2
            </span>
          </div>
        )}
      </div>

      {/* Address */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground tracking-[-0.3px]">
          Send USDC on {networkNames[network]} to
        </p>

        {/* Copy Box */}
        <button
          onClick={handleCopy}
          className={cn(
            "w-full p-4 rounded-xl border border-border/50 bg-muted/30",
            "flex items-center justify-between gap-3",
            "hover:bg-muted/50 transition-colors",
            "focus:outline-none",
            copied && "border-green-500/50 bg-green-500/5"
          )}
        >
          <code className="text-sm font-mono text-foreground break-all text-left">
            {address || "Loading address..."}
          </code>
          <div className="flex-shrink-0">
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {copied && (
          <p className="text-xs text-green-600">
            Copied to clipboard
          </p>
        )}
      </div>

      {/* Subtle Inline Warning */}
      <p className="text-xs text-muted-foreground tracking-[-0.3px] text-center">
        Only send USDC on {networkNames[network]}. Other tokens or networks will be lost.
      </p>
    </div>
  );
}
