import React from 'react';
import {
  Wallet,
  ReceiptText,
  BarChart3,
  Scale,
  Target,
  Sparkles,
  Plus,
  HeartHandshake,
  Coins,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

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
  onOpenQuickEntry: () => void;
  onOpenDonate: () => void;
  onOpenCurrencies: () => void;
  onOpenCategories: () => void;
}

export function Header({
  activeTab,
  setActiveTab,
  currentSavings,
  totalIncome,
  debtsYouOweTotal,
  debtsOwedToYouTotal,
  currencySymbol,
  onOpenQuickEntry,
  onOpenDonate,
  onOpenCurrencies,
  onOpenCategories,
}: HeaderProps) {
  const hasActiveDebts = debtsYouOweTotal > 0.01 || debtsOwedToYouTotal > 0.01;

  // Format current Month and Year indicator
  const currentMonthYear = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-zinc-200">
      {/* Top Banner: Global Financial Status & Branding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Brand + Month/Year Indicator */}
        <div className="flex items-center gap-3">
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

          {/* Month & Year Indicator */}
          <div
            id="header-month-year-indicator"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 border border-zinc-200 rounded-[4px] text-xs font-medium text-zinc-700 font-mono"
            title="Current Month and Year"
          >
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>{currentMonthYear}</span>
          </div>
        </div>

        {/* Global Financial Metrics */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Current Savings */}
          <div
            id="current-savings-display"
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-[4px]"
            title="Total Income minus Total Expenses"
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
            title="Total income earned across all logged records"
          >
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-emerald-600" /> Earned:
            </span>
            <span className="font-mono text-sm font-semibold text-emerald-700 tabular-nums">
              {formatCurrency(totalIncome, currencySymbol)}
            </span>
          </div>

          {/* Quick Action Buttons */}
          <button
            id="btn-quick-entry"
            onClick={onOpenQuickEntry}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-[4px] transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Entry</span>
          </button>
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

          {/* Secondary Utilities: Currencies, Categories, Donate */}
          <div className="flex items-center gap-1.5 py-1.5">
            <button
              id="btn-manage-currencies"
              onClick={onOpenCurrencies}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-[4px] transition-colors whitespace-nowrap"
              title="Edit currency list and set default currency"
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
