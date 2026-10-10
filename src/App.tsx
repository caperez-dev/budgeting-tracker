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
  createDefaultCategories,
  createDefaultCategoriesForAccount,
} from './data/initialData';
import { Header, ActiveTab } from './components/Header';
import { AuthScreen, AuthScreenMode } from './components/AuthScreen';
import { LandingPage } from './components/LandingPage';
import { QuickEntryForm } from './components/QuickEntryForm';
import { TrackerView } from './components/TrackerView';
import { SummaryPanel } from './components/SummaryPanel';
import { DebtTracker } from './components/DebtTracker';
import { GoalsView } from './components/GoalsView';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { CurrencyManagerModal } from './components/CurrencyManagerModal';
import { AccountManagerModal } from './components/AccountManagerModal';
import { TransferModal } from './components/TransferModal';
import { SettingsPage } from './components/SettingsPage';
import { PinLockScreen } from './components/PinLockScreen';
import { Particles } from './components/ui/particles';
import { ClickSpark } from './components/ui/ClickSpark';
import { ModalPortal } from './components/ui/ModalPortal';
import { FileDown, Plus, AlertCircle } from 'lucide-react';
import { buildBudgetPdfDoc, exportPdfSaveAs } from './utils/pdfExport';
import {
  getCurrent12HourTime,
  getTodayDateString,
  consolidateTransactions,
  calculateTimestamp,
} from './utils/formatters';
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

export const sortAccountsByOrder = (accList: Account[]): Account[] => {
  if (!Array.isArray(accList) || accList.length === 0) return DEFAULT_ACCOUNTS;
  const cashAcc = accList.find(isCashAccount);
  const seenIds = new Set<string>();
  if (cashAcc) {
    seenIds.add(cashAcc.id);
    seenIds.add('cash');
  }

  const otherAccs: Account[] = [];
  for (const a of accList) {
    if (!a || !a.id || isCashAccount(a)) continue;
    if (!seenIds.has(a.id)) {
      seenIds.add(a.id);
      otherAccs.push(a);
    }
  }

  otherAccs.sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : 9999;
    const orderB = typeof b.order === 'number' ? b.order : 9999;
    return orderA - orderB;
  });

  const finalCash: Account = cashAcc
    ? { ...cashAcc, order: 0 }
    : {
        id: 'cash',
        name: 'Cash',
        type: 'cash' as const,
        color: '#16A34A',
        icon: 'Banknote',
        order: 0,
        isDefault: otherAccs.every((a) => !a.isDefault),
        initialBalance: 0,
      };

  return [finalCash, ...otherAccs.map((a, idx) => ({ ...a, order: idx + 1 }))];
};

export const ensureCashAccount = (accList: Account[]): Account[] => {
  if (!Array.isArray(accList) || accList.length === 0) {
    return DEFAULT_ACCOUNTS.map((a, idx) => ({ ...a, order: idx }));
  }
  const cashAcc = accList.find(isCashAccount);
  const seenIds = new Set<string>();
  if (cashAcc) {
    seenIds.add(cashAcc.id);
    seenIds.add('cash');
  }

  const otherAccs: Account[] = [];
  for (const a of accList) {
    if (!a || !a.id || isCashAccount(a)) continue;
    if (!seenIds.has(a.id)) {
      seenIds.add(a.id);
      otherAccs.push(a);
    }
  }

  const finalCash: Account = cashAcc
    ? { ...cashAcc, order: 0 }
    : {
        id: 'cash',
        name: 'Cash',
        type: 'cash' as const,
        color: '#16A34A',
        icon: 'Banknote',
        order: 0,
        isDefault: otherAccs.every((a) => !a.isDefault),
        initialBalance: 0,
      };

  return [finalCash, ...otherAccs.map((a, idx) => ({ ...a, order: idx + 1 }))];
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
  ACTIVE_TAB_PREFIX: 'budget_tracker_active_tab_v2',
  SELECTED_YEAR_MONTH_PREFIX: 'budget_tracker_selected_year_month_v2',
  SELECTED_DATE_PREFIX: 'budget_tracker_selected_date_v2',
  AUTH_VIEW: 'budget_tracker_auth_view_v1',
  AUTH_INITIAL_MODE: 'budget_tracker_auth_initial_mode_v1',
};

const getUserStorageKey = (prefix: string, userId?: string | null) => {
  return userId ? `${prefix}_${userId}` : `${prefix}_guest`;
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
      if (user && (user.id?.startsWith('google_') || user.googleId || user.googleEmail)) {
        user.authProvider = user.authProvider || 'google';
        user.googleId = user.googleId || (user.id?.startsWith('google_') ? user.id.replace('google_', '') : user.id);
        user.googleEmail = user.googleEmail || user.email;
      }
      return user;
    } catch {
      return null;
    }
  });

  // PIN lock state: locked whenever app/tab is opened fresh (sessionStorage does not have unlocked flag)
  const [isPinLocked, setIsPinLocked] = useState<boolean>(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!savedUser) return false;
      const user = JSON.parse(savedUser);
      if (!user || user.isVerified === false) return false;
      // If session is already unlocked in this tab session, do not lock
      const sessionUnlocked = sessionStorage.getItem(`wallo_session_unlocked_${user.id}`);
      return sessionUnlocked !== 'true';
    } catch {
      return false;
    }
  });

  const [authView, setAuthView] = useState<'landing' | 'auth'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH_VIEW);
      if (saved === 'auth' || saved === 'landing') return saved;
    } catch {}
    return 'landing';
  });

  const [authInitialMode, setAuthInitialMode] = useState<AuthScreenMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH_INITIAL_MODE);
      if (saved === 'login' || saved === 'register' || saved === 'reset_request') {
        return saved as AuthScreenMode;
      }
    } catch {}
    return 'login';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_VIEW, authView);
    } catch {}
  }, [authView]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_INITIAL_MODE, authInitialMode);
    } catch {}
  }, [authInitialMode]);

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
          hasPin: parsed.user.hasPin ?? Boolean(parsed.user.pinCode),
          pinCode: parsed.user.pinCode || null,
          googleId: parsed.user.googleId || null,
          googleEmail: parsed.user.googleEmail || null,
          authProvider: parsed.user.authProvider || 'google',
          hasPassword: parsed.user.hasPassword ?? false,
        };

        setCurrentUser(user);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        // Mark session unlocked on explicit Google login
        sessionStorage.setItem(`wallo_session_unlocked_${user.id}`, 'true');
        setIsPinLocked(false);
        localStorage.removeItem('budget_tracker_google_auth');
      }
    } catch {
      localStorage.removeItem('budget_tracker_google_auth');
    }
  }, []);

  // Synchronize PIN status with database whenever currentUser is present
  useEffect(() => {
    if (!currentUser?.id && !currentUser?.email) return;

    let isMounted = true;
    const syncPinWithServer = async () => {
      try {
        const params = new URLSearchParams();
        if (currentUser.id) params.append('userId', currentUser.id);
        if (currentUser.email) params.append('email', currentUser.email);
        const res = await fetch(`/api/user/pin-status?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !data.success) return;

        const localPin = localStorage.getItem(`wallo_local_pin_${currentUser.id}`);

        if (data.hasPin) {
          // Server has PIN
          if (!currentUser.hasPin || currentUser.pinCode !== data.pinCode) {
            const updated: AuthUser = {
              ...currentUser,
              hasPin: true,
              pinCode: data.pinCode || currentUser.pinCode || null,
            };
            setCurrentUser(updated);
            try {
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
              if (data.pinCode) {
                localStorage.setItem(`wallo_local_pin_${currentUser.id}`, data.pinCode);
              }
            } catch {}
          }
        } else if (localPin && /^\d{4}$/.test(localPin.trim())) {
          // Device has a local PIN from previous session but server has none: sync to database!
          const saveRes = await fetch('/api/user/set-pin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentUser.id,
            },
            body: JSON.stringify({
              userId: currentUser.id,
              email: currentUser.email,
              pin: localPin.trim(),
            }),
          });
          if (saveRes.ok && isMounted) {
            const updated: AuthUser = {
              ...currentUser,
              hasPin: true,
              pinCode: localPin.trim(),
            };
            setCurrentUser(updated);
            try {
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
            } catch {}
          }
        }
      } catch (err) {
        console.error('Failed to sync PIN with server:', err);
      }
    };

    syncPinWithServer();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, currentUser?.email]);

  // Remove any legacy transaction history or tracker filter persistence from localStorage
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('budget_tracker_transactions') ||
            k.startsWith('budget_tracker_filter') ||
            k.startsWith('budget_tracker_search'))
        ) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }, []);

  // Helpers to ensure underlying financial data preserves original values and recovers from corrupted state
  const ensureTxOriginals = (tx: Transaction): Transaction => {
    const rawAmt = tx.originalAmount !== undefined ? tx.originalAmount : tx.amount;
    const origAmt = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt)) || 0;
    const origCurr = tx.originalCurrency || tx.currency || 'PHP';
    const validTimestamp =
      typeof tx.timestamp === 'number' && !isNaN(tx.timestamp)
        ? tx.timestamp
        : calculateTimestamp(tx.date, tx.time);
    return {
      ...tx,
      amount: origAmt,
      currency: origCurr,
      originalAmount: origAmt,
      originalCurrency: origCurr,
      timestamp: validTimestamp,
    };
  };

  const ensureDebtOriginals = (d: Debt): Debt => {
    const rawAmt = d.originalAmount !== undefined ? d.originalAmount : d.amount;
    const origAmt = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt)) || 0;
    const origCurr = d.originalCurrency || d.currency || 'PHP';
    return {
      ...d,
      amount: origAmt,
      currency: origCurr,
      originalAmount: origAmt,
      originalCurrency: origCurr,
    };
  };

  const ensureGoalOriginals = (g: Goal): Goal => {
    const rawTarget = g.originalTargetPrice !== undefined ? g.originalTargetPrice : g.targetPrice;
    const origTarget = typeof rawTarget === 'number' ? rawTarget : parseFloat(String(rawTarget)) || 0;
    const rawEarmarked = g.originalEarmarkedAmount !== undefined ? g.originalEarmarkedAmount : (g.earmarkedAmount || 0);
    const origEarmarked = typeof rawEarmarked === 'number' ? rawEarmarked : parseFloat(String(rawEarmarked)) || 0;
    const origCurr = g.originalCurrency || g.currency || 'PHP';
    return {
      ...g,
      targetPrice: origTarget,
      earmarkedAmount: origEarmarked,
      currency: origCurr,
      originalTargetPrice: origTarget,
      originalEarmarkedAmount: origEarmarked,
      originalCurrency: origCurr,
    };
  };

  const ensureAccountOriginals = (a: Account): Account => {
    const rawBal = a.originalInitialBalance !== undefined ? a.originalInitialBalance : (a.initialBalance || 0);
    const origBal = typeof rawBal === 'number' ? rawBal : parseFloat(String(rawBal)) || 0;
    const origCurr = a.originalCurrency || a.currency || 'PHP';
    return {
      ...a,
      initialBalance: origBal,
      currency: origCurr,
      originalInitialBalance: origBal,
      originalCurrency: origCurr,
    };
  };

  // Transactions are maintained in memory and directly synced with the database (no localStorage persistence on tracker navigation)
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      // Purge deprecated shared categories key
      localStorage.removeItem(STORAGE_KEYS.CATEGORIES);

      const user = (() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })();
      if (user?.id) {
        const saved = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.CATEGORIES_PREFIX, user.id));
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const seen = new Set<string>();
            const cleaned: Category[] = [];
            for (const c of parsed) {
              const key = `${(c.name || '').toLowerCase().trim()}_${c.type}`;
              if (!seen.has(key)) {
                seen.add(key);
                const { accountId, ...rest } = c;
                cleaned.push(rest);
              }
            }
            if (!cleaned.some((c) => c.type === 'income' && c.name.toLowerCase() === 'cash in')) {
              const cashInDef = DEFAULT_CATEGORIES.find((c) => c.id === 'cat-cash-in');
              if (cashInDef) cleaned.push({ ...cashInDef });
            }
            cleaned.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            if (cleaned.length > 0) return cleaned;
          }
        }
      }
      return createDefaultCategories();
    } catch {
      return createDefaultCategories();
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
          return ensureCashAccount(parsed).map(ensureAccountOriginals);
        }
      }
      return DEFAULT_ACCOUNTS.map(ensureAccountOriginals);
    } catch {
      return DEFAULT_ACCOUNTS.map(ensureAccountOriginals);
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
      return saved ? (JSON.parse(saved) as Debt[]).map(ensureDebtOriginals) : SEED_DEBTS.map(ensureDebtOriginals);
    } catch {
      return SEED_DEBTS.map(ensureDebtOriginals);
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
      return saved ? (JSON.parse(saved) as Goal[]).map(ensureGoalOriginals) : SEED_GOALS.map(ensureGoalOriginals);
    } catch {
      return SEED_GOALS.map(ensureGoalOriginals);
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
      if (currentUser?.id) {
        const perUserProfileKey = getUserStorageKey(STORAGE_KEYS.USER_PROFILE_PREFIX, currentUser.id);
        const saved = localStorage.getItem(perUserProfileKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            nickname: parsed.nickname || currentUser.nickname || 'User',
            email: currentUser.email || parsed.email || '',
            avatarUrl:
              parsed.avatarUrl !== undefined
                ? parsed.avatarUrl
                : currentUser.avatarUrl || '',
          };
        }
        return {
          nickname: currentUser.nickname || 'User',
          email: currentUser.email || '',
          avatarUrl: currentUser.avatarUrl || '',
        };
      }
      return DEFAULT_USER_PROFILE;
    } catch {
      return DEFAULT_USER_PROFILE;
    }
  });

  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      const userId = savedUser ? JSON.parse(savedUser)?.id : null;
      const key = getUserStorageKey(STORAGE_KEYS.ACTIVE_TAB_PREFIX, userId);
      const savedTab = localStorage.getItem(key);
      const validTabs: ActiveTab[] = ['tracker', 'summary', 'debts', 'goals', 'settings'];
      if (savedTab && validTabs.includes(savedTab as ActiveTab)) {
        return savedTab as ActiveTab;
      }
    } catch {}
    return 'tracker';
  });

  useEffect(() => {
    try {
      const key = getUserStorageKey(STORAGE_KEYS.ACTIVE_TAB_PREFIX, currentUser?.id);
      localStorage.setItem(key, activeTab);
    } catch {}
  }, [activeTab, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      try {
        const key = getUserStorageKey(STORAGE_KEYS.ACTIVE_TAB_PREFIX, currentUser.id);
        const savedTab = localStorage.getItem(key);
        const validTabs: ActiveTab[] = ['tracker', 'summary', 'debts', 'goals', 'settings'];
        if (savedTab && validTabs.includes(savedTab as ActiveTab)) {
          setActiveTab(savedTab as ActiveTab);
        }
      } catch {}
    }
  }, [currentUser?.id]);

  // --- Modals State ---
  const [showQuickEntryModal, setShowQuickEntryModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [categoriesInitialType, setCategoriesInitialType] = useState<TransactionType>('expense');
  const [categoriesInitialAdd, setCategoriesInitialAdd] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [accountsInitialAdd, setAccountsInitialAdd] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCurrenciesModal, setShowCurrenciesModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // --- Online Storage State & Sync ---
  const [dbStatus, setDbStatus] = useState<DBStatus>({
    configured: false,
    hasPlaceholder: false,
    connected: false,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef<boolean>(false);
  const lastSyncedTimeRef = useRef<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const hasInitialSyncCompletedRef = useRef<boolean>(false);

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

    // 3. Transactions: strictly loaded from cloud database, no localStorage persistence
    try {
      const txKey = getUserStorageKey(STORAGE_KEYS.TRANSACTIONS_PREFIX, user.id);
      localStorage.removeItem(txKey);
    } catch {}

    // 4. Debts
    try {
      const debtKey = getUserStorageKey(STORAGE_KEYS.DEBTS_PREFIX, user.id);
      const savedDebts = localStorage.getItem(debtKey);
      if (savedDebts) setDebts((JSON.parse(savedDebts) as Debt[]).map(ensureDebtOriginals));
    } catch {}

    // 5. Goals
    try {
      const goalKey = getUserStorageKey(STORAGE_KEYS.GOALS_PREFIX, user.id);
      const savedGoals = localStorage.getItem(goalKey);
      if (savedGoals) setGoals((JSON.parse(savedGoals) as Goal[]).map(ensureGoalOriginals));
    } catch {}

    // 6. Accounts
    try {
      const accKey = getUserStorageKey(STORAGE_KEYS.ACCOUNTS_PREFIX, user.id);
      const savedAccs = localStorage.getItem(accKey);
      if (savedAccs) {
        setAccounts(ensureCashAccount(JSON.parse(savedAccs)).map(ensureAccountOriginals));
      } else {
        setAccounts(DEFAULT_ACCOUNTS.map(ensureAccountOriginals));
      }
    } catch {
      setAccounts(DEFAULT_ACCOUNTS.map(ensureAccountOriginals));
    }

    // 7. Categories
    try {
      const catKey = getUserStorageKey(STORAGE_KEYS.CATEGORIES_PREFIX, user.id);
      const savedCats = localStorage.getItem(catKey);
      if (savedCats) {
        const parsed = JSON.parse(savedCats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          const cleaned: Category[] = [];
          for (const c of parsed) {
            const key = `${(c.name || '').toLowerCase().trim()}_${c.type}`;
            if (!seen.has(key)) {
              seen.add(key);
              const { accountId, ...rest } = c;
              cleaned.push(rest);
            }
          }
          if (!cleaned.some((c) => c.type === 'income' && c.name.toLowerCase() === 'cash in')) {
            const cashInDef = DEFAULT_CATEGORIES.find((c) => c.id === 'cat-cash-in');
            if (cashInDef) cleaned.push({ ...cashInDef });
          }
          cleaned.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setCategories(cleaned.length > 0 ? cleaned : createDefaultCategories());
        } else {
          setCategories(createDefaultCategories());
        }
      } else {
        setCategories(createDefaultCategories());
      }
    } catch {
      setCategories(createDefaultCategories());
    }

    // 8. User Profile (avatar, nickname, email)
    try {
      const perUserProfileKey = getUserStorageKey(STORAGE_KEYS.USER_PROFILE_PREFIX, user.id);
      const savedProfileRaw = localStorage.getItem(perUserProfileKey);
      if (savedProfileRaw) {
        const parsed = JSON.parse(savedProfileRaw);
        setUserProfile({
          nickname: parsed.nickname || user.nickname || 'User',
          email: user.email, // Always enforce the logged-in user's email
          avatarUrl:
            parsed.avatarUrl !== undefined
              ? parsed.avatarUrl
              : user.avatarUrl || '',
        });
      } else {
        // Fall back to currentUser's values
        setUserProfile({
          nickname: user.nickname || 'User',
          email: user.email,
          avatarUrl: user.avatarUrl || '',
        });
      }
    } catch {
      setUserProfile({
        nickname: user.nickname || 'User',
        email: user.email,
        avatarUrl: user.avatarUrl || '',
      });
    }
  };

  const handleSyncWithDB = async (targetUserId?: string) => {
    const uid = targetUserId || currentUser?.id;
    if (!uid) return;
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      // Direct, non-cached fetch to ensure fresh server records are received across devices
      const res = await fetch(`/api/db/sync?userId=${encodeURIComponent(uid)}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'x-user-id': uid,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      if (res.ok) {
        setDbStatus({
          configured: true,
          hasPlaceholder: false,
          connected: true,
          readyState: 1,
          error: null,
        });
        const json = await res.json();
        if (json.success && json.data) {
          if (Array.isArray(json.data.transactions)) {
            const consolidated = consolidateTransactions(json.data.transactions, json.data.accounts || accounts).map(ensureTxOriginals);
            setTransactions(consolidated);
            try {
              localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.TRANSACTIONS_PREFIX, uid));
            } catch {}
          }
          if (Array.isArray(json.data.categories) && json.data.categories.length > 0) {
            const seen = new Set<string>();
            const cleaned: Category[] = [];
            for (const c of json.data.categories) {
              const key = `${(c.name || '').toLowerCase().trim()}_${c.type}`;
              if (!seen.has(key)) {
                seen.add(key);
                const { accountId, ...rest } = c;
                cleaned.push(rest);
              }
            }
            if (!cleaned.some((c) => c.type === 'income' && c.name.toLowerCase() === 'cash in')) {
              const cashInDef = DEFAULT_CATEGORIES.find((c) => c.id === 'cat-cash-in');
              if (cashInDef) cleaned.push({ ...cashInDef });
            }
            cleaned.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            const finalCats = cleaned.length > 0 ? cleaned : createDefaultCategories();
            setCategories(finalCats);
            try {
              localStorage.setItem(
                getUserStorageKey(STORAGE_KEYS.CATEGORIES_PREFIX, uid),
                JSON.stringify(finalCats)
              );
            } catch {}
          } else {
            const defaultCats = createDefaultCategories();
            setCategories(defaultCats);
            try {
              localStorage.setItem(
                getUserStorageKey(STORAGE_KEYS.CATEGORIES_PREFIX, uid),
                JSON.stringify(defaultCats)
              );
            } catch {}
          }
          if (Array.isArray(json.data.debts)) {
            const normalizedDebts = (json.data.debts as Debt[]).map(ensureDebtOriginals);
            setDebts(normalizedDebts);
            try {
              localStorage.setItem(
                getUserStorageKey(STORAGE_KEYS.DEBTS_PREFIX, uid),
                JSON.stringify(normalizedDebts)
              );
            } catch {}
          }
          if (Array.isArray(json.data.goals)) {
            const normalizedGoals = (json.data.goals as Goal[]).map(ensureGoalOriginals);
            setGoals(normalizedGoals);
            try {
              localStorage.setItem(
                getUserStorageKey(STORAGE_KEYS.GOALS_PREFIX, uid),
                JSON.stringify(normalizedGoals)
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
            const safeAccs = ensureCashAccount(json.data.accounts).map(ensureAccountOriginals);
            setAccounts(safeAccs);
            try {
              localStorage.setItem(
                getUserStorageKey(STORAGE_KEYS.ACCOUNTS_PREFIX, uid),
                JSON.stringify(safeAccs)
              );
            } catch {}
          }
          if (json.data.profile) {
            // Ensure profile is scoped to current user and matches their authenticated email
            const profileEmail = json.data.profile.email;
            const isMatch =
              !currentUser?.email ||
              !profileEmail ||
              profileEmail.toLowerCase() === currentUser.email.toLowerCase();

            if (isMatch) {
              const safeProfile: UserProfile = {
                nickname: json.data.profile.nickname || currentUser?.nickname || 'User',
                email: currentUser?.email || profileEmail,
                avatarUrl:
                  json.data.profile.avatarUrl !== undefined
                    ? json.data.profile.avatarUrl
                    : currentUser?.avatarUrl || '',
              };
              setUserProfile(safeProfile);
              try {
                localStorage.setItem(
                  getUserStorageKey(STORAGE_KEYS.USER_PROFILE_PREFIX, uid),
                  JSON.stringify(safeProfile)
                );
              } catch {}

              // Keep currentUser avatar and nickname in sync across device
              setCurrentUser((prev) => {
                if (!prev) return prev;
                if (prev.avatarUrl === safeProfile.avatarUrl && prev.nickname === safeProfile.nickname) {
                  return prev;
                }
                const updatedUser: AuthUser = {
                  ...prev,
                  avatarUrl: safeProfile.avatarUrl,
                  nickname: safeProfile.nickname,
                };
                try {
                  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
                } catch {}
                return updatedUser;
              });
            }
          }
          if (json.data.user) {
            setCurrentUser((prev) => {
              if (!prev) return prev;
              const merged: AuthUser = {
                ...prev,
                ...json.data.user,
              };
              try {
                localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(merged));
              } catch {}
              return merged;
            });
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
      isSyncingRef.current = false;
      setIsSyncing(false);
      hasInitialSyncCompletedRef.current = true;
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

  // Background sync for user settings, categories, currencies, accounts, debts, and goals
  const isFirstSyncRender = useRef(true);
  useEffect(() => {
    if (isFirstSyncRender.current) {
      isFirstSyncRender.current = false;
      return;
    }
    // Prevent uninitialized client state from overwriting cloud database before first fetch completes!
    if (!hasInitialSyncCompletedRef.current) return;
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
          categories,
          currencies,
          accounts,
          debts,
          goals,
          settings,
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
  }, [categories, currencies, accounts, debts, goals, settings, dbStatus.connected, currentUser?.id]);

  // Real-Time Cross-Device Synchronization via Server-Sent Events (SSE)
  useEffect(() => {
    if (!currentUser?.id) return;
    const uid = currentUser.id;
    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isDisposed = false;

    const connectSSE = () => {
      if (isDisposed) return;
      try {
        eventSource = new EventSource(`/api/db/events?userId=${encodeURIComponent(uid)}`);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'transaction_saved' && data.transaction) {
              const tx = ensureTxOriginals(data.transaction);
              setTransactions((prev) => {
                if (prev.some((t) => t.id === tx.id)) {
                  return prev.map((t) => (t.id === tx.id ? tx : t));
                }
                return [tx, ...prev];
              });
            } else if (data.type === 'transaction_updated' && data.transaction) {
              const tx = ensureTxOriginals(data.transaction);
              setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
            } else if (data.type === 'transaction_deleted' && data.id) {
              setTransactions((prev) => prev.filter((t) => t.id !== data.id));
            } else if (data.type === 'sync_updated') {
              handleSyncWithDB(uid);
            } else if (data.type === 'profile_updated' && data.profile) {
              const updated = data.profile;
              const nextAvatar = updated.avatarUrl !== undefined ? updated.avatarUrl : '';
              const nextNickname = updated.nickname || 'User';
              const nextEmail = updated.email || '';

              const safeProfile: UserProfile = {
                nickname: nextNickname,
                email: nextEmail,
                avatarUrl: nextAvatar,
              };
              setUserProfile(safeProfile);

              setCurrentUser((prev) => {
                if (!prev) return prev;
                const updatedUser: AuthUser = {
                  ...prev,
                  nickname: nextNickname || prev.nickname,
                  email: nextEmail || prev.email,
                  avatarUrl: nextAvatar,
                };
                try {
                  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
                } catch {}
                return updatedUser;
              });

              try {
                localStorage.setItem(
                  getUserStorageKey(STORAGE_KEYS.USER_PROFILE_PREFIX, uid),
                  JSON.stringify(safeProfile)
                );
              } catch {}
            }
          } catch {}
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!isDisposed) {
            reconnectTimer = setTimeout(connectSSE, 2500);
          }
        };
      } catch {}
    };

    connectSSE();

    return () => {
      isDisposed = true;
      if (eventSource) eventSource.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [currentUser?.id]);

  // Tab visibility synchronization: refresh when tab gains focus
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser?.id && !isSyncingRef.current) {
        handleSyncWithDB(currentUser.id);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [currentUser?.id]);

  // Purge any legacy localStorage transaction cache so tracker state is purely cloud-synced
  useEffect(() => {
    try {
      const userKey = getUserStorageKey(STORAGE_KEYS.TRANSACTIONS_PREFIX, currentUser?.id);
      localStorage.removeItem(userKey);
    } catch {}
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      try {
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.CATEGORIES_PREFIX, currentUser.id),
          JSON.stringify(categories)
        );
      } catch {}
    }
  }, [categories, currentUser?.id]);

  // Ensure categories are clean, deduplicated, and contain default 'Cash In'
  useEffect(() => {
    setCategories((prev) => {
      let changed = false;
      const seen = new Set<string>();
      const cleaned: Category[] = [];
      for (const c of prev) {
        const key = `${(c.name || '').toLowerCase().trim()}_${c.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          const { accountId, ...rest } = c as any;
          if (accountId) changed = true;
          cleaned.push(rest);
        } else {
          changed = true; // Dropped duplicate
        }
      }
      const hasCashIn = cleaned.some(
        (c) => c.type === 'income' && c.name.toLowerCase() === 'cash in'
      );
      if (!hasCashIn) {
        const cashInDef = DEFAULT_CATEGORIES.find((c) => c.id === 'cat-cash-in') || {
          id: 'cat-cash-in',
          name: 'Cash In',
          type: 'income',
          color: '#0D9488',
          icon: 'Banknote',
          isDefault: true,
        };
        cleaned.push({ ...cashInDef });
        changed = true;
      }
      if (!changed) return prev;
      return cleaned;
    });
  }, [accounts]);

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
    } else {
      try {
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));
      } catch {}
    }
  }, [userProfile, currentUser?.id]);

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
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      const userId = savedUser ? JSON.parse(savedUser)?.id : null;
      const key = getUserStorageKey(STORAGE_KEYS.SELECTED_YEAR_MONTH_PREFIX, userId);
      const savedYM = localStorage.getItem(key);
      if (savedYM && /^\d{4}-\d{2}$/.test(savedYM)) {
        return savedYM;
      }
    } catch {}
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`; // e.g. "2026-10"
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    try {
      const key = getUserStorageKey(STORAGE_KEYS.SELECTED_YEAR_MONTH_PREFIX, currentUser?.id);
      localStorage.setItem(key, selectedYearMonth);
    } catch {}
  }, [selectedYearMonth, currentUser?.id]);

  useEffect(() => {
    try {
      const key = getUserStorageKey(STORAGE_KEYS.SELECTED_DATE_PREFIX, currentUser?.id);
      if (selectedDate) {
        localStorage.setItem(key, selectedDate);
      } else {
        localStorage.removeItem(key);
      }
    } catch {}
  }, [selectedDate, currentUser?.id]);

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

  // Custom exchange rates map
  const ratesMap: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    currencies.forEach((c) => {
      if (c.exchangeRate) map[c.code] = c.exchangeRate;
    });
    return map;
  }, [currencies]);

  // Dynamic converted views for the currently selected display currency (WITHOUT mutating stored data)
  const displayTransactions: Transaction[] = useMemo(() => {
    const targetCurr = settings.defaultCurrency || 'PHP';
    return transactions.map((t) => {
      const origAmt = t.originalAmount !== undefined ? t.originalAmount : t.amount;
      const origCurr = t.originalCurrency || t.currency || targetCurr;
      const convertedAmt =
        origCurr === targetCurr
          ? origAmt
          : roundToCurrency(convertCurrency(origAmt, origCurr, targetCurr, ratesMap));

      return {
        ...t,
        amount: convertedAmt,
        currency: targetCurr,
        originalAmount: origAmt,
        originalCurrency: origCurr,
      };
    });
  }, [transactions, settings.defaultCurrency, ratesMap]);

  const displayDebts: Debt[] = useMemo(() => {
    const targetCurr = settings.defaultCurrency || 'PHP';
    return debts.map((d) => {
      const origAmt = d.originalAmount !== undefined ? d.originalAmount : d.amount;
      const origCurr = d.originalCurrency || d.currency || targetCurr;
      const convertedAmt =
        origCurr === targetCurr
          ? origAmt
          : roundToCurrency(convertCurrency(origAmt, origCurr, targetCurr, ratesMap));

      return {
        ...d,
        amount: convertedAmt,
        currency: targetCurr,
        originalAmount: origAmt,
        originalCurrency: origCurr,
      };
    });
  }, [debts, settings.defaultCurrency, ratesMap]);

  const displayGoals: Goal[] = useMemo(() => {
    const targetCurr = settings.defaultCurrency || 'PHP';
    return goals.map((g) => {
      const origTarget = g.originalTargetPrice !== undefined ? g.originalTargetPrice : g.targetPrice;
      const origEarmarked = g.originalEarmarkedAmount !== undefined ? g.originalEarmarkedAmount : g.earmarkedAmount;
      const origCurr = g.originalCurrency || g.currency || targetCurr;
      const convertedTarget =
        origCurr === targetCurr
          ? origTarget
          : roundToCurrency(convertCurrency(origTarget, origCurr, targetCurr, ratesMap));
      const convertedEarmarked =
        origCurr === targetCurr
          ? origEarmarked
          : roundToCurrency(convertCurrency(origEarmarked, origCurr, targetCurr, ratesMap));

      return {
        ...g,
        targetPrice: convertedTarget,
        earmarkedAmount: convertedEarmarked,
        currency: targetCurr,
        originalTargetPrice: origTarget,
        originalEarmarkedAmount: origEarmarked,
        originalCurrency: origCurr,
      };
    });
  }, [goals, settings.defaultCurrency, ratesMap]);

  const displayAccounts: Account[] = useMemo(() => {
    const targetCurr = settings.defaultCurrency || 'PHP';
    const cleanedAccounts = ensureCashAccount(accounts);
    return cleanedAccounts.map((acc) => {
      const origBal = acc.originalInitialBalance !== undefined ? acc.originalInitialBalance : (acc.initialBalance || 0);
      const accCurr = acc.originalCurrency || acc.currency || targetCurr;
      const convertedBal =
        accCurr === targetCurr
          ? origBal
          : roundToCurrency(convertCurrency(origBal, accCurr, targetCurr, ratesMap));

      return {
        ...acc,
        initialBalance: convertedBal,
        currency: targetCurr,
        originalInitialBalance: origBal,
        originalCurrency: accCurr,
      };
    });
  }, [accounts, settings.defaultCurrency, ratesMap]);

  // Self-heal accounts if any duplicate cash or duplicate IDs ever exist in state
  useEffect(() => {
    if (Array.isArray(accounts) && accounts.length > 0) {
      const cleaned = ensureCashAccount(accounts);
      if (cleaned.length !== accounts.length || accounts.filter(isCashAccount).length > 1) {
        setAccounts(cleaned);
        if (currentUser?.id) {
          try {
            localStorage.setItem(
              getUserStorageKey(STORAGE_KEYS.ACCOUNTS_PREFIX, currentUser.id),
              JSON.stringify(cleaned)
            );
          } catch {}
          fetch('/api/db/accounts/reorder', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentUser.id,
            },
            body: JSON.stringify({
              userId: currentUser.id,
              accounts: cleaned,
            }),
          }).catch(() => {});
        }
      }
    }
  }, [accounts, currentUser?.id]);

  // Monthly filtered transactions for the selected month or specific date
  const monthlyTransactions = useMemo(() => {
    if (selectedDate) {
      return displayTransactions.filter((t) => t.date === selectedDate);
    }
    return displayTransactions.filter((t) => t.date.startsWith(selectedYearMonth));
  }, [displayTransactions, selectedYearMonth, selectedDate]);

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
  const totalIncome = useMemo(() => {
    return displayTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [displayTransactions]);

  const totalExpense = useMemo(() => {
    return displayTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [displayTransactions]);

  const expenseCount = displayTransactions.filter((t) => t.type === 'expense').length;
  const incomeCount = displayTransactions.filter((t) => t.type === 'income').length;
  const debtCount = displayDebts.filter((d) => !d.settled).length;

  // Current Savings = Total Income minus Total Expenses as mandated by §7
  const currentSavings = totalIncome - totalExpense;

  // Debts Net Calculation
  const totalYouOweUnsettled = useMemo(() => {
    return displayDebts
      .filter((d) => d.type === 'owe' && !d.settled)
      .reduce((sum, d) => sum + d.amount, 0);
  }, [displayDebts]);

  const totalOwedToYouUnsettled = useMemo(() => {
    return displayDebts
      .filter((d) => d.type === 'owed' && !d.settled)
      .reduce((sum, d) => sum + d.amount, 0);
  }, [displayDebts]);

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
    accountId?: string;
    note: string;
    date: string;
    time: string;
  }) => {
    const txCurrency = newTxData.currency || settings.defaultCurrency || 'PHP';

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

    const matchedCategory = categories.find((c) => c.id === newTxData.categoryId);
    const matchedAccount = (newTxData as any).accountId
      ? accounts.find((a) => a.id === (newTxData as any).accountId)
      : undefined;

    const newTx: Transaction = {
      ...newTxData,
      amount: newTxData.amount,
      currency: txCurrency,
      originalAmount: newTxData.amount,
      originalCurrency: txCurrency,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      userId: currentUser?.id,
      timestamp: calculateTimestamp(newTxData.date, newTxData.time),
      createdAt: Date.now(),
      categoryName: matchedCategory?.name || (newTxData as any).categoryName || 'Other',
      categoryIcon: matchedCategory?.icon || (newTxData as any).categoryIcon || 'Tag',
      categoryColor: matchedCategory?.color || (newTxData as any).categoryColor || '#52525B',
      accountName: matchedAccount?.name || (newTxData as any).accountName,
      accountIcon: matchedAccount?.icon || (newTxData as any).accountIcon,
    };

    const updatedTransactions = [newTx, ...transactions];
    setTransactions(updatedTransactions);

    // Immediately broadcast and persist transaction to cloud database
    if (currentUser?.id) {
      fetch('/api/db/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          ...newTx,
          userId: currentUser.id,
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
    }

    const txYearMonth = newTxData.date.slice(0, 7);
    if (txYearMonth && txYearMonth !== selectedYearMonth) {
      setSelectedYearMonth(txYearMonth);
    }
    // If a different date filter is currently selected, clear it so the newly saved transaction is visible
    if (selectedDate && selectedDate !== newTxData.date) {
      setSelectedDate(null);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const txToDelete = transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    // If deleting a transfer whose source account no longer exists, add amount back to Cash
    if (txToDelete.type === 'transfer') {
      const fromId = txToDelete.fromAccountId || txToDelete.accountId;
      const fromAccountExists = fromId
        ? accounts.some((a) => a.id === fromId)
        : (txToDelete.fromAccountName ? accounts.some((a) => a.name.toLowerCase() === txToDelete.fromAccountName?.toLowerCase()) : false);

      if (!fromAccountExists) {
        setAccounts((prevAccounts) => {
          const cashAcc = prevAccounts.find(isCashAccount) || prevAccounts[0];
          if (!cashAcc) return prevAccounts;

          const cashCurr = cashAcc.originalCurrency || cashAcc.currency || settings.defaultCurrency || 'PHP';
          const txCurr = txToDelete.originalCurrency || txToDelete.currency || settings.defaultCurrency || 'PHP';
          const amtToAdd =
            txCurr === cashCurr
              ? txToDelete.amount
              : roundToCurrency(convertCurrency(txToDelete.amount, txCurr, cashCurr, ratesMap));

          const updated = prevAccounts.map((a) =>
            a.id === cashAcc.id
              ? {
                  ...a,
                  initialBalance: roundToCurrency((a.initialBalance || 0) + amtToAdd),
                  originalInitialBalance: roundToCurrency(
                    (a.originalInitialBalance !== undefined ? a.originalInitialBalance : (a.initialBalance || 0)) + amtToAdd
                  ),
                }
              : a
          );

          if (currentUser?.id) {
            try {
              localStorage.setItem(
                getUserStorageKey(STORAGE_KEYS.ACCOUNTS_PREFIX, currentUser.id),
                JSON.stringify(updated)
              );
            } catch {}

            fetch(`/api/db/accounts?userId=${encodeURIComponent(currentUser.id)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
              body: JSON.stringify({ userId: currentUser.id, accounts: updated }),
            }).catch(() => {});
          } else {
            try {
              localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
            } catch {}
          }
          return updated;
        });
      }
    }

    // Immediately remove row from local state
    const remainingTransactions = transactions.filter((t) => t.id !== id);
    setTransactions(remainingTransactions);

    // Request deletion on server directly
    if (currentUser?.id) {
      fetch(`/api/db/transactions/${id}?userId=${encodeURIComponent(currentUser.id)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id },
      }).catch(() => {});

      fetch('/api/db/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          isFullReplace: true,
          transactions: remainingTransactions.map((t) => ({ ...t, userId: currentUser.id })),
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
    }
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    let enrichedTx: Transaction;
    if (updatedTx.type === 'transfer') {
      const fromAcc = updatedTx.fromAccountId
        ? accounts.find((a) => a.id === updatedTx.fromAccountId)
        : accounts.find((a) => a.id === updatedTx.accountId);
      const toAcc = updatedTx.toAccountId
        ? accounts.find((a) => a.id === updatedTx.toAccountId)
        : undefined;

      enrichedTx = {
        ...updatedTx,
        amount: updatedTx.amount,
        currency: updatedTx.currency,
        originalAmount: updatedTx.amount,
        originalCurrency: updatedTx.currency,
        fromAccountId: fromAcc?.id || updatedTx.fromAccountId || updatedTx.accountId,
        fromAccountName: fromAcc?.name || updatedTx.fromAccountName || 'Account 1',
        fromAccountIcon: fromAcc?.icon || updatedTx.fromAccountIcon || 'Wallet',
        toAccountId: toAcc?.id || updatedTx.toAccountId,
        toAccountName: toAcc?.name || updatedTx.toAccountName || 'Account 2',
        toAccountIcon: toAcc?.icon || updatedTx.toAccountIcon || 'Wallet',
        accountId: fromAcc?.id || updatedTx.fromAccountId || updatedTx.accountId,
        accountName: fromAcc?.name,
        accountIcon: fromAcc?.icon,
        note: (updatedTx.note || '').trim(),
      };
    } else {
      const cat = categories.find((c) => c.id === updatedTx.categoryId);
      const acc = updatedTx.accountId ? accounts.find((a) => a.id === updatedTx.accountId) : undefined;
      enrichedTx = {
        ...updatedTx,
        amount: updatedTx.amount,
        currency: updatedTx.currency,
        originalAmount: updatedTx.amount,
        originalCurrency: updatedTx.currency,
        categoryName: cat?.name || updatedTx.categoryName || 'Other',
        categoryIcon: cat?.icon || updatedTx.categoryIcon || 'Tag',
        categoryColor: cat?.color || updatedTx.categoryColor || '#52525B',
        accountName: acc?.name || updatedTx.accountName,
        accountIcon: acc?.icon || updatedTx.accountIcon,
      };
    }

    const updatedTransactionsList = transactions.map((t) => (t.id === enrichedTx.id ? enrichedTx : t));
    setTransactions(updatedTransactionsList);

    // Immediately broadcast and update transaction in cloud database
    if (currentUser?.id) {
      fetch(`/api/db/transactions/${encodeURIComponent(enrichedTx.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          ...enrichedTx,
          userId: currentUser.id,
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
    }
  };

  // --- Handlers: Debts ---
  const handleAddDebt = (debtData: Omit<Debt, 'id' | 'createdAt' | 'settled'>) => {
    const debtCurrency = debtData.currency || settings.defaultCurrency || 'PHP';
    const newDebt: Debt = {
      ...debtData,
      amount: debtData.amount,
      currency: debtCurrency,
      originalAmount: debtData.amount,
      originalCurrency: debtCurrency,
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
    const goalCurrency = goalData.currency || settings.defaultCurrency || 'PHP';
    const newGoal: Goal = {
      ...goalData,
      targetPrice: goalData.targetPrice,
      earmarkedAmount: goalData.earmarkedAmount || 0,
      currency: goalCurrency,
      originalTargetPrice: goalData.targetPrice,
      originalEarmarkedAmount: goalData.earmarkedAmount || 0,
      originalCurrency: goalCurrency,
      id: `goal-${Date.now()}`,
      createdAt: Date.now(),
    };
    setGoals((prev) => [...prev, newGoal]);
  };

  const handleUpdateGoal = (updatedGoal: Goal) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === updatedGoal.id
          ? {
              ...updatedGoal,
              targetPrice: updatedGoal.targetPrice,
              earmarkedAmount: updatedGoal.earmarkedAmount || 0,
              currency: updatedGoal.currency,
              originalTargetPrice: updatedGoal.targetPrice,
              originalEarmarkedAmount: updatedGoal.earmarkedAmount || 0,
              originalCurrency: updatedGoal.currency,
            }
          : g
      )
    );
  };

  const handleDeleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  // --- Handlers: Categories & Currencies ---
  const handleAddCategory = (catData: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...catData,
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      order: categories.length,
    };
    setCategories((prev) => [...prev, newCat]);
  };

  const handleUpdateCategory = (updatedCat: Category) => {
    setCategories((prev) => prev.map((c) => (c.id === updatedCat.id ? updatedCat : c)));
  };

  const handleReorderCategories = (reorderedTabCats: Category[]) => {
    if (!reorderedTabCats || reorderedTabCats.length === 0) return;
    const tabType = reorderedTabCats[0].type;
    const otherCats = categories.filter((c) => c.type !== tabType);
    const combined =
      tabType === 'expense'
        ? [...reorderedTabCats, ...otherCats]
        : [...otherCats, ...reorderedTabCats];

    const updated = combined.map((cat, idx) => ({
      ...cat,
      order: idx,
    }));

    setCategories(updated);

    if (currentUser?.id) {
      try {
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.CATEGORIES_PREFIX, currentUser.id),
          JSON.stringify(updated)
        );
      } catch {}

      // Automatically and immediately save
      fetch('/api/db/categories/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          categories: updated,
        }),
      }).catch(() => {});
    }
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

  // --- Handlers: Accounts ---
  const handleAddAccount = (accData: Omit<Account, 'id'>) => {
    const accCurrency = accData.currency || settings.defaultCurrency || 'PHP';
    const initBal = accData.initialBalance || 0;
    const newAcc: Account = {
      ...accData,
      initialBalance: initBal,
      currency: accCurrency,
      originalInitialBalance: initBal,
      originalCurrency: accCurrency,
      id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setAccounts((prev) => [...prev, newAcc]);
  };

  const handleUpdateAccount = (updatedAcc: Account) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === updatedAcc.id
          ? {
              ...updatedAcc,
              originalInitialBalance: updatedAcc.initialBalance,
              originalCurrency: updatedAcc.currency || a.originalCurrency || settings.defaultCurrency,
            }
          : a
      )
    );
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

    // Persist deletion immediately to backend
    const delUrl = `/api/db/accounts/${encodeURIComponent(id)}${
      currentUser?.id ? `?userId=${encodeURIComponent(currentUser.id)}` : ''
    }`;
    fetch(delUrl, {
      method: 'DELETE',
      headers: currentUser?.id ? { 'x-user-id': currentUser.id } : undefined,
    }).catch(() => {});
  };

  const handleReorderAccounts = (reorderedAccounts: Account[]) => {
    if (!reorderedAccounts || reorderedAccounts.length === 0) return;
    const updated = ensureCashAccount(reorderedAccounts);

    setAccounts(updated);

    if (currentUser?.id) {
      try {
        localStorage.setItem(
          getUserStorageKey(STORAGE_KEYS.ACCOUNTS_PREFIX, currentUser.id),
          JSON.stringify(updated)
        );
      } catch {}

      // Automatically and immediately save to backend
      fetch('/api/db/accounts/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          accounts: updated,
        }),
      }).catch(() => {});
    } else {
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
      } catch {}
    }
  };

  const handleTransfer = ({
    fromAccountId,
    toAccountId,
    amount,
    note,
    date,
    time,
  }: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    note: string;
    date?: string;
    time?: string;
  }) => {
    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const toAcc = accounts.find((a) => a.id === toAccountId);

    const now = Date.now();
    const today = date || getTodayDateString();
    const currentTime = time || getCurrent12HourTime();
    const transferCurrency = settings.defaultCurrency || 'PHP';

    const transferTx: Transaction = {
      id: `tx-transfer-${now}-${Math.random().toString(36).substr(2, 4)}`,
      userId: currentUser?.id,
      type: 'transfer',
      amount,
      currency: transferCurrency,
      originalAmount: amount,
      originalCurrency: transferCurrency,
      fromAccountId,
      toAccountId,
      fromAccountName: fromAcc?.name || 'Account 1',
      toAccountName: toAcc?.name || 'Account 2',
      fromAccountIcon: fromAcc?.icon || 'Wallet',
      toAccountIcon: toAcc?.icon || 'Wallet',
      accountId: fromAccountId,
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
    // 1. Update default currency in settings
    const updatedSettings: UserSettings = {
      ...settings,
      defaultCurrency: newCode,
      primaryCurrency: newCode,
    };
    setSettings(updatedSettings);

    // 2. Explicitly associate and persist to active user account
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

      // Sync with server (preserving original underlying transaction amounts and currencies)
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
          transactions: transactions.map((t) => ({ ...t, userId: currentUser.id })),
          debts,
          goals,
          accounts,
          categories,
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
        transactions: displayTransactions,
        categories,
        debts: displayDebts,
        goals: displayGoals,
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
        localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.TRANSACTIONS_PREFIX, currentUser.id));
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
      if (currentUser?.id) {
        sessionStorage.removeItem(`wallo_session_unlocked_${currentUser.id}`);
      }
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    } catch {}
    setIsPinLocked(false);
    setCurrentUser(null);
    setAuthView('landing');
    setTransactions([]);
    setSettings(DEFAULT_SETTINGS);
    setUserProfile(DEFAULT_USER_PROFILE);
    setAccounts(DEFAULT_ACCOUNTS);
    setCategories(createDefaultCategories());
    setCurrencies(DEFAULT_CURRENCIES);
    setGoals([]);
    setDebts([]);
  };

  const handleUpdateAccountSettings = async (data: {
    nickname?: string;
    email?: string;
    password?: string;
    currentPassword?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const payload: any = {
        userId: currentUser?.id,
      };
      if (data.nickname !== undefined) payload.nickname = data.nickname;
      if (data.email !== undefined) payload.email = data.email;
      if (data.password !== undefined) payload.password = data.password;
      if (data.currentPassword !== undefined) payload.currentPassword = data.currentPassword;
      if (data.avatarUrl !== undefined) payload.avatarUrl = data.avatarUrl;

      try {
        const res = await fetch('/api/user/update-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser?.id || '',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const json = await res.json();
            return {
              success: false,
              error: json.error || 'Failed to update account settings.',
            };
          }
          return {
            success: false,
            error: 'Server error updating account settings.',
          };
        }
      } catch (err: any) {
        console.error('Failed to update profile on server:', err);
      }

      const nextNickname =
        data.nickname !== undefined
          ? data.nickname
          : (currentUser?.nickname || userProfile.nickname || 'User');
      const nextEmail =
        data.email !== undefined
          ? data.email
          : (currentUser?.email || userProfile.email || '');
      const nextAvatar =
        data.avatarUrl !== undefined ? data.avatarUrl : (currentUser?.avatarUrl || '');

      // Always update on device
      const updatedUser: AuthUser = {
        ...(currentUser || { id: 'user-local', email: nextEmail, nickname: nextNickname }),
        email: nextEmail,
        nickname: nextNickname,
        avatarUrl: nextAvatar,
        defaultCurrency: currentUser?.defaultCurrency || settings.defaultCurrency || 'PHP',
        ...(data.password ? { hasPassword: true } : {}),
      };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      } catch {}

      const updatedProfile: UserProfile = {
        nickname: nextNickname,
        email: nextEmail,
        avatarUrl: nextAvatar,
      };
      setUserProfile(updatedProfile);

      if (currentUser?.id) {
        try {
          localStorage.setItem(
            getUserStorageKey(STORAGE_KEYS.USER_PROFILE_PREFIX, currentUser.id),
            JSON.stringify(updatedProfile)
          );
        } catch {}
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred while updating your settings.' };
    }
  };

  const handleUpdateCurrentUserPartial = (updated: Partial<AuthUser>) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const nextUser: AuthUser = {
        ...prev,
        ...updated,
      };
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(nextUser));
      } catch {}
      return nextUser;
    });

    if (currentUser?.id) {
      handleSyncWithDB(currentUser.id);
    }
  };

  const handleUnlockSession = () => {
    if (currentUser?.id) {
      sessionStorage.setItem(`wallo_session_unlocked_${currentUser.id}`, 'true');
    }
    setIsPinLocked(false);
  };

  const handleSetUserPin = async (pin: string): Promise<boolean> => {
    if (!currentUser?.id && !currentUser?.email) return false;
    try {
      const res = await fetch('/api/user/set-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id || '',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          email: currentUser.email,
          pin: pin.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedUser: AuthUser = {
          ...currentUser,
          hasPin: true,
          pinCode: pin.trim(),
        };
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
          localStorage.setItem(`wallo_local_pin_${currentUser.id}`, pin.trim());
        } catch {}
        return true;
      }
    } catch (err) {
      console.error('Failed to set PIN on server:', err);
    }

    return false;
  };

  const handleVerifyUserPin = async (pin: string): Promise<boolean> => {
    if (!currentUser?.id && !currentUser?.email) return false;
    try {
      const res = await fetch('/api/user/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id || '',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          email: currentUser.email,
          pin: pin.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        return true;
      }
      if (res.status === 400) {
        return false;
      }
    } catch (err) {
      console.error('Failed to verify PIN on server:', err);
    }

    // Fallback: check stored local PIN or user object PIN
    const localPin =
      localStorage.getItem(`wallo_local_pin_${currentUser.id}`) || currentUser.pinCode;
    if (localPin) {
      return String(localPin).trim() === pin.trim();
    }
    return false;
  };

  // If user is not signed in or not verified, render the LandingPage or AuthScreen
  if (!currentUser || currentUser.isVerified === false) {
    if (authView === 'auth') {
      return (
        <AuthScreen
          initialMode={authInitialMode}
          onBackToLanding={() => setAuthView('landing')}
          onLoginSuccess={(user, profileUpdate) => {
            setIsProfileLoading(true);
            setCurrentUser(user);
            try {
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
              // Mark session unlocked on explicit login
              sessionStorage.setItem(`wallo_session_unlocked_${user.id}`, 'true');
            } catch {}
            setIsPinLocked(false);
            setUserProfile({
              nickname: profileUpdate?.nickname || user.nickname || 'User',
              avatarUrl:
                profileUpdate?.avatarUrl !== undefined
                  ? profileUpdate.avatarUrl
                  : user.avatarUrl || '',
              email: user.email,
            });
            loadUserDataForUser(user);
            handleSyncWithDB(user.id).finally(() => {
              setIsProfileLoading(false);
            });
          }}
        />
      );
    }

    return (
      <LandingPage
        onGetStarted={() => {
          setAuthInitialMode('register');
          setAuthView('auth');
        }}
        onSignUp={() => {
          setAuthInitialMode('register');
          setAuthView('auth');
        }}
        onSignIn={() => {
          setAuthInitialMode('login');
          setAuthView('auth');
        }}
      />
    );
  }

  // If session is locked by 4-digit PIN (reopened app/tab with Remember Me active)
  if (isPinLocked) {
    const hasPinSet = Boolean(
      currentUser.hasPin ||
      currentUser.pinCode ||
      (typeof window !== 'undefined' && localStorage.getItem(`wallo_local_pin_${currentUser.id}`))
    );

    return (
      <PinLockScreen
        userId={currentUser.id}
        userNickname={currentUser.nickname}
        userEmail={currentUser.email}
        hasPin={hasPinSet}
        onUnlock={handleUnlockSession}
        onSetPin={handleSetUserPin}
        onVerifyPin={handleVerifyUserPin}
        onLogout={handleLogout}
        onPinFound={() => {
          setCurrentUser((prev) => {
            if (!prev) return prev;
            const updated: AuthUser = { ...prev, hasPin: true };
            try {
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }}
      />
    );
  }

  return (
    <ClickSpark
      sparkColor="#18181b"
      sparkSize={10}
      sparkRadius={15}
      sparkCount={8}
      duration={400}
    >
      <div className="relative min-h-screen flex flex-col bg-white text-[#18181B] font-sans antialiased overflow-x-clip">
      {/* Background Animated Particles (non-cursor tracking) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-white" aria-hidden="true">
        <Particles
          color="#666666"
          quantity={120}
          ease={20}
          followCursor={false}
          className="absolute inset-0"
        />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
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
        currentCurrencyCode={currentCurrencyObj?.code || 'PHP'}
        currentCurrencyFlag={currentCurrencyObj?.flag || getCurrencyFlag(currentCurrencyObj?.code || 'PHP')}
        selectedMonthYearLabel={selectedMonthYearLabel}
        selectedYearMonth={selectedYearMonth}
        onSelectYearMonth={handleSelectYearMonth}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        userProfile={userProfile}
        onUpdateProfile={setUserProfile}
        isProfileLoading={isProfileLoading}
        expenseCount={monthlyTransactions.filter((t) => t.type === 'expense').length}
        incomeCount={monthlyTransactions.filter((t) => t.type === 'income').length}
        debtCount={debtCount}
        dbStatus={dbStatus}
        onSyncWithDB={handleSyncWithDB}
        isSyncing={isSyncing}
        lastSyncedTime={lastSyncedTime}
        currentUser={currentUser}
        onOpenSettings={() => setActiveTab('settings')}
        onLogout={() => setShowLogoutConfirm(true)}
        onOpenAccounts={() => setShowAccountsModal(true)}
        onOpenTransfer={() => setShowTransferModal(true)}
        onOpenCurrencies={() => setShowCurrenciesModal(true)}
        onOpenCategories={() => {
          setCategoriesInitialType('expense');
          setShowCategoriesModal(true);
        }}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div key={activeTab} className="animate-tab-slide-down space-y-6">
          {/* Quick Entry Form (Always accessible on Tracker view or as modal everywhere else) */}
          {activeTab === 'tracker' && (
            <QuickEntryForm
              currencies={currencies}
              categories={categories}
              accounts={displayAccounts}
              transactions={displayTransactions}
              selectedCurrency={settings.defaultCurrency}
              onSave={handleSaveTransaction}
              onOpenAddCategory={(type, initialAdd = false) => {
                setCategoriesInitialType(type);
                setCategoriesInitialAdd(initialAdd);
                setShowCategoriesModal(true);
              }}
              onOpenAddAccount={(initialAdd = false) => {
                setAccountsInitialAdd(initialAdd);
                setShowAccountsModal(true);
              }}
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
              accounts={displayAccounts}
              selectedCurrency={settings.defaultCurrency}
              onDeleteTransaction={handleDeleteTransaction}
              onUpdateTransaction={handleUpdateTransaction}
            />
          )}

          {activeTab === 'summary' && (
            <SummaryPanel
              transactions={displayTransactions}
              categories={categories}
              currencySymbol={currencySymbol}
            />
          )}

          {activeTab === 'debts' && (
            <DebtTracker
              debts={displayDebts}
              currencies={currencies}
              selectedCurrency={settings.defaultCurrency}
              onAddDebt={handleAddDebt}
              onToggleSettle={handleToggleSettleDebt}
              onDeleteDebt={handleDeleteDebt}
            />
          )}

          {activeTab === 'goals' && (
            <GoalsView
              goals={displayGoals}
              currencies={currencies}
              selectedCurrency={settings.defaultCurrency}
              currentSavings={currentSavings}
              onAddGoal={handleAddGoal}
              onUpdateGoal={handleUpdateGoal}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              currentUser={currentUser}
              profile={userProfile}
              onBack={() => setActiveTab('tracker')}
              onSave={handleUpdateAccountSettings}
              onSetPin={handleSetUserPin}
              onUpdateCurrentUser={handleUpdateCurrentUserPartial}
            />
          )}
        </div>
      </main>

      {/* Footer Utilities */}
      <footer className="bg-white border-t border-zinc-200 mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-medium">© 2026 Wallo</span>
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
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-modal-backdrop-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowQuickEntryModal(false);
              }
            }}
          >
            <div className="animate-modal-slide-in max-w-xl w-full my-auto">
              <QuickEntryForm
                currencies={currencies}
                categories={categories}
                accounts={displayAccounts}
                transactions={displayTransactions}
                selectedCurrency={settings.defaultCurrency}
                onSave={handleSaveTransaction}
                onOpenAddCategory={(type, initialAdd = false) => {
                  setCategoriesInitialType(type);
                  setCategoriesInitialAdd(initialAdd);
                  setShowCategoriesModal(true);
                }}
                onOpenAddAccount={(initialAdd = false) => {
                  setShowQuickEntryModal(false);
                  setAccountsInitialAdd(initialAdd);
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
          </div>
        </ModalPortal>
      )}

      {/* Accounts & Assets Manager Modal */}
      {showAccountsModal && (
        <AccountManagerModal
          accounts={displayAccounts}
          transactions={displayTransactions}
          currencySymbol={currencySymbol}
          onAddAccount={handleAddAccount}
          onUpdateAccount={handleUpdateAccount}
          onDeleteAccount={handleDeleteAccount}
          onReorderAccounts={handleReorderAccounts}
          onClose={() => {
            setShowAccountsModal(false);
            setAccountsInitialAdd(false);
          }}
          initialAdd={accountsInitialAdd}
        />
      )}

      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        accounts={displayAccounts}
        transactions={displayTransactions}
        currencySymbol={currencySymbol}
        defaultCurrency={settings.defaultCurrency}
        onTransfer={handleTransfer}
        onOpenAddAccount={() => setShowAccountsModal(true)}
      />

      {/* Categories Manager Modal */}
      {showCategoriesModal && (
        <CategoryManagerModal
          categories={categories}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onReorderCategories={handleReorderCategories}
          onClose={() => {
            setShowCategoriesModal(false);
            setCategoriesInitialAdd(false);
          }}
          initialType={categoriesInitialType}
          initialAdd={categoriesInitialAdd}
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

      {/* Logout Confirmation Modal - matching the delete transaction modal design */}
      {showLogoutConfirm && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-modal-backdrop-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowLogoutConfirm(false);
              }
            }}
          >
            <div className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-sm w-full shadow-lg space-y-3 my-auto animate-modal-slide-in">
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
        </ModalPortal>
      )}
      </div>
    </div>
    </ClickSpark>
  );
}
