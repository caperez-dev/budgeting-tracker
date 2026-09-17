import { Currency } from '../types';

export interface WorldCurrency extends Currency {
  country: string;
  flag: string;
  region: 'Asia' | 'Europe' | 'Americas' | 'Africa' | 'Middle East' | 'Oceania' | 'Other';
}

export const WORLD_CURRENCIES: WorldCurrency[] = [
  // Major & Asia-Pacific
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭', country: 'Philippines', region: 'Asia', exchangeRate: 61.0 },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', country: 'United States', region: 'Americas', exchangeRate: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', country: 'European Union', region: 'Europe', exchangeRate: 0.92 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', country: 'Japan', region: 'Asia', exchangeRate: 155.0 },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', country: 'United Kingdom', region: 'Europe', exchangeRate: 0.79 },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', flag: '🇨🇦', country: 'Canada', region: 'Americas', exchangeRate: 1.38 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', country: 'Australia', region: 'Oceania', exchangeRate: 1.52 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', country: 'Switzerland', region: 'Europe', exchangeRate: 0.90 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', country: 'Singapore', region: 'Asia', exchangeRate: 1.35 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰', country: 'Hong Kong', region: 'Asia', exchangeRate: 7.82 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿', country: 'New Zealand', region: 'Oceania', exchangeRate: 1.66 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳', country: 'China', region: 'Asia', exchangeRate: 7.25 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷', country: 'South Korea', region: 'Asia', exchangeRate: 1380.0 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', country: 'India', region: 'Asia', exchangeRate: 83.5 },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', flag: '🇹🇼', country: 'Taiwan', region: 'Asia', exchangeRate: 32.2 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭', country: 'Thailand', region: 'Asia', exchangeRate: 36.5 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾', country: 'Malaysia', region: 'Asia', exchangeRate: 4.70 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩', country: 'Indonesia', region: 'Asia', exchangeRate: 16250.0 },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳', country: 'Vietnam', region: 'Asia', exchangeRate: 25400.0 },

  // Middle East & West Asia
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪', country: 'United Arab Emirates', region: 'Middle East', exchangeRate: 3.67 },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', flag: '🇸🇦', country: 'Saudi Arabia', region: 'Middle East', exchangeRate: 3.75 },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', flag: '🇶🇦', country: 'Qatar', region: 'Middle East', exchangeRate: 3.64 },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', flag: '🇰🇼', country: 'Kuwait', region: 'Middle East', exchangeRate: 0.31 },
  { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar', flag: '🇧🇭', country: 'Bahrain', region: 'Middle East', exchangeRate: 0.38 },
  { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial', flag: '🇴🇲', country: 'Oman', region: 'Middle East', exchangeRate: 0.385 },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel', flag: '🇮🇱', country: 'Israel', region: 'Middle East', exchangeRate: 3.70 },
  { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar', flag: '🇯🇴', country: 'Jordan', region: 'Middle East', exchangeRate: 0.71 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷', country: 'Turkey', region: 'Middle East', exchangeRate: 33.5 },
  { code: 'LBP', symbol: 'L£', name: 'Lebanese Pound', flag: '🇱🇧', country: 'Lebanon', region: 'Middle East', exchangeRate: 89500.0 },
  { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar', flag: '🇮🇶', country: 'Iraq', region: 'Middle East', exchangeRate: 1310.0 },

  // Europe (Non-Eurozone)
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪', country: 'Sweden', region: 'Europe', exchangeRate: 10.5 },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴', country: 'Norway', region: 'Europe', exchangeRate: 10.8 },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰', country: 'Denmark', region: 'Europe', exchangeRate: 6.85 },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱', country: 'Poland', region: 'Europe', exchangeRate: 3.95 },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', flag: '🇨🇿', country: 'Czech Republic', region: 'Europe', exchangeRate: 23.2 },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', flag: '🇭🇺', country: 'Hungary', region: 'Europe', exchangeRate: 365.0 },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', flag: '🇷🇴', country: 'Romania', region: 'Europe', exchangeRate: 4.58 },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', flag: '🇧🇬', country: 'Bulgaria', region: 'Europe', exchangeRate: 1.80 },
  { code: 'ISK', symbol: 'kr', name: 'Icelandic Krona', flag: '🇮🇸', country: 'Iceland', region: 'Europe', exchangeRate: 139.0 },
  { code: 'RSD', symbol: 'дин.', name: 'Serbian Dinar', flag: '🇷🇸', country: 'Serbia', region: 'Europe', exchangeRate: 107.5 },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', flag: '🇺🇦', country: 'Ukraine', region: 'Europe', exchangeRate: 41.2 },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺', country: 'Russia', region: 'Europe', exchangeRate: 90.0 },

  // Americas (Latin & South America)
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷', country: 'Brazil', region: 'Americas', exchangeRate: 5.6 },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', flag: '🇲🇽', country: 'Mexico', region: 'Americas', exchangeRate: 19.5 },
  { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso', flag: '🇨🇱', country: 'Chile', region: 'Americas', exchangeRate: 935.0 },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', flag: '🇨🇴', country: 'Colombia', region: 'Americas', exchangeRate: 4150.0 },
  { code: 'PEN', symbol: 'S/.', name: 'Peruvian Sol', flag: '🇵🇪', country: 'Peru', region: 'Americas', exchangeRate: 3.75 },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', flag: '🇦🇷', country: 'Argentina', region: 'Americas', exchangeRate: 960.0 },
  { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso', flag: '🇺🇾', country: 'Uruguay', region: 'Americas', exchangeRate: 40.5 },
  { code: 'BOB', symbol: 'Bs.', name: 'Bolivian Boliviano', flag: '🇧🇴', country: 'Bolivia', region: 'Americas', exchangeRate: 6.91 },
  { code: 'PYG', symbol: '₲', name: 'Paraguayan Guarani', flag: '🇵🇾', country: 'Paraguay', region: 'Americas', exchangeRate: 7600.0 },
  { code: 'CRC', symbol: '₡', name: 'Costa Rican Colon', flag: '🇨🇷', country: 'Costa Rica', region: 'Americas', exchangeRate: 520.0 },
  { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso', flag: '🇩🇴', country: 'Dominican Republic', region: 'Americas', exchangeRate: 59.5 },
  { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal', flag: '🇬🇹', country: 'Guatemala', region: 'Americas', exchangeRate: 7.75 },
  { code: 'HNL', symbol: 'L', name: 'Honduran Lempira', flag: '🇭🇳', country: 'Honduras', region: 'Americas', exchangeRate: 24.8 },
  { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Cordoba', flag: '🇳🇮', country: 'Nicaragua', region: 'Americas', exchangeRate: 36.8 },
  { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa', flag: '🇵🇦', country: 'Panama', region: 'Americas', exchangeRate: 1.0 },
  { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar', flag: '🇯🇲', country: 'Jamaica', region: 'Americas', exchangeRate: 157.0 },
  { code: 'TTD', symbol: 'TT$', name: 'Trinidad & Tobago Dollar', flag: '🇹🇹', country: 'Trinidad and Tobago', region: 'Americas', exchangeRate: 6.78 },
  { code: 'BBD', symbol: 'Bds$', name: 'Barbadian Dollar', flag: '🇧🇧', country: 'Barbados', region: 'Americas', exchangeRate: 2.0 },
  { code: 'BSD', symbol: 'B$', name: 'Bahamian Dollar', flag: '🇧🇸', country: 'Bahamas', region: 'Americas', exchangeRate: 1.0 },
  { code: 'XCD', symbol: 'EC$', name: 'East Caribbean Dollar', flag: '🇦🇮', country: 'East Caribbean', region: 'Americas', exchangeRate: 2.70 },

  // Africa
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦', country: 'South Africa', region: 'Africa', exchangeRate: 18.0 },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', flag: '🇪🇬', country: 'Egypt', region: 'Africa', exchangeRate: 48.5 },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬', country: 'Nigeria', region: 'Africa', exchangeRate: 1620.0 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', flag: '🇰🇪', country: 'Kenya', region: 'Africa', exchangeRate: 129.0 },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', flag: '🇬🇭', country: 'Ghana', region: 'Africa', exchangeRate: 15.8 },
  { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham', flag: '🇲🇦', country: 'Morocco', region: 'Africa', exchangeRate: 9.85 },
  { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar', flag: '🇩🇿', country: 'Algeria', region: 'Africa', exchangeRate: 133.0 },
  { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar', flag: '🇹🇳', country: 'Tunisia', region: 'Africa', exchangeRate: 3.10 },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', flag: '🇪🇹', country: 'Ethiopia', region: 'Africa', exchangeRate: 118.0 },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', flag: '🇹🇿', country: 'Tanzania', region: 'Africa', exchangeRate: 2720.0 },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', flag: '🇺🇬', country: 'Uganda', region: 'Africa', exchangeRate: 3710.0 },
  { code: 'BWP', symbol: 'P', name: 'Botswana Pula', flag: '🇧🇼', country: 'Botswana', region: 'Africa', exchangeRate: 13.5 },
  { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee', flag: '🇲🇺', country: 'Mauritius', region: 'Africa', exchangeRate: 46.5 },
  { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', flag: '🇿🇲', country: 'Zambia', region: 'Africa', exchangeRate: 26.5 },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', flag: '🇸🇳', country: 'West Africa (BCEAO)', region: 'Africa', exchangeRate: 605.0 },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', flag: '🇨🇲', country: 'Central Africa (BEAC)', region: 'Africa', exchangeRate: 605.0 },

  // South & Central Asia
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰', country: 'Pakistan', region: 'Asia', exchangeRate: 278.0 },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩', country: 'Bangladesh', region: 'Asia', exchangeRate: 120.0 },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', flag: '🇱🇰', country: 'Sri Lanka', region: 'Asia', exchangeRate: 300.0 },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee', flag: '🇳🇵', country: 'Nepal', region: 'Asia', exchangeRate: 133.5 },
  { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat', flag: '🇲🇲', country: 'Myanmar', region: 'Asia', exchangeRate: 2100.0 },
  { code: 'KHM', symbol: '៛', name: 'Cambodian Riel', flag: '🇰🇭', country: 'Cambodia', region: 'Asia', exchangeRate: 4080.0 },
  { code: 'LAK', symbol: '₭', name: 'Lao Kip', flag: '🇱🇦', country: 'Laos', region: 'Asia', exchangeRate: 22000.0 },
  { code: 'MNT', symbol: '₮', name: 'Mongolian Tugrik', flag: '🇲🇳', country: 'Mongolia', region: 'Asia', exchangeRate: 3380.0 },
  { code: 'BND', symbol: 'B$', name: 'Brunei Dollar', flag: '🇧🇳', country: 'Brunei', region: 'Asia', exchangeRate: 1.35 },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', flag: '🇰🇿', country: 'Kazakhstan', region: 'Asia', exchangeRate: 480.0 },
  { code: 'UZS', symbol: 'soʻm', name: 'Uzbekistani Som', flag: '🇺🇿', country: 'Uzbekistan', region: 'Asia', exchangeRate: 12700.0 },
  { code: 'MVR', symbol: 'Rf', name: 'Maldivian Rufiyaa', flag: '🇲🇻', country: 'Maldives', region: 'Asia', exchangeRate: 15.4 },

  // Oceania
  { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar', flag: '🇫🇯', country: 'Fiji', region: 'Oceania', exchangeRate: 2.25 },
  { code: 'PGK', symbol: 'K', name: 'Papua New Guinea Kina', flag: '🇵🇬', country: 'Papua New Guinea', region: 'Oceania', exchangeRate: 3.90 },
];

// Quick index lookup
const CURRENCY_MAP = new Map<string, WorldCurrency>();
WORLD_CURRENCIES.forEach((c) => CURRENCY_MAP.set(c.code.toUpperCase(), c));

/**
 * Returns the flag emoji for a given currency code (e.g. 'PHP' -> '🇵🇭')
 */
export function getCurrencyFlag(code?: string): string {
  if (!code) return '🌐';
  const found = CURRENCY_MAP.get(code.toUpperCase());
  return found?.flag || '🌐';
}

/**
 * Returns the default symbol for a currency code (e.g. 'PHP' -> '₱')
 */
export function getCurrencySymbol(code?: string): string {
  if (!code) return '';
  const found = CURRENCY_MAP.get(code.toUpperCase());
  return found?.symbol || code;
}

/**
 * Finds a currency in the world catalog
 */
export function getWorldCurrency(code?: string): WorldCurrency | undefined {
  if (!code) return undefined;
  return CURRENCY_MAP.get(code.toUpperCase());
}

/**
 * Fetches live exchange rates using the open, public ExchangeRate API.
 * Returns a key-value map of rates relative to USD (1.0).
 */
export async function fetchLiveExchangeRates(): Promise<Record<string, number> | null> {
  // Primary endpoint: Open Exchange Rates (open.er-api.com) - high availability, live real-time forex
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && typeof data.rates === 'object') {
        return data.rates as Record<string, number>;
      }
    }
  } catch {
    // Attempt fallback
  }

  // Backup endpoint: ExchangeRate-API free tier v4
  try {
    const res2 = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.rates && typeof data2.rates === 'object') {
        return data2.rates as Record<string, number>;
      }
    }
  } catch (err) {
    console.warn('Could not fetch live exchange rates from network sources, using embedded rates:', err);
  }

  return null;
}
