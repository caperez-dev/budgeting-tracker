import React, { useState } from 'react';
import { getCurrencyFlag } from '../data/worldCurrencies';

// Comprehensive Currency Code -> ISO 3166-1 alpha-2 Country Code mapping
const CURRENCY_TO_COUNTRY: Record<string, string> = {
  PHP: 'ph', // Philippines
  USD: 'us', // United States
  EUR: 'eu', // European Union
  JPY: 'jp', // Japan
  GBP: 'gb', // United Kingdom
  CAD: 'ca', // Canada
  AUD: 'au', // Australia
  CHF: 'ch', // Switzerland
  SGD: 'sg', // Singapore
  HKD: 'hk', // Hong Kong
  NZD: 'nz', // New Zealand
  CNY: 'cn', // China
  KRW: 'kr', // South Korea
  INR: 'in', // India
  TWD: 'tw', // Taiwan
  THB: 'th', // Thailand
  MYR: 'my', // Malaysia
  IDR: 'id', // Indonesia
  VND: 'vn', // Vietnam
  AED: 'ae', // United Arab Emirates
  SAR: 'sa', // Saudi Arabia
  QAR: 'qa', // Qatar
  KWD: 'kw', // Kuwait
  BHD: 'bh', // Bahrain
  OMR: 'om', // Oman
  ILS: 'il', // Israel
  JOD: 'jo', // Jordan
  TRY: 'tr', // Turkey
  LBP: 'lb', // Lebanon
  IQD: 'iq', // Iraq
  SEK: 'se', // Sweden
  NOK: 'no', // Norway
  DKK: 'dk', // Denmark
  PLN: 'pl', // Poland
  CZK: 'cz', // Czech Republic
  HUF: 'hu', // Hungary
  RON: 'ro', // Romania
  BGN: 'bg', // Bulgaria
  ISK: 'is', // Iceland
  RSD: 'rs', // Serbia
  UAH: 'ua', // Ukraine
  RUB: 'ru', // Russia
  BRL: 'br', // Brazil
  MXN: 'mx', // Mexico
  CLP: 'cl', // Chile
  COP: 'co', // Colombia
  PEN: 'pe', // Peru
  ARS: 'ar', // Argentina
  UYU: 'uy', // Uruguay
  BOB: 'bo', // Bolivia
  PYG: 'py', // Paraguay
  CRC: 'cr', // Costa Rica
  DOP: 'do', // Dominican Republic
  GTQ: 'gt', // Guatemala
  HNL: 'hn', // Honduras
  NIO: 'ni', // Nicaragua
  PAB: 'pa', // Panama
  JMD: 'jm', // Jamaica
  TTD: 'tt', // Trinidad and Tobago
  BBD: 'bb', // Barbados
  BSD: 'bs', // Bahamas
  XCD: 'ag', // East Caribbean
  ZAR: 'za', // South Africa
  EGP: 'eg', // Egypt
  NGN: 'ng', // Nigeria
  KES: 'ke', // Kenya
  GHS: 'gh', // Ghana
  MAD: 'ma', // Morocco
  DZD: 'dz', // Algeria
  TND: 'tn', // Tunisia
  ETB: 'et', // Ethiopia
  TZS: 'tz', // Tanzania
  UGX: 'ug', // Uganda
  BWP: 'bw', // Botswana
  MUR: 'mu', // Mauritius
  ZMW: 'zm', // Zambia
  XOF: 'sn', // West Africa
  XAF: 'cm', // Central Africa
  PKR: 'pk', // Pakistan
  BDT: 'bd', // Bangladesh
  LKR: 'lk', // Sri Lanka
  NPR: 'np', // Nepal
  MMK: 'mm', // Myanmar
  KHM: 'kh', // Cambodia
  LAK: 'la', // Laos
  MNT: 'mn', // Mongolia
  BND: 'bn', // Brunei
  KZT: 'kz', // Kazakhstan
  UZS: 'uz', // Uzbekistan
  MVR: 'mv', // Maldives
  FJD: 'fj', // Fiji
  PGK: 'pg', // Papua New Guinea
};

/**
 * Derives a 2-letter ISO country code from either currency code or regional indicator flag emoji.
 */
export function getCountryCode(currencyCode?: string, flagEmoji?: string): string {
  if (currencyCode && CURRENCY_TO_COUNTRY[currencyCode.toUpperCase()]) {
    return CURRENCY_TO_COUNTRY[currencyCode.toUpperCase()];
  }

  // Extract from Regional Indicator Symbols (Unicode flags)
  if (flagEmoji) {
    const chars = Array.from(flagEmoji);
    if (chars.length >= 2) {
      const cp0 = chars[0].codePointAt(0);
      const cp1 = chars[1].codePointAt(0);
      if (
        cp0 &&
        cp1 &&
        cp0 >= 0x1f1e6 &&
        cp0 <= 0x1f1ff &&
        cp1 >= 0x1f1e6 &&
        cp1 <= 0x1f1ff
      ) {
        return (
          String.fromCharCode(cp0 - 0x1f1e6 + 65) +
          String.fromCharCode(cp1 - 0x1f1e6 + 65)
        ).toLowerCase();
      }
    }
  }

  if (currencyCode && currencyCode.length >= 2) {
    return currencyCode.slice(0, 2).toLowerCase();
  }

  return 'un';
}

export interface CurrencyFlagProps {
  code: string;
  flag?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * CurrencyFlag renders an actual high-resolution visual national flag image
 * using FlagCDN (fast, free, global CDN). This avoids OS font limitations
 * (such as Windows showing "PH", "US", "EU" text letters instead of flag emojis).
 */
export function CurrencyFlag({
  code,
  flag,
  className = '',
  size = 'md',
}: CurrencyFlagProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const countryCode = getCountryCode(code, flag);
  const fallbackEmoji = flag || getCurrencyFlag(code);

  const sizeClasses = {
    sm: 'w-4 h-2.5 text-xs',
    md: 'w-4.5 h-3 text-xs',
    lg: 'w-6 h-4 text-sm',
  }[size];

  // If there's an error loading the image or invalid country code, render the emoji flag directly
  if (hasError || !countryCode || countryCode === 'un') {
    return (
      <span
        className={`inline-flex items-center justify-center text-center select-none shrink-0 ${sizeClasses} ${className}`}
        title={`${code} flag`}
        role="img"
        aria-label={`${code} flag`}
      >
        {fallbackEmoji}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-[2px] shrink-0 select-none ${sizeClasses} ${className}`}
      title={`${code} flag`}
    >
      {/* Visual flag emoji while the external image is loading or if it fails */}
      {!imgLoaded && (
        <span className="text-center leading-none" role="img" aria-label={`${code} flag`}>
          {fallbackEmoji}
        </span>
      )}
      <img
        src={`https://flagcdn.com/w40/${countryCode}.png`}
        srcSet={`https://flagcdn.com/w80/${countryCode}.png 2x`}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
        onError={() => setHasError(true)}
        className={`absolute inset-0 w-full h-full object-cover rounded-[2px] transition-opacity duration-150 ${
          imgLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </span>
  );
}
