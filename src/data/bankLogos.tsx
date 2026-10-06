import React from 'react';
import applepayLogo from '../assets/accounts/applepay.jpg';
import bdoLogo from '../assets/accounts/bdo.jpg';
import bpiLogo from '../assets/accounts/bpi.png';
import cimbLogo from '../assets/accounts/cimb.png';
import eastwestLogo from '../assets/accounts/eastwest.jpg';
import gcashLogo from '../assets/accounts/gcash.png';
import googlepayLogo from '../assets/accounts/google pay.png';
import gotymeLogo from '../assets/accounts/gotyme.png';
import grabpayLogo from '../assets/accounts/grabpay.png';
import maribankLogo from '../assets/accounts/maribank.jpg';
import mayaLogo from '../assets/accounts/maya.png';
import metrobankLogo from '../assets/accounts/metrobank.jpg';
import paypalLogo from '../assets/accounts/paypal.png';
import rcbcLogo from '../assets/accounts/rcbc.png';
import seabankLogo from '../assets/accounts/seabank.jpg';
import securitybankLogo from '../assets/accounts/securitybank.png';
import unionbankLogo from '../assets/accounts/unionbank.jpg';
import wiseLogo from '../assets/accounts/wise.png';

export interface BankLogoItem {
  id: string;
  name: string;
  category: 'wallet' | 'bank' | 'global';
  src: string;
  render: (className?: string) => React.ReactNode;
}

export const BANK_LOGOS: BankLogoItem[] = [
  {
    id: 'bank-gcash',
    name: 'GCash',
    category: 'wallet',
    src: gcashLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={gcashLogo}
        alt="GCash"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-maribank',
    name: 'MariBank',
    category: 'bank',
    src: maribankLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={maribankLogo}
        alt="MariBank"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-maya',
    name: 'Maya',
    category: 'wallet',
    src: mayaLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={mayaLogo}
        alt="Maya"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-paypal',
    name: 'PayPal',
    category: 'wallet',
    src: paypalLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={paypalLogo}
        alt="PayPal"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-unionbank',
    name: 'UnionBank',
    category: 'bank',
    src: unionbankLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={unionbankLogo}
        alt="UnionBank"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-gotyme',
    name: 'GoTyme',
    category: 'bank',
    src: gotymeLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={gotymeLogo}
        alt="GoTyme"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-eastwest',
    name: 'EastWest',
    category: 'bank',
    src: eastwestLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={eastwestLogo}
        alt="EastWest"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-bdo',
    name: 'BDO',
    category: 'bank',
    src: bdoLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={bdoLogo}
        alt="BDO"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-bpi',
    name: 'BPI',
    category: 'bank',
    src: bpiLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={bpiLogo}
        alt="BPI"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-metrobank',
    name: 'Metrobank',
    category: 'bank',
    src: metrobankLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={metrobankLogo}
        alt="Metrobank"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-securitybank',
    name: 'Security Bank',
    category: 'bank',
    src: securitybankLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={securitybankLogo}
        alt="Security Bank"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-rcbc',
    name: 'RCBC',
    category: 'bank',
    src: rcbcLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={rcbcLogo}
        alt="RCBC"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-cimb',
    name: 'CIMB',
    category: 'bank',
    src: cimbLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={cimbLogo}
        alt="CIMB"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-seabank',
    name: 'SeaBank',
    category: 'bank',
    src: seabankLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={seabankLogo}
        alt="SeaBank"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-grabpay',
    name: 'GrabPay',
    category: 'wallet',
    src: grabpayLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={grabpayLogo}
        alt="GrabPay"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-wise',
    name: 'Wise',
    category: 'global',
    src: wiseLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={wiseLogo}
        alt="Wise"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-applepay',
    name: 'Apple Pay',
    category: 'global',
    src: applepayLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={applepayLogo}
        alt="Apple Pay"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
  {
    id: 'bank-googlepay',
    name: 'Google Pay',
    category: 'global',
    src: googlepayLogo,
    render: (className = 'w-4 h-4') => (
      <img
        src={googlepayLogo}
        alt="Google Pay"
        className={`${className} object-cover rounded-[4px] shrink-0 select-none`}
        loading="lazy"
      />
    ),
  },
];

export const BANK_LOGOS_MAP: Record<string, BankLogoItem> = BANK_LOGOS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    acc[item.name] = item;
    acc[item.name.toLowerCase()] = item;
    acc[item.name.toLowerCase().replace(/\s+/g, '')] = item;
    const cleanId = item.id.replace(/^bank-/, '');
    acc[cleanId] = item;
    return acc;
  },
  {} as Record<string, BankLogoItem>
);
