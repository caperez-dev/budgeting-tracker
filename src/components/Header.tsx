import React, { useRef } from 'react';
import {
  Wallet,
  ReceiptText,
  BarChart3,
  Scale,
  Target,
  Sparkles,
  HeartHandshake,
  Coins,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  Calendar,
  X,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { UserProfile, DBStatus, AuthUser } from '../types';
import { ProfileDropdown } from './ProfileDropdown';

export type ActiveTab = 'tracker' | 'summary' | 'debts' | 'goals' | 'ai';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentSavings: number;
  totalIncome: number;
  totalExpense: number;
  debtsYouOweTotal: number;
  debtsOwedToYouTotal: number;
  currencySymbol: string;
  selectedMonthYearLabel: string;
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
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
  selectedMonthYearLabel,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  userProfile,
  onUpdateProfile,
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
}: HeaderProps) {
  const hasActiveDebts = debtsYouOweTotal > 0.01 || debtsOwedToYouTotal > 0.01;
  const headerDateInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-zinc-200">
      {/* Top Banner: Global Financial Status & Branding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 relative">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[4px] bg-zinc-900 text-white flex items-center justify-center shadow-xs">
            <Wallet className="w-4 h-4 text-zinc-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-zinc-900">
                Budget Tracker
              </h1>
            </div>
          </div>
        </div>

        {/* Centered Month & Year Component with Previous, Next, and Calendar Buttons */}
        <div
          id="header-month-year-navigator"
          className="flex items-center justify-center gap-1 sm:absolute sm:left-1/2 sm:-translate-x-1/2 order-3 sm:order-none w-full sm:w-auto"
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

          <span className="text-sm font-semibold text-zinc-800 select-none px-1 tracking-tight min-w-[130px] text-center">
            {selectedMonthYearLabel}
          </span>

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

          {/* Calendar Picker Button beside Month/Year */}
          <div className="relative inline-flex items-center ml-0.5">
            <button
              id="btn-header-calendar-select"
              type="button"
              onClick={() => {
                if (headerDateInputRef.current?.showPicker) {
                  headerDateInputRef.current.showPicker();
                } else {
                  headerDateInputRef.current?.focus();
                }
              }}
              className={`p-1.5 rounded-[4px] border transition-colors cursor-pointer ${
                selectedDate
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 border-zinc-200 bg-white'
              }`}
              title={selectedDate ? 'Change selected date' : 'Select a specific date'}
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
            <input
              ref={headerDateInputRef}
              type="date"
              value={selectedDate || ''}
              onChange={(e) => {
                if (e.target.value) {
                  onSelectDate?.(e.target.value);
                }
              }}
              className="sr-only"
              tabIndex={-1}
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => onSelectDate?.(null)}
                className="ml-0.5 p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-100 cursor-pointer"
                title="Clear date filter (Show full month)"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Global Financial Metrics */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-auto sm:ml-0">
          {/* Current Savings (Hidden on mobile view) */}
          <div
            id="current-savings-display"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-[4px]"
            title={`Savings for ${selectedMonthYearLabel}`}
          >
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Savings:
            </span>
            <span
              className={`font-mono text-sm font-semibold tabular-nums ${
                currentSavings >= 0 ? 'text-zinc-900' : 'text-rose-600'
              }`}
            >
              {formatCurrency(currentSavings, currencySymbol)}
            </span>
          </div>

          {/* Total Earned / Obtained */}
          <div
            id="total-earned-display"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-[4px]"
            title={`Earned for ${selectedMonthYearLabel}`}
          >
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Earned:
            </span>
            <span className="font-mono text-sm font-semibold text-emerald-700 tabular-nums">
              {formatCurrency(totalIncome, currencySymbol)}
            </span>
          </div>

          {/* Profile Dropdown */}
          <ProfileDropdown
            profile={userProfile}
            onUpdateProfile={onUpdateProfile}
            expenseCount={expenseCount}
            incomeCount={incomeCount}
            debtCount={debtCount}
            totalExpense={totalExpense}
            totalIncome={totalIncome}
            totalDebt={debtsYouOweTotal}
            currencySymbol={currencySymbol}
            dbStatus={dbStatus}
            onSyncWithDB={onSyncWithDB}
            isSyncing={isSyncing}
            lastSyncedTime={lastSyncedTime}
            currentUser={currentUser}
            onOpenSettings={onOpenSettings}
            onLogout={onLogout}
          />
        </div>
      </div>

      {/* Sub-bar: Navigation Tabs & Utilities */}
      <div className="bg-zinc-50/80 border-t border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 overflow-x-auto">
          {/* Main Navigation Tabs */}
          <nav className="flex space-x-1 py-1.5" aria-label="Tabs">
            <button
              id="tab-tracker"
              onClick={() => setActiveTab('tracker')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                activeTab === 'tracker'
                  ? 'bg-white text-zinc-900 shadow-2xs border border-zinc-200 font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <ReceiptText className="w-3.5 h-3.5" />
              <span>Tracker</span>
            </button>

            <button
              id="tab-summary"
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'bg-white text-zinc-900 shadow-2xs border border-zinc-200 font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Summary</span>
            </button>

            <button
              id="tab-debts"
              onClick={() => setActiveTab('debts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                activeTab === 'debts'
                  ? 'bg-white text-zinc-900 shadow-2xs border border-zinc-200 font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Debts</span>
              {hasActiveDebts && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
              )}
            </button>

            <button
              id="tab-goals"
              onClick={() => setActiveTab('goals')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                activeTab === 'goals'
                  ? 'bg-white text-zinc-900 shadow-2xs border border-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Purchase Goals</span>
            </button>

            <button
              id="tab-ai"
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                activeTab === 'ai'
                  ? 'bg-white text-zinc-900 shadow-2xs border border-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Advisor</span>
            </button>
          </nav>

          {/* Secondary Utilities: Accounts, Currencies, Categories, Donate */}
          <div className="flex items-center gap-1.5 py-1.5">
            <button
              id="btn-manage-accounts"
              onClick={onOpenAccounts}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-[4px] transition-colors whitespace-nowrap cursor-pointer"
              title="Manage accounts and assets (Cash, E-Wallet, etc.)"
            >
              <Wallet className="w-3 h-3 text-zinc-500" />
              <span className="hidden sm:inline">Accounts</span>
            </button>

            <button
              id="btn-transfer"
              onClick={onOpenTransfer}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-[4px] transition-colors whitespace-nowrap cursor-pointer"
              title="Transfer balance between accounts"
            >
              <ArrowLeftRight className="w-3 h-3 text-zinc-500" />
              <span className="hidden sm:inline">Transfer</span>
            </button>

            <button
              id="btn-manage-currencies"
              onClick={onOpenCurrencies}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-[4px] transition-colors whitespace-nowrap"
              title="Manage currencies and exchange rates"
            >
              <Coins className="w-3 h-3 text-zinc-500" />
              <span className="hidden sm:inline">Currencies</span>
            </button>

            <button
              id="btn-manage-categories"
              onClick={onOpenCategories}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-[4px] transition-colors whitespace-nowrap"
              title="Add, edit, or customize categories, icons, and accent colors"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
              <span className="hidden sm:inline">Categories</span>
            </button>

            <button
              id="btn-donate"
              onClick={onOpenDonate}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-[4px] transition-colors whitespace-nowrap"
              title="Support the app developer"
            >
              <HeartHandshake className="w-3 h-3 text-rose-500" />
              <span className="hidden sm:inline">Donate</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
