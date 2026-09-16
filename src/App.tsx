import React, { useState, useEffect, useRef } from 'react';
import {
  Category,
  Currency,
  Debt,
  Goal,
  Transaction,
  TransactionType,
  UserSettings,
} from './types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CURRENCIES,
  DEFAULT_SETTINGS,
  SEED_DEBTS,
  SEED_GOALS,
  SEED_TRANSACTIONS,
} from './data/initialData';
import { Header, ActiveTab } from './components/Header';
import { QuickEntryForm } from './components/QuickEntryForm';
import { TrackerView } from './components/TrackerView';
import { SummaryPanel } from './components/SummaryPanel';
import { DebtTracker } from './components/DebtTracker';
import { GoalsView } from './components/GoalsView';
import { AIAdvisorModal } from './components/AIAdvisorModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { CurrencyManagerModal } from './components/CurrencyManagerModal';
import { DonateModal } from './components/DonateModal';
import { FileDown, Plus } from 'lucide-react';
import { generateBudgetPdf } from './utils/pdfExport';
import {
  convertCurrency,
  roundToCurrency,
  DEFAULT_EXCHANGE_RATES,
} from './utils/currency';

const STORAGE_KEYS = {
  TRANSACTIONS: 'budget_tracker_transactions_v1',
  CATEGORIES: 'budget_tracker_categories_v1',
  CURRENCIES: 'budget_tracker_currencies_v1',
  DEBTS: 'budget_tracker_debts_v1',
  GOALS: 'budget_tracker_goals_v1',
  SETTINGS: 'budget_tracker_settings_v1',
};

export default function App() {
  // --- Persistent State loaded from LocalStorage ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return saved ? JSON.parse(saved) : SEED_TRANSACTIONS;
    } catch {
      return SEED_TRANSACTIONS;
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const [currencies, setCurrencies] = useState<Currency[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENCIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: Currency) => ({
            ...c,
            exchangeRate: c.exchangeRate || DEFAULT_EXCHANGE_RATES[c.code] || 1.0,
          }));
        }
      }
      return DEFAULT_CURRENCIES;
    } catch {
      return DEFAULT_CURRENCIES;
    }
  });

  const [debts, setDebts] = useState<Debt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEBTS);
      return saved ? JSON.parse(saved) : SEED_DEBTS;
    } catch {
      return SEED_DEBTS;
    }
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GOALS);
      return saved ? JSON.parse(saved) : SEED_GOALS;
    } catch {
      return SEED_GOALS;
    }
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('tracker');

  // --- Modals State ---
  const [showQuickEntryModal, setShowQuickEntryModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [categoriesInitialType, setCategoriesInitialType] = useState<TransactionType>('expense');
  const [showCurrenciesModal, setShowCurrenciesModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);

  // --- Undo Delete State (§5 Requirement) ---
  const [pendingUndoTx, setPendingUndoTx] = useState<Transaction | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState<number>(6);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENCIES, JSON.stringify(currencies));
  }, [currencies]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    };
  }, []);

  // --- Financial Computations ---
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

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
    const ratesMap: Record<string, number> = {};
    currencies.forEach((c) => {
      if (c.exchangeRate) ratesMap[c.code] = c.exchangeRate;
    });

    const finalAmount =
      fromCurr !== settings.defaultCurrency
        ? roundToCurrency(convertCurrency(newTxData.amount, fromCurr, settings.defaultCurrency, ratesMap))
        : newTxData.amount;

    const newTx: Transaction = {
      ...newTxData,
      amount: finalAmount,
      currency: settings.defaultCurrency,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date(`${newTxData.date}T${new Date().toTimeString().slice(0, 8)}`).getTime(),
      createdAt: Date.now(),
    };
    setTransactions((prev) => [newTx, ...prev]);
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
    setTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)));
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
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddCurrency = (newCurr: Currency) => {
    setCurrencies((prev) => [...prev, newCurr]);
  };

  const handleSelectDefaultCurrency = (newCode: string) => {
    const oldCode = settings.defaultCurrency;
    if (newCode === oldCode) return;

    // Build custom rates map
    const ratesMap: Record<string, number> = {};
    currencies.forEach((c) => {
      if (c.exchangeRate) ratesMap[c.code] = c.exchangeRate;
    });

    // 1. Convert all transactions
    setTransactions((prev) =>
      prev.map((t) => {
        const fromCurr = t.currency || oldCode;
        const converted = convertCurrency(t.amount, fromCurr, newCode, ratesMap);
        return {
          ...t,
          amount: roundToCurrency(converted),
          currency: newCode,
        };
      })
    );

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
    setDebts((prev) =>
      prev.map((d) => {
        const fromCurr = d.currency || oldCode;
        const converted = convertCurrency(d.amount, fromCurr, newCode, ratesMap);
        return {
          ...d,
          amount: roundToCurrency(converted),
          currency: newCode,
        };
      })
    );

    // 3. Convert all goals
    setGoals((prev) =>
      prev.map((g) => {
        const fromCurr = g.currency || oldCode;
        const convertedTarget = convertCurrency(g.targetPrice, fromCurr, newCode, ratesMap);
        const convertedEarmarked = convertCurrency(g.earmarkedAmount, fromCurr, newCode, ratesMap);
        return {
          ...g,
          targetPrice: roundToCurrency(convertedTarget),
          earmarkedAmount: roundToCurrency(convertedEarmarked),
          currency: newCode,
        };
      })
    );

    // 4. Update default currency in settings
    setSettings((prev) => ({ ...prev, defaultCurrency: newCode }));
  };

  const handleDeleteCurrency = (code: string) => {
    const remaining = currencies.filter((c) => c.code !== code);
    setCurrencies(remaining);
    if (settings.defaultCurrency === code && remaining.length > 0) {
      handleSelectDefaultCurrency(remaining[0].code);
    }
  };

  // Export PDF Report
  const handleExportPdf = () => {
    generateBudgetPdf({
      transactions,
      categories,
      debts,
      goals,
      currentSavings,
      totalIncome,
      totalExpense,
      currencySymbol,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#18181B] font-sans antialiased">
      {/* Persistent Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentSavings={currentSavings}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        debtsYouOweTotal={totalYouOweUnsettled}
        debtsOwedToYouTotal={totalOwedToYouUnsettled}
        currencySymbol={currencySymbol}
        onOpenQuickEntry={() => setShowQuickEntryModal(true)}
        onOpenDonate={() => setShowDonateModal(true)}
        onOpenCurrencies={() => setShowCurrenciesModal(true)}
        onOpenCategories={() => {
          setCategoriesInitialType('expense');
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
            selectedCurrency={settings.defaultCurrency}
            onSave={handleSaveTransaction}
            onOpenAddCategory={(type) => {
              setCategoriesInitialType(type);
              setShowCategoriesModal(true);
            }}
          />
        )}

        {/* Tab Views */}
        {activeTab === 'tracker' && (
          <TrackerView
            transactions={transactions}
            categories={categories}
            currencies={currencies}
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
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-700 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-[4px] transition-colors shadow-2xs"
              title="Download comprehensive PDF report"
            >
              <FileDown className="w-3.5 h-3.5 text-zinc-600" />
              <span className="font-medium">Export PDF</span>
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
            selectedCurrency={settings.defaultCurrency}
            onSave={handleSaveTransaction}
            onOpenAddCategory={(type) => {
              setCategoriesInitialType(type);
              setShowCategoriesModal(true);
            }}
            isModal={true}
            onClose={() => setShowQuickEntryModal(false)}
          />
        </div>
      )}

      {/* Categories Manager Modal */}
      {showCategoriesModal && (
        <CategoryManagerModal
          categories={categories}
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
    </div>
  );
}
