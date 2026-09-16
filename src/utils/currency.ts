// Currency conversion utilities and exchange rates table

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  PHP: 61.0, // 61 PHP = 1 USD (1 USD = 61 pesos)
  EUR: 0.92,
  GBP: 0.79,
  JPY: 155.0,
  SGD: 1.35,
  CAD: 1.38,
  AUD: 1.52,
  CNY: 7.25,
  HKD: 7.82,
  KRW: 1380.0,
  NZD: 1.66,
  THB: 36.5,
  MYR: 4.70,
  IDR: 16250.0,
  INR: 83.5,
  CHF: 0.90,
  AED: 3.67,
};

/**
 * Converts an amount from one currency to another using the exchange rates table.
 * Standard base is USD (USD = 1.0, PHP = 61.0).
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string,
  customRates?: Record<string, number>
): number {
  if (!amount || fromCode === toCode) {
    return amount;
  }

  const rates = { ...DEFAULT_EXCHANGE_RATES, ...(customRates || {}) };
  const fromRate = rates[fromCode] || 1.0;
  const toRate = rates[toCode] || 1.0;

  // Convert source currency to USD base, then USD to destination currency
  const inUSD = amount / fromRate;
  const converted = inUSD * toRate;

  return converted;
}

/**
 * Returns how many units of `toCode` correspond to 1 unit of `fromCode`.
 * e.g., getExchangeRate(USD, PHP) = 61.0 (1 USD = 61 PHP)
 */
export function getExchangeRate(
  fromCode: string,
  toCode: string,
  customRates?: Record<string, number>
): number {
  const rates = { ...DEFAULT_EXCHANGE_RATES, ...(customRates || {}) };
  const fromRate = rates[fromCode] || 1.0;
  const toRate = rates[toCode] || 1.0;
  return toRate / fromRate;
}

/**
 * Accurately rounds a currency amount to 2 decimal places.
 */
export function roundToCurrency(amount: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}
