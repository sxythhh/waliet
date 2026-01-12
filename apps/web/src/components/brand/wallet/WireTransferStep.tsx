import { useState } from "react";
import { Copy, Check, Clock, AlertCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  onDone: () => void;
}

export function WireTransferStep({
  accountName,
  accountNumber,
  routingNumber,
  bankName,
  bankAddress,
  reference,
  onDone,
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

  return (
    <div className="space-y-6">
      {/* Header Badge */}
      <div className="flex items-center justify-center gap-2">
        <Badge
          variant="secondary"
          className="px-3 py-1 text-sm bg-gray-500/10 text-gray-600 dark:text-gray-400 border-0"
        >
          <Building2 className="h-3 w-3 mr-1.5" />
          ACH / Wire Transfer
        </Badge>
      </div>

      {/* Processing Time */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Processing time: 1-3 business days</span>
      </div>

      {/* Wire Details */}
      <div className="space-y-3">
        {details.map((detail) => (
          <div
            key={detail.label}
            className="flex items-start justify-between p-3 rounded-xl bg-muted/50 border border-border/50"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] mb-1">
                {detail.label}
              </p>
              <p
                className={cn(
                  "text-sm font-medium text-foreground",
                  detail.copyable && "font-mono"
                )}
              >
                {detail.value}
              </p>
            </div>
            {detail.copyable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 ml-2"
                onClick={() => handleCopy(detail.value, detail.label)}
              >
                {copiedField === detail.label ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Copy All Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          const allDetails = details
            .map((d) => `${d.label}: ${d.value}`)
            .join("\n");
          handleCopy(allDetails, "all");
        }}
      >
        {copiedField === "all" ? (
          <>
            <Check className="h-4 w-4 mr-2 text-green-500" />
            Copied All Details
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-2" />
            Copy All Details
          </>
        )}
      </Button>

      {/* Important Notes */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
            Important Notes
          </p>
          <ul className="text-xs text-blue-700/80 dark:text-blue-400/80 space-y-1">
            {reference && (
              <li>• Include the reference code in your transfer memo</li>
            )}
            <li>• Wire from a bank account in your company name</li>
            <li>• Minimum deposit: $100 USD</li>
            <li>• Your balance will update once the wire is received</li>
          </ul>
        </div>
      </div>

      {/* Done Button */}
      <Button className="w-full h-11 font-medium" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
