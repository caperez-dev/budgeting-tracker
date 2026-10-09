import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  const todayStr = getTodayDateString();
  const [currentYearStr, currentMonthStr] = todayStr.split('-');
  const currentYearMonth = `${currentYearStr}-${currentMonthStr}`;
  const currentYearNum = parseInt(currentYearStr, 10);

  const [selectedPeriod, setSelectedPeriod] = useState<Period>(() => {
    try {
      const saved = localStorage.getItem('budget_tracker_summary_period_v1');
      if (saved && ['today', 'week', 'month', 'year', 'all'].includes(saved)) {
        return saved as Period;
      }
    } catch {}
    return 'month';
  });

  const [breakdownType, setBreakdownType] = useState<MetricType>(() => {
    try {
      const saved = localStorage.getItem('budget_tracker_summary_breakdown_type_v1');
      if (saved === 'expense' || saved === 'income') {
        return saved as MetricType;
      }
    } catch {}
    return 'expense';
  });

  // Month and Year selector state
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('budget_tracker_summary_year_v1');
      if (saved && !isNaN(parseInt(saved, 10))) {
        return parseInt(saved, 10);
      }
    } catch {}
    return currentYearNum;
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('budget_tracker_summary_month_v1');
      if (saved && /^\d{2}$/.test(saved)) {
        return saved;
      }
    } catch {}
    return currentMonthStr;
  });

  // Specific date selector for Today / Date panel
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('budget_tracker_summary_date_v1');
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
        return saved;
      }
    } catch {}
    return todayStr;
  });

  const selectedYearMonth = `${selectedYear}-${selectedMonth}`;

  useEffect(() => {
    try {
      localStorage.setItem('budget_tracker_summary_period_v1', selectedPeriod);
    } catch {}
  }, [selectedPeriod]);

  useEffect(() => {
    try {
      localStorage.setItem('budget_tracker_summary_breakdown_type_v1', breakdownType);
    } catch {}
  }, [breakdownType]);

  useEffect(() => {
    try {
      localStorage.setItem('budget_tracker_summary_year_v1', String(selectedYear));
    } catch {}
  }, [selectedYear]);

  useEffect(() => {
    try {
      localStorage.setItem('budget_tracker_summary_month_v1', selectedMonth);
    } catch {}
  }, [selectedMonth]);

  useEffect(() => {
    try {
      localStorage.setItem('budget_tracker_summary_date_v1', selectedDate);
    } catch {}
  }, [selectedDate]);

  // Popover state for selecting date, month or year directly on the cards
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [isMonthPopoverOpen, setIsMonthPopoverOpen] = useState(false);
  const [isYearPopoverOpen, setIsYearPopoverOpen] = useState(false);
  const datePopoverRef = useRef<HTMLDivElement>(null);
  const monthPopoverRef = useRef<HTMLDivElement>(null);
  const yearPopoverRef = useRef<HTMLDivElement>(null);
  const dateCalBtnRef = useRef<HTMLButtonElement>(null);
  const monthCalBtnRef = useRef<HTMLButtonElement>(null);
  const yearCalBtnRef = useRef<HTMLButtonElement>(null);

  // Calendar month view state for the date picker popover
  const [dateCalViewYear, setDateCalViewYear] = useState<number>(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const y = parseInt(selectedDate.split('-')[0], 10);
      if (!isNaN(y)) return y;
    }
    return currentYearNum;
  });

  const [dateCalViewMonth, setDateCalViewMonth] = useState<number>(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const m = parseInt(selectedDate.split('-')[1], 10);
      if (!isNaN(m)) return m - 1;
    }
    return parseInt(currentMonthStr, 10) - 1;
  });

  // Sync calendar view month when selectedDate changes
  useEffect(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const [y, m] = selectedDate.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setDateCalViewYear(y);
        setDateCalViewMonth(m - 1);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!isDatePopoverOpen && !isMonthPopoverOpen && !isYearPopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        isDatePopoverOpen &&
        datePopoverRef.current &&
        !datePopoverRef.current.contains(target) &&
        dateCalBtnRef.current &&
        !dateCalBtnRef.current.contains(target)
      ) {
        setIsDatePopoverOpen(false);
      }
      if (
        isMonthPopoverOpen &&
        monthPopoverRef.current &&
        !monthPopoverRef.current.contains(target) &&
        monthCalBtnRef.current &&
        !monthCalBtnRef.current.contains(target)
      ) {
        setIsMonthPopoverOpen(false);
      }
      if (
        isYearPopoverOpen &&
        yearPopoverRef.current &&
        !yearPopoverRef.current.contains(target) &&
        yearCalBtnRef.current &&
        !yearCalBtnRef.current.contains(target)
      ) {
        setIsYearPopoverOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDatePopoverOpen(false);
        setIsMonthPopoverOpen(false);
        setIsYearPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDatePopoverOpen, isMonthPopoverOpen, isYearPopoverOpen]);

  // Calendar calculation for date picker popover
  const dateCalMonthTitle = useMemo(() => {
    const d = new Date(dateCalViewYear, dateCalViewMonth, 1);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(d);
  }, [dateCalViewYear, dateCalViewMonth]);

  const handleDateCalPrevMonth = () => {
    setDateCalViewMonth((prev) => {
      if (prev === 0) {
        setDateCalViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleDateCalNextMonth = () => {
    setDateCalViewMonth((prev) => {
      if (prev === 11) {
        setDateCalViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const dateCalGrid = useMemo(() => {
    const firstDayIndex = new Date(dateCalViewYear, dateCalViewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(dateCalViewYear, dateCalViewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(dateCalViewYear, dateCalViewMonth, 0).getDate();

    const leadingDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevD = daysInPrevMonth - i;
      const prevM = dateCalViewMonth === 0 ? 12 : dateCalViewMonth;
      const prevY = dateCalViewMonth === 0 ? dateCalViewYear - 1 : dateCalViewYear;
      const dStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevD).padStart(2, '0')}`;
      leadingDays.push({ day: prevD, isCurrentMonth: false, dateStr: dStr });
    }

    const currentDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dStr = `${dateCalViewYear}-${String(dateCalViewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      currentDays.push({ day: d, isCurrentMonth: true, dateStr: dStr });
    }

    const totalSlots = leadingDays.length + currentDays.length > 35 ? 42 : 35;
    const trailingCount = totalSlots - (leadingDays.length + currentDays.length);
    const trailingDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let t = 1; t <= trailingCount; t++) {
      const nextM = dateCalViewMonth === 11 ? 1 : dateCalViewMonth + 2;
      const nextY = dateCalViewMonth === 11 ? dateCalViewYear + 1 : dateCalViewYear;
      const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
      trailingDays.push({ day: t, isCurrentMonth: false, dateStr: dStr });
    }

    return [...leadingDays, ...currentDays, ...trailingDays];
  }, [dateCalViewYear, dateCalViewMonth]);

  const datesWithTransactions = useMemo(() => {
    const dates = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.date) dates.add(tx.date);
    });
    return dates;
  }, [transactions]);

  // Available years from transactions
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    for (let i = currentYearNum - 4; i <= currentYearNum + 1; i++) {
      yearsSet.add(i);
    }
    transactions.forEach((t) => {
      if (t.date) {
        const y = parseInt(t.date.slice(0, 4), 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions, currentYearNum]);

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

  const isSelectedDate = (dateStr: string) => dateStr === selectedDate;
  const isSelectedMonth = (dateStr: string) => dateStr.startsWith(selectedYearMonth);
  const isSelectedYear = (dateStr: string) => dateStr.startsWith(String(selectedYear));

  // Filter Transactions by type
  const expenseTxs = transactions.filter((t) => t.type === 'expense');
  const incomeTxs = transactions.filter((t) => t.type === 'income');

  // Expense Totals
  const expenseDate = expenseTxs.filter((t) => isSelectedDate(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const expenseThisWeek = expenseTxs.filter((t) => isThisWeek(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const expenseSelectedMonth = expenseTxs.filter((t) => isSelectedMonth(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const expenseSelectedYear = expenseTxs.filter((t) => isSelectedYear(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const expenseAllTime = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

  // Income Totals
  const incomeDate = incomeTxs.filter((t) => isSelectedDate(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const incomeThisWeek = incomeTxs.filter((t) => isThisWeek(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const incomeSelectedMonth = incomeTxs.filter((t) => isSelectedMonth(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const incomeSelectedYear = incomeTxs.filter((t) => isSelectedYear(t.date)).reduce((sum, t) => sum + t.amount, 0);
  const incomeAllTime = incomeTxs.reduce((sum, t) => sum + t.amount, 0);

  const selectedMonthObj = MONTHS.find((m) => m.value === selectedMonth);
  const selectedMonthName = selectedMonthObj?.name || 'Month';
  const selectedMonthShort = selectedMonthObj?.short || 'Month';
  const isCurrentMonthSelected = selectedYearMonth === currentYearMonth;
  const isCurrentYearSelected = selectedYear === currentYearNum;
  const isActualToday = selectedDate === todayStr;

  // Format selected date nicely (e.g. Oct 10, 2026 or Oct 10)
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return todayStr;
    const parts = selectedDate.split('-');
    if (parts.length !== 3) return selectedDate;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dt = new Date(y, m, d);
    if (isNaN(dt.getTime())) return selectedDate;
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [selectedDate, todayStr]);

  const dateCardLabel = isActualToday ? 'Today' : formattedSelectedDate;
  const dateCardSublabel = isActualToday ? todayStr : 'Selected Date';

  // Descriptive card labels displaying what month and what year it is
  const monthCardLabel = isCurrentMonthSelected
    ? `This Month (${selectedMonthName})`
    : `${selectedMonthName} ${selectedYear}`;
  const monthCardSublabel = isCurrentMonthSelected
    ? `${selectedMonthName} ${selectedYear}`
    : `Selected Month`;

  const yearCardLabel = isCurrentYearSelected
    ? `This Year (${selectedYear})`
    : `Year ${selectedYear}`;
  const yearCardSublabel = isCurrentYearSelected
    ? `Year ${selectedYear}`
    : `Selected Year`;

  const expenseCards = [
    { id: 'today' as Period, label: dateCardLabel, sublabel: dateCardSublabel, total: expenseDate },
    { id: 'week' as Period, label: 'This Week', sublabel: 'Current 7-day cycle', total: expenseThisWeek },
    { id: 'month' as Period, label: monthCardLabel, sublabel: monthCardSublabel, total: expenseSelectedMonth },
    { id: 'year' as Period, label: yearCardLabel, sublabel: yearCardSublabel, total: expenseSelectedYear },
    { id: 'all' as Period, label: 'All-Time', sublabel: 'Cumulative expenses', total: expenseAllTime },
  ];

  const incomeCards = [
    { id: 'today' as Period, label: dateCardLabel, sublabel: dateCardSublabel, total: incomeDate },
    { id: 'week' as Period, label: 'This Week', sublabel: 'Current 7-day cycle', total: incomeThisWeek },
    { id: 'month' as Period, label: monthCardLabel, sublabel: monthCardSublabel, total: incomeSelectedMonth },
    { id: 'year' as Period, label: yearCardLabel, sublabel: yearCardSublabel, total: incomeSelectedYear },
    { id: 'all' as Period, label: 'All-Time', sublabel: 'Cumulative income', total: incomeAllTime },
  ];

  // Active breakdown transactions based on selected type and period
  const activeSourceTxs = breakdownType === 'expense' ? expenseTxs : incomeTxs;
  const activePeriodTxs = activeSourceTxs.filter((t) => {
    if (selectedPeriod === 'today') return isSelectedDate(t.date);
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
    today: isActualToday ? 'Today' : formattedSelectedDate,
    week: 'This Week',
    month: `${selectedMonthName} ${selectedYear}`,
    year: `Year ${selectedYear}`,
    all: 'All-Time',
  };

  return (
    <div id="summary-panel" className="space-y-6">
      {/* 1. SUMMARY CARDS WITH EXPENSES / INCOME TOGGLE */}
      <div className="bg-white border border-zinc-200 rounded-[5px] p-3 sm:p-5 shadow-xs space-y-3 sm:space-y-4">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {(breakdownType === 'expense' ? expenseCards : incomeCards).map((card) => {
            const isSelected = selectedPeriod === card.id;
            const isTodayCard = card.id === 'today';
            const isMonthCard = card.id === 'month';
            const isYearCard = card.id === 'year';

            const handleCardClick = () => {
              setSelectedPeriod(card.id);
              setIsDatePopoverOpen(false);
              setIsMonthPopoverOpen(false);
              setIsYearPopoverOpen(false);
            };

            return (
              <div
                key={`${breakdownType}-${card.id}`}
                className="relative h-full"
              >
                <div
                  role="button"
                  tabIndex={0}
                  id={`btn-summary-period-${card.id}`}
                  onClick={handleCardClick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick();
                    }
                  }}
                  className={`w-full h-full flex flex-col justify-between p-2 sm:p-3.5 rounded-[5px] border transition-all cursor-pointer select-none ${
                    isSelected
                      ? breakdownType === 'income'
                        ? 'bg-emerald-50/40 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                        : 'bg-rose-50/40 border-rose-500 shadow-xs ring-1 ring-rose-500'
                      : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between min-h-[20px] sm:min-h-[26px] text-[10px] sm:text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1 sm:mb-2">
                    <span className="truncate pr-1">{card.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0 min-h-[20px] sm:min-h-[24px]">
                      {isTodayCard && (
                        <button
                          ref={dateCalBtnRef}
                          type="button"
                          id="btn-summary-today-calendar"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPeriod('today');
                            setIsDatePopoverOpen((prev) => !prev);
                            setIsMonthPopoverOpen(false);
                            setIsYearPopoverOpen(false);
                          }}
                          title="Select specific date"
                          aria-label="Select specific date"
                          aria-expanded={isDatePopoverOpen}
                          className={`p-1 transition-colors cursor-pointer flex items-center justify-center ${
                            isDatePopoverOpen
                              ? 'text-zinc-900'
                              : 'text-zinc-400 hover:text-zinc-700'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isMonthCard && (
                        <button
                          ref={monthCalBtnRef}
                          type="button"
                          id="btn-summary-month-calendar"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPeriod('month');
                            setIsMonthPopoverOpen((prev) => !prev);
                            setIsDatePopoverOpen(false);
                            setIsYearPopoverOpen(false);
                          }}
                          title="Select month"
                          aria-label="Select month"
                          aria-expanded={isMonthPopoverOpen}
                          className={`p-1 transition-colors cursor-pointer flex items-center justify-center ${
                            isMonthPopoverOpen
                              ? 'text-zinc-900'
                              : 'text-zinc-400 hover:text-zinc-700'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isYearCard && (
                        <button
                          ref={yearCalBtnRef}
                          type="button"
                          id="btn-summary-year-calendar"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPeriod('year');
                            setIsYearPopoverOpen((prev) => !prev);
                            setIsDatePopoverOpen(false);
                            setIsMonthPopoverOpen(false);
                          }}
                          title="Select year"
                          aria-label="Select year"
                          aria-expanded={isYearPopoverOpen}
                          className={`p-1 transition-colors cursor-pointer flex items-center justify-center ${
                            isYearPopoverOpen
                              ? 'text-zinc-900'
                              : 'text-zinc-400 hover:text-zinc-700'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className={`text-sm sm:text-lg font-bold font-mono tabular-nums ${
                      breakdownType === 'income' ? 'text-emerald-700' : 'text-zinc-900'
                    }`}
                  >
                    {formatCurrency(card.total, currencySymbol)}
                  </div>
                </div>

                {/* Popover Date Selector directly on the Today panel */}
                {isTodayCard && isDatePopoverOpen && (
                  <div
                    ref={datePopoverRef}
                    className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-zinc-200 rounded-[6px] shadow-xl p-3.5 w-72 animate-in fade-in zoom-in-95 duration-100 max-w-[calc(100vw-2rem)]"
                  >
                    {/* Month Navigation inside calendar */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateCalPrevMonth();
                        }}
                        className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                        title="Previous month"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <span className="text-xs font-bold text-zinc-900 tracking-wide">
                        {dateCalMonthTitle}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateCalNextMonth();
                        }}
                        className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                        title="Next month"
                        aria-label="Next month"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Days of Week Header */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                        <span key={d} className="text-[10px] font-semibold text-zinc-400 py-0.5">
                          {d}
                        </span>
                      ))}
                    </div>

                    {/* Day Cells Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {dateCalGrid.map((item, idx) => {
                        const isDateActive = selectedDate === item.dateStr;
                        const isCurrentToday = item.dateStr === todayStr;
                        const hasTx = datesWithTransactions.has(item.dateStr);

                        if (!item.isCurrentMonth) {
                          return (
                            <div
                              key={`summary-date-pad-${idx}`}
                              className="h-8 flex items-center justify-center text-[11px] text-zinc-300 pointer-events-none select-none"
                            >
                              {item.day}
                            </div>
                          );
                        }

                        return (
                          <button
                            key={`summary-date-${item.dateStr}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(item.dateStr);
                              setIsDatePopoverOpen(false);
                            }}
                            className={`h-8 flex flex-col items-center justify-center rounded-[4px] text-xs transition-colors cursor-pointer relative ${
                              isDateActive
                                ? 'bg-zinc-900 text-white font-bold shadow-xs'
                                : isCurrentToday
                                ? 'text-zinc-900 font-bold border border-zinc-400 hover:bg-zinc-100'
                                : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                            }`}
                          >
                            <span>{item.day}</span>
                            {hasTx && (
                              <span
                                className={`w-1 h-1 rounded-full absolute bottom-1 ${
                                  isDateActive ? 'bg-white' : 'bg-emerald-500'
                                }`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(todayStr);
                          setIsDatePopoverOpen(false);
                        }}
                        className="text-zinc-700 hover:text-zinc-900 font-medium px-2 py-1 rounded-[3px] hover:bg-zinc-100 transition-colors cursor-pointer"
                      >
                        Today
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDatePopoverOpen(false);
                        }}
                        className="text-zinc-400 hover:text-zinc-600 px-2 py-1 rounded-[3px] transition-colors cursor-pointer ml-auto"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {/* Popover Month Selector directly on the Month panel */}
                {isMonthCard && isMonthPopoverOpen && (
                  <div
                    ref={monthPopoverRef}
                    className="absolute left-0 sm:right-0 sm:left-auto lg:left-0 lg:right-auto top-full mt-1.5 z-50 bg-white border border-zinc-200 rounded-[6px] shadow-xl p-3 w-64 animate-in fade-in zoom-in-95 duration-100 max-w-[calc(100vw-2rem)]"
                  >
                    {/* Year Navigation inside Month selector */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedYear((y) => y - 1);
                        }}
                        className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                        title="Previous year"
                        aria-label="Previous year"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-xs font-bold text-zinc-900 font-mono">
                        {selectedYear}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedYear((y) => y + 1);
                        }}
                        className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                        title="Next year"
                        aria-label="Next year"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Months 3x4 Grid */}
                    <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                      {MONTHS.map((m) => {
                        const isMonthActive = selectedMonth === m.value;
                        const isCurrent = m.value === currentMonthStr && selectedYear === currentYearNum;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMonth(m.value);
                              setIsMonthPopoverOpen(false);
                            }}
                            className={`py-1.5 text-xs rounded-[4px] font-medium transition-colors cursor-pointer ${
                              isMonthActive
                                ? 'bg-zinc-900 text-white font-bold shadow-xs'
                                : isCurrent
                                ? 'border border-zinc-400 text-zinc-900 font-bold hover:bg-zinc-100'
                                : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                            }`}
                          >
                            {m.short}
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedYear(currentYearNum);
                          setSelectedMonth(currentMonthStr);
                          setIsMonthPopoverOpen(false);
                        }}
                        className="text-zinc-700 hover:text-zinc-900 font-medium px-2 py-1 rounded-[3px] hover:bg-zinc-100 transition-colors cursor-pointer"
                      >
                        This Month
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMonthPopoverOpen(false);
                        }}
                        className="text-zinc-400 hover:text-zinc-600 px-2 py-1 rounded-[3px] transition-colors cursor-pointer ml-auto"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {/* Popover Year Selector directly on the Year panel */}
                {isYearCard && isYearPopoverOpen && (
                  <div
                    ref={yearPopoverRef}
                    className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-zinc-200 rounded-[6px] shadow-xl p-3 w-56 animate-in fade-in zoom-in-95 duration-100 max-w-[calc(100vw-2rem)]"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                      <span className="text-xs font-bold text-zinc-900">
                        Select Year
                      </span>
                      <span className="font-mono text-xs font-bold text-zinc-600">
                        {selectedYear}
                      </span>
                    </div>

                    {/* Available Years list */}
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {availableYears.map((yr) => {
                        const isYearActive = selectedYear === yr;
                        const isCurrent = yr === currentYearNum;
                        return (
                          <button
                            key={yr}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedYear(yr);
                              setIsYearPopoverOpen(false);
                            }}
                            className={`w-full py-1.5 px-2.5 text-xs rounded-[4px] font-mono flex items-center justify-between transition-colors cursor-pointer ${
                              isYearActive
                                ? 'bg-zinc-900 text-white font-bold shadow-xs'
                                : isCurrent
                                ? 'border border-zinc-300 text-zinc-900 font-semibold hover:bg-zinc-100'
                                : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                            }`}
                          >
                            <span>{yr}</span>
                            {isCurrent && (
                              <span className={`text-[10px] font-sans ${isYearActive ? 'text-zinc-300' : 'text-zinc-400'}`}>
                                Current
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedYear(currentYearNum);
                          setIsYearPopoverOpen(false);
                        }}
                        className="text-zinc-700 hover:text-zinc-900 font-medium px-2 py-1 rounded-[3px] hover:bg-zinc-100 transition-colors cursor-pointer"
                      >
                        This Year
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsYearPopoverOpen(false);
                        }}
                        className="text-zinc-400 hover:text-zinc-600 px-2 py-1 rounded-[3px] transition-colors cursor-pointer ml-auto"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
