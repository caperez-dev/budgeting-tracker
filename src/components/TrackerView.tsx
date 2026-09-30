import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Trash2,
  Edit3,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  ArrowRight,
  RotateCcw,
  RotateCw,
  AlertCircle,
  Clock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
} from 'lucide-react';
import { Category, Currency, Transaction, Account } from '../types';
import {
  formatCurrency,
  groupTransactions,
  formatTimeTo24Hour,
  format24HourTo12Hour,
  calculateTimestamp,
  getTodayDateString,
  getCurrent12HourTime,
} from '../utils/formatters';
import { CategoryIcon, AccountIcon } from './CategoryIcon';
import { CurrencySelect } from './CurrencySelect';
import { CategorySelect } from './CategorySelect';
import { AccountSelect } from './AccountSelect';

interface TrackerViewProps {
  transactions: Transaction[];
  categories: Category[];
  currencies: Currency[];
  accounts?: Account[];
  selectedCurrency: string;
  selectedMonthYearLabel?: string;
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
  allTransactionsCount?: number;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction: (tx: Transaction) => void;
  pendingUndoTx: Transaction | null;
  onUndoDelete: () => void;
  undoSecondsLeft: number;
}

export function TrackerView({
  transactions,
  categories,
  currencies,
  accounts = [],
  selectedCurrency,
  selectedMonthYearLabel,
  selectedDate,
  onSelectDate,
  allTransactionsCount,
  onDeleteTransaction,
  onUpdateTransaction,
  pendingUndoTx,
  onUndoDelete,
  undoSecondsLeft,
}: TrackerViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // In-App Calendar Popover State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);

  const [calViewYear, setCalViewYear] = useState<number>(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const y = parseInt(selectedDate.split('-')[0], 10);
      if (!isNaN(y)) return y;
    }
    return new Date().getFullYear();
  });

  const [calViewMonth, setCalViewMonth] = useState<number>(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const m = parseInt(selectedDate.split('-')[1], 10);
      if (!isNaN(m)) return m - 1;
    }
    return new Date().getMonth();
  });

  useEffect(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const [y, m] = selectedDate.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setCalViewYear(y);
        setCalViewMonth(m - 1);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!isCalendarOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(e.target as Node) &&
        calendarButtonRef.current &&
        !calendarButtonRef.current.contains(e.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCalendarOpen]);

  const calMonthTitle = useMemo(() => {
    const d = new Date(calViewYear, calViewMonth, 1);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(d);
  }, [calViewYear, calViewMonth]);

  const handleCalPrevMonth = () => {
    setCalViewMonth((prev) => {
      if (prev === 0) {
        setCalViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleCalNextMonth = () => {
    setCalViewMonth((prev) => {
      if (prev === 11) {
        setCalViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const calGrid = useMemo(() => {
    const firstDayIndex = new Date(calViewYear, calViewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calViewYear, calViewMonth, 0).getDate();

    const leadingDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevD = daysInPrevMonth - i;
      const prevM = calViewMonth === 0 ? 12 : calViewMonth;
      const prevY = calViewMonth === 0 ? calViewYear - 1 : calViewYear;
      const dStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevD).padStart(2, '0')}`;
      leadingDays.push({ day: prevD, isCurrentMonth: false, dateStr: dStr });
    }

    const currentDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dStr = `${calViewYear}-${String(calViewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      currentDays.push({ day: d, isCurrentMonth: true, dateStr: dStr });
    }

    const totalSlots = leadingDays.length + currentDays.length > 35 ? 42 : 35;
    const trailingCount = totalSlots - (leadingDays.length + currentDays.length);
    const trailingDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let t = 1; t <= trailingCount; t++) {
      const nextM = calViewMonth === 11 ? 1 : calViewMonth + 2;
      const nextY = calViewMonth === 11 ? calViewYear + 1 : calViewYear;
      const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
      trailingDays.push({ day: t, isCurrentMonth: false, dateStr: dStr });
    }

    return [...leadingDays, ...currentDays, ...trailingDays];
  }, [calViewYear, calViewMonth]);

  const datesWithTransactions = useMemo(() => {
    const dates = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.date) dates.add(tx.date);
    });
    return dates;
  }, [transactions]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Edit Transaction In-Modal Calendar Popover State
  const [isEditCalOpen, setIsEditCalOpen] = useState(false);
  const editCalRef = useRef<HTMLDivElement>(null);
  const editCalButtonRef = useRef<HTMLButtonElement>(null);

  const [editCalYear, setEditCalYear] = useState<number>(() => new Date().getFullYear());
  const [editCalMonth, setEditCalMonth] = useState<number>(() => new Date().getMonth());

  useEffect(() => {
    if (editingTx?.date && editingTx.date.includes('-')) {
      const [y, m] = editingTx.date.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setEditCalYear(y);
        setEditCalMonth(m - 1);
      }
    } else {
      setEditCalYear(new Date().getFullYear());
      setEditCalMonth(new Date().getMonth());
    }
    setIsEditCalOpen(false);
  }, [editingTx?.id]);

  useEffect(() => {
    if (!isEditCalOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        editCalRef.current &&
        !editCalRef.current.contains(e.target as Node) &&
        editCalButtonRef.current &&
        !editCalButtonRef.current.contains(e.target as Node)
      ) {
        setIsEditCalOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditCalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditCalOpen]);

  const editCalMonthTitle = useMemo(() => {
    const d = new Date(editCalYear, editCalMonth, 1);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(d);
  }, [editCalYear, editCalMonth]);

  const handleEditCalPrevMonth = () => {
    setEditCalMonth((prev) => {
      if (prev === 0) {
        setEditCalYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleEditCalNextMonth = () => {
    setEditCalMonth((prev) => {
      if (prev === 11) {
        setEditCalYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const editCalGrid = useMemo(() => {
    const firstDayIndex = new Date(editCalYear, editCalMonth, 1).getDay();
    const daysInCurrentMonth = new Date(editCalYear, editCalMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(editCalYear, editCalMonth, 0).getDate();

    const leadingDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevD = daysInPrevMonth - i;
      const prevM = editCalMonth === 0 ? 12 : editCalMonth;
      const prevY = editCalMonth === 0 ? editCalYear - 1 : editCalYear;
      leadingDays.push({
        day: prevD,
        isCurrentMonth: false,
        dateStr: `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevD).padStart(2, '0')}`,
      });
    }

    const currentDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      currentDays.push({
        day: d,
        isCurrentMonth: true,
        dateStr: `${editCalYear}-${String(editCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    const totalSlots = Math.ceil((leadingDays.length + currentDays.length) / 7) * 7;
    const trailingCount = totalSlots - (leadingDays.length + currentDays.length);
    const trailingDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let t = 1; t <= trailingCount; t++) {
      const nextM = editCalMonth === 11 ? 1 : editCalMonth + 2;
      const nextY = editCalMonth === 11 ? editCalYear + 1 : editCalYear;
      const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
      trailingDays.push({ day: t, isCurrentMonth: false, dateStr: dStr });
    }

    return [...leadingDays, ...currentDays, ...trailingDays];
  }, [editCalYear, editCalMonth]);

  // Reset pagination when filter criteria change
  React.useEffect(() => {
    setVisibleCount(10);
  }, [filterType, filterCategory, searchQuery, selectedMonthYearLabel]);

  const currencyObj = currencies.find((c) => c.code === selectedCurrency);
  const currencySymbol = currencyObj?.symbol || '₱';

  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  const accountMap = new Map<string, Account>();
  accounts.forEach((a) => accountMap.set(a.id, a));

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterType !== 'transfer' && filterCategory !== 'all' && tx.categoryId !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
      const catName = (cat ? cat.name : tx.categoryName || '').toLowerCase();
      const fromAcc = tx.fromAccountId ? accountMap.get(tx.fromAccountId) : (tx.accountId ? accountMap.get(tx.accountId) : undefined);
      const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : undefined;
      const fromName = (fromAcc ? fromAcc.name : tx.fromAccountName || '').toLowerCase();
      const toName = (toAcc ? toAcc.name : tx.toAccountName || '').toLowerCase();
      const acc = tx.accountId ? accountMap.get(tx.accountId) : undefined;
      const accName = (acc ? acc.name : tx.accountName || '').toLowerCase();
      const matchesNote = (tx.note || '').toLowerCase().includes(q);
      const matchesAmount = String(tx.amount).includes(q);
      const matchesDate = tx.date.includes(q);
      const matchesAccounts = fromName.includes(q) || toName.includes(q) || accName.includes(q);
      const matchesTransfer = tx.type === 'transfer' && ('transfer'.includes(q) || 'from'.includes(q) || 'to'.includes(q));
      if (!matchesNote && !catName.includes(q) && !matchesAccounts && !matchesAmount && !matchesDate && !matchesTransfer) {
        return false;
      }
    }
    return true;
  });

  const visibleTransactions = filtered.slice(0, visibleCount);
  const monthGroups = groupTransactions(visibleTransactions);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteTransaction(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    if (editingTx.type === 'transfer') {
      const fromId = editingTx.fromAccountId || editingTx.accountId;
      const toId = editingTx.toAccountId;
      if (!fromId || !toId || fromId === toId || !editingTx.amount) return;
      const fromAcc = accounts.find((a) => a.id === fromId);
      const toAcc = accounts.find((a) => a.id === toId);
      onUpdateTransaction({
        ...editingTx,
        fromAccountId: fromId,
        toAccountId: toId,
        accountId: fromId,
        fromAccountName: fromAcc?.name || 'Account 1',
        toAccountName: toAcc?.name || 'Account 2',
        fromAccountIcon: fromAcc?.icon || 'Wallet',
        toAccountIcon: toAcc?.icon || 'Wallet',
        accountName: fromAcc?.name,
        accountIcon: fromAcc?.icon,
        note: (editingTx.note || '').trim(),
      });
      setEditingTx(null);
      return;
    }
    onUpdateTransaction(editingTx);
    setEditingTx(null);
  };

  const totalInFiltered = useMemo(() => {
    return filtered.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  }, [filtered]);

  const totalOutFiltered = useMemo(() => {
    return filtered.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }, [filtered]);

  return (
    <div id="tracker-main-view" className="space-y-4">
      {/* Controls Bar: Search, Filters, Stats */}
      <div className="bg-white border border-zinc-200 rounded-[5px] p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] h-8">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions (note, category, amount)..."
              className="w-full h-8 bg-zinc-50 border border-zinc-200 text-xs pl-8 pr-3 rounded-[4px] text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center h-8 bg-zinc-100 p-0.5 rounded-[4px] border border-zinc-200">
            <button
              onClick={() => setFilterType('all')}
              className={`h-full flex items-center px-2.5 text-xs font-medium rounded-[3px] transition-colors ${
                filterType === 'all'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`h-full flex items-center px-2.5 text-xs font-medium rounded-[3px] transition-colors ${
                filterType === 'expense'
                  ? 'bg-white text-rose-600 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`h-full flex items-center px-2.5 text-xs font-medium rounded-[3px] transition-colors ${
                filterType === 'income'
                  ? 'bg-white text-emerald-600 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Income
            </button>
            <button
              onClick={() => setFilterType('transfer')}
              className={`h-full flex items-center px-2.5 text-xs font-medium rounded-[3px] transition-colors ${
                filterType === 'transfer'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Transfers
            </button>
          </div>

          {/* Category Filter - custom styled matching CurrencySelect */}
          <div className="h-8 min-w-[160px]">
            {filterType === 'transfer' ? (
              <div className="h-full px-2.5 flex items-center bg-zinc-50 border border-zinc-200 rounded-[4px] text-zinc-400 text-xs">
                No category for transfers
              </div>
            ) : (
              <CategorySelect
                id="filter-category-select"
                ariaLabel="Filter by category"
                categories={categories}
                value={filterCategory}
                onChange={setFilterCategory}
                showAllOption={true}
                className="h-full"
                buttonClassName="h-8 min-h-[32px]"
              />
            )}
          </div>
        </div>

        <div className="text-xs font-mono text-zinc-500">
          Showing <span className="font-semibold text-zinc-800">{Math.min(visibleCount, filtered.length)}</span>{' '}
          {filtered.length > visibleCount ? (
            <span>
              of <span className="font-semibold text-zinc-800">{filtered.length}</span> entries
            </span>
          ) : (
            filtered.length === 1 ? 'entry' : 'entries'
          )}
        </div>
      </div>

      {/* Undo Delete Toast / Snackbar (as mandated in §5) */}
      {pendingUndoTx && (
        <div
          id="undo-toast"
          className="bg-zinc-900 text-white px-4 py-2.5 rounded-[4px] shadow-lg flex items-center justify-between gap-3 border border-zinc-800 animate-slide-up"
        >
          <div className="flex items-center gap-2 text-xs">
            <RotateCcw className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>
              Deleted transaction "
              <strong className="font-medium text-zinc-100">{pendingUndoTx.note || 'Untitled'}</strong>" (
              {formatCurrency(pendingUndoTx.amount, currencySymbol)}).
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              Auto-finalizing in {undoSecondsLeft}s
            </span>
          </div>
          <button
            onClick={onUndoDelete}
            id="btn-undo-delete"
            className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-semibold rounded-[3px] transition-colors"
          >
            Undo Delete
          </button>
        </div>
      )}

      {/* Transactions Container */}
      <div className="bg-white border border-zinc-200 rounded-[5px] shadow-xs divide-y divide-zinc-100">
        {/* Persistent Section Header Bar: Month/Date & Interactive Calendar Selector */}
        <div className="p-4 sm:p-5 pb-3 flex flex-wrap items-center justify-between gap-3 bg-white rounded-t-[5px]">
          <div className="flex items-center gap-2">
            {/* In-App Interactive Calendar Selector on LEFT of Month Year */}
            <div className="relative inline-flex items-center">
              <button
                ref={calendarButtonRef}
                id="btn-tracker-calendar-picker"
                type="button"
                onClick={() => setIsCalendarOpen((prev) => !prev)}
                aria-expanded={isCalendarOpen}
                className={`p-1.5 rounded-[4px] border transition-colors cursor-pointer flex items-center gap-1 ${
                  selectedDate
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border-zinc-200 bg-white'
                }`}
                title={selectedDate ? 'Change selected date' : 'Select date from calendar'}
              >
                <CalendarDays className="w-3.5 h-3.5" />
              </button>

              {/* Reload Button - red reload icon only, no wrapper, height does not exceed calendar button, only displayed when date is selected */}
              {selectedDate && (
                <button
                  id="btn-tracker-reload"
                  type="button"
                  onClick={() => {
                    onSelectDate?.(null);
                    setSearchQuery('');
                    setFilterType('all');
                    setFilterCategory('all');
                    setVisibleCount(50);
                  }}
                  className="ml-1 p-1 text-red-500 hover:text-red-600 transition-colors cursor-pointer flex items-center justify-center h-7 w-7 max-h-[28px] max-w-[28px]"
                  title="Clear date selection"
                  aria-label="Clear date selection"
                >
                  <RotateCw className="w-3.5 h-3.5 text-red-500 hover:text-red-600" />
                </button>
              )}

              {/* In-App Popover Calendar Selector */}
              {isCalendarOpen && (
                <div
                  ref={calendarRef}
                  className="absolute left-0 top-full mt-2 z-50 bg-white border border-zinc-200 rounded-[6px] shadow-xl p-3.5 w-72 animate-in fade-in zoom-in-95 duration-100"
                >
                  {/* Month Navigation inside calendar */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                    <button
                      type="button"
                      onClick={handleCalPrevMonth}
                      className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                      title="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-bold text-zinc-900 tracking-wide">
                      {calMonthTitle}
                    </span>

                    <button
                      type="button"
                      onClick={handleCalNextMonth}
                      className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                      title="Next month"
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
                    {calGrid.map((item, idx) => {
                      const isSelected = selectedDate === item.dateStr;
                      const isToday = item.dateStr === todayStr;
                      const hasTx = datesWithTransactions.has(item.dateStr);

                      if (!item.isCurrentMonth) {
                        return (
                          <div
                            key={`pad-${idx}`}
                            className="h-8 flex items-center justify-center text-[11px] text-zinc-300 pointer-events-none select-none"
                          >
                            {item.day}
                          </div>
                        );
                      }

                      return (
                        <button
                          key={item.dateStr}
                          type="button"
                          onClick={() => {
                            onSelectDate?.(item.dateStr);
                            setIsCalendarOpen(false);
                          }}
                          className={`h-8 flex flex-col items-center justify-center rounded-[4px] text-xs transition-colors cursor-pointer relative ${
                            isSelected
                              ? 'bg-zinc-900 text-white font-bold shadow-xs'
                              : isToday
                              ? 'text-zinc-900 font-bold border border-zinc-400 hover:bg-zinc-100'
                              : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                          }`}
                        >
                          <span>{item.day}</span>
                          {hasTx && (
                            <span
                              className={`w-1 h-1 rounded-full absolute bottom-1 ${
                                isSelected ? 'bg-white' : 'bg-emerald-500'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar Footer */}
                  <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDate?.(todayStr);
                        setIsCalendarOpen(false);
                      }}
                      className="text-zinc-700 hover:text-zinc-900 font-medium px-2 py-1 rounded-[3px] hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      Today
                    </button>

                    {selectedDate && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectDate?.(null);
                          setIsCalendarOpen(false);
                        }}
                        className="text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded-[3px] hover:bg-zinc-100 transition-colors cursor-pointer"
                      >
                        All Month
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(false)}
                      className="text-zinc-400 hover:text-zinc-600 px-2 py-1 rounded-[3px] transition-colors cursor-pointer ml-auto"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
              {selectedDate && selectedMonthYearLabel ? selectedMonthYearLabel : (selectedMonthYearLabel || 'Transaction History')}
            </h3>
          </div>

          {/* Period In/Out Totals */}
          <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
            <span className="text-emerald-700 font-medium">
              +{formatCurrency(totalInFiltered, currencySymbol)}
            </span>
            <span className="text-rose-700 font-medium">
              -{formatCurrency(totalOutFiltered, currencySymbol)}
            </span>
          </div>
        </div>

        {monthGroups.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 space-y-3">
            <Layers className="w-8 h-8 mx-auto text-zinc-300" />
            <div>
              <p className="text-sm font-medium text-zinc-700">
                No transactions found {selectedDate ? `for ${selectedMonthYearLabel}` : `in this view`}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                {searchQuery || filterType !== 'all' || filterCategory !== 'all'
                  ? 'Try clearing your filters or search terms.'
                  : 'Add an entry using the form above or pick another date from the calendar.'}
              </p>
            </div>
            {selectedDate && (
              <button
                type="button"
                onClick={() => onSelectDate?.(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-[4px] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Show full month</span>
              </button>
            )}
          </div>
        ) : (
          monthGroups.map((month) => (
            <div key={month.yearMonth} className="p-4 sm:p-5 pt-3">
              {/* Weeks within Month (Week headers hidden if filtering by a specific date) */}
              <div className={`space-y-4 ${selectedDate ? 'ml-0' : 'ml-1 sm:ml-3'}`}>
                {month.weeks.map((week) => (
                  <div key={`${month.yearMonth}-${week.weekNumber}`} className="space-y-2">
                    {/* Level 2: Week Header (e.g. "Week 1", "Week 2") - HIDDEN when date filter is active */}
                    {!selectedDate && (
                      <div className="flex items-center justify-between py-1 px-2 bg-zinc-50/80 rounded-[4px] border border-zinc-100">
                        <span className="text-xs font-semibold text-zinc-700 font-mono">
                          {week.weekLabel}
                        </span>
                        <div className="text-[11px] font-mono text-zinc-500 tabular-nums">
                          Out: {formatCurrency(week.weekTotalOut, currencySymbol)}
                        </div>
                      </div>
                    )}

                    {/* Days within Week */}
                    <div className={`space-y-3 ${selectedDate ? 'ml-0' : 'ml-2 sm:ml-4'}`}>
                      {week.days.map((day) => (
                        <div key={day.date} className="space-y-1">
                          {/* Level 3: Day Header (e.g. "Sep 1") */}
                          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 pt-1">
                            <span className="font-mono text-zinc-800 font-semibold">
                              {day.displayDate} ({day.dayOfWeek})
                            </span>
                            <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                              Daily out: {formatCurrency(day.dayTotalOut, currencySymbol)}
                            </span>
                          </div>

                          {/* Chronological Row Entries */}
                          <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-[4px] overflow-hidden bg-white">
                            {day.transactions.map((tx) => {
                              const isTransfer = tx.type === 'transfer';
                              const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
                              const catColor = cat ? cat.color : tx.categoryColor || '#52525B';
                              const catIcon = cat ? cat.icon : tx.categoryIcon || 'Tag';
                              const catName = cat ? cat.name : tx.categoryName || 'Other';

                              const fromAcc = tx.fromAccountId
                                ? accountMap.get(tx.fromAccountId)
                                : (tx.accountId ? accountMap.get(tx.accountId) : undefined);
                              const fromName = fromAcc ? fromAcc.name : (tx.fromAccountName || tx.accountName || 'Account 1');
                              const fromIcon = fromAcc ? fromAcc.icon : (tx.fromAccountIcon || tx.accountIcon || 'Wallet');

                              const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : undefined;
                              const toName = toAcc ? toAcc.name : (tx.toAccountName || 'Account 2');
                              const toIcon = toAcc ? toAcc.icon : (tx.toAccountIcon || 'Wallet');

                              const acc = tx.accountId ? accountMap.get(tx.accountId) : undefined;
                              const accName = acc ? acc.name : tx.accountName;
                              const accIcon = acc ? acc.icon : tx.accountIcon || 'Wallet';

                              return (
                                <div
                                  key={tx.id}
                                  id={`tx-row-${tx.id}`}
                                  className="group flex flex-wrap items-center justify-between py-2 px-3 hover:bg-zinc-50/80 transition-colors text-xs"
                                >
                                  {/* Left: Tag [OUT]/[IN]/[Transfer], Amount, Category/Accounts, Note */}
                                  <div className="flex items-center gap-2.5 sm:gap-3.5 flex-1 min-w-[240px]">
                                    {/* Tag Badge: clean in / out / transfer indicators */}
                                    {isTransfer ? (
                                      <span
                                        className="w-14 shrink-0 flex items-center justify-center text-center py-0.5 rounded-[3px] font-mono text-[11px] font-medium border bg-zinc-100 text-zinc-700 border-zinc-200/80"
                                        title="Transfer"
                                      >
                                        transfer
                                      </span>
                                    ) : (
                                      <span
                                        className={`w-14 shrink-0 flex items-center justify-center text-center py-0.5 rounded-[3px] font-mono text-[11px] font-medium border ${
                                          tx.type === 'expense'
                                            ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                        }`}
                                      >
                                        {tx.type === 'expense' ? 'out' : 'in'}
                                      </span>
                                    )}

                                    {/* Amount: fixed width so all amounts align vertically */}
                                    <span
                                      className={`font-mono text-sm font-semibold tabular-nums w-28 shrink-0 ${
                                        isTransfer
                                          ? 'text-zinc-900'
                                          : tx.type === 'expense'
                                          ? 'text-zinc-900'
                                          : 'text-emerald-600'
                                      }`}
                                    >
                                      {formatCurrency(tx.amount, currencySymbol)}
                                    </span>

                                    {/* Transfer vs Regular Category & Account */}
                                    {isTransfer ? (
                                      <div className="inline-flex items-center gap-1.5 py-0.5 px-2 bg-zinc-50 border border-zinc-200/80 rounded-[4px] text-xs shadow-2xs whitespace-nowrap">
                                        <span className="flex items-center gap-1 font-medium text-zinc-800">
                                          <AccountIcon name={fromIcon} className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                          <span className="text-zinc-900">{fromName}</span>
                                        </span>
                                        <span className="text-zinc-400 text-xs font-normal select-none">→</span>
                                        <span className="flex items-center gap-1 font-medium text-zinc-800">
                                          <AccountIcon name={toIcon} className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                          <span className="text-zinc-900">{toName}</span>
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        {/* Category with Icon */}
                                        <span className="flex items-center gap-1 text-zinc-700 font-medium whitespace-nowrap">
                                          <CategoryIcon name={catIcon} className="w-3.5 h-3.5 text-zinc-400" />
                                          <span>{catName}</span>
                                        </span>

                                        {/* Account Badge if available */}
                                        {accName && (
                                          <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-600 bg-zinc-100/90 px-1.5 py-0.5 rounded-[3px] border border-zinc-200/60 whitespace-nowrap">
                                            <AccountIcon name={accIcon} className="w-3 h-3 shrink-0 text-zinc-500" />
                                            <span>{accName}</span>
                                          </span>
                                        )}
                                      </>
                                    )}

                                    {/* Description / Note */}
                                    {tx.note && (
                                      <span className="text-zinc-500 truncate max-w-[200px] sm:max-w-[320px]">
                                        {tx.note}
                                      </span>
                                    )}
                                  </div>

                                  {/* Right: Subtle 12-hour timestamp and row actions */}
                                  <div className="flex items-center gap-3">
                                    {/* Subtle 12-hour timestamp next to entry per §5 */}
                                    <span className="font-mono text-[11px] text-zinc-400 tabular-nums flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-zinc-300" />
                                      {tx.time}
                                    </span>

                                    {/* Actions */}
                                    <div className="flex items-center opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                      <button
                                        onClick={() => setEditingTx(tx)}
                                        className="p-1 text-zinc-400 hover:text-zinc-700 rounded-[3px] hover:bg-zinc-200/60"
                                        title={isTransfer ? 'Edit transfer' : 'Edit transaction'}
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteClick(tx.id)}
                                        className="p-1 text-zinc-400 hover:text-rose-600 rounded-[3px] hover:bg-rose-50"
                                        title={isTransfer ? 'Delete transfer' : 'Delete transaction'}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Load More Button */}
        {filtered.length > visibleCount && (
          <div className="p-3.5 sm:p-4 text-center border-t border-zinc-100 bg-zinc-50/50">
            <button
              type="button"
              id="btn-load-more"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-800 hover:text-zinc-950 border border-zinc-200 hover:border-zinc-300 text-xs font-semibold rounded-[4px] shadow-2xs transition-colors cursor-pointer"
            >
              <span>Load 10 more transactions</span>
              <span className="text-[11px] text-zinc-400 font-mono font-normal">
                (Showing {Math.min(visibleCount, filtered.length)} of {filtered.length})
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (per §5) */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-sm w-full shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h4 className="text-sm font-semibold text-zinc-900">Delete this transaction?</h4>
            </div>
            <p className="text-xs text-zinc-600">
              Delete this transaction? This can be undone immediately from the notification banner.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 font-medium rounded-[3px]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-[3px] transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleEditSubmit}
            className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-md w-full shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h4 className="text-sm font-semibold text-zinc-900">
                {editingTx.type === 'transfer' ? 'Edit Transfer' : 'Edit Transaction'}
              </h4>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="text-zinc-400 hover:text-zinc-600 text-xs"
              >
                ✕
              </button>
            </div>

            {editingTx.type === 'transfer' ? (
              /* Transfer Edit Form: Currency, Amount, Account 1, Account 2, Description ONLY */
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 items-start">
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">Currency</label>
                    <div className="relative h-9">
                      <CurrencySelect
                        currencies={currencies}
                        value={editingTx.currency}
                        onChange={(code) =>
                          setEditingTx({ ...editingTx, currency: code })
                        }
                        ariaLabel="Transfer currency"
                        className="h-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">Amount</label>
                    <div className="relative h-9">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="999999999.99"
                        required
                        value={editingTx.amount || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setEditingTx({ ...editingTx, amount: 0 });
                          } else {
                            const num = parseFloat(val);
                            if (!isNaN(num) && num <= 999999999.99) {
                              setEditingTx({ ...editingTx, amount: num });
                            }
                          }
                        }}
                        placeholder="Enter amount"
                        className="w-full h-full bg-white border border-zinc-200 px-2.5 rounded-[4px] font-mono font-semibold tabular-nums text-sm text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>
                </div>

                {accounts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
                    <div>
                      <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">From (Account 1)</label>
                      <div className="relative h-9">
                        <AccountSelect
                          id="edit-transfer-from-account"
                          ariaLabel="From account"
                          accounts={accounts}
                          value={editingTx.fromAccountId || editingTx.accountId || ''}
                          onChange={(accId) => {
                            const acc = accounts.find((a) => a.id === accId);
                            setEditingTx({
                              ...editingTx,
                              fromAccountId: accId,
                              accountId: accId,
                              fromAccountName: acc?.name,
                              fromAccountIcon: acc?.icon,
                            });
                          }}
                          currencySymbol={currencySymbol}
                          className="h-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">To (Account 2)</label>
                      <div className="relative h-9">
                        <AccountSelect
                          id="edit-transfer-to-account"
                          ariaLabel="To account"
                          accounts={accounts}
                          value={editingTx.toAccountId || ''}
                          onChange={(accId) => {
                            const acc = accounts.find((a) => a.id === accId);
                            setEditingTx({
                              ...editingTx,
                              toAccountId: accId,
                              toAccountName: acc?.name,
                              toAccountIcon: acc?.icon,
                            });
                          }}
                          currencySymbol={currencySymbol}
                          className="h-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(editingTx.fromAccountId || editingTx.accountId) &&
                  editingTx.toAccountId &&
                  (editingTx.fromAccountId || editingTx.accountId) === editingTx.toAccountId && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      From and To accounts cannot be the same.
                    </p>
                  )}

                {/* Date & Time Selector with Calendar Icon */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5 h-4 leading-4">
                    <label className="text-zinc-500 font-medium flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Date & Time</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const today = getTodayDateString();
                        const now = getCurrent12HourTime();
                        setEditingTx({
                          ...editingTx,
                          date: today,
                          time: now,
                          timestamp: calculateTimestamp(today, now),
                        });
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-900 font-medium cursor-pointer transition-colors"
                      title="Set to today and current time"
                    >
                      Set to Now
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-start">
                    {/* Date Selector with Calendar Icon */}
                    <div className="relative h-9 flex items-center">
                      <button
                        ref={editCalButtonRef}
                        type="button"
                        onClick={() => setIsEditCalOpen((prev) => !prev)}
                        aria-expanded={isEditCalOpen}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer z-10 flex items-center justify-center"
                        title="Open calendar to pick date"
                        aria-label="Open calendar selector"
                      >
                        <CalendarDays className="w-4 h-4 text-zinc-600" />
                      </button>

                      <input
                        type="date"
                        required
                        value={editingTx.date || ''}
                        onClick={(e) => (e.target as any).showPicker?.()}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setEditingTx({
                            ...editingTx,
                            date: newDate,
                            timestamp: calculateTimestamp(newDate, editingTx.time),
                          });
                        }}
                        className="w-full h-full bg-white border border-zinc-200 pl-8 pr-2.5 rounded-[4px] font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-500 cursor-pointer"
                      />
                    </div>

                    {/* Time Selector with Clock Icon */}
                    <div className="relative h-9 flex items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector('input[type="time"]') as HTMLInputElement | null;
                          input?.showPicker?.();
                          input?.focus();
                        }}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer z-10 flex items-center justify-center"
                        title="Select time"
                        aria-label="Select time"
                      >
                        <Clock className="w-4 h-4 text-zinc-600" />
                      </button>

                      <input
                        type="time"
                        required
                        value={formatTimeTo24Hour(editingTx.time)}
                        onClick={(e) => (e.target as any).showPicker?.()}
                        onChange={(e) => {
                          const time24 = e.target.value;
                          const time12 = format24HourTo12Hour(time24);
                          setEditingTx({
                            ...editingTx,
                            time: time12,
                            timestamp: calculateTimestamp(editingTx.date, time12),
                          });
                        }}
                        className="w-full h-full bg-white border border-zinc-200 pl-8 pr-2.5 rounded-[4px] font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* In-Modal Calendar Popover */}
                  {isEditCalOpen && (
                    <div
                      ref={editCalRef}
                      className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-zinc-200 rounded-[6px] shadow-xl p-3 w-72 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-100">
                        <button
                          type="button"
                          onClick={handleEditCalPrevMonth}
                          className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                          title="Previous month"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="text-xs font-bold text-zinc-900 tracking-wide">
                          {editCalMonthTitle}
                        </span>

                        <button
                          type="button"
                          onClick={handleEditCalNextMonth}
                          className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                          title="Next month"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                          <span key={d} className="text-[10px] font-semibold text-zinc-400 py-0.5">
                            {d}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center">
                        {editCalGrid.map((item, idx) => {
                          const isSelected = editingTx.date === item.dateStr;
                          const isToday = item.dateStr === todayStr;

                          if (!item.isCurrentMonth) {
                            return (
                              <div
                                key={`edit-pad-${idx}`}
                                className="h-7 flex items-center justify-center text-[10px] text-zinc-300 pointer-events-none select-none"
                              >
                                {item.day}
                              </div>
                            );
                          }

                          return (
                            <button
                              key={`edit-day-${item.dateStr}`}
                              type="button"
                              onClick={() => {
                                setEditingTx({
                                  ...editingTx,
                                  date: item.dateStr,
                                  timestamp: calculateTimestamp(item.dateStr, editingTx.time),
                                });
                                setIsEditCalOpen(false);
                              }}
                              className={`h-7 flex items-center justify-center rounded-[3px] text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-zinc-900 text-white font-bold shadow-xs'
                                  : isToday
                                  ? 'text-zinc-900 font-bold border border-zinc-400 hover:bg-zinc-100'
                                  : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                              }`}
                            >
                              <span>{item.day}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            const today = getTodayDateString();
                            setEditingTx({
                              ...editingTx,
                              date: today,
                              timestamp: calculateTimestamp(today, editingTx.time),
                            });
                            setIsEditCalOpen(false);
                          }}
                          className="text-zinc-700 hover:text-zinc-900 font-medium px-2 py-1 rounded-[3px] hover:bg-zinc-100 transition-colors cursor-pointer"
                        >
                          Today
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsEditCalOpen(false)}
                          className="text-zinc-400 hover:text-zinc-600 px-2 py-1 rounded-[3px] transition-colors cursor-pointer ml-auto"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 h-4 leading-4">
                    <label className="block text-zinc-500 font-medium">Description (Optional)</label>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {(editingTx.note || '').length}/100
                    </span>
                  </div>
                  <div className="relative h-9">
                    <input
                      type="text"
                      maxLength={100}
                      value={editingTx.note || ''}
                      onChange={(e) => setEditingTx({ ...editingTx, note: e.target.value.slice(0, 100) })}
                      placeholder="Description (optional)"
                      className="w-full h-full bg-white border border-zinc-200 px-2.5 rounded-[4px] text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Regular Transaction Edit Form */
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 items-start">
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">Currency</label>
                    <div className="relative h-9">
                      <CurrencySelect
                        currencies={currencies}
                        value={editingTx.currency}
                        onChange={(code) =>
                          setEditingTx({ ...editingTx, currency: code })
                        }
                        ariaLabel="Transaction currency"
                        className="h-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">Amount</label>
                    <div className="relative h-9">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="999999999.99"
                        required
                        value={editingTx.amount || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setEditingTx({ ...editingTx, amount: 0 });
                          } else {
                            const num = parseFloat(val);
                            if (!isNaN(num) && num <= 999999999.99) {
                              setEditingTx({ ...editingTx, amount: num });
                            }
                          }
                        }}
                        placeholder="Enter amount"
                        className="w-full h-full bg-white border border-zinc-200 px-2.5 rounded-[4px] font-mono font-semibold tabular-nums text-sm text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Category (Left) and Account (Right) Side by Side */}
                <div className={`grid gap-2 items-start ${accounts.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">Category</label>
                    <div className="relative h-9">
                      <CategorySelect
                        id="edit-tx-category-select"
                        ariaLabel="Transaction category"
                        categories={categories.filter(
                          (c) => c.type === editingTx.type
                        )}
                        value={editingTx.categoryId || ''}
                        onChange={(catId) =>
                          setEditingTx({ ...editingTx, categoryId: catId })
                        }
                        showAllOption={false}
                        className="h-full"
                      />
                    </div>
                  </div>

                  {accounts.length > 0 && (
                    <div>
                      <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">Account</label>
                      <div className="relative h-9">
                        <AccountSelect
                          id="edit-tx-account-select"
                          ariaLabel="Transaction account"
                          accounts={accounts}
                          value={editingTx.accountId || ''}
                          onChange={(accId) => {
                            setEditingTx({ ...editingTx, accountId: accId });
                          }}
                          currencySymbol={currencySymbol}
                          className="h-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Date & Time Selector with Calendar Icon */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5 h-4 leading-4">
                    <label className="text-zinc-500 font-medium flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Date & Time</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const today = getTodayDateString();
                        const now = getCurrent12HourTime();
                        setEditingTx({
                          ...editingTx,
                          date: today,
                          time: now,
                          timestamp: calculateTimestamp(today, now),
                        });
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-900 font-medium cursor-pointer transition-colors"
                      title="Set to today and current time"
                    >
                      Set to Now
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-start">
                    {/* Date Selector with Calendar Icon */}
                    <div className="relative h-9 flex items-center">
                      <button
                        ref={editCalButtonRef}
                        type="button"
                        onClick={() => setIsEditCalOpen((prev) => !prev)}
                        aria-expanded={isEditCalOpen}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer z-10 flex items-center justify-center"
                        title="Open calendar to pick date"
                        aria-label="Open calendar selector"
                      >
                        <CalendarDays className="w-4 h-4 text-zinc-600" />
                      </button>

                      <input
                        type="date"
                        required
                        value={editingTx.date || ''}
                        onClick={(e) => (e.target as any).showPicker?.()}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setEditingTx({
                            ...editingTx,
                            date: newDate,
                            timestamp: calculateTimestamp(newDate, editingTx.time),
                          });
                        }}
                        className="w-full h-full bg-white border border-zinc-200 pl-8 pr-2.5 rounded-[4px] font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-500 cursor-pointer"
                      />
                    </div>

                    {/* Time Selector with Clock Icon */}
                    <div className="relative h-9 flex items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector('input[type="time"]') as HTMLInputElement | null;
                          input?.showPicker?.();
                          input?.focus();
                        }}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer z-10 flex items-center justify-center"
                        title="Select time"
                        aria-label="Select time"
                      >
                        <Clock className="w-4 h-4 text-zinc-600" />
                      </button>

                      <input
                        type="time"
                        required
                        value={formatTimeTo24Hour(editingTx.time)}
                        onClick={(e) => (e.target as any).showPicker?.()}
                        onChange={(e) => {
                          const time24 = e.target.value;
                          const time12 = format24HourTo12Hour(time24);
                          setEditingTx({
                            ...editingTx,
                            time: time12,
                            timestamp: calculateTimestamp(editingTx.date, time12),
                          });
                        }}
                        className="w-full h-full bg-white border border-zinc-200 pl-8 pr-2.5 rounded-[4px] font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* In-Modal Calendar Popover */}
                  {isEditCalOpen && (
                    <div
                      ref={editCalRef}
                      className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-zinc-200 rounded-[6px] shadow-xl p-3 w-72 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-100">
                        <button
                          type="button"
                          onClick={handleEditCalPrevMonth}
                          className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                          title="Previous month"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="text-xs font-bold text-zinc-900 tracking-wide">
                          {editCalMonthTitle}
                        </span>

                        <button
                          type="button"
                          onClick={handleEditCalNextMonth}
                          className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-[3px] transition-colors cursor-pointer"
                          title="Next month"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                          <span key={d} className="text-[10px] font-semibold text-zinc-400 py-0.5">
                            {d}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center">
                        {editCalGrid.map((item, idx) => {
                          const isSelected = editingTx.date === item.dateStr;
                          const isToday = item.dateStr === todayStr;

                          if (!item.isCurrentMonth) {
                            return (
                              <div
                                key={`reg-edit-pad-${idx}`}
                                className="h-7 flex items-center justify-center text-[10px] text-zinc-300 pointer-events-none select-none"
                              >
                                {item.day}
                              </div>
                            );
                          }

                          return (
                            <button
                              key={`reg-edit-day-${item.dateStr}`}
                              type="button"
                              onClick={() => {
                                setEditingTx({
                                  ...editingTx,
                                  date: item.dateStr,
                                  timestamp: calculateTimestamp(item.dateStr, editingTx.time),
                                });
                                setIsEditCalOpen(false);
                              }}
                              className={`h-7 flex items-center justify-center rounded-[3px] text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-zinc-900 text-white font-bold shadow-xs'
                                  : isToday
                                  ? 'text-zinc-900 font-bold border border-zinc-400 hover:bg-zinc-100'
                                  : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                              }`}
                            >
                              <span>{item.day}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            const today = getTodayDateString();
                            setEditingTx({
                              ...editingTx,
                              date: today,
                              timestamp: calculateTimestamp(today, editingTx.time),
                            });
                            setIsEditCalOpen(false);
                          }}
                          className="text-zinc-700 hover:text-zinc-900 font-medium px-2 py-1 rounded-[3px] hover:bg-zinc-100 transition-colors cursor-pointer"
                        >
                          Today
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsEditCalOpen(false)}
                          className="text-zinc-400 hover:text-zinc-600 px-2 py-1 rounded-[3px] transition-colors cursor-pointer ml-auto"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 h-4 leading-4">
                    <label className="block text-zinc-500 font-medium">Description (Optional)</label>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {(editingTx.note || '').length}/100
                    </span>
                  </div>
                  <div className="relative h-9">
                    <input
                      type="text"
                      maxLength={100}
                      value={editingTx.note || ''}
                      onChange={(e) => setEditingTx({ ...editingTx, note: e.target.value.slice(0, 100) })}
                      placeholder="Description (optional)"
                      className="w-full h-full bg-white border border-zinc-200 px-2.5 rounded-[4px] text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 rounded-[3px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  editingTx.type === 'transfer' &&
                  (!editingTx.amount ||
                    !editingTx.toAccountId ||
                    !(editingTx.fromAccountId || editingTx.accountId) ||
                    (editingTx.fromAccountId || editingTx.accountId) === editingTx.toAccountId)
                }
                className="px-3 py-1.5 bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-[3px]"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
