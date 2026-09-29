import { Category, Currency, Debt, Goal, Transaction, UserSettings, UserProfile } from '../types';

export const DEFAULT_USER_PROFILE: UserProfile = {
  nickname: 'Carlos',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  email: 'perez.carlos6566@gmail.com',
};

export const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭', exchangeRate: 61.0 },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', exchangeRate: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', exchangeRate: 0.92 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', exchangeRate: 155.0 },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', exchangeRate: 0.79 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', exchangeRate: 1.35 },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Income categories
  {
    id: 'cat-salary',
    name: 'Salary',
    type: 'income',
    color: '#059669', // emerald
    icon: 'Briefcase',
    isDefault: true,
  },
  {
    id: 'cat-allowance',
    name: 'Allowance',
    type: 'income',
    color: '#10B981', // emerald-500
    icon: 'Coins',
    isDefault: true,
  },
  {
    id: 'cat-cash-in',
    name: 'Cash In',
    type: 'income',
    color: '#0D9488', // teal-600
    icon: 'Banknote',
    isDefault: true,
  },
  {
    id: 'cat-freelance',
    name: 'Freelance',
    type: 'income',
    color: '#2563EB', // blue
    icon: 'Laptop',
    isDefault: true,
  },
  {
    id: 'cat-business',
    name: 'Business',
    type: 'income',
    color: '#4F46E5', // indigo
    icon: 'CircleDollarSign',
    isDefault: true,
  },

  // Expense categories (Food & Drink, Transport, Bills, Shopping ONLY)
  {
    id: 'cat-food-drink',
    name: 'Food & Drink',
    type: 'expense',
    color: '#E11D48', // rose-600
    icon: 'Utensils',
    isDefault: true,
  },
  {
    id: 'cat-transport',
    name: 'Transport',
    type: 'expense',
    color: '#0284C7', // sky-600
    icon: 'Car',
    isDefault: true,
  },
  {
    id: 'cat-bills',
    name: 'Bills',
    type: 'expense',
    color: '#EA580C', // orange-600
    icon: 'Receipt',
    isDefault: true,
  },
  {
    id: 'cat-shopping',
    name: 'Shopping',
    type: 'expense',
    color: '#9333EA', // purple-600
    icon: 'ShoppingBag',
    isDefault: true,
  },
];

export function createDefaultCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((c) => ({ ...c }));
}

export const createDefaultCategoriesForAccount = createDefaultCategories;

// Helper to construct timestamp for Sep 2026 transactions matching the spec
function makeTimestamp(dateStr: string, timeStr: string): number {
  // e.g. dateStr: '2026-09-01', timeStr: '2:14 PM'
  const [year, month, day] = dateStr.split('-').map(Number);
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  let hours = 12;
  let minutes = 0;
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const isPM = match[3].toUpperCase() === 'PM';
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
  }
  return new Date(year, month - 1, day, hours, minutes).getTime();
}

export const SEED_TRANSACTIONS: Transaction[] = [];

export const SEED_DEBTS: Debt[] = [
  {
    id: 'debt-1',
    type: 'owe',
    person: 'Marco (Apartment Electric split)',
    amount: 1450,
    currency: 'PHP',
    note: 'Due at end of month',
    dueDate: '2026-09-30',
    createdAt: Date.now() - 86400000 * 3,
    settled: false,
  },
  {
    id: 'debt-2',
    type: 'owed',
    person: 'Elena (Weekend Grocery share)',
    amount: 850,
    currency: 'PHP',
    note: 'To send via GCash',
    dueDate: '2026-09-15',
    createdAt: Date.now() - 86400000 * 5,
    settled: false,
  },
];

export const SEED_GOALS: Goal[] = [
  {
    id: 'goal-1',
    name: 'Mechanical Ergonomic Keyboard',
    targetPrice: 6500,
    currency: 'PHP',
    plannedDate: '2026-10-15',
    imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&auto=format&fit=crop&q=80',
    allocationMode: 'earmarked',
    earmarkedAmount: 3500,
    isAchieved: false,
    notes: 'Low profile switches for quiet typing',
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'goal-2',
    name: 'Noise-Cancelling Headphones',
    targetPrice: 18000,
    currency: 'PHP',
    plannedDate: '2026-12-25',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    allocationMode: 'shared',
    earmarkedAmount: 0,
    isAchieved: false,
    notes: 'Holiday travel comfort',
    createdAt: Date.now() - 86400000 * 4,
  },
];

export const DEFAULT_SETTINGS: UserSettings = {
  defaultCurrency: 'PHP',
  includeDebtInNetWorth: false,
  donateInfo: {
    message: 'If this budget tracker helps keep your finances organized, feel free to support future development!',
    platform: 'GCash / Maya / PayPal',
    handle: '@carlos.perez.budget',
    linkUrl: 'https://paypal.me',
  },
};
