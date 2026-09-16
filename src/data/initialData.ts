import { Category, Currency, Debt, Goal, Transaction, UserSettings } from '../types';

export const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', exchangeRate: 61.0 },
  { code: 'USD', symbol: '$', name: 'US Dollar', exchangeRate: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', exchangeRate: 0.92 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', exchangeRate: 155.0 },
  { code: 'GBP', symbol: '£', name: 'British Pound', exchangeRate: 0.79 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', exchangeRate: 1.35 },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Income categories
  {
    id: 'inc-salary',
    name: 'Salary',
    type: 'income',
    color: '#059669', // emerald
    icon: 'Briefcase',
    isDefault: true,
  },
  {
    id: 'inc-gift',
    name: 'Gift',
    type: 'income',
    color: '#D97706', // amber
    icon: 'Gift',
    isDefault: true,
  },
  {
    id: 'inc-freelance',
    name: 'Freelance',
    type: 'income',
    color: '#2563EB', // blue
    icon: 'Laptop',
    isDefault: true,
  },
  {
    id: 'inc-other',
    name: 'Other',
    type: 'income',
    color: '#4F46E5', // indigo
    icon: 'CircleDollarSign',
    isDefault: true,
  },

  // Expense categories (per spec: Transportation, Food, Dates, Projects, Spay, Other)
  {
    id: 'exp-transport',
    name: 'Transportation',
    type: 'expense',
    color: '#0284C7', // sky-600
    icon: 'Car',
    isDefault: true,
  },
  {
    id: 'exp-food',
    name: 'Food',
    type: 'expense',
    color: '#E11D48', // rose-600
    icon: 'Utensils',
    isDefault: true,
  },
  {
    id: 'exp-dates',
    name: 'Dates',
    type: 'expense',
    color: '#DB2777', // pink-600
    icon: 'Heart',
    isDefault: true,
  },
  {
    id: 'exp-projects',
    name: 'Projects',
    type: 'expense',
    color: '#7C3AED', // violet-600
    icon: 'FolderKanban',
    isDefault: true,
  },
  {
    id: 'exp-spay',
    name: 'SPayLater / Bills', // Handled per spec note ("Spay" = Shopee PayLater / Installments / Bills)
    type: 'expense',
    color: '#EA580C', // orange-600
    icon: 'CreditCard',
    isDefault: true,
  },
  {
    id: 'exp-other',
    name: 'Other',
    type: 'expense',
    color: '#52525B', // zinc-600
    icon: 'Tag',
    isDefault: true,
  },
];

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

export const SEED_TRANSACTIONS: Transaction[] = [
  // Sep 2026 - Week 1 - Sep 1 (from spec)
  {
    id: 'tx-1',
    type: 'income',
    amount: 35000,
    currency: 'PHP',
    categoryId: 'inc-salary',
    note: 'Monthly Base Salary',
    date: '2026-09-01',
    time: '9:00 AM',
    timestamp: makeTimestamp('2026-09-01', '9:00 AM'),
    createdAt: makeTimestamp('2026-09-01', '9:00 AM'),
  },
  {
    id: 'tx-2',
    type: 'expense',
    amount: 20,
    currency: 'PHP',
    categoryId: 'exp-transport',
    note: 'Commute (Morning LRT)',
    date: '2026-09-01',
    time: '8:02 AM',
    timestamp: makeTimestamp('2026-09-01', '8:02 AM'),
    createdAt: makeTimestamp('2026-09-01', '8:02 AM'),
  },
  {
    id: 'tx-3',
    type: 'expense',
    amount: 100,
    currency: 'PHP',
    categoryId: 'exp-other',
    note: 'Shopping (Notebooks & Pens)',
    date: '2026-09-01',
    time: '2:14 PM',
    timestamp: makeTimestamp('2026-09-01', '2:14 PM'),
    createdAt: makeTimestamp('2026-09-01', '2:14 PM'),
  },
  {
    id: 'tx-4',
    type: 'expense',
    amount: 20,
    currency: 'PHP',
    categoryId: 'exp-transport',
    note: 'Commute (Evening Return)',
    date: '2026-09-01',
    time: '6:45 PM',
    timestamp: makeTimestamp('2026-09-01', '6:45 PM'),
    createdAt: makeTimestamp('2026-09-01', '6:45 PM'),
  },
  {
    id: 'tx-5',
    type: 'expense',
    amount: 100,
    currency: 'PHP',
    categoryId: 'exp-spay',
    note: 'Spay Monthly Installment',
    date: '2026-09-01',
    time: '9:30 PM',
    timestamp: makeTimestamp('2026-09-01', '9:30 PM'),
    createdAt: makeTimestamp('2026-09-01', '9:30 PM'),
  },

  // Sep 2026 - Week 1 - Sep 3
  {
    id: 'tx-6',
    type: 'expense',
    amount: 380,
    currency: 'PHP',
    categoryId: 'exp-food',
    note: 'Food (Dinner Ramen)',
    date: '2026-09-03',
    time: '7:20 PM',
    timestamp: makeTimestamp('2026-09-03', '7:20 PM'),
    createdAt: makeTimestamp('2026-09-03', '7:20 PM'),
  },
  {
    id: 'tx-7',
    type: 'expense',
    amount: 1250,
    currency: 'PHP',
    categoryId: 'exp-dates',
    note: 'Dates (Cinema & Bistro)',
    date: '2026-09-05',
    time: '8:45 PM',
    timestamp: makeTimestamp('2026-09-05', '8:45 PM'),
    createdAt: makeTimestamp('2026-09-05', '8:45 PM'),
  },

  // Sep 2026 - Week 2 - Sep 8 (from spec)
  {
    id: 'tx-8',
    type: 'income',
    amount: 100,
    currency: 'PHP',
    categoryId: 'inc-salary',
    note: 'Salary (Bonus adjustment)',
    date: '2026-09-08',
    time: '9:00 AM',
    timestamp: makeTimestamp('2026-09-08', '9:00 AM'),
    createdAt: makeTimestamp('2026-09-08', '9:00 AM'),
  },
  {
    id: 'tx-9',
    type: 'expense',
    amount: 100,
    currency: 'PHP',
    categoryId: 'exp-other',
    note: 'Shopping (Desk organizer)',
    date: '2026-09-08',
    time: '1:10 PM',
    timestamp: makeTimestamp('2026-09-08', '1:10 PM'),
    createdAt: makeTimestamp('2026-09-08', '1:10 PM'),
  },
  {
    id: 'tx-10',
    type: 'expense',
    amount: 650,
    currency: 'PHP',
    categoryId: 'exp-projects',
    note: 'Projects (Cloud Hosting Tier)',
    date: '2026-09-08',
    time: '4:15 PM',
    timestamp: makeTimestamp('2026-09-08', '4:15 PM'),
    createdAt: makeTimestamp('2026-09-08', '4:15 PM'),
  },
];

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
