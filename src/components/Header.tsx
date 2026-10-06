import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Wallet,
  ReceiptText,
  BarChart3,
  Scale,
  Flag,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  Tags,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { UserProfile, DBStatus, AuthUser } from '../types';
import { ProfileDropdown } from './ProfileDropdown';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const HEADER_METRIC_STORAGE_KEY = 'budget_tracker_header_metric_view';

export type ActiveTab = 'tracker' | 'summary' | 'debts' | 'goals' | 'settings';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentSavings: number;
  totalIncome: number;
  totalExpense: number;
  debtsYouOweTotal: number;
  debtsOwedToYouTotal: number;
  currencySymbol: string;
  currentCurrencyCode?: string;
  currentCurrencyFlag?: string;
  selectedMonthYearLabel: string;
  selectedYearMonth?: string;
  onSelectYearMonth?: (yearMonth: string) => void;
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  isProfileLoading?: boolean;
  expenseCount: number;
  incomeCount: number;
  debtCount?: number;
  dbStatus?: DBStatus;
  onSyncWithDB?: () => Promise<void>;
  isSyncing?: boolean;
  lastSyncedTime?: string | null;
  currentUser?: AuthUser | null;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  onOpenDonate: () => void;
  onOpenAccounts: () => void;
  onOpenTransfer: () => void;
  onOpenCurrencies: () => void;
  onOpenCategories: () => void;
}

export function Header({
  activeTab,
  setActiveTab,
  currentSavings,
  totalIncome,
  totalExpense,
  debtsYouOweTotal,
  debtsOwedToYouTotal,
  currencySymbol,
  currentCurrencyCode,
  currentCurrencyFlag,
  selectedMonthYearLabel,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  userProfile,
  onUpdateProfile,
  isProfileLoading,
  expenseCount,
  incomeCount,
  debtCount,
  dbStatus,
  onSyncWithDB,
  isSyncing,
  lastSyncedTime,
  currentUser,
  onOpenSettings,
  onLogout,
  onOpenDonate,
  onOpenAccounts,
  onOpenTransfer,
  onOpenCurrencies,
  onOpenCategories,
  selectedYearMonth,
  onSelectYearMonth,
}: HeaderProps) {
  const hasActiveDebts = debtsYouOweTotal > 0.01 || debtsOwedToYouTotal > 0.01;

  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  const [headerYear, headerMonth] = useMemo(() => {
    if (selectedYearMonth && selectedYearMonth.includes('-')) {
      const [y, m] = selectedYearMonth.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) return [y, m];
    }
    const d = new Date();
    return [d.getFullYear(), d.getMonth() + 1];
  }, [selectedYearMonth]);

  const [pickerYear, setPickerYear] = useState<number>(headerYear);

  // Keep pickerYear synced when opening
  useEffect(() => {
    if (isMonthPickerOpen) {
      setPickerYear(headerYear);
    }
  }, [isMonthPickerOpen, headerYear]);

  // Click outside and escape key handling
  useEffect(() => {
    if (!isMonthPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMonthPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMonthPickerOpen]);

  const monthYearDisplay = useMemo(() => {
    const d = new Date(headerYear, headerMonth - 1, 1);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(d);
  }, [headerYear, headerMonth]);

  const specificMonthName = useMemo(() => {
    const d = new Date(headerYear, headerMonth - 1, 1);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
    }).format(d);
  }, [headerYear, headerMonth]);

  const [metricView, setMetricView] = useState<'expense' | 'income'>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const userSaved = currentUser?.id
          ? localStorage.getItem(`${HEADER_METRIC_STORAGE_KEY}_${currentUser.id}`)
          : null;
        if (userSaved === 'income' || userSaved === 'expense') {
          return userSaved;
        }
        const globalSaved = localStorage.getItem(HEADER_METRIC_STORAGE_KEY);
        if (globalSaved === 'income' || globalSaved === 'expense') {
          return globalSaved;
        }
      }
    } catch {}
    return 'expense';
  });

  // Synchronize persisted preference when currentUser changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const userSaved = currentUser?.id
          ? localStorage.getItem(`${HEADER_METRIC_STORAGE_KEY}_${currentUser.id}`)
          : null;
        if (userSaved === 'income' || userSaved === 'expense') {
          setMetricView(userSaved);
          return;
        }
        const globalSaved = localStorage.getItem(HEADER_METRIC_STORAGE_KEY);
        if (globalSaved === 'income' || globalSaved === 'expense') {
          setMetricView(globalSaved);
        }
      }
    } catch {}
  }, [currentUser?.id]);

  const handleToggleMetricView = () => {
    setMetricView((prev) => {
      const next = prev === 'expense' ? 'income' : 'expense';
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(HEADER_METRIC_STORAGE_KEY, next);
          if (currentUser?.id) {
            localStorage.setItem(`${HEADER_METRIC_STORAGE_KEY}_${currentUser.id}`, next);
          }
        }
      } catch {}
      return next;
    });
  };

  const monthHoverMessage = `Month of ${specificMonthName}`;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-zinc-200">
      {/* Top Banner: Global Financial Status & Branding (One-liner layout on mobile) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 relative">
        {/* Logo & Brand */}
        <div className="flex items-center shrink-0">
          <img
            src="/logo.png"
            alt="Wallo"
            className="h-8 w-auto object-contain select-none"
          />
        </div>

        {/* Centered Month & Year Component with Previous and Next Buttons */}
        <div
          id="header-month-year-navigator"
          className="flex items-center justify-center gap-0.5 sm:gap-1 absolute left-1/2 -translate-x-1/2 shrink-0"
        >
          <button
            id="btn-prev-month"
            type="button"
            onClick={onPrevMonth}
            aria-label="Previous month"
            title="Previous month"
            className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[4px] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Clickable Month and Year button */}
          <button
            id="btn-header-month-year-picker"
            type="button"
            onClick={() => setIsMonthPickerOpen((prev) => !prev)}
            aria-expanded={isMonthPickerOpen}
            title="Click to select month and year"
            className="flex items-center px-2.5 py-1 text-sm font-semibold text-zinc-800 hover:text-zinc-950 hover:bg-zinc-100 rounded-[4px] transition-colors cursor-pointer"
          >
            <span>{monthYearDisplay}</span>
          </button>

          <button
            id="btn-next-month"
            type="button"
            onClick={onNextMonth}
            aria-label="Next month"
            title="Next month"
            className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[4px] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Month & Year Selector Popover (Month and Year only - No date selector) */}
          {isMonthPickerOpen && (
            <div
              ref={monthPickerRef}
              className="absolute top-full mt-2 z-50 bg-white border border-zinc-200 rounded-[6px] shadow-lg p-3 w-64 animate-in fade-in zoom-in-95 duration-100 left-1/2 -translate-x-1/2"
            >
              {/* Year Navigation Bar */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                <button
                  type="button"
                  id="btn-picker-prev-year"
                  onClick={() => setPickerYear((y) => y - 1)}
                  className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                  title="Previous year"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-sm font-bold text-zinc-900 tabular-nums tracking-wide">
                  {pickerYear}
                </span>

                <button
                  type="button"
                  id="btn-picker-next-year"
                  onClick={() => setPickerYear((y) => y + 1)}
                  className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                  title="Next year"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {MONTH_NAMES.map((mName, idx) => {
                  const isSelected = pickerYear === headerYear && idx + 1 === headerMonth;
                  const now = new Date();
                  const isCurrentMonthNow = pickerYear === now.getFullYear() && idx === now.getMonth();

                  return (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => {
                        const formatted = `${pickerYear}-${String(idx + 1).padStart(2, '0')}`;
                        onSelectYearMonth?.(formatted);
                        setIsMonthPickerOpen(false);
                      }}
                      className={`py-2 px-1 text-xs font-medium rounded-[4px] transition-colors cursor-pointer text-center ${
                        isSelected
                          ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                          : isCurrentMonthNow
                          ? 'bg-zinc-100 text-zinc-900 font-semibold border border-zinc-300 hover:bg-zinc-200'
                          : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                      }`}
                    >
                      {mName}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions Footer */}
              <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    onSelectYearMonth?.(currentYM);
                    setIsMonthPickerOpen(false);
                  }}
                  className="text-zinc-600 hover:text-zinc-900 font-medium px-2 py-1 rounded-[3px] hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  This Month
                </button>

                <button
                  type="button"
                  onClick={() => setIsMonthPickerOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 px-2 py-1 rounded-[3px] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global Financial Metrics */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-auto sm:ml-0">
          {/* Expenses / Income Metric Component (Clickable to switch between Monthly Expenses and Monthly Income) */}
          <button
            type="button"
            id="header-expenses-display"
            onClick={handleToggleMetricView}
            className="relative group hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-[4px] cursor-pointer transition-all active:scale-[0.98] select-none text-left shadow-2xs"
            title={monthHoverMessage}
            aria-label={`${metricView === 'expense' ? 'Expenses' : 'Income'} for ${monthHoverMessage}. Click to switch to ${metricView === 'expense' ? 'income' : 'expenses'}.`}
          >
            <span
              className={`text-xs uppercase tracking-wider ${
                metricView === 'income' ? 'text-black font-semibold' : 'text-zinc-500 font-medium'
              }`}
            >
              {metricView === 'expense' ? 'Expenses:' : 'Income:'}
            </span>
            <span
              className={`font-mono text-sm font-semibold tabular-nums ${
                metricView === 'income' ? 'text-black' : 'text-zinc-900'
              }`}
            >
              {formatCurrency(metricView === 'expense' ? totalExpense : totalIncome, currencySymbol)}
            </span>

            {/* Hover Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-30 drop-shadow-md">
              <div className="w-1.5 h-1.5 bg-zinc-900 rotate-45 -mb-0.5 border-l border-t border-zinc-800" />
              <div className="bg-zinc-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-[4px] whitespace-nowrap shadow-md">
                {monthHoverMessage}
              </div>
            </div>
          </button>

          {/* Profile Dropdown */}
          <ProfileDropdown
            profile={userProfile}
            isLoading={isProfileLoading}
            onUpdateProfile={onUpdateProfile}
            expenseCount={expenseCount}
            incomeCount={incomeCount}
            debtCount={debtCount}
            totalExpense={totalExpense}
            totalIncome={totalIncome}
            totalDebt={debtsYouOweTotal}
            currencySymbol={currencySymbol}
            currentCurrencyCode={currentCurrencyCode}
            currentCurrencyFlag={currentCurrencyFlag}
            onOpenCurrencies={onOpenCurrencies}
            dbStatus={dbStatus}
            onSyncWithDB={onSyncWithDB}
            isSyncing={isSyncing}
            lastSyncedTime={lastSyncedTime}
            currentUser={currentUser}
            onOpenSettings={onOpenSettings}
            onLogout={onLogout}
            onOpenDonate={onOpenDonate}
          />
        </div>
      </div>

      {/* Sub-bar: Navigation Tabs & Utilities */}
      <div className="bg-white border-t border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 overflow-x-auto">
          {/* Main Navigation Tabs */}
          <nav className="flex space-x-1 py-1.5 shrink-0" aria-label="Tabs">
            <button
              id="tab-tracker"
              onClick={() => setActiveTab('tracker')}
              title="Tracker"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'tracker'
                  ? 'bg-white text-zinc-900 shadow-2xs border border-zinc-200 font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <ReceiptText className="w-3.5 h-3.5 shrink-0" />
              <span>Tracker</span>
            </button>

            <button
              id="tab-summary"
              onClick={() => setActiveTab('summary')}
              title="Summary"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-white text-zinc-900 shadow-2xs border border-zinc-200 font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Summary</span>
            </button>

            <button
              id="tab-debts"
              onClick={() => setActiveTab('debts')}
              title="Debts"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'debts'
                  ? 'bg-white text-zinc-900 shadow-2xs border border-zinc-200 font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Scale className="w-3.5 h-3.5 shrink-0" />
              <span>Debts</span>
              {hasActiveDebts && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
              )}
            </button>

            <button
              id="tab-goals"
              onClick={() => setActiveTab('goals')}
              title="Purchase Goals"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'goals'
                  ? 'bg-white text-zinc-900 shadow-2xs border border-zinc-200 font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Flag className="w-3.5 h-3.5 shrink-0" />
              <span>Goals</span>
            </button>
          </nav>

          {/* Secondary Utilities: Accounts, Transfer, Categories */}
          <div className="flex items-center gap-1 sm:gap-1.5 py-1.5 shrink-0">
            <button
              id="btn-manage-accounts"
              onClick={onOpenAccounts}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-[4px] transition-colors whitespace-nowrap cursor-pointer"
              title="Manage accounts and assets (Cash, E-Wallet, etc.)"
              aria-label="Manage accounts"
            >
              <Wallet className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>Accounts</span>
            </button>

            <button
              id="btn-transfer"
              onClick={onOpenTransfer}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-[4px] transition-colors whitespace-nowrap cursor-pointer"
              title="Transfer balance between accounts"
              aria-label="Transfer balance"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>Transfer</span>
            </button>

            <button
              id="btn-manage-categories"
              onClick={onOpenCategories}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-[4px] transition-colors whitespace-nowrap cursor-pointer"
              title="Add, edit, or customize categories, icons, and accent colors"
              aria-label="Manage categories"
            >
              <Tags className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>Categories</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
