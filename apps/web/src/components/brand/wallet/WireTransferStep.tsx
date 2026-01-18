import { useState } from "react";
import { Copy, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface WireDetail {
  label: string;
  value: string;
  copyable?: boolean;
}

interface WireTransferStepProps {
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  bankAddress?: string;
  reference?: string;
}

export function WireTransferStep({
  accountName,
  accountNumber,
  routingNumber,
  bankName,
  bankAddress,
  reference,
}: WireTransferStepProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const details: WireDetail[] = [
    { label: "Account Name", value: accountName, copyable: true },
    { label: "Account Number", value: accountNumber, copyable: true },
    { label: "Routing Number (ACH)", value: routingNumber, copyable: true },
    { label: "Bank Name", value: bankName },
    ...(bankAddress ? [{ label: "Bank Address", value: bankAddress }] : []),
    ...(reference ? [{ label: "Reference (Required)", value: reference, copyable: true }] : []),
  ];

  const handleCopyAll = () => {
    const allDetails = details
      .map((d) => `${d.label}: ${d.value}`)
      .join("\n");
    handleCopy(allDetails, "all");
  };

  return (
    <div className="space-y-5">
      {/* Processing Time */}
      <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] text-center">
        Processing time: 1-3 business days
      </p>

      {/* Wire Details */}
      <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/50">
        {details.map((detail) => (
          <div
            key={detail.label}
            className="flex items-center justify-between px-4 py-3 bg-muted/20"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground font-inter tracking-[-0.3px] mb-0.5">
                {detail.label}
              </p>
              <p
                className={cn(
                  "text-sm font-medium text-foreground font-inter tracking-[-0.3px]",
                  detail.copyable && "font-mono text-[13px]"
                )}
              >
                {detail.value}
              </p>
            </div>
            {detail.copyable && (
              <button
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors flex-shrink-0 ml-2"
                onClick={() => handleCopy(detail.value, detail.label)}
              >
                {copiedField === detail.label ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Copy All */}
      <button
        className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors font-inter tracking-[-0.3px]"
        onClick={handleCopyAll}
      >
        {copiedField === "all" ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            Copied all details
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy all details
          </>
        )}
      </button>

      {/* Important Note */}
      <div className="flex gap-2.5 p-3 rounded-lg bg-muted/30">
        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] leading-relaxed">
          {reference && "Include the reference code in your transfer memo. "}
          Wire from a bank account in your company name. Minimum deposit: $100.
        </p>
      </div>
    </div>
  );
}
