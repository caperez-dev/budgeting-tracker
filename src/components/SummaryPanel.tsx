import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { Category, Transaction } from '../types';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface SummaryPanelProps {
  transactions: Transaction[];
  categories: Category[];
  currencySymbol: string;
}

type Period = 'today' | 'week' | 'month' | 'year' | 'all';
type MetricType = 'expense' | 'income';

const MONTHS = [
  { value: '01', name: 'January', short: 'Jan' },
  { value: '02', name: 'February', short: 'Feb' },
  { value: '03', name: 'March', short: 'Mar' },
  { value: '04', name: 'April', short: 'Apr' },
  { value: '05', name: 'May', short: 'May' },
  { value: '06', name: 'June', short: 'Jun' },
  { value: '07', name: 'July', short: 'Jul' },
  { value: '08', name: 'August', short: 'Aug' },
  { value: '09', name: 'September', short: 'Sep' },
  { value: '10', name: 'October', short: 'Oct' },
  { value: '11', name: 'November', short: 'Nov' },
  { value: '12', name: 'December', short: 'Dec' },
];

export function SummaryPanel({
  transactions,
  categories,
  currencySymbol,
}: SummaryPanelProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
  const [breakdownType, setBreakdownType] = useState<MetricType>('expense');

  const todayStr = getTodayDateString();
  const [currentYearStr, currentMonthStr] = todayStr.split('-');
  const currentYearMonth = `${currentYearStr}-${currentMonthStr}`;
  const currentYearNum = parseInt(currentYearStr, 10);

  // Month and Year selector state
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const selectedYearMonth = `${selectedYear}-${selectedMonth}`;

  // Available years from transactions
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([currentYearNum, currentYearNum - 1, currentYearNum + 1]);
    transactions.forEach((t) => {
      if (t.date) {
        const y = parseInt(t.date.slice(0, 4), 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions, currentYearNum]);

  const handlePrevMonth = () => {
    const mNum = parseInt(selectedMonth, 10);
    if (mNum === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth('12');
    } else {
      setSelectedMonth(String(mNum - 1).padStart(2, '0'));
    }
  };

  const handleNextMonth = () => {
    const mNum = parseInt(selectedMonth, 10);
    if (mNum === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth('01');
    } else {
      setSelectedMonth(String(mNum + 1).padStart(2, '0'));
    }
  };

  // Helper to test if a date is in this week (Week starts on Sunday)
  const isThisWeek = (dateStr: string) => {
    const today = new Date();
    const d = new Date(dateStr + 'T00:00:00');
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const sunday = new Date(today);
    sunday.setDate(today.getDate() - day);
    sunday.setHours(0, 0, 0, 0);

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);

    return d >= sunday && d <= saturday;
  };

  const isToday = (dateStr: string) => dateStr === todayStr;
  const isSelectedMonth = (dateStr: string) => dateStr.startsWith(selectedYearMonth);
  const isSelectedYear = (dateStr: string) => dateStr.startsWith(String(selectedYear));

  // Filter Transactions by type
  const expenseTxs = transactions.filter((t) => t.type === 'expense');
  const incomeTxs = transactions.filter((t) => t.type === 'income');

  // Expense Totals
  const expenseToday = expenseTxs.filter((t) => isToday(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const expenseThisWeek = expenseTxs.filter((t) => isThisWeek(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const expenseSelectedMonth = expenseTxs.filter((t) => isSelectedMonth(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const expenseSelectedYear = expenseTxs.filter((t) => isSelectedYear(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const expenseAllTime = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

  // Income Totals
  const incomeToday = incomeTxs.filter((t) => isToday(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const incomeThisWeek = incomeTxs.filter((t) => isThisWeek(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const incomeSelectedMonth = incomeTxs.filter((t) => isSelectedMonth(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const incomeSelectedYear = incomeTxs.filter((t) => isSelectedYear(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const incomeAllTime = incomeTxs.reduce((sum, t) => sum + t.amount, 0);

  const selectedMonthObj = MONTHS.find((m) => m.value === selectedMonth);
  const selectedMonthName = selectedMonthObj?.name || 'Month';
  const selectedMonthLabel = `${selectedMonthObj?.short || 'Month'} ${selectedYear}`;
  const isCurrentMonthSelected = selectedYearMonth === currentYearMonth;
  const isCurrentYearSelected = selectedYear === currentYearNum;

  const expenseCards = [
    { id: 'today' as Period, label: 'Today', sublabel: todayStr, total: expenseToday },
    { id: 'week' as Period, label: 'This Week', sublabel: 'Current 7-day cycle', total: expenseThisWeek },
    { id: 'month' as Period, label: isCurrentMonthSelected ? 'This Month' : selectedMonthLabel, sublabel: selectedMonthLabel, total: expenseSelectedMonth },
    { id: 'year' as Period, label: isCurrentYearSelected ? 'This Year' : `Year ${selectedYear}`, sublabel: String(selectedYear), total: expenseSelectedYear },
    { id: 'all' as Period, label: 'All-Time', sublabel: 'Cumulative expenses', total: expenseAllTime },
  ];

  const incomeCards = [
    { id: 'today' as Period, label: 'Today', sublabel: todayStr, total: incomeToday },
    { id: 'week' as Period, label: 'This Week', sublabel: 'Current 7-day cycle', total: incomeThisWeek },
    { id: 'month' as Period, label: isCurrentMonthSelected ? 'This Month' : selectedMonthLabel, sublabel: selectedMonthLabel, total: incomeSelectedMonth },
    { id: 'year' as Period, label: isCurrentYearSelected ? 'This Year' : `Year ${selectedYear}`, sublabel: String(selectedYear), total: incomeSelectedYear },
    { id: 'all' as Period, label: 'All-Time', sublabel: 'Cumulative income', total: incomeAllTime },
  ];

  // Active breakdown transactions based on selected type and period
  const activeSourceTxs = breakdownType === 'expense' ? expenseTxs : incomeTxs;
  const activePeriodTxs = activeSourceTxs.filter((t) => {
    if (selectedPeriod === 'today') return isToday(t.date);
    if (selectedPeriod === 'week') return isThisWeek(t.date);
    if (selectedPeriod === 'month') return isSelectedMonth(t.date);
    if (selectedPeriod === 'year') return isSelectedYear(t.date);
    return true;
  });

  const activePeriodTotal = activePeriodTxs.reduce((sum, t) => sum + t.amount, 0);

  // Category breakdown for active selection
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
      const matchingTx = activePeriodTxs.find((t) => t.categoryId === catId);
      const name = cat ? cat.name : matchingTx?.categoryName || 'Other';
      const color = cat ? cat.color : matchingTx?.categoryColor || '#52525B';
      const icon = cat ? cat.icon : matchingTx?.categoryIcon || 'Tag';
      const percentage = activePeriodTotal > 0 ? (amount / activePeriodTotal) * 100 : 0;
      return { id: catId, name, color, icon, amount, percentage };
    })
    .sort((a, b) => b.amount - a.amount);

  const periodLabels: Record<Period, string> = {
    today: 'Today',
    week: 'This Week',
    month: `${selectedMonthName} ${selectedYear}`,
    year: `Year ${selectedYear}`,
    all: 'All-Time',
  };

  return (
    <div id="summary-panel" className="space-y-6">
      {/* 1. SUMMARY CARDS WITH EXPENSES / INCOME TOGGLE */}
      <div className="bg-white border border-zinc-200 rounded-[5px] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">
              {breakdownType === 'income' ? 'Income Summary' : 'Expenses Summary'}
            </h2>
            <p className="text-[11px] text-zinc-500">
              {breakdownType === 'income'
                ? 'Total money received across today, this week, month, year, and all-time.'
                : 'Total money spent across today, this week, month, year, and all-time.'}
            </p>
          </div>

          {/* Toggle Button */}
          <div
            id="summary-type-toggle"
            className="flex items-center bg-zinc-100 p-0.5 rounded-[5px] border border-zinc-200 self-start sm:self-auto"
          >
            <button
              type="button"
              id="btn-summary-toggle-expense"
              onClick={() => setBreakdownType('expense')}
              className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all cursor-pointer ${
                breakdownType === 'expense'
                  ? 'bg-white text-rose-700 font-semibold shadow-xs border border-zinc-200/60'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span>Expenses</span>
            </button>
            <button
              type="button"
              id="btn-summary-toggle-income"
              onClick={() => setBreakdownType('income')}
              className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all cursor-pointer ${
                breakdownType === 'income'
                  ? 'bg-white text-emerald-700 font-semibold shadow-xs border border-zinc-200/60'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span>Income</span>
            </button>
          </div>
        </div>

        {/* 5 Summary Cards for Active Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(breakdownType === 'expense' ? expenseCards : incomeCards).map((card) => {
            const isSelected = selectedPeriod === card.id;
            return (
              <button
                key={`${breakdownType}-${card.id}`}
                type="button"
                onClick={() => setSelectedPeriod(card.id)}
                className={`text-left p-3.5 rounded-[5px] border transition-all cursor-pointer ${
                  isSelected
                    ? breakdownType === 'income'
                      ? 'bg-emerald-50/40 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                      : 'bg-rose-50/40 border-rose-500 shadow-xs ring-1 ring-rose-500'
                    : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/60'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                  <span className="flex items-center gap-1">
                    <span>{card.label}</span>
                    {(card.id === 'month' || card.id === 'year') && (
                      <Calendar className="w-3 h-3 text-zinc-400" />
                    )}
                  </span>
                  {isSelected && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        breakdownType === 'income' ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    />
                  )}
                </div>
                <div
                  className={`text-base sm:text-lg font-bold font-mono tabular-nums ${
                    breakdownType === 'income' ? 'text-emerald-700' : 'text-zinc-900'
                  }`}
                >
                  {formatCurrency(card.total, currencySymbol)}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-1 truncate">
                  {card.sublabel}
                </div>
              </button>
            );
          })}
        </div>

        {/* Month Selector Component */}
        {selectedPeriod === 'month' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 bg-zinc-50/70 p-3 rounded-[4px] border border-zinc-200/80 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>Select Month:</span>
              </span>
              <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-[4px] p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                  title="Previous month"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-zinc-900 px-2 py-1 rounded-[3px] focus:outline-none cursor-pointer"
                  aria-label="Select month"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-xs font-semibold text-zinc-900 px-2 py-1 rounded-[3px] focus:outline-none cursor-pointer border-l border-zinc-200"
                  aria-label="Select year for month"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                  title="Next month"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!isCurrentMonthSelected && (
              <button
                type="button"
                onClick={() => {
                  setSelectedYear(currentYearNum);
                  setSelectedMonth(currentMonthStr);
                }}
                className="text-xs text-zinc-600 hover:text-zinc-900 font-medium px-2.5 py-1 rounded-[3px] bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Current Month
              </button>
            )}
          </div>
        )}

        {/* Year Selector Component */}
        {selectedPeriod === 'year' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 bg-zinc-50/70 p-3 rounded-[4px] border border-zinc-200/80 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>Select Year:</span>
              </span>
              <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-[4px] p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y - 1)}
                  className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                  title="Previous year"
                  aria-label="Previous year"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-xs font-semibold text-zinc-900 px-3 py-1 rounded-[3px] focus:outline-none cursor-pointer"
                  aria-label="Select year"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y + 1)}
                  className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                  title="Next year"
                  aria-label="Next year"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!isCurrentYearSelected && (
              <button
                type="button"
                onClick={() => setSelectedYear(currentYearNum)}
                className="text-xs text-zinc-600 hover:text-zinc-900 font-medium px-2.5 py-1 rounded-[3px] bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Current Year
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. CATEGORY BREAKDOWN */}
      <div className="bg-white border border-zinc-200 rounded-[5px] p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Breakdown -{' '}
              <span className={breakdownType === 'income' ? 'text-emerald-700' : 'text-rose-700'}>
                {breakdownType === 'income' ? 'Income' : 'Expenses'}
              </span>{' '}
              <span className="text-zinc-500 font-normal">({periodLabels[selectedPeriod]})</span>
            </h3>
          </div>
        </div>

        {/* Total Metric Header */}
        <div className="flex items-center justify-between text-xs mb-3 font-mono">
          <span className="text-zinc-500">
            Total {breakdownType === 'income' ? 'Earned' : 'Spent'} ({periodLabels[selectedPeriod]}):
          </span>
          <span className={`text-sm font-bold ${breakdownType === 'income' ? 'text-emerald-700' : 'text-zinc-900'}`}>
            {formatCurrency(activePeriodTotal, currencySymbol)}
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
            No {breakdownType} entries recorded for this time range.
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
