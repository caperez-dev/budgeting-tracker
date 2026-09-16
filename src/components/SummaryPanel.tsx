import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  TrendingDown,
  PieChart,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Category, Transaction } from '../types';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface SummaryPanelProps {
  transactions: Transaction[];
  categories: Category[];
  currencySymbol: string;
}

export function SummaryPanel({
  transactions,
  categories,
  currencySymbol,
}: SummaryPanelProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<
    'today' | 'week' | 'month' | 'year' | 'all'
  >('month');

  const todayStr = getTodayDateString();
  const [currentYearStr, currentMonthStr] = todayStr.split('-');
  const currentYearMonth = `${currentYearStr}-${currentMonthStr}`;

  // Helper to test if a date is in this week
  const isThisWeek = (dateStr: string) => {
    const today = new Date();
    const d = new Date(dateStr + 'T00:00:00');
    // Day of week: 0 = Sun, 1 = Mon ...
    const day = today.getDay();
    // Monday of current week:
    const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diffToMon));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return d >= monday && d <= sunday;
  };

  const isToday = (dateStr: string) => dateStr === todayStr;
  const isThisMonth = (dateStr: string) => dateStr.startsWith(currentYearMonth);
  const isThisYear = (dateStr: string) => dateStr.startsWith(currentYearStr);

  // Filter expense-only (OUT) transactions
  const expenseTxs = transactions.filter((t) => t.type === 'expense');

  // Specific totals as strictly required by §6:
  const totalToday = expenseTxs
    .filter((t) => isToday(t.date))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalThisWeek = expenseTxs
    .filter((t) => isThisWeek(t.date))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalThisMonth = expenseTxs
    .filter((t) => isThisMonth(t.date))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalThisYear = expenseTxs
    .filter((t) => isThisYear(t.date))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalAllTime = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

  // Filter transactions according to active breakdown period
  const activePeriodTxs = expenseTxs.filter((t) => {
    if (selectedPeriod === 'today') return isToday(t.date);
    if (selectedPeriod === 'week') return isThisWeek(t.date);
    if (selectedPeriod === 'month') return isThisMonth(t.date);
    if (selectedPeriod === 'year') return isThisYear(t.date);
    return true;
  });

  const activePeriodTotal = activePeriodTxs.reduce((sum, t) => sum + t.amount, 0);

  // Category breakdown for selected period
  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  const categoryTotals = new Map<string, number>();
  activePeriodTxs.forEach((t) => {
    const prev = categoryTotals.get(t.categoryId) || 0;
    categoryTotals.set(t.categoryId, prev + t.amount);
  });

  const sortedCategories = Array.from(categoryTotals.entries())
    .map(([catId, amount]) => {
      const cat = categoryMap.get(catId);
      const name = cat ? cat.name : 'Other';
      const color = cat ? cat.color : '#52525B';
      const icon = cat ? cat.icon : 'Tag';
      const percentage = activePeriodTotal > 0 ? (amount / activePeriodTotal) * 100 : 0;
      return { id: catId, name, color, icon, amount, percentage };
    })
    .sort((a, b) => b.amount - a.amount);

  const cards = [
    {
      id: 'today',
      label: 'Today',
      sublabel: todayStr,
      total: totalToday,
      active: selectedPeriod === 'today',
    },
    {
      id: 'week',
      label: 'This Week',
      sublabel: 'Current 7-day cycle',
      total: totalThisWeek,
      active: selectedPeriod === 'week',
    },
    {
      id: 'month',
      label: 'This Month',
      sublabel: currentYearMonth,
      total: totalThisMonth,
      active: selectedPeriod === 'month',
    },
    {
      id: 'year',
      label: 'This Year',
      sublabel: currentYearStr,
      total: totalThisYear,
      active: selectedPeriod === 'year',
    },
    {
      id: 'all',
      label: 'All-Time',
      sublabel: 'Cumulative overall',
      total: totalAllTime,
      active: selectedPeriod === 'all',
    },
  ];

  return (
    <div id="summary-panel" className="space-y-5">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-600" />
            Expense Summary (OUT Totals)
          </h2>
          <p className="text-xs text-zinc-500">
            Dedicated expense-only metrics across today, this week, month, year, and all-time.
          </p>
        </div>
      </div>

      {/* 5 Core Metric Cards mandated by §6 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setSelectedPeriod(card.id as any)}
            className={`text-left p-3.5 rounded-[5px] border transition-all ${
              card.active
                ? 'bg-white border-zinc-900 shadow-xs ring-1 ring-zinc-900'
                : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/60'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              <span>{card.label}</span>
              {card.active && <span className="w-1.5 h-1.5 rounded-full bg-zinc-900"></span>}
            </div>
            <div className="text-lg font-bold font-mono text-zinc-900 tabular-nums">
              {formatCurrency(card.total, currencySymbol)}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1 truncate">
              {card.sublabel}
            </div>
          </button>
        ))}
      </div>

      {/* Detailed Breakdown for Selected Period */}
      <div className="bg-white border border-zinc-200 rounded-[5px] p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-zinc-600" />
            <h3 className="text-sm font-semibold text-zinc-900">
              Category Breakdown —{' '}
              <span className="capitalize text-zinc-600">
                {cards.find((c) => c.id === selectedPeriod)?.label}
              </span>
            </h3>
          </div>
          <span className="font-mono text-xs text-zinc-500">
            Total Out: <strong className="text-zinc-900 font-semibold">{formatCurrency(activePeriodTotal, currencySymbol)}</strong>
          </span>
        </div>

        {/* Stacked Progress Bar */}
        {activePeriodTotal > 0 && (
          <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden flex mb-5">
            {sortedCategories.map((cat) => (
              <div
                key={cat.id}
                style={{
                  width: `${cat.percentage}%`,
                  backgroundColor: cat.color,
                }}
                title={`${cat.name}: ${cat.percentage.toFixed(1)}%`}
                className="h-full transition-all"
              />
            ))}
          </div>
        )}

        {/* Categories List */}
        {sortedCategories.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-xs">
            No expenses recorded for this time range.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {sortedCategories.map((cat) => (
              <div
                key={cat.id}
                className="py-2.5 flex items-center justify-between text-xs hover:bg-zinc-50/50 px-1 rounded transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: cat.color }}
                  />
                  <CategoryIcon name={cat.icon} className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-medium text-zinc-800">{cat.name}</span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono text-zinc-400 text-[11px] tabular-nums">
                    {cat.percentage.toFixed(1)}%
                  </span>
                  <span
                    className="font-mono font-semibold tabular-nums text-right min-w-[80px]"
                    style={{ color: cat.color }}
                  >
                    {formatCurrency(cat.amount, currencySymbol)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
