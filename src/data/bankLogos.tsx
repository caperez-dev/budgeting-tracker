import React from 'react';

export interface BankLogoItem {
  id: string;
  name: string;
  category: 'wallet' | 'bank' | 'global';
  render: (className?: string) => React.ReactNode;
}

export const BANK_LOGOS: BankLogoItem[] = [
  {
    id: 'bank-gcash',
    name: 'GCash',
    category: 'wallet',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="GCash">
        <rect width="32" height="32" rx="7" fill="#007DFE" />
        <path
          d="M16 7.5C11.3 7.5 7.5 11.3 7.5 16s3.8 8.5 8.5 8.5c4 0 7.3-2.7 8.2-6.5h-4.2c-.7 1.6-2.3 2.8-4 2.8-2.6 0-4.8-2.2-4.8-4.8s2.2-4.8 4.8-4.8c1.5 0 2.9.7 3.8 1.9l3-2.4C21.4 8.9 18.8 7.5 16 7.5z"
          fill="#FFF"
        />
        <circle cx="21" cy="16" r="2.2" fill="#FFF" />
      </svg>
    ),
  },
  {
    id: 'bank-maribank',
    name: 'MariBank',
    category: 'bank',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="MariBank">
        <rect width="32" height="32" rx="7" fill="#FF5330" />
        <path
          d="M7 22.5V11l4.5 6L16 11l4.5 6 4.5-6v11.5h-3.5v-6.2l-3.5 4.7h-2L12.5 16.3V22.5H7z"
          fill="#FFF"
        />
        <circle cx="16" cy="7.5" r="1.5" fill="#FFE57F" />
      </svg>
    ),
  },
  {
    id: 'bank-maya',
    name: 'Maya',
    category: 'wallet',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="Maya">
        <rect width="32" height="32" rx="7" fill="#0B0F19" />
        <path
          d="M6.5 21V11l4.5 6L16 11l4.5 6 4.5-6v10h-3v-5.2l-4 5.2h-1.5l-4-5.2V21H6.5z"
          fill="#00D632"
        />
        <circle cx="25.5" cy="20.5" r="1.5" fill="#C6FF00" />
      </svg>
    ),
  },
  {
    id: 'bank-paypal',
    name: 'PayPal',
    category: 'wallet',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="PayPal">
        <rect width="32" height="32" rx="7" fill="#F4F8FD" />
        <path
          d="M10 24h3.5l1.6-10.2h4.2c3.5 0 5.7 1.7 5.2 4.9-.5 3.3-3.2 5.3-6.5 5.3h-2.4L14.3 29H10l0-5z"
          fill="#003087"
        />
        <path
          d="M13.2 21h3.4c3.2 0 5.4-1.6 5-4.6-.4-3-2.9-4.4-6-4.4h-4.2L9.5 24h3.7v-3z"
          fill="#0079C1"
          opacity="0.95"
        />
      </svg>
    ),
  },
  {
    id: 'bank-unionbank',
    name: 'UnionBank',
    category: 'bank',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="UnionBank">
        <rect width="32" height="32" rx="7" fill="#FF5900" />
        <path
          d="M8.5 9v8a7.5 7.5 0 0015 0V9h-4.2v8a3.3 3.3 0 01-6.6 0V9H8.5z"
          fill="#FFF"
        />
        <path
          d="M16 24.5a7.5 7.5 0 007.5-7.5h-4.2a3.3 3.3 0 01-3.3 3.3v4.2z"
          fill="#FFE0B2"
        />
      </svg>
    ),
  },
  {
    id: 'bank-gotyme',
    name: 'GoTyme',
    category: 'bank',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="GoTyme">
        <rect width="32" height="32" rx="7" fill="#00D2B4" />
        <circle cx="16" cy="16" r="8.5" stroke="#FFF" strokeWidth="2.8" />
        <path
          d="M16 11.5V16h4.5"
          stroke="#FFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="1.5" fill="#FFF" />
      </svg>
    ),
  },
  {
    id: 'bank-eastwest',
    name: 'EastWest',
    category: 'bank',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="EastWest Bank">
        <rect width="32" height="32" rx="7" fill="#582C83" />
        <path
          d="M16 6.5l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5 2.5-7z"
          fill="#FFC72C"
        />
        <circle cx="16" cy="16" r="2.8" fill="#FFF" />
      </svg>
    ),
  },
  {
    id: 'bank-bdo',
    name: 'BDO',
    category: 'bank',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="BDO Unibank">
        <rect width="32" height="32" rx="7" fill="#002D62" />
        <text
          x="16"
          y="20.5"
          textAnchor="middle"
          fontSize="10"
          fontWeight="900"
          fill="#FFD100"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.6"
        >
          BDO
        </text>
      </svg>
    ),
  },
  {
    id: 'bank-bpi',
    name: 'BPI',
    category: 'bank',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="BPI">
        <rect width="32" height="32" rx="7" fill="#B31B1B" />
        <path
          d="M16 7l7.5 4v7c0 5.5-4.2 8.5-7.5 9.5-3.3-1-7.5-4-7.5-9.5v-7L16 7z"
          fill="#FFF"
        />
        <path
          d="M16 10.5v12M10.5 16h11"
          stroke="#B31B1B"
          strokeWidth="2.4"
          strokeLinecap="square"
        />
      </svg>
    ),
  },
  {
    id: 'bank-metrobank',
    name: 'Metrobank',
    category: 'bank',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="Metrobank">
        <rect width="32" height="32" rx="7" fill="#003882" />
        <path
          d="M7.5 22.5l4.5-12.5 4 7.5 4-7.5 4.5 12.5h-3.8l-2.5-7-2.2 4.5h-1L12.5 15.5l-2.5 7H7.5z"
          fill="#00B5E2"
        />
        <path d="M16 16.5l3-5.5 2.5 7h-2.5l-1.5-4-1.5 2.5z" fill="#FFF" />
      </svg>
    ),
  },
  {
    id: 'bank-securitybank',
    name: 'Security Bank',
    category: 'bank',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="Security Bank">
        <rect width="32" height="32" rx="7" fill="#003B71" />
        <path
          d="M16 7.5c-4.2 0-7 2.6-7 6 0 4.5 7 4.2 7 6.8 0 1.2-1 2-2.2 2-1.6 0-3-.9-3.8-2.2l-2.6 1.6c1.3 2.2 3.6 3.8 6.4 3.8 4.2 0 7-2.6 7-6 0-4.5-7-4.2-7-6.8 0-1.2 1-2 2.2-2 1.4 0 2.6.7 3.4 1.8l2.5-1.8c-1.4-2-3.6-3.4-6-3.4z"
          fill="#00B140"
        />
      </svg>
    ),
  },
  {
    id: 'bank-rcbc',
    name: 'RCBC',
    category: 'bank',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="RCBC">
        <rect width="32" height="32" rx="7" fill="#003B77" />
        <path d="M16 7.5l7.5 4.5v9L16 25.5 8.5 21v-9L16 7.5z" fill="#FFC72C" />
        <path d="M16 11l4.5 2.8v5.4L16 22l-4.5-2.8v-5.4L16 11z" fill="#003B77" />
        <circle cx="16" cy="16.5" r="2" fill="#FFF" />
      </svg>
    ),
  },
  {
    id: 'bank-cimb',
    name: 'CIMB',
    category: 'bank',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="CIMB Bank">
        <rect width="32" height="32" rx="7" fill="#ED1C24" />
        <text
          x="16"
          y="19"
          textAnchor="middle"
          fontSize="7.5"
          fontWeight="900"
          fill="#FFF"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.4"
        >
          CIMB
        </text>
        <path d="M8 22h16v1.5H8z" fill="#FFF" />
      </svg>
    ),
  },
  {
    id: 'bank-seabank',
    name: 'SeaBank',
    category: 'bank',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="SeaBank">
        <rect width="32" height="32" rx="7" fill="#FF5330" />
        <path
          d="M16 8.5c-3.8 0-6.5 2.2-6.5 5.2 0 4.2 6.5 3.8 6.5 6.3 0 1-.9 1.8-2 1.8-1.5 0-2.8-.8-3.5-2l-2.8 1.8c1.3 2.2 3.8 3.4 6.3 3.4 3.8 0 6.5-2.2 6.5-5.2 0-4.2-6.5-3.8-6.5-6.3 0-1 .9-1.8 2-1.8 1.3 0 2.4.7 3.1 1.7l2.6-1.7c-1.3-1.9-3.4-3.2-5.7-3.2z"
          fill="#FFF"
        />
      </svg>
    ),
  },
  {
    id: 'bank-grabpay',
    name: 'GrabPay',
    category: 'wallet',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="GrabPay">
        <rect width="32" height="32" rx="7" fill="#00B14F" />
        <text
          x="16"
          y="21"
          textAnchor="middle"
          fontSize="10"
          fontWeight="900"
          fill="#FFF"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          GP
        </text>
      </svg>
    ),
  },
  {
    id: 'bank-wise',
    name: 'Wise',
    category: 'global',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="Wise">
        <rect width="32" height="32" rx="7" fill="#9FE870" />
        <path d="M8.5 22.5l6.5-14h4.5l-3.8 8h8.5l-8.5 6h-7.2z" fill="#163300" />
      </svg>
    ),
  },
  {
    id: 'bank-applepay',
    name: 'Apple Pay',
    category: 'global',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="Apple Pay">
        <rect width="32" height="32" rx="7" fill="#000000" />
        <path
          d="M17.8 11.2c-.7.8-1.7 1.4-2.7 1.3-.1-1 .3-2 1-2.7.7-.8 1.8-1.3 2.7-1.3.1 1-.3 2-1 2.7zM18.8 16.8c0-2.1 1.7-3.1 1.8-3.2-1-.1.4-2.4 1.3-3.2 2.3-.9 3.8-.1 4.7 1.1 0 0-1.8 1-1.8 3.1 0 2.4 2.1 3.2 2.1 3.2-.5 1.5-1.2 2.9-2.3 4-1 .9-2 1.9-3.4 1.9s-1.8-.8-3.4-.8-3.5.9-3.5.9c-1.3-.1-2.4-1.2-3.4-2.6-2-2.9-3.5-8.2-1.4-11.8 1-1.8 2.8-2.9 4.7-2.9 1.4 0 2.8.9 3.6.9.9 0 2.5-1.1 4.2-.9z"
          fill="#FFF"
        />
      </svg>
    ),
  },
  {
    id: 'bank-googlepay',
    name: 'Google Pay',
    category: 'global',
    render: (className = 'w-4 h-4') => (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="Google Pay">
        <rect width="32" height="32" rx="7" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <path
          d="M22.6 16.3c0-.6-.1-1.2-.2-1.7H16v3.2h3.7c-.2.9-.7 1.7-1.4 2.3v1.9h2.3c1.3-1.2 2-3.1 2-5.7z"
          fill="#4285F4"
        />
        <path
          d="M16 23c1.9 0 3.5-.6 4.6-1.7l-2.3-1.9c-.6.4-1.4.7-2.3.7-1.8 0-3.3-1.2-3.8-2.9h-2.3v1.8C11.1 21.3 13.3 23 16 23z"
          fill="#34A853"
        />
        <path
          d="M12.2 17.2c-.1-.4-.2-.9-.2-1.2s.1-.8.2-1.2V13h-2.3C9.4 14 9 15 9 16s.4 2 1 3l2.2-1.8z"
          fill="#FBBC05"
        />
        <path
          d="M16 12.2c1 0 1.9.4 2.7 1l2-2C19.5 10.1 17.9 9.5 16 9.5c-2.7 0-4.9 1.7-6 4.1l2.2 1.8c.6-1.7 2.1-3.2 3.8-3.2z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
];

export const BANK_LOGOS_MAP: Record<string, BankLogoItem> = BANK_LOGOS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, BankLogoItem>
);
