import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Category,
  Currency,
  Debt,
  Goal,
  Transaction,
  TransactionType,
  UserSettings,
  UserProfile,
  DBStatus,
  AuthUser,
  Account,
} from './types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CURRENCIES,
  DEFAULT_SETTINGS,
  DEFAULT_USER_PROFILE,
  SEED_DEBTS,
  SEED_GOALS,
  SEED_TRANSACTIONS,
  createDefaultAccountCategories,
} from './data/initialData';
import { Header, ActiveTab } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { QuickEntryForm } from './components/QuickEntryForm';
import { TrackerView } from './components/TrackerView';
import { SummaryPanel } from './components/SummaryPanel';
import { DebtTracker } from './components/DebtTracker';
import { GoalsView } from './components/GoalsView';
import { AIAdvisorModal } from './components/AIAdvisorModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { CurrencyManagerModal } from './components/CurrencyManagerModal';
import { AccountManagerModal } from './components/AccountManagerModal';
import { TransferModal } from './components/TransferModal';
import { DonateModal } from './components/DonateModal';
import { SettingsModal } from './components/SettingsModal';
import { FileDown, Plus, AlertCircle } from 'lucide-react';
import { buildBudgetPdfDoc, exportPdfSaveAs } from './utils/pdfExport';
import { getCurrent12HourTime, getTodayDateString } from './utils/formatters';
import {
  convertCurrency,
  roundToCurrency,
  DEFAULT_EXCHANGE_RATES,
} from './utils/currency';
import {
  getCurrencyFlag,
  getWorldCurrency,
  fetchLiveExchangeRates,
} from './data/worldCurrencies';

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'cash',
    name: 'Cash',
    type: 'cash',
    color: '#16A34A',
    icon: 'Banknote',
    isDefault: true,
    initialBalance: 0,
  },
  {
    id: 'ewallet',
    name: 'E-Wallet',
    type: 'ewallet',
    color: '#0284C7',
    icon: 'Wallet',
    isDefault: false,
    initialBalance: 0,
  },
];

export const isCashAccount = (acc: { id?: string; type?: string; name?: string }): boolean => {
  if (!acc) return false;
  return (
    acc.id === 'cash' ||
    acc.type === 'cash' ||
    (typeof acc.name === 'string' && acc.name.trim().toLowerCase() === 'cash')
  );
};

export const ensureCashAccount = (accList: Account[]): Account[] => {
  if (!Array.isArray(accList) || accList.length === 0) {
    return DEFAULT_ACCOUNTS;
  }
  const hasCash = accList.some(isCashAccount);
  if (hasCash) {
    return accList;
  }
  const cashAccount: Account = {
    id: 'cash',
    name: 'Cash',
    type: 'cash',
    color: '#16A34A',
    icon: 'Banknote',
    isDefault: accList.every((a) => !a.isDefault),
    initialBalance: 0,
  };
  return [cashAccount, ...accList];
};

const STORAGE_KEYS = {
  TRANSACTIONS_V1: 'budget_tracker_transactions_v1', // old shared key to purge
  TRANSACTIONS_PREFIX: 'budget_tracker_transactions_v2',
  CATEGORIES_PREFIX: 'budget_tracker_categories_v2',
  CURRENCIES_PREFIX: 'budget_tracker_currencies_v2',
  ACCOUNTS_PREFIX: 'budget_tracker_accounts_v2',
  DEBTS_PREFIX: 'budget_tracker_debts_v2',
  GOALS_PREFIX: 'budget_tracker_goals_v2',
  SETTINGS_PREFIX: 'budget_tracker_settings_v2',
  USER_PROFILE_PREFIX: 'budget_tracker_user_profile_v2',
  CATEGORIES: 'budget_tracker_categories_v1',
  CURRENCIES: 'budget_tracker_currencies_v1',
  ACCOUNTS: 'budget_tracker_accounts_v1',
  DEBTS: 'budget_tracker_debts_v1',
  GOALS: 'budget_tracker_goals_v1',
  SETTINGS: 'budget_tracker_settings_v1',
  USER_PROFILE: 'budget_tracker_user_profile_v1',
  CURRENT_USER: 'budget_tracker_current_user_v1',
};

const getUserStorageKey = (prefix: string, userId?: string | null) => {
  return userId ? `${prefix}_${userId}` : `${prefix}_guest`;
};

// Consolidates any legacy dual-entry transfer pairs (one IN, one OUT) into a single transfer transaction
export const consolidateTransferTransactions = (txList: Transaction[], accountsList?: Account[]): Transaction[] => {
  if (!Array.isArray(txList) || txList.length === 0) return txList;

  const result: Transaction[] = [];
  const processedIds = new Set<string>();

  // Helper to extract clean note and account names from legacy transfer notes
  const extractTransferInfo = (tx: Transaction) => {
    let cleanNote = tx.note || '';
    let targetAccName = '';
    let sourceAccName = '';

    const toMatch = (tx.note || '').match(/Transfer to ([^:]+)(?::\s*(.*))?/i);
    if (toMatch) {
      targetAccName = toMatch[1].trim();
      cleanNote = toMatch[2]?.trim() || '';
    } else if ((tx.note || '').toLowerCase().startsWith('transfer to ')) {
      targetAccName = (tx.note || '').substring(12).trim();
      cleanNote = '';
    }

    const fromMatch = (tx.note || '').match(/Transfer from ([^:]+)(?::\s*(.*))?/i);
    if (fromMatch) {
      sourceAccName = fromMatch[1].trim();
      cleanNote = fromMatch[2]?.trim() || '';
    } else if ((tx.note || '').toLowerCase().startsWith('transfer from ')) {
      sourceAccName = (tx.note || '').substring(14).trim();
      cleanNote = '';
    }

    return { cleanNote, targetAccName, sourceAccName };
  };

  const isTransferOut = (t: Transaction) =>
    t.id.startsWith('tx-transfer-out-') ||
    (t.type === 'expense' && (t.categoryName?.toLowerCase() === 'transfer' || (t.note || '').toLowerCase().startsWith('transfer to')));

  const isTransferIn = (t: Transaction) =>
    t.id.startsWith('tx-transfer-in-') ||
    (t.type === 'income' && (t.categoryName?.toLowerCase() === 'transfer' || (t.note || '').toLowerCase().startsWith('transfer from')));

  // Pre-filter OUT and IN candidates
  const outTxList = txList.filter(isTransferOut);
  const inTxList = txList.filter(isTransferIn);

  // 1. Process matching OUT and IN pairs
  for (const outTx of outTxList) {
    if (processedIds.has(outTx.id)) continue;

    // Find best matching IN candidate
    const inTx = inTxList.find((candidate) => {
      if (processedIds.has(candidate.id) || candidate.id === outTx.id) return false;
      // Must match amount
      if (Math.abs(candidate.amount - outTx.amount) > 0.001) return false;

      // Check matching timestamp within 5 minutes or matching date
      const timeDiff = Math.abs((candidate.timestamp || 0) - (outTx.timestamp || 0));
      if (timeDiff < 300000) return true;
      if (candidate.date === outTx.date) return true;
      return false;
    });

    processedIds.add(outTx.id);
    if (inTx) processedIds.add(inTx.id);

    const { cleanNote: outNote, targetAccName } = extractTransferInfo(outTx);
    const { cleanNote: inNote, sourceAccName } = inTx ? extractTransferInfo(inTx) : { cleanNote: '', sourceAccName: '' };

    const fromAccId = outTx.fromAccountId || outTx.accountId || (inTx ? inTx.fromAccountId : undefined) || 'cash';
    const toAccId = (inTx ? (inTx.toAccountId || inTx.accountId) : outTx.toAccountId) || 'ewallet';

    const fromAcc = accountsList?.find(
      (a) => a.id === fromAccId || (sourceAccName && a.name.toLowerCase() === sourceAccName.toLowerCase())
    );
    const toAcc = accountsList?.find(
      (a) => a.id === toAccId || (targetAccName && a.name.toLowerCase() === targetAccName.toLowerCase())
    );

    const cleanNote = outNote || inNote || ((outTx.note || '').startsWith('Transfer') ? '' : outTx.note);

    result.push({
      id: outTx.id.startsWith('tx-transfer-out-')
        ? outTx.id.replace('tx-transfer-out-', 'tx-transfer-')
        : outTx.id.startsWith('tx-transfer-')
        ? outTx.id
        : `tx-transfer-${outTx.id}`,
      userId: outTx.userId,
      type: 'transfer',
      amount: outTx.amount,
      currency: outTx.currency,
      categoryId: '',
      categoryName: undefined,
      categoryIcon: undefined,
      categoryColor: undefined,
      accountId: fromAccId,
      fromAccountId: fromAccId,
      toAccountId: toAccId,
      fromAccountName: fromAcc?.name || outTx.fromAccountName || outTx.accountName || sourceAccName || 'Account 1',
      toAccountName: toAcc?.name || (inTx?.toAccountName || inTx?.accountName) || targetAccName || 'Account 2',
      fromAccountIcon: fromAcc?.icon || outTx.fromAccountIcon || outTx.accountIcon || 'Wallet',
      toAccountIcon: toAcc?.icon || inTx?.toAccountIcon || inTx?.accountIcon || 'Wallet',
      accountName: fromAcc?.name || outTx.accountName,
      accountIcon: fromAcc?.icon || outTx.accountIcon || 'Wallet',
      note: cleanNote,
      date: outTx.date,
      time: outTx.time,
      timestamp: outTx.timestamp,
      createdAt: outTx.createdAt,
    });
  }

  // 2. Process any remaining orphaned IN transactions (had no matching OUT)
  for (const inTx of inTxList) {
    if (processedIds.has(inTx.id)) continue;
    processedIds.add(inTx.id);

    const { cleanNote, sourceAccName } = extractTransferInfo(inTx);
    const toAccId = inTx.toAccountId || inTx.accountId || 'ewallet';
    const fromAccId = inTx.fromAccountId || 'cash';
    const fromAcc = accountsList?.find(
      (a) => a.id === fromAccId || (sourceAccName && a.name.toLowerCase() === sourceAccName.toLowerCase())
    );
    const toAcc = accountsList?.find((a) => a.id === toAccId);

    result.push({
      id: inTx.id.startsWith('tx-transfer-in-')
        ? inTx.id.replace('tx-transfer-in-', 'tx-transfer-')
        : `tx-transfer-${inTx.id}`,
      userId: inTx.userId,
      type: 'transfer',
      amount: inTx.amount,
      currency: inTx.currency,
      categoryId: '',
      categoryName: undefined,
      categoryIcon: undefined,
      categoryColor: undefined,
      accountId: fromAccId,
      fromAccountId: fromAccId,
      toAccountId: toAccId,
      fromAccountName: fromAcc?.name || sourceAccName || 'Account 1',
      toAccountName: toAcc?.name || inTx.toAccountName || inTx.accountName || 'Account 2',
      fromAccountIcon: fromAcc?.icon || 'Wallet',
      toAccountIcon: toAcc?.icon || inTx.toAccountIcon || inTx.accountIcon || 'Wallet',
      accountName: fromAcc?.name || inTx.accountName,
      accountIcon: fromAcc?.icon || inTx.accountIcon || 'Wallet',
      note: cleanNote || ((inTx.note || '').startsWith('Transfer') ? '' : inTx.note),
      date: inTx.date,
      time: inTx.time,
      timestamp: inTx.timestamp,
      createdAt: inTx.createdAt,
    });
  }

  // 3. Process remaining transactions & deduplicate any dual transfer records
  const seenTransfers = new Set<string>();

  for (const tx of txList) {
    if (processedIds.has(tx.id)) continue;

    if (tx.type === 'transfer') {
      const fromAccId = tx.fromAccountId || tx.accountId || 'cash';
      const toAccId = tx.toAccountId || 'ewallet';
      const fromAcc = accountsList?.find((a) => a.id === fromAccId);
      const toAcc = accountsList?.find((a) => a.id === toAccId);

      const normTx: Transaction = {
        ...tx,
        categoryId: '',
        categoryName: undefined,
        categoryIcon: undefined,
        categoryColor: undefined,
        accountId: fromAccId,
        fromAccountId: fromAccId,
        toAccountId: toAccId,
        fromAccountName: fromAcc?.name || tx.fromAccountName || tx.accountName || 'Account 1',
        toAccountName: toAcc?.name || tx.toAccountName || 'Account 2',
        fromAccountIcon: fromAcc?.icon || tx.fromAccountIcon || tx.accountIcon || 'Wallet',
        toAccountIcon: toAcc?.icon || tx.toAccountIcon || 'Wallet',
      };

      const transferKey = `${normTx.amount}_${normTx.date}_${normTx.fromAccountId}_${normTx.toAccountId}`;
      if (seenTransfers.has(transferKey)) {
        continue; // Deduplicate
      }
      seenTransfers.add(transferKey);
      result.push(normTx);
      continue;
    }

    result.push(tx);
  }

  return result;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!saved) return null;
      const user = JSON.parse(saved);
      if (user && user.isVerified === false) {
        return null;
      }
      return user;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      const pendingGoogleAuth = localStorage.getItem('budget_tracker_google_auth');
      if (!pendingGoogleAuth) return;

      const parsed = JSON.parse(pendingGoogleAuth);
      if (parsed?.type === 'OAUTH_AUTH_SUCCESS' && parsed?.user) {
        const user: AuthUser = {
          id: parsed.user.id,
          email: parsed.user.email,
          nickname: parsed.user.nickname,
          avatarUrl: parsed.user.avatarUrl || '',
          defaultCurrency: parsed.user.defaultCurrency || 'PHP',
          isVerified: true,
        };

        setCurrentUser(user);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        localStorage.removeItem('budget_tracker_google_auth');
      }
    } catch {
      localStorage.removeItem('budget_tracker_google_auth');
    }
  }, []);

  // --- Persistent State loaded from LocalStorage (isolated per user) ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      // Discard deprecated shared v1 key
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS_V1);
      const user = (() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })();
      const userKey = getUserStorageKey(STORAGE_KEYS.TRANSACTIONS_PREFIX, user?.id);
      const saved = localStorage.getItem(userKey);
      return saved ? consolidateTransferTransactions(JSON.parse(saved)) : [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const user = (() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })();
      let saved = null;
      if (user?.id) {
        saved = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.CATEGORIES_PREFIX, user.id));
      }
      if (!saved) {
        saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      }
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const [currencies, setCurrencies] = useState<Currency[]>(() => {
    try {
      const user = (() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })();
      let saved = null;
      if (user?.id) {
        saved = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.CURRENCIES_PREFIX, user.id));
      }
      if (!saved) {
        saved = localStorage.getItem(STORAGE_KEYS.CURRENCIES);
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: Currency) => ({
            ...c,
            flag: c.flag || getCurrencyFlag(c.code),
            exchangeRate: c.exchangeRate || DEFAULT_EXCHANGE_RATES[c.code] || 1.0,
          }));
        }
      }
      return DEFAULT_CURRENCIES;
    } catch {
      return DEFAULT_CURRENCIES;
    }
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const user = (() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })();
      let saved = null;
      if (user?.id) {
        saved = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.ACCOUNTS_PREFIX, user.id));
      }
      if (!saved) {
        saved = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return ensureCashAccount(parsed);
        }
      }
      return DEFAULT_ACCOUNTS;
    } catch {
      return DEFAULT_ACCOUNTS;
    }
  });

  const [debts, setDebts] = useState<Debt[]>(() => {
    try {
      const user = (() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })();
      let saved = null;
      if (user?.id) {
        saved = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.DEBTS_PREFIX, user.id));
      }
      if (!saved) {
        saved = localStorage.getItem(STORAGE_KEYS.DEBTS);
      }
      return saved ? JSON.parse(saved) : SEED_DEBTS;
    } catch {
      return SEED_DEBTS;
    }
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const user = (() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })();
      let saved = null;
      if (user?.id) {
        saved = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.GOALS_PREFIX, user.id));
      }
      if (!saved) {
        saved = localStorage.getItem(STORAGE_KEYS.GOALS);
      }
      return saved ? JSON.parse(saved) : SEED_GOALS;
    } catch {
      return SEED_GOALS;
    }
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const user = (() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })();

      if (user?.id) {
        const userKey = getUserStorageKey(STORAGE_KEYS.SETTINGS_PREFIX, user.id);
        const savedSettings = localStorage.getItem(userKey);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            defaultCurrency: parsed.defaultCurrency || user.defaultCurrency || 'PHP',
          };
        }
        if (user.defaultCurrency) {
          return {
            ...DEFAULT_SETTINGS,
            defaultCurrency: user.defaultCurrency,
          };
        }
      }

      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          defaultCurrency: parsed.defaultCurrency || 'PHP',
        };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return saved ? JSON.parse(saved) : DEFAULT_USER_PROFILE;
    } catch {
      return DEFAULT_USER_PROFILE;
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('tracker');

  // --- Modals State ---
  const [showQuickEntryModal, setShowQuickEntryModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [categoriesInitialType, setCategoriesInitialType] = useState<TransactionType>('expense');
  const [categoriesInitialAccountId, setCategoriesInitialAccountId] = useState<string>('cash');
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCurrenciesModal, setShowCurrenciesModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // --- Online Storage State & Sync ---
  const [dbStatus, setDbStatus] = useState<DBStatus>({
    configured: false,
    hasPlaceholder: false,
    connected: false,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Check connection status
  const checkDBStatus = async (): Promise<DBStatus | null> => {
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) {
        const data: DBStatus = await res.json();
        setDbStatus(data);
        return data;
      }
    } catch {
      // Offline / server not ready
    }
    return null;
  };

  const loadUserDataForUser = (user: AuthUser) => {
    // 1. Settings & default currency
    let userSettings: UserSettings = DEFAULT_SETTINGS;
    let foundDefaultCurrency = user.defaultCurrency;

    try {
      const savedUserKey = getUserStorageKey(STORAGE_KEYS.SETTINGS_PREFIX, user.id);
      const rawSettings = localStorage.getItem(savedUserKey);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        userSettings = { ...DEFAULT_SETTINGS, ...parsed };
        if (parsed.defaultCurrency) {
          foundDefaultCurrency = parsed.defaultCurrency;
        }
      } else {
        const rawAccounts = localStorage.getItem('budget_tracker_saved_accounts_v1');
        if (rawAccounts) {
          const accs = JSON.parse(rawAccounts);
          const matched = accs.find(
            (a: any) => a.id === user.id || a.email?.toLowerCase() === user.email?.toLowerCase()
          );
          if (matched?.defaultCurrency) {
            foundDefaultCurrency = matched.defaultCurrency;
          }
        }
      }
    } catch {}

    const resolvedCurrency = foundDefaultCurrency || userSettings.defaultCurrency || 'PHP';
    userSettings.defaultCurrency = resolvedCurrency;
    setSettings(userSettings);

    // 2. Currencies
    try {
      const currKey = getUserStorageKey(STORAGE_KEYS.CURRENCIES_PREFIX, user.id);
      const rawCurrs = localStorage.getItem(currKey);
      if (rawCurrs) {
        const parsed = JSON.parse(rawCurrs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed.map((c: Currency) => ({
            ...c,
            flag: c.flag || getCurrencyFlag(c.code),
            exchangeRate: c.exchangeRate || DEFAULT_EXCHANGE_RATES[c.code] || 1.0,
          }));
          if (!mapped.some((c: Currency) => c.code === resolvedCurrency)) {
            const worldCurr = getWorldCurrency(resolvedCurrency);
            if (worldCurr) {
              mapped.push({
                code: worldCurr.code,
                symbol: worldCurr.symbol,
                name: worldCurr.name,
                flag: worldCurr.flag,
                exchangeRate: worldCurr.exchangeRate || 1.0,
              });
            }
          }
          setCurrencies(mapped);
        }
      } else {
        let baseCurrs = [...DEFAULT_CURRENCIES];
        if (!baseCurrs.some((c) => c.code === resolvedCurrency)) {
          const worldCurr = getWorldCurrency(resolvedCurrency);
          if (worldCurr) {
            baseCurrs.push({
              code: worldCurr.code,
              symbol: worldCurr.symbol,
              name: worldCurr.name,
              flag: worldCurr.flag,
              exchangeRate: worldCurr.exchangeRate || 1.0,
            });
          }
        }
        setCurrencies(baseCurrs);
      }
    } catch {}

    // 3. Transactions
    try {
      const txKey = getUserStorageKey(STORAGE_KEYS.TRANSACTIONS_PREFIX, user.id);
      const savedTx = localStorage.getItem(txKey);
      setTransactions(savedTx ? consolidateTransferTransactions(JSON.parse(savedTx)) : []);
    } catch {
      setTransactions([]);
    }

    // 4. Debts
    try {
      const debtKey = getUserStorageKey(STORAGE_KEYS.DEBTS_PREFIX, user.id);
      const savedDebts = localStorage.getItem(debtKey);
      if (savedDebts) setDebts(JSON.parse(savedDebts));
    } catch {}

    // 5. Goals
    try {
      const goalKey = getUserStorageKey(STORAGE_KEYS.GOALS_PREFIX, user.id);
      const savedGoals = localStorage.getItem(goalKey);
      if (savedGoals) setGoals(JSON.parse(savedGoals));
    } catch {}

    // 6. Accounts
    try {
      const accKey = getUserStorageKey(STORAGE_KEYS.ACCOUNTS_PREFIX, user.id);
      const savedAccs = localStorage.getItem(accKey);
      if (savedAccs) {
        setAccounts(ensureCashAccount(JSON.parse(savedAccs)));
      } else {
        setAccounts(DEFAULT_ACCOUNTS);
      }
    } catch {
      setAccounts(DEFAULT_ACCOUNTS);
    }

    // 7. Categories
    try {
      const catKey = getUserStorageKey(STORAGE_KEYS.CATEGORIES_PREFIX, user.id);
      const savedCats = localStorage.getItem(catKey);
      if (savedCats) setCategories(JSON.parse(savedCats));
    } catch {}
  };

  const handleSyncWithDB = async (targetUserId?: string) => {
    const uid = targetUserId || currentUser?.id;
    if (!uid) return;
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const status = await checkDBStatus();
      if (!status?.connected) {
        setIsSyncing(false);
        return;
      }

      // Fetch user's records from storage
      const res = await fetch(`/api/db/sync?userId=${encodeURIComponent(uid)}`, {
        headers: { 'x-user-id': uid },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (Array.isArray(json.data.transactions)) {
            const consolidated = consolidateTransferTransactions(json.data.transactions);
            setTransactions(consolidated);
            try {
              localStorage.setItem(
                getUserStorageKey(STORAGE_KEYS.TRANSACTIONS_PREFIX, uid),
                JSON.stringify(consolidated)
              );
            } catch {}
          }
          if (Array.isArray(json.data.categories) && json.data.categories.length > 0) {
            setCategories(json.data.categories);
            try {
              localStorage.setItem(
                getUserStorageKey(STORAGE_KEYS.CATEGORIES_PREFIX, uid),
                JSON.stringify(json.data.categories)
              );
            } catch {}
          }
          if (Array.isArray(json.data.debts)) {
            setDebts(json.data.debts);
            try {
              localStorage.setItem(
                getUserStorageKey(STORAGE_KEYS.DEBTS_PREFIX, uid),
                JSON.stringify(json.data.debts)
              );
            } catch {}
          }
          if (Array.isArray(json.data.goals)) {
            setGoals(json.data.goals);
            try {
              localStorage.setItem(
                getUserStorageKey(STORAGE_KEYS.GOALS_PREFIX, uid),
                JSON.stringify(json.data.goals)
              );
            } catch {}
          }
          if (json.data.settings) {
            const serverCurrency =
              json.data.settings.defaultCurrency ||
              json.data.settings.primaryCurrency;
            setSettings((prev) => {
              const updated = {
                ...prev,
                ...json.data.settings,
                defaultCurrency: serverCurrency || prev.defaultCurrency || 'PHP',
              };
              try {
                localStorage.setItem(
                  getUserStorageKey(STORAGE_KEYS.SETTINGS_PREFIX, uid),
                  JSON.stringify(updated)
                );
              } catch {}
              return updated;
            });
          }
          if (Array.isArray(json.data.currencies) && json.data.currencies.length > 0) {
            setCurrencies(json.data.currencies);
            try {
              localStorage.setItem(
                getUserStorageKey(STORAGE_KEYS.CURRENCIES_PREFIX, uid),
                JSON.stringify(json.data.currencies)
              );
            } catch {}
          }
          if (Array.isArray(json.data.accounts) && json.data.accounts.length > 0) {
            const safeAccs = ensureCashAccount(json.data.accounts);
            setAccounts(safeAccs);
            try {
              localStorage.setItem(
                getUserStorageKey(STORAGE_KEYS.ACCOUNTS_PREFIX, uid),
                JSON.stringify(safeAccs)
              );
            } catch {}
          }
          if (json.data.profile) {
            setUserProfile(json.data.profile);
            try {
              localStorage.setItem(
                getUserStorageKey(STORAGE_KEYS.USER_PROFILE_PREFIX, uid),
                JSON.stringify(json.data.profile)
              );
            } catch {}
          }
          const nowStr = new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          setLastSyncedTime(nowStr);
        }
      }
    } catch (err) {
      console.error('Failed to sync records:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Switch user local records & sync when user logs in / switches
  useEffect(() => {
    if (currentUser?.id) {
      loadUserDataForUser(currentUser);
      handleSyncWithDB(currentUser.id);
    } else {
      setTransactions([]);
    }
  }, [currentUser?.id]);

  // Initial connection check on mount
  useEffect(() => {
    checkDBStatus().then((status) => {
      if (status?.connected && currentUser?.id) {
        handleSyncWithDB(currentUser.id);
      }
    });
  }, []);

  // Background sync whenever state changes
  const isFirstSyncRender = useRef(true);
  useEffect(() => {
    if (isFirstSyncRender.current) {
      isFirstSyncRender.current = false;
      return;
    }
    if (!dbStatus.connected || !currentUser?.id) return;

    const timer = setTimeout(() => {
      fetch('/api/db/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          transactions: transactions.map((t) => ({ ...t, userId: currentUser.id })),
          categories,
          currencies,
          accounts,
          debts,
          goals,
          settings,
          profile: userProfile,
        }),
      })
        .then(() => {
          const nowStr = new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          setLastSyncedTime(nowStr);
        })
        .catch(() => {});
    }, 1200);

    return () => clearTimeout(timer);
  }, [transactions, categories, currencies, accounts, debts, goals, settings, userProfile, dbStatus.connected, currentUser?.id]);

  // --- Undo Delete State (§5 Requirement) ---
  const [pendingUndoTx, setPendingUndoTx] = useState<Transaction | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState<number>(6);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      const userKey = getUserStorageKey(STORAGE_KEYS.TRANSACTIONS_PREFIX, currentUser?.id);
      localStorage.setItem(userKey, JSON.stringify(transactions));
    } catch {}
  }, [transactions, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      try {
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.CATEGORIES_PREFIX, currentUser.id),
          JSON.stringify(categories)
        );
      } catch {}
    }
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }, [categories, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      try {
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.CURRENCIES_PREFIX, currentUser.id),
          JSON.stringify(currencies)
        );
      } catch {}
    }
    localStorage.setItem(STORAGE_KEYS.CURRENCIES, JSON.stringify(currencies));
  }, [currencies, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      try {
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.ACCOUNTS_PREFIX, currentUser.id),
          JSON.stringify(accounts)
        );
      } catch {}
    }
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }, [accounts, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      try {
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.DEBTS_PREFIX, currentUser.id),
          JSON.stringify(debts)
        );
      } catch {}
    }
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
  }, [debts, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      try {
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.GOALS_PREFIX, currentUser.id),
          JSON.stringify(goals)
        );
      } catch {}
    }
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }, [goals, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      try {
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.SETTINGS_PREFIX, currentUser.id),
          JSON.stringify(settings)
        );
      } catch {}
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings, currentUser?.id]);

  // Backfill snapshot category & account details on legacy transactions so historical records are permanently preserved
  useEffect(() => {
    if (categories.length === 0 && accounts.length === 0) return;
    const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
    const accMap = new Map<string, Account>(accounts.map((a) => [a.id, a]));

    let modified = false;
    const enriched = transactions.map((tx) => {
      let changed = false;
      const updates: Partial<Transaction> = {};

      if (!tx.categoryName && tx.categoryId && catMap.has(tx.categoryId)) {
        const cat = catMap.get(tx.categoryId)!;
        updates.categoryName = cat.name;
        updates.categoryIcon = cat.icon;
        updates.categoryColor = cat.color;
        changed = true;
      }
      if (!tx.accountName && tx.accountId && accMap.has(tx.accountId)) {
        const acc = accMap.get(tx.accountId)!;
        updates.accountName = acc.name;
        updates.accountIcon = acc.icon;
        changed = true;
      }

      if (changed) {
        modified = true;
        return { ...tx, ...updates };
      }
      return tx;
    });

    if (modified) {
      setTransactions(enriched);
    }
  }, [categories, accounts, transactions.length]);

  useEffect(() => {
    if (currentUser?.id) {
      try {
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.USER_PROFILE_PREFIX, currentUser.id),
          JSON.stringify(userProfile)
        );
      } catch {}
    }
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));
  }, [userProfile, currentUser?.id]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    };
  }, []);

  // Automatically fetch live exchange rates on mount and sync currencies
  useEffect(() => {
    fetchLiveExchangeRates().then((liveRates) => {
      if (liveRates) {
        setCurrencies((prev) =>
          prev.map((c) => ({
            ...c,
            flag: c.flag || getCurrencyFlag(c.code),
            exchangeRate: liveRates[c.code] || c.exchangeRate || DEFAULT_EXCHANGE_RATES[c.code] || 1.0,
          }))
        );
      }
    });
  }, []);

  // --- Month & Year Navigation State ---
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`; // e.g. "2026-09"
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleSelectDate = (date: string | null) => {
    setSelectedDate(date);
    if (date) {
      setSelectedYearMonth(date.slice(0, 7));
    }
  };

  const handleSelectYearMonth = (yearMonth: string) => {
    setSelectedDate(null);
    setSelectedYearMonth(yearMonth);
  };

  const handlePrevMonth = () => {
    setSelectedDate(null);
    setSelectedYearMonth((prev) => {
      const [y, m] = prev.split('-').map(Number);
      const d = new Date(y, m - 1 - 1, 1);
      const newY = d.getFullYear();
      const newM = String(d.getMonth() + 1).padStart(2, '0');
      return `${newY}-${newM}`;
    });
  };

  const handleNextMonth = () => {
    setSelectedDate(null);
    setSelectedYearMonth((prev) => {
      const [y, m] = prev.split('-').map(Number);
      const d = new Date(y, m - 1 + 1, 1);
      const newY = d.getFullYear();
      const newM = String(d.getMonth() + 1).padStart(2, '0');
      return `${newY}-${newM}`;
    });
  };

  const selectedMonthYearLabel = useMemo(() => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(dateObj);
    }
    const [y, m] = selectedYearMonth.split('-').map(Number);
    const dateObj = new Date(y, m - 1, 1);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(dateObj);
  }, [selectedYearMonth, selectedDate]);

  // Monthly filtered transactions for the selected month or specific date
  const monthlyTransactions = useMemo(() => {
    if (selectedDate) {
      return transactions.filter((t) => t.date === selectedDate);
    }
    return transactions.filter((t) => t.date.startsWith(selectedYearMonth));
  }, [transactions, selectedYearMonth, selectedDate]);

  // Monthly financial figures for the selected month
  const monthlyIncome = useMemo(() => {
    return monthlyTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthlyTransactions]);

  const monthlyExpense = useMemo(() => {
    return monthlyTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthlyTransactions]);

  // Monthly Savings = Monthly Income minus Monthly Expenses
  const monthlySavings = monthlyIncome - monthlyExpense;

  // --- Financial Computations ---
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseCount = transactions.filter((t) => t.type === 'expense').length;
  const incomeCount = transactions.filter((t) => t.type === 'income').length;
  const debtCount = debts.filter((d) => !d.settled).length;

  // Current Savings = Total Income minus Total Expenses as mandated by §7
  const currentSavings = totalIncome - totalExpense;

  // Debts Net Calculation
  const totalYouOweUnsettled = debts
    .filter((d) => d.type === 'owe' && !d.settled)
    .reduce((sum, d) => sum + d.amount, 0);

  const totalOwedToYouUnsettled = debts
    .filter((d) => d.type === 'owed' && !d.settled)
    .reduce((sum, d) => sum + d.amount, 0);

  // positive = net owed to you, negative = net you owe
  const netDebt = totalOwedToYouUnsettled - totalYouOweUnsettled;

  const currentCurrencyObj =
    currencies.find((c) => c.code === settings.defaultCurrency) || currencies[0];
  const currencySymbol = currentCurrencyObj?.symbol || '₱';

  // --- Handlers: Transactions ---
  const handleSaveTransaction = (newTxData: {
    type: TransactionType;
    amount: number;
    currency: string;
    categoryId: string;
    note: string;
    date: string;
    time: string;
  }) => {
    const fromCurr = newTxData.currency || settings.defaultCurrency;

    // If transaction used a world currency not yet in active list, auto-add it
    if (newTxData.currency && !currencies.some((c) => c.code === newTxData.currency)) {
      const wc = getWorldCurrency(newTxData.currency);
      if (wc) {
        handleAddCurrency({
          code: wc.code,
          symbol: wc.symbol,
          name: wc.name,
          flag: wc.flag,
          exchangeRate: wc.exchangeRate || 1.0,
        });
      }
    }

    const ratesMap: Record<string, number> = {};
    currencies.forEach((c) => {
      if (c.exchangeRate) ratesMap[c.code] = c.exchangeRate;
    });

    const finalAmount =
      fromCurr !== settings.defaultCurrency
        ? roundToCurrency(convertCurrency(newTxData.amount, fromCurr, settings.defaultCurrency, ratesMap))
        : newTxData.amount;

    const matchedCategory = categories.find((c) => c.id === newTxData.categoryId);
    const matchedAccount = (newTxData as any).accountId
      ? accounts.find((a) => a.id === (newTxData as any).accountId)
      : undefined;

    const newTx: Transaction = {
      ...newTxData,
      amount: finalAmount,
      currency: settings.defaultCurrency,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: currentUser?.id,
      timestamp: new Date(`${newTxData.date}T${new Date().toTimeString().slice(0, 8)}`).getTime(),
      createdAt: Date.now(),
      categoryName: matchedCategory?.name || (newTxData as any).categoryName || 'Other',
      categoryIcon: matchedCategory?.icon || (newTxData as any).categoryIcon || 'Tag',
      categoryColor: matchedCategory?.color || (newTxData as any).categoryColor || '#52525B',
      accountName: matchedAccount?.name || (newTxData as any).accountName,
      accountIcon: matchedAccount?.icon || (newTxData as any).accountIcon,
    };
    setTransactions((prev) => [newTx, ...prev]);

    const txYearMonth = newTxData.date.slice(0, 7);
    if (txYearMonth && txYearMonth !== selectedYearMonth) {
      setSelectedYearMonth(txYearMonth);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const txToDelete = transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    // Clear any previous timer
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);

    // Set pending undo state
    setPendingUndoTx(txToDelete);
    setUndoSecondsLeft(6);

    // Remove row from list
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    // Request deletion on server if authenticated
    if (currentUser?.id) {
      fetch(`/api/db/transactions/${id}?userId=${encodeURIComponent(currentUser.id)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id },
      }).catch(() => {});
    }

    // Start 6-second timer to finalize deletion
    let secondsRemaining = 6;
    undoTimerRef.current = setInterval(() => {
      secondsRemaining -= 1;
      setUndoSecondsLeft(secondsRemaining);
      if (secondsRemaining <= 0) {
        if (undoTimerRef.current) clearInterval(undoTimerRef.current);
        setPendingUndoTx(null);
      }
    }, 1000);
  };

  const handleUndoDelete = () => {
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    if (pendingUndoTx) {
      setTransactions((prev) => [pendingUndoTx, ...prev]);
      setPendingUndoTx(null);
    }
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    if (updatedTx.type === 'transfer') {
      const fromAccId = updatedTx.fromAccountId || updatedTx.accountId;
      const toAccId = updatedTx.toAccountId;
      const fromAcc = accounts.find((a) => a.id === fromAccId);
      const toAcc = accounts.find((a) => a.id === toAccId);

      const enrichedTx: Transaction = {
        ...updatedTx,
        categoryId: '',
        categoryName: undefined,
        categoryIcon: undefined,
        categoryColor: undefined,
        accountId: fromAccId,
        fromAccountId: fromAccId,
        toAccountId: toAccId,
        fromAccountName: fromAcc?.name || updatedTx.fromAccountName,
        toAccountName: toAcc?.name || updatedTx.toAccountName,
        fromAccountIcon: fromAcc?.icon || updatedTx.fromAccountIcon || 'Wallet',
        toAccountIcon: toAcc?.icon || updatedTx.toAccountIcon || 'Wallet',
        accountName: fromAcc?.name || updatedTx.accountName,
        accountIcon: fromAcc?.icon || updatedTx.accountIcon || 'Wallet',
      };
      setTransactions((prev) => prev.map((t) => (t.id === enrichedTx.id ? enrichedTx : t)));
      return;
    }

    const cat = categories.find((c) => c.id === updatedTx.categoryId);
    const acc = updatedTx.accountId ? accounts.find((a) => a.id === updatedTx.accountId) : undefined;
    const enrichedTx: Transaction = {
      ...updatedTx,
      categoryName: cat?.name || updatedTx.categoryName || 'Other',
      categoryIcon: cat?.icon || updatedTx.categoryIcon || 'Tag',
      categoryColor: cat?.color || updatedTx.categoryColor || '#52525B',
      accountName: acc?.name || updatedTx.accountName,
      accountIcon: acc?.icon || updatedTx.accountIcon,
    };
    setTransactions((prev) => prev.map((t) => (t.id === enrichedTx.id ? enrichedTx : t)));
  };

  // --- Handlers: Debts ---
  const handleAddDebt = (debtData: Omit<Debt, 'id' | 'createdAt' | 'settled'>) => {
    const fromCurr = debtData.currency || settings.defaultCurrency;
    const ratesMap: Record<string, number> = {};
    currencies.forEach((c) => {
      if (c.exchangeRate) ratesMap[c.code] = c.exchangeRate;
    });

    const finalAmount =
      fromCurr !== settings.defaultCurrency
        ? roundToCurrency(convertCurrency(debtData.amount, fromCurr, settings.defaultCurrency, ratesMap))
        : debtData.amount;

    const newDebt: Debt = {
      ...debtData,
      amount: finalAmount,
      currency: settings.defaultCurrency,
      id: `debt-${Date.now()}`,
      createdAt: Date.now(),
      settled: false,
    };
    setDebts((prev) => [newDebt, ...prev]);
  };

  const handleToggleSettleDebt = (id: string) => {
    setDebts((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              settled: !d.settled,
              settledAt: !d.settled ? Date.now() : undefined,
            }
          : d
      )
    );
  };

  const handleDeleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  // --- Handlers: Goals ---
  const handleAddGoal = (goalData: Omit<Goal, 'id' | 'createdAt'>) => {
    const fromCurr = goalData.currency || settings.defaultCurrency;
    const ratesMap: Record<string, number> = {};
    currencies.forEach((c) => {
      if (c.exchangeRate) ratesMap[c.code] = c.exchangeRate;
    });

    const finalTarget =
      fromCurr !== settings.defaultCurrency
        ? roundToCurrency(convertCurrency(goalData.targetPrice, fromCurr, settings.defaultCurrency, ratesMap))
        : goalData.targetPrice;

    const newGoal: Goal = {
      ...goalData,
      targetPrice: finalTarget,
      currency: settings.defaultCurrency,
      id: `goal-${Date.now()}`,
      createdAt: Date.now(),
    };
    setGoals((prev) => [...prev, newGoal]);
  };

  const handleUpdateGoal = (updatedGoal: Goal) => {
    setGoals((prev) => prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g)));
  };

  const handleDeleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  // --- Handlers: Categories & Currencies ---
  const handleAddCategory = (catData: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...catData,
      id: `cat-${Date.now()}`,
    };
    setCategories((prev) => [...prev, newCat]);
  };

  const handleUpdateCategory = (updatedCat: Category) => {
    setCategories((prev) => prev.map((c) => (c.id === updatedCat.id ? updatedCat : c)));
  };

  const handleDeleteCategory = (id: string) => {
    const target = categories.find((c) => c.id === id);

    // Retain category name, icon, and color in all past transactions
    if (target) {
      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.categoryId === id) {
            return {
              ...tx,
              categoryName: tx.categoryName || target.name,
              categoryIcon: tx.categoryIcon || target.icon,
              categoryColor: tx.categoryColor || target.color,
            };
          }
          return tx;
        })
      );
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));

    // Persist deletion immediately to backend
    const delUrl = `/api/db/categories/${encodeURIComponent(id)}${
      currentUser?.id ? `?userId=${encodeURIComponent(currentUser.id)}` : ''
    }`;
    fetch(delUrl, {
      method: 'DELETE',
      headers: currentUser?.id ? { 'x-user-id': currentUser.id } : undefined,
    }).catch(() => {});
  };

  // Ensure every account has its own isolated categories and new accounts get default categories
  useEffect(() => {
    setCategories((prevCats) => {
      let changed = false;
      const updated = [...prevCats];

      // Assign missing accountId to 'cash'
      for (let i = 0; i < updated.length; i++) {
        if (!updated[i].accountId) {
          updated[i] = { ...updated[i], accountId: 'cash' };
          changed = true;
        }
      }

      // Check each account: ensure it has both expense and income categories
      accounts.forEach((acc) => {
        const accCats = updated.filter((c) => (c.accountId || 'cash') === acc.id);
        const hasExpenses = accCats.some((c) => c.type === 'expense');
        const hasIncome = accCats.some((c) => c.type === 'income');

        if (!hasExpenses && !hasIncome) {
          changed = true;
          updated.push(...createDefaultAccountCategories(acc.id));
        } else {
          if (!hasExpenses) {
            changed = true;
            updated.push(
              ...createDefaultAccountCategories(acc.id).filter((c) => c.type === 'expense')
            );
          }
          if (!hasIncome) {
            changed = true;
            updated.push(
              ...createDefaultAccountCategories(acc.id).filter((c) => c.type === 'income')
            );
          }
        }
      });

      return changed ? updated : prevCats;
    });
  }, [accounts]);

  // --- Handlers: Accounts ---
  const handleAddAccount = (accData: Omit<Account, 'id'>) => {
    const newId = `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newAcc: Account = {
      ...accData,
      id: newId,
    };
    setAccounts((prev) => [...prev, newAcc]);

    // For new accounts - the default category should be Food & Drink, Transport, Bills, and Shopping ONLY for Expense. Then, Salary, Allowance, Freelance, Business for Income
    const newCats = createDefaultAccountCategories(newId);
    setCategories((prev) => [...prev, ...newCats]);
    setCategoriesInitialAccountId(newId);

    if (currentUser?.id) {
      newCats.forEach((cat) => {
        fetch(`/api/db/categories?userId=${encodeURIComponent(currentUser.id)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify(cat),
        }).catch(() => {});
      });
    }
  };

  const handleUpdateAccount = (updatedAcc: Account) => {
    setAccounts((prev) => prev.map((a) => (a.id === updatedAcc.id ? updatedAcc : a)));
  };

  const handleDeleteAccount = (id: string) => {
    const target = accounts.find((a) => a.id === id);
    if (!target || isCashAccount(target)) {
      return; // Cash is permanent and cannot be removed
    }
    if (accounts.length <= 1) return;

    // Retain account name and icon in all past transactions
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.accountId === id) {
          return {
            ...tx,
            accountName: tx.accountName || target.name,
            accountIcon: tx.accountIcon || target.icon,
          };
        }
        return tx;
      })
    );

    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setCategories((prev) => prev.filter((c) => c.accountId !== id));

    // Persist deletion immediately to backend
    const delUrl = `/api/db/accounts/${encodeURIComponent(id)}${
      currentUser?.id ? `?userId=${encodeURIComponent(currentUser.id)}` : ''
    }`;
    fetch(delUrl, {
      method: 'DELETE',
      headers: currentUser?.id ? { 'x-user-id': currentUser.id } : undefined,
    }).catch(() => {});
  };

  const handleTransfer = ({
    fromAccountId,
    toAccountId,
    amount,
    note,
  }: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    note: string;
  }) => {
    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const toAcc = accounts.find((a) => a.id === toAccountId);

    const now = Date.now();
    const today = getTodayDateString();
    const currentTime = getCurrent12HourTime();

    const transferTx: Transaction = {
      id: `tx-transfer-${now}-${Math.random().toString(36).substr(2, 4)}`,
      userId: currentUser?.id,
      type: 'transfer',
      amount,
      currency: settings.defaultCurrency,
      categoryId: '',
      categoryName: undefined,
      categoryIcon: undefined,
      categoryColor: undefined,
      accountId: fromAccountId,
      fromAccountId,
      toAccountId,
      fromAccountName: fromAcc?.name || 'Account 1',
      toAccountName: toAcc?.name || 'Account 2',
      fromAccountIcon: fromAcc?.icon || 'Wallet',
      toAccountIcon: toAcc?.icon || 'Wallet',
      accountName: fromAcc?.name,
      accountIcon: fromAcc?.icon || 'Wallet',
      note: note.trim(),
      date: today,
      time: currentTime,
      timestamp: now,
      createdAt: now,
    };

    setTransactions((prev) => [transferTx, ...prev]);

    if (currentUser?.id) {
      fetch(`/api/db/transactions?userId=${encodeURIComponent(currentUser.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify(transferTx),
      }).catch(() => {});
    }
  };

  const handleAddCurrency = (newCurr: Currency) => {
    setCurrencies((prev) => {
      if (prev.some((c) => c.code === newCurr.code)) return prev;
      return [
        ...prev,
        {
          ...newCurr,
          flag: newCurr.flag || getCurrencyFlag(newCurr.code),
        },
      ];
    });
  };

  const handleUpdateRates = (newRates: Record<string, number>) => {
    setCurrencies((prev) =>
      prev.map((c) => ({
        ...c,
        flag: c.flag || getCurrencyFlag(c.code),
        exchangeRate: newRates[c.code] || c.exchangeRate || 1.0,
      }))
    );
  };

  // Keep currency exchange rates as live as possible on mount, periodically, and when tab becomes active
  useEffect(() => {
    let isMounted = true;
    const updateRates = async () => {
      try {
        const liveRates = await fetchLiveExchangeRates();
        if (liveRates && isMounted) {
          handleUpdateRates(liveRates);
        }
      } catch (err) {
        console.warn('Auto-refresh rates error:', err);
      }
    };

    // Immediate fetch on startup
    updateRates();

    // Auto-refresh every 10 minutes
    const interval = setInterval(updateRates, 10 * 60 * 1000);

    // Refresh when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateRates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleSelectDefaultCurrency = (newCode: string) => {
    const oldCode = settings.defaultCurrency || 'PHP';

    // Build custom rates map
    const ratesMap: Record<string, number> = {};
    currencies.forEach((c) => {
      if (c.exchangeRate) ratesMap[c.code] = c.exchangeRate;
    });

    let updatedTransactions = transactions;
    let updatedDebts = debts;
    let updatedGoals = goals;

    if (newCode !== oldCode) {
      // 1. Convert all transactions
      updatedTransactions = transactions.map((t) => {
        const fromCurr = t.currency || oldCode;
        const converted = convertCurrency(t.amount, fromCurr, newCode, ratesMap);
        return {
          ...t,
          amount: roundToCurrency(converted),
          currency: newCode,
        };
      });
      setTransactions(updatedTransactions);

      // Convert pending undo transaction if any
      if (pendingUndoTx) {
        setPendingUndoTx((prev) =>
          prev
            ? {
                ...prev,
                amount: roundToCurrency(
                  convertCurrency(prev.amount, prev.currency || oldCode, newCode, ratesMap)
                ),
                currency: newCode,
              }
            : null
        );
      }

      // 2. Convert all debts
      updatedDebts = debts.map((d) => {
        const fromCurr = d.currency || oldCode;
        const converted = convertCurrency(d.amount, fromCurr, newCode, ratesMap);
        return {
          ...d,
          amount: roundToCurrency(converted),
          currency: newCode,
        };
      });
      setDebts(updatedDebts);

      // 3. Convert all goals
      updatedGoals = goals.map((g) => {
        const fromCurr = g.currency || oldCode;
        const convertedTarget = convertCurrency(g.targetPrice, fromCurr, newCode, ratesMap);
        const convertedEarmarked = convertCurrency(g.earmarkedAmount, fromCurr, newCode, ratesMap);
        return {
          ...g,
          targetPrice: roundToCurrency(convertedTarget),
          earmarkedAmount: roundToCurrency(convertedEarmarked),
          currency: newCode,
        };
      });
      setGoals(updatedGoals);
    }

    // 4. Update default currency in settings
    const updatedSettings: UserSettings = {
      ...settings,
      defaultCurrency: newCode,
      primaryCurrency: newCode,
    };
    setSettings(updatedSettings);

    // 5. Explicitly associate and persist to active user account
    if (currentUser) {
      const updatedUser: AuthUser = {
        ...currentUser,
        defaultCurrency: newCode,
      };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      } catch {}

      try {
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.SETTINGS_PREFIX, currentUser.id),
          JSON.stringify(updatedSettings)
        );
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.CURRENCIES_PREFIX, currentUser.id),
          JSON.stringify(currencies)
        );
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.TRANSACTIONS_PREFIX, currentUser.id),
          JSON.stringify(updatedTransactions)
        );
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.DEBTS_PREFIX, currentUser.id),
          JSON.stringify(updatedDebts)
        );
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.GOALS_PREFIX, currentUser.id),
          JSON.stringify(updatedGoals)
        );
      } catch {}

      // Update in saved device accounts list
      try {
        const rawAccounts = localStorage.getItem('budget_tracker_saved_accounts_v1');
        if (rawAccounts) {
          const accs = JSON.parse(rawAccounts);
          const updated = accs.map((a: any) => {
            if (a.id === currentUser.id || a.email?.toLowerCase() === currentUser.email?.toLowerCase()) {
              return { ...a, defaultCurrency: newCode };
            }
            return a;
          });
          localStorage.setItem('budget_tracker_saved_accounts_v1', JSON.stringify(updated));
        }
      } catch {}

      // Sync with server
      fetch('/api/db/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          settings: updatedSettings,
          currencies,
          transactions: updatedTransactions.map((t) => ({ ...t, userId: currentUser.id })),
          debts: updatedDebts,
          goals: updatedGoals,
          accounts,
          categories,
          profile: userProfile,
        }),
      }).catch(() => {});
    }

    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    } catch {}
  };

  const handleDeleteCurrency = (code: string) => {
    const remaining = currencies.filter((c) => c.code !== code);
    setCurrencies(remaining);
    if (settings.defaultCurrency === code && remaining.length > 0) {
      handleSelectDefaultCurrency(remaining[0].code);
    }
  };

  // Export PDF Report - Acts directly as a Save As action without opening a modal
  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const options = {
        transactions,
        categories,
        debts,
        goals,
        currentSavings,
        totalIncome,
        totalExpense,
        currencySymbol,
      };
      const { doc, defaultFilename } = buildBudgetPdfDoc(options);
      await exportPdfSaveAs(doc, defaultFilename);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = () => {
    if (currentUser?.id) {
      try {
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.SETTINGS_PREFIX, currentUser.id),
          JSON.stringify(settings)
        );
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.CURRENCIES_PREFIX, currentUser.id),
          JSON.stringify(currencies)
        );
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.TRANSACTIONS_PREFIX, currentUser.id),
          JSON.stringify(transactions)
        );
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.DEBTS_PREFIX, currentUser.id),
          JSON.stringify(debts)
        );
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.GOALS_PREFIX, currentUser.id),
          JSON.stringify(goals)
        );
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.ACCOUNTS_PREFIX, currentUser.id),
          JSON.stringify(accounts)
        );
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.CATEGORIES_PREFIX, currentUser.id),
          JSON.stringify(categories)
        );
      } catch {}
    }
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch {}
    setCurrentUser(null);
    setTransactions([]);
    setSettings(DEFAULT_SETTINGS);
  };

  const handleUpdateAccountSettings = async (data: {
    nickname: string;
    email: string;
    password?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      try {
        const res = await fetch('/api/user/update-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser?.id || '',
          },
          body: JSON.stringify({
            userId: currentUser?.id,
            nickname: data.nickname,
            email: data.email,
            password: data.password,
            avatarUrl: data.avatarUrl,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          if (!res.ok && !json.success && json.error) {
            console.warn('Online sync during profile update:', json.error);
          }
        }
      } catch {
        // Backend offline or running on static hosting
      }

      // Always update on device
      const updatedUser: AuthUser = {
        id: currentUser?.id || 'user-local',
        email: data.email,
        nickname: data.nickname,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : currentUser?.avatarUrl,
        defaultCurrency: currentUser?.defaultCurrency || settings.defaultCurrency || 'PHP',
      };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      } catch {}

      setUserProfile((prev) => ({
        ...prev,
        nickname: data.nickname,
        email: data.email,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : prev.avatarUrl,
      }));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred while updating your settings.' };
    }
  };

  // If user is not signed in or not verified, render the uniform AuthScreen
  if (!currentUser || currentUser.isVerified === false) {
    return (
      <AuthScreen
        onLoginSuccess={(user, profileUpdate) => {
          setCurrentUser(user);
          try {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
          } catch {}
          if (profileUpdate) {
            setUserProfile((prev) => ({
              ...prev,
              nickname: profileUpdate.nickname || prev.nickname,
              avatarUrl: profileUpdate.avatarUrl !== undefined ? profileUpdate.avatarUrl : prev.avatarUrl,
              email: profileUpdate.email || prev.email,
            }));
          }
          loadUserDataForUser(user);
          handleSyncWithDB(user.id);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#18181B] font-sans antialiased">
      {/* Persistent Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentSavings={monthlySavings}
        totalIncome={monthlyIncome}
        totalExpense={monthlyExpense}
        debtsYouOweTotal={totalYouOweUnsettled}
        debtsOwedToYouTotal={totalOwedToYouUnsettled}
        currencySymbol={currencySymbol}
        selectedMonthYearLabel={selectedMonthYearLabel}
        selectedYearMonth={selectedYearMonth}
        onSelectYearMonth={handleSelectYearMonth}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        userProfile={userProfile}
        onUpdateProfile={setUserProfile}
        expenseCount={monthlyTransactions.filter((t) => t.type === 'expense').length}
        incomeCount={monthlyTransactions.filter((t) => t.type === 'income').length}
        debtCount={debtCount}
        dbStatus={dbStatus}
        onSyncWithDB={handleSyncWithDB}
        isSyncing={isSyncing}
        lastSyncedTime={lastSyncedTime}
        currentUser={currentUser}
        onOpenSettings={() => setShowSettingsModal(true)}
        onLogout={() => setShowLogoutConfirm(true)}
        onOpenDonate={() => setShowDonateModal(true)}
        onOpenAccounts={() => setShowAccountsModal(true)}
        onOpenTransfer={() => setShowTransferModal(true)}
        onOpenCurrencies={() => setShowCurrenciesModal(true)}
        onOpenCategories={() => {
          setCategoriesInitialType('expense');
          setCategoriesInitialAccountId(accounts[0]?.id || 'cash');
          setShowCategoriesModal(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Quick Entry Form (Always accessible on Tracker view or as modal everywhere else) */}
        {activeTab === 'tracker' && (
          <QuickEntryForm
            currencies={currencies}
            categories={categories}
            accounts={accounts}
            transactions={transactions}
            selectedCurrency={settings.defaultCurrency}
            onSave={handleSaveTransaction}
            onOpenAddCategory={(type, accId) => {
              setCategoriesInitialType(type);
              if (accId) setCategoriesInitialAccountId(accId);
              setShowCategoriesModal(true);
            }}
            onOpenAddAccount={() => setShowAccountsModal(true)}
            onOpenCurrencyManager={() => setShowCurrenciesModal(true)}
          />
        )}

        {/* Tab Views */}
        {activeTab === 'tracker' && (
          <TrackerView
            transactions={monthlyTransactions}
            allTransactionsCount={transactions.length}
            selectedMonthYearLabel={selectedMonthYearLabel}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            categories={categories}
            currencies={currencies}
            accounts={accounts}
            selectedCurrency={settings.defaultCurrency}
            onDeleteTransaction={handleDeleteTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            pendingUndoTx={pendingUndoTx}
            onUndoDelete={handleUndoDelete}
            undoSecondsLeft={undoSecondsLeft}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryPanel
            transactions={transactions}
            categories={categories}
            currencySymbol={currencySymbol}
          />
        )}

        {activeTab === 'debts' && (
          <DebtTracker
            debts={debts}
            currencies={currencies}
            selectedCurrency={settings.defaultCurrency}
            onAddDebt={handleAddDebt}
            onToggleSettle={handleToggleSettleDebt}
            onDeleteDebt={handleDeleteDebt}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsView
            goals={goals}
            currencies={currencies}
            selectedCurrency={settings.defaultCurrency}
            currentSavings={currentSavings}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
          />
        )}

        {activeTab === 'ai' && (
          <AIAdvisorModal
            transactions={transactions}
            categories={categories}
            debts={debts}
            goals={goals}
            currentSavings={currentSavings}
            totalIncome={totalIncome}
            totalExpenses={totalExpense}
            netDebt={netDebt}
            currencySymbol={currencySymbol}
          />
        )}
      </main>

      {/* Footer Utilities */}
      <footer className="bg-white border-t border-zinc-200 mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-800">Budget Tracker</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="button-export-pdf"
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-700 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-[4px] transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
              title="Save report as PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-zinc-600" />
              <span className="font-medium">{isExporting ? 'Saving...' : 'Export'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Quick Entry Modal (Available from header on any tab) */}
      {showQuickEntryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <QuickEntryForm
            currencies={currencies}
            categories={categories}
            accounts={accounts}
            transactions={transactions}
            selectedCurrency={settings.defaultCurrency}
            onSave={handleSaveTransaction}
            onOpenAddCategory={(type, accId) => {
              setCategoriesInitialType(type);
              if (accId) setCategoriesInitialAccountId(accId);
              setShowCategoriesModal(true);
            }}
            onOpenAddAccount={() => {
              setShowQuickEntryModal(false);
              setShowAccountsModal(true);
            }}
            onOpenCurrencyManager={() => {
              setShowQuickEntryModal(false);
              setShowCurrenciesModal(true);
            }}
            isModal={true}
            onClose={() => setShowQuickEntryModal(false)}
          />
        </div>
      )}

      {/* Accounts & Assets Manager Modal */}
      {showAccountsModal && (
        <AccountManagerModal
          accounts={accounts}
          transactions={transactions}
          currencySymbol={currencySymbol}
          onAddAccount={handleAddAccount}
          onUpdateAccount={handleUpdateAccount}
          onDeleteAccount={handleDeleteAccount}
          onClose={() => setShowAccountsModal(false)}
        />
      )}

      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        accounts={accounts}
        transactions={transactions}
        currencySymbol={currencySymbol}
        defaultCurrency={settings.defaultCurrency}
        onTransfer={handleTransfer}
        onOpenAddAccount={() => setShowAccountsModal(true)}
      />

      {/* Categories Manager Modal */}
      {showCategoriesModal && (
        <CategoryManagerModal
          categories={categories}
          accounts={accounts}
          initialAccountId={categoriesInitialAccountId}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onClose={() => setShowCategoriesModal(false)}
          initialType={categoriesInitialType}
        />
      )}

      {/* Currencies Manager Modal */}
      {showCurrenciesModal && (
        <CurrencyManagerModal
          currencies={currencies}
          selectedCurrency={settings.defaultCurrency}
          onSelectDefaultCurrency={handleSelectDefaultCurrency}
          onAddCurrency={handleAddCurrency}
          onDeleteCurrency={handleDeleteCurrency}
          onUpdateRates={handleUpdateRates}
          onClose={() => setShowCurrenciesModal(false)}
        />
      )}

      {/* Donate Modal */}
      {showDonateModal && (
        <DonateModal
          donateInfo={settings.donateInfo}
          onUpdateDonateInfo={(info) =>
            setSettings((prev) => ({ ...prev, donateInfo: info }))
          }
          onClose={() => setShowDonateModal(false)}
        />
      )}

      {/* Account Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          currentUser={currentUser}
          profile={userProfile}
          onClose={() => setShowSettingsModal(false)}
          onSave={handleUpdateAccountSettings}
        />
      )}

      {/* Logout Confirmation Modal - matching the delete transaction modal design */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-sm w-full shadow-lg space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h4 className="text-sm font-semibold text-zinc-900">Sign out of your account?</h4>
            </div>
            <p className="text-xs text-zinc-600">
              Are you sure you want to log out? You will need to sign in again to access your finances.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 font-medium rounded-[3px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-[3px] transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
