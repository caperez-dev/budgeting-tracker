export type TransactionType = 'income' | 'expense';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag?: string; // Flag emoji e.g. "🇵🇭"
  exchangeRate?: number; // Exchange rate relative to 1 USD
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string; // Accent color used for categories in transaction views
  icon: string; // Lucide icon identifier
  isDefault?: boolean;
}

export type AccountType = 'ewallet' | 'cash' | 'bank' | 'credit_card' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  color: string;
  icon: string; // Lucide icon identifier
  initialBalance?: number;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  userId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  categoryId: string;
  accountId?: string;
  note: string;
  date: string; // YYYY-MM-DD
  time: string; // 12-hour format e.g. "2:14 PM"
  timestamp: number; // Unix epoch ms
  createdAt: number;
}

export interface Debt {
  id: string;
  type: 'owe' | 'owed'; // 'owe' = Debts you owe; 'owed' = Debts owed to you
  person: string;
  amount: number;
  currency: string;
  note?: string;
  dueDate?: string; // YYYY-MM-DD
  createdAt: number;
  settled: boolean;
  settledAt?: number;
}

export interface Goal {
  id: string;
  name: string;
  targetPrice: number;
  currency: string;
  plannedDate: string; // YYYY-MM-DD
  imageUrl?: string;
  allocationMode: 'shared' | 'earmarked';
  earmarkedAmount: number;
  isAchieved?: boolean;
  notes?: string;
  createdAt: number;
}

export interface UserSettings {
  defaultCurrency: string;
  includeDebtInNetWorth: boolean;
  donateInfo: {
    message: string;
    platform: string;
    handle: string;
    qrUrl?: string;
    linkUrl?: string;
  };
}

export interface AIInsight {
  title: string;
  type: 'alert' | 'tip' | 'milestone' | 'savings';
  message: string;
  actionableStep: string;
}

export interface UserProfile {
  nickname: string;
  avatarUrl?: string;
  email?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
  defaultCurrency?: string;
  isVerified?: boolean;
}

export interface DBStatus {
  configured: boolean;
  hasPlaceholder: boolean;
  connected: boolean;
  error?: string | null;
}
