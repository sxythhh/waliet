import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCIES } from "@/lib/currency";
import { SettingsCard } from "./SettingsCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

export function CurrencySettingsCard() {
  const { currencyCode, setCurrency, isLoading } = useCurrency();

  // Sort currencies alphabetically by name
  const sortedCurrencies = Object.values(CURRENCIES).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <SettingsCard
      title="Display Currency"
      description="Choose the currency for displaying your earnings and balances"
      footerHint="Amounts are stored in USD and converted using live exchange rates."
    >
      <div className="max-w-xs">
        <Select
          value={currencyCode}
          onValueChange={setCurrency}
          disabled={isLoading}
        >
          <SelectTrigger
            className="h-11 bg-background border border-border"
            style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <SelectValue placeholder="Select currency" />
            </div>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {sortedCurrencies.map((currency) => (
              <SelectItem
                key={currency.code}
                value={currency.code}
                style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
              >
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground w-8">{currency.symbol}</span>
                  <span>{currency.name}</span>
                  <span className="text-muted-foreground text-xs">({currency.code})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </SettingsCard>
  );
}
