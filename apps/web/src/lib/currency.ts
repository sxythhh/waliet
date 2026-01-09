// Currency utilities for local currency display

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

// Common currencies with their symbols and locales
export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  EUR: { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc", locale: "de-CH" },
  CNY: { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN" },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  MXN: { code: "MXN", symbol: "MX$", name: "Mexican Peso", locale: "es-MX" },
  BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },
  KRW: { code: "KRW", symbol: "₩", name: "South Korean Won", locale: "ko-KR" },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
  HKD: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", locale: "zh-HK" },
  NOK: { code: "NOK", symbol: "kr", name: "Norwegian Krone", locale: "nb-NO" },
  SEK: { code: "SEK", symbol: "kr", name: "Swedish Krona", locale: "sv-SE" },
  DKK: { code: "DKK", symbol: "kr", name: "Danish Krone", locale: "da-DK" },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ" },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA" },
  RUB: { code: "RUB", symbol: "₽", name: "Russian Ruble", locale: "ru-RU" },
  TRY: { code: "TRY", symbol: "₺", name: "Turkish Lira", locale: "tr-TR" },
  PLN: { code: "PLN", symbol: "zł", name: "Polish Zloty", locale: "pl-PL" },
  THB: { code: "THB", symbol: "฿", name: "Thai Baht", locale: "th-TH" },
  IDR: { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", locale: "id-ID" },
  MYR: { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", locale: "ms-MY" },
  PHP: { code: "PHP", symbol: "₱", name: "Philippine Peso", locale: "en-PH" },
  CZK: { code: "CZK", symbol: "Kč", name: "Czech Koruna", locale: "cs-CZ" },
  ILS: { code: "ILS", symbol: "₪", name: "Israeli Shekel", locale: "he-IL" },
  AED: { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
  SAR: { code: "SAR", symbol: "﷼", name: "Saudi Riyal", locale: "ar-SA" },
  CLP: { code: "CLP", symbol: "CLP$", name: "Chilean Peso", locale: "es-CL" },
  COP: { code: "COP", symbol: "COP$", name: "Colombian Peso", locale: "es-CO" },
  ARS: { code: "ARS", symbol: "ARS$", name: "Argentine Peso", locale: "es-AR" },
  VND: { code: "VND", symbol: "₫", name: "Vietnamese Dong", locale: "vi-VN" },
  NGN: { code: "NGN", symbol: "₦", name: "Nigerian Naira", locale: "en-NG" },
  EGP: { code: "EGP", symbol: "E£", name: "Egyptian Pound", locale: "ar-EG" },
  PKR: { code: "PKR", symbol: "₨", name: "Pakistani Rupee", locale: "en-PK" },
  BDT: { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", locale: "bn-BD" },
  RON: { code: "RON", symbol: "lei", name: "Romanian Leu", locale: "ro-RO" },
  HUF: { code: "HUF", symbol: "Ft", name: "Hungarian Forint", locale: "hu-HU" },
  UAH: { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia", locale: "uk-UA" },
  BGN: { code: "BGN", symbol: "лв", name: "Bulgarian Lev", locale: "bg-BG" },
};

// Get currency info, fallback to USD
export function getCurrencyInfo(code: string): CurrencyInfo {
  return CURRENCIES[code.toUpperCase()] || CURRENCIES.USD;
}

// Format amount in a specific currency
export function formatCurrency(
  amount: number,
  currencyCode: string = "USD",
  options?: { compact?: boolean; showCode?: boolean }
): string {
  const currency = getCurrencyInfo(currencyCode);

  try {
    const formatter = new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: options?.compact ? 0 : 2,
      maximumFractionDigits: options?.compact ? 0 : 2,
      notation: options?.compact ? "compact" : "standard",
    });

    let formatted = formatter.format(amount);

    // Optionally append currency code for clarity
    if (options?.showCode && !formatted.includes(currency.code)) {
      formatted += ` ${currency.code}`;
    }

    return formatted;
  } catch {
    // Fallback formatting
    return `${currency.symbol}${amount.toFixed(2)}`;
  }
}

// Format USD amount with conversion to local currency
export function formatWithConversion(
  usdAmount: number,
  localCurrency: string,
  exchangeRate: number,
  options?: { showUsd?: boolean; compact?: boolean }
): string {
  if (localCurrency === "USD" || !exchangeRate || exchangeRate === 1) {
    return formatCurrency(usdAmount, "USD", options);
  }

  const localAmount = usdAmount * exchangeRate;
  const localFormatted = formatCurrency(localAmount, localCurrency, options);

  if (options?.showUsd) {
    const usdFormatted = formatCurrency(usdAmount, "USD", options);
    return `${localFormatted} (${usdFormatted})`;
  }

  return localFormatted;
}

// Storage keys
export const CURRENCY_STORAGE_KEY = "virality_user_currency";
export const EXCHANGE_RATES_STORAGE_KEY = "virality_exchange_rates";
export const LOCATION_STORAGE_KEY = "virality_user_location";

// Cache duration: 1 hour for exchange rates
export const EXCHANGE_RATES_CACHE_DURATION = 60 * 60 * 1000;
// Cache duration: 7 days for location
export const LOCATION_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

export interface StoredExchangeRates {
  rates: Record<string, number>;
  timestamp: number;
  base: string;
}

export interface StoredLocation {
  countryCode: string;
  currency: string;
  timestamp: number;
}

// Check if cached data is still valid
export function isCacheValid(timestamp: number, duration: number): boolean {
  return Date.now() - timestamp < duration;
}
