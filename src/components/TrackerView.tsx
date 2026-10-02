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
  ChevronDown,
  Layers,
  X,
} from 'lucide-react';
import { Category, Currency, Transaction, Account } from '../types';
import {
  formatCurrency,
  groupTransactions,
  calculateTimestamp,
  getTodayDateString,
  getCurrent12HourTime,
} from '../utils/formatters';
import { CategoryIcon, AccountIcon } from './CategoryIcon';
import { CurrencySelect } from './CurrencySelect';
import { CategorySelect } from './CategorySelect';
import { AccountSelect } from './AccountSelect';

function formatFriendlyDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dt = new Date(y, m, d);
  if (isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseTimeComponents(timeStr?: string): { hour: number; minute: string; period: 'AM' | 'PM' } {
  if (!timeStr) return { hour: 12, minute: '00', period: 'PM' };
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return { hour: 12, minute: '00', period: 'PM' };
  let h = parseInt(match[1], 10);
  if (h < 1 || h > 12) h = 12;
  const m = match[2];
  const p = ((match[3] || 'PM').toUpperCase() === 'AM' ? 'AM' : 'PM') as 'AM' | 'PM';
  return { hour: h, minute: m, period: p };
}

function construct12HourTime(hour: number, minute: string, period: 'AM' | 'PM'): string {
  return `${hour}:${minute.padStart(2, '0')} ${period}`;
}

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

  // Edit Transaction In-Modal Calendar & Time Popover State
  const [isEditCalOpen, setIsEditCalOpen] = useState(false);
  const editCalRef = useRef<HTMLDivElement>(null);
  const editCalButtonRef = useRef<HTMLButtonElement>(null);

  const [isEditTimeOpen, setIsEditTimeOpen] = useState(false);
  const editTimeRef = useRef<HTMLDivElement>(null);
  const editTimeButtonRef = useRef<HTMLButtonElement>(null);

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
    setIsEditTimeOpen(false);
  }, [editingTx?.id]);

  useEffect(() => {
    if (!isEditCalOpen && !isEditTimeOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        isEditCalOpen &&
        editCalRef.current &&
        !editCalRef.current.contains(target) &&
        editCalButtonRef.current &&
        !editCalButtonRef.current.contains(target)
      ) {
        setIsEditCalOpen(false);
      }
      if (
        isEditTimeOpen &&
        editTimeRef.current &&
        !editTimeRef.current.contains(target) &&
        editTimeButtonRef.current &&
        !editTimeButtonRef.current.contains(target)
      ) {
        setIsEditTimeOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditCalOpen(false);
        setIsEditTimeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditCalOpen, isEditTimeOpen]);

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

  const txToDelete = useMemo(() => {
    return deleteConfirmId ? transactions.find((t) => t.id === deleteConfirmId) : null;
  }, [deleteConfirmId, transactions]);

  const transferDeleteInfo = useMemo(() => {
    if (!txToDelete || txToDelete.type !== 'transfer') return null;
    const fromId = txToDelete.fromAccountId || txToDelete.accountId;
    const matchedAccount = fromId
      ? accounts.find((a) => a.id === fromId)
      : (txToDelete.fromAccountName ? accounts.find((a) => a.name.toLowerCase() === txToDelete.fromAccountName?.toLowerCase()) : undefined);

    const sourceAccountExists = Boolean(matchedAccount);
    const sourceAccountName = matchedAccount
      ? matchedAccount.name
      : (txToDelete.fromAccountName || txToDelete.accountName || 'the previous account');

    return {
      sourceAccountExists,
      sourceAccountName,
      amountFormatted: formatCurrency(txToDelete.amount, currencySymbol),
    };
  }, [txToDelete, accounts, currencySymbol]);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteTransaction(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  // Compute balances for all accounts to validate transfers accurately
  const accountBalances = useMemo(() => {
    const balances = new Map<string, number>();
    accounts.forEach((acc) => {
      balances.set(acc.id, acc.initialBalance || 0);
    });

    transactions.forEach((tx) => {
      if (tx.type === 'transfer') {
        const fromId = tx.fromAccountId || tx.accountId;
        const toId = tx.toAccountId;
        if (fromId && balances.has(fromId)) {
          balances.set(fromId, (balances.get(fromId) ?? 0) - tx.amount);
        }
        if (toId && balances.has(toId)) {
          balances.set(toId, (balances.get(toId) ?? 0) + tx.amount);
        }
      } else if (tx.accountId && balances.has(tx.accountId)) {
        const current = balances.get(tx.accountId)!;
        if (tx.type === 'income') {
          balances.set(tx.accountId, current + tx.amount);
        } else if (tx.type === 'expense') {
          balances.set(tx.accountId, current - tx.amount);
        }
      }
    });

    return balances;
  }, [accounts, transactions]);

  const originalTx = useMemo(() => {
    return editingTx ? transactions.find((t) => t.id === editingTx.id) : null;
  }, [editingTx?.id, transactions]);

  const existingTransferAmount = useMemo(() => {
    if (!originalTx || originalTx.type !== 'transfer') return 0;
    return originalTx.originalAmount !== undefined ? originalTx.originalAmount : originalTx.amount;
  }, [originalTx]);

  const transferSourceAccount = useMemo(() => {
    if (!editingTx || editingTx.type !== 'transfer') return null;
    const fromId =
      editingTx.fromAccountId ||
      editingTx.accountId ||
      originalTx?.fromAccountId ||
      originalTx?.accountId;
    if (!fromId) return null;
    return accounts.find((a) => a.id === fromId) || null;
  }, [editingTx, originalTx, accounts]);

  const transferSourceBalance = useMemo(() => {
    if (!transferSourceAccount) return 0;
    return accountBalances.get(transferSourceAccount.id) ?? (transferSourceAccount.initialBalance || 0);
  }, [transferSourceAccount, accountBalances]);

  const transferAccounts = useMemo(() => {
    if (!editingTx || editingTx.type !== 'transfer') return accounts;
    const list = [...accounts];
    const fromId = editingTx.fromAccountId || editingTx.accountId;
    if (fromId && !list.some((a) => a.id === fromId)) {
      list.unshift({
        id: fromId,
        name: editingTx.fromAccountName || editingTx.accountName || 'Account 1',
        type: 'other',
        icon: editingTx.fromAccountIcon || editingTx.accountIcon || 'Wallet',
        color: '#71717A',
      });
    }
    const toId = editingTx.toAccountId;
    if (toId && !list.some((a) => a.id === toId)) {
      list.push({
        id: toId,
        name: editingTx.toAccountName || 'Account 2',
        type: 'other',
        icon: editingTx.toAccountIcon || 'Wallet',
        color: '#71717A',
      });
    }
    return list;
  }, [accounts, editingTx]);

  const transferAmountValidationError = useMemo(() => {
    if (!editingTx || editingTx.type !== 'transfer') return null;
    const newAmount =
      typeof editingTx.amount === 'number'
        ? editingTx.amount
        : parseFloat(String(editingTx.amount)) || 0;

    if (newAmount <= 0) {
      return 'Please enter an amount greater than 0.';
    }

    const difference = newAmount - existingTransferAmount;
    if (difference > 0.0001) {
      if (!transferSourceAccount) {
        return 'The previous account is no longer available to fund the additional amount.';
      }
      if (transferSourceBalance < difference - 0.0001) {
        return `${transferSourceAccount.name} only has ${formatCurrency(
          transferSourceBalance,
          currencySymbol
        )} available. You need ${formatCurrency(
          difference,
          currencySymbol
        )} in its balance to increase this transfer to ${formatCurrency(newAmount, currencySymbol)}.`;
      }
    }

    return null;
  }, [
    editingTx,
    existingTransferAmount,
    transferSourceAccount,
    transferSourceBalance,
    currencySymbol,
  ]);

  const renderDateTimeSelectors = () => {
    if (!editingTx) return null;
    return (
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
              setIsEditCalOpen(false);
              setIsEditTimeOpen(false);
            }}
            className="text-[10px] text-zinc-500 hover:text-zinc-900 font-medium cursor-pointer transition-colors"
            title="Set to today and current time"
          >
            Set to Now
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 items-start relative">
          {/* Date Selector Trigger matching custom top calendar design */}
          <div className="relative">
            <button
              ref={editCalButtonRef}
              type="button"
              onClick={() => {
                setIsEditCalOpen((prev) => !prev);
                setIsEditTimeOpen(false);
              }}
              aria-expanded={isEditCalOpen}
              className={`w-full h-9 bg-white border rounded-[4px] px-2.5 flex items-center gap-2 text-xs transition-colors cursor-pointer ${
                isEditCalOpen
                  ? 'border-zinc-900 ring-1 ring-zinc-900 shadow-2xs'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
              title="Select date"
              aria-label="Select date"
            >
              <CalendarDays className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="font-mono text-xs font-semibold text-zinc-900 truncate">
                {editingTx.date ? formatFriendlyDate(editingTx.date) : 'Select date'}
              </span>
            </button>

            {/* In-Modal Popover Calendar - IDENTICAL design to the top calendar */}
            {isEditCalOpen && (
              <div
                ref={editCalRef}
                className="absolute left-0 top-full mt-2 z-50 bg-white border border-zinc-200 rounded-[6px] shadow-xl p-3.5 w-72 animate-in fade-in zoom-in-95 duration-100"
              >
                {/* Month Navigation inside calendar */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
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
                  {editCalGrid.map((item, idx) => {
                    const isSelected = editingTx.date === item.dateStr;
                    const isToday = item.dateStr === todayStr;
                    const hasTx = datesWithTransactions.has(item.dateStr);

                    if (!item.isCurrentMonth) {
                      return (
                        <div
                          key={`edit-pad-${idx}`}
                          className="h-8 flex items-center justify-center text-[11px] text-zinc-300 pointer-events-none select-none"
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

          {/* Time Selector Trigger */}
          <div className="relative">
            <button
              ref={editTimeButtonRef}
              type="button"
              onClick={() => {
                setIsEditTimeOpen((prev) => !prev);
                setIsEditCalOpen(false);
              }}
              aria-expanded={isEditTimeOpen}
              className={`w-full h-9 bg-white border rounded-[4px] px-2.5 flex items-center gap-2 text-xs transition-colors cursor-pointer ${
                isEditTimeOpen
                  ? 'border-zinc-900 ring-1 ring-zinc-900 shadow-2xs'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
              title="Select time"
              aria-label="Select time"
            >
              <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="font-mono text-xs font-semibold text-zinc-900 truncate">
                {editingTx.time || '12:00 PM'}
              </span>
            </button>

            {/* In-Modal Popover Time Picker */}
            {isEditTimeOpen && (
              <div
                ref={editTimeRef}
                className="absolute right-0 top-full mt-2 z-50 bg-white border border-zinc-200 rounded-[6px] shadow-xl p-3 w-64 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                  <span className="text-xs font-bold text-zinc-900 tracking-wide">
                    Select Time
                  </span>
                  <span className="font-mono font-bold text-xs text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-[3px]">
                    {editingTx.time || '12:00 PM'}
                  </span>
                </div>

                {(() => {
                  const { hour: curH, minute: curM, period: curP } = parseTimeComponents(editingTx.time);
                  const setTime = (h: number, m: string, p: 'AM' | 'PM') => {
                    const newTime = construct12HourTime(h, m, p);
                    setEditingTx({
                      ...editingTx,
                      time: newTime,
                      timestamp: calculateTimestamp(editingTx.date, newTime),
                    });
                  };

                  return (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      {/* Hours Column */}
                      <div>
                        <div className="text-[10px] font-semibold text-zinc-400 uppercase mb-1">Hour</div>
                        <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                            const isSelected = curH === h;
                            return (
                              <button
                                key={h}
                                type="button"
                                onClick={() => setTime(h, curM, curP)}
                                className={`w-full py-1 text-xs rounded-[3px] transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-zinc-900 text-white font-bold'
                                    : 'text-zinc-700 hover:bg-zinc-100'
                                }`}
                              >
                                {h}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Minutes Column */}
                      <div>
                        <div className="text-[10px] font-semibold text-zinc-400 uppercase mb-1">Minute</div>
                        <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
                          {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => {
                            const isSelected = curM === m;
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setTime(curH, m, curP)}
                                className={`w-full py-1 text-xs rounded-[3px] transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-zinc-900 text-white font-bold'
                                    : 'text-zinc-700 hover:bg-zinc-100'
                                }`}
                              >
                                {m}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Period Column */}
                      <div>
                        <div className="text-[10px] font-semibold text-zinc-400 uppercase mb-1">Period</div>
                        <div className="space-y-1">
                          {(['AM', 'PM'] as const).map((p) => {
                            const isSelected = curP === p;
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setTime(curH, curM, p)}
                                className={`w-full py-2 text-xs rounded-[3px] font-bold transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-zinc-900 text-white shadow-2xs'
                                    : 'text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
                                }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Time Picker Footer */}
                <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const now = getCurrent12HourTime();
                      setEditingTx({
                        ...editingTx,
                        time: now,
                        timestamp: calculateTimestamp(editingTx.date, now),
                      });
                    }}
                    className="text-zinc-700 hover:text-zinc-900 font-medium px-2 py-1 rounded-[3px] hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    Now
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditTimeOpen(false)}
                    className="text-zinc-400 hover:text-zinc-600 px-2 py-1 rounded-[3px] transition-colors cursor-pointer ml-auto"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    if (editingTx.type === 'transfer') {
      if (transferAmountValidationError) return;
      const fromId = editingTx.fromAccountId || editingTx.accountId;
      const toId = editingTx.toAccountId;
      if (!fromId || !toId || fromId === toId || !editingTx.amount || editingTx.amount <= 0) return;
      const fromAcc = accounts.find((a) => a.id === fromId);
      const toAcc = accounts.find((a) => a.id === toId);
      onUpdateTransaction({
        ...editingTx,
        fromAccountId: fromId,
        toAccountId: toId,
        accountId: fromId,
        fromAccountName: fromAcc?.name || editingTx.fromAccountName || 'Account 1',
        toAccountName: toAcc?.name || editingTx.toAccountName || 'Account 2',
        fromAccountIcon: fromAcc?.icon || editingTx.fromAccountIcon || 'Wallet',
        toAccountIcon: toAcc?.icon || editingTx.toAccountIcon || 'Wallet',
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

  const availableFilterCategories = useMemo(() => {
    if (filterType === 'expense') {
      return categories.filter((c) => c.type === 'expense');
    }
    if (filterType === 'income') {
      return categories.filter((c) => c.type === 'income');
    }
    return categories;
  }, [categories, filterType]);

  const handleFilterTypeChange = (type: 'all' | 'expense' | 'income' | 'transfer') => {
    setFilterType(type);
    if (type === 'transfer') {
      setFilterCategory('all');
    } else if (type === 'expense') {
      const activeCat = categories.find((c) => c.id === filterCategory);
      if (activeCat && activeCat.type !== 'expense') {
        setFilterCategory('all');
      }
    } else if (type === 'income') {
      const activeCat = categories.find((c) => c.id === filterCategory);
      if (activeCat && activeCat.type !== 'income') {
        setFilterCategory('all');
      }
    }
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
          <div className="flex items-center h-8 bg-zinc-100 p-0.5 rounded-[4px] border border-zinc-200 shrink-0">
            <button
              onClick={() => handleFilterTypeChange('all')}
              className={`h-full flex items-center justify-center px-2.5 text-xs font-medium rounded-[3px] transition-colors shrink-0 whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterTypeChange('expense')}
              className={`h-full flex items-center justify-center px-2.5 text-xs font-medium rounded-[3px] transition-colors shrink-0 whitespace-nowrap ${
                filterType === 'expense'
                  ? 'bg-white text-rose-600 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => handleFilterTypeChange('income')}
              className={`h-full flex items-center justify-center px-2.5 text-xs font-medium rounded-[3px] transition-colors shrink-0 whitespace-nowrap ${
                filterType === 'income'
                  ? 'bg-white text-emerald-600 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Income
            </button>
            <button
              onClick={() => handleFilterTypeChange('transfer')}
              className={`h-full flex items-center justify-center px-2.5 text-xs font-medium rounded-[3px] transition-colors shrink-0 whitespace-nowrap ${
                filterType === 'transfer'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Transfers
            </button>
          </div>

          {/* Category Filter - custom styled matching CurrencySelect, hidden when viewing transfers */}
          {filterType !== 'transfer' && (
            <div className="h-8 w-44 shrink-0">
              <CategorySelect
                id="filter-category-select"
                ariaLabel="Filter by category"
                categories={availableFilterCategories}
                value={filterCategory}
                onChange={setFilterCategory}
                showAllOption={true}
                className="h-full"
                buttonClassName="h-8 min-h-[32px]"
              />
            </div>
          )}
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
              {pendingUndoTx.type === 'transfer' ? (
                (() => {
                  const undoFromId = pendingUndoTx.fromAccountId || pendingUndoTx.accountId;
                  const undoAcc = undoFromId
                    ? accounts.find((a) => a.id === undoFromId)
                    : (pendingUndoTx.fromAccountName ? accounts.find((a) => a.name.toLowerCase() === pendingUndoTx.fromAccountName?.toLowerCase()) : undefined);
                  const destName = undoAcc ? undoAcc.name : 'Cash';
                  return (
                    <>
                      Deleted transfer ({formatCurrency(pendingUndoTx.amount, currencySymbol)}) — amount transferred back to{' '}
                      <strong className="font-medium text-zinc-100">{destName}</strong>.
                    </>
                  );
                })()
              ) : (
                <>
                  Deleted transaction &quot;
                  <strong className="font-medium text-zinc-100">{pendingUndoTx.note || 'Untitled'}</strong>&quot; (
                  {formatCurrency(pendingUndoTx.amount, currencySymbol)}).
                </>
              )}
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
                          <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-[4px] overflow-x-auto bg-white">
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
                                  className="group flex items-center py-2.5 px-3 hover:bg-zinc-50/80 transition-colors text-xs gap-3 sm:gap-4 min-w-[620px]"
                                >
                                  {/* Column 1: Clean IN / OUT / Transfer Indicator (No border or background) */}
                                  <div className="w-8 shrink-0 flex items-center justify-start">
                                    {isTransfer ? (
                                      <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-500" title="Transfer" />
                                    ) : (
                                      <span
                                        className={`font-mono text-[11px] font-semibold tracking-tight ${
                                          tx.type === 'expense'
                                            ? 'text-rose-600'
                                            : 'text-emerald-600'
                                        }`}
                                      >
                                        {tx.type === 'expense' ? 'OUT' : 'IN'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Column 2: Amount (fixed width) */}
                                  <div className="w-24 sm:w-28 shrink-0">
                                    <span
                                      className={`font-mono text-sm font-semibold tabular-nums ${
                                        isTransfer
                                          ? 'text-zinc-900'
                                          : tx.type === 'expense'
                                          ? 'text-zinc-900'
                                          : 'text-emerald-600'
                                      }`}
                                    >
                                      {formatCurrency(tx.amount, currencySymbol)}
                                    </span>
                                  </div>

                                  {/* Column 3: Category Column (aligned) */}
                                  <div className="w-32 sm:w-36 md:w-40 shrink-0 flex items-center min-w-0">
                                    {isTransfer ? (
                                      <span className="text-zinc-400 font-medium text-xs">
                                        Transfer
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5 text-zinc-700 font-medium truncate text-xs">
                                        <CategoryIcon name={catIcon} className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                        <span className="truncate">{catName}</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Column 4: Account Column (aligned, no wrappers) */}
                                  <div className="w-40 sm:w-48 md:w-56 shrink-0 flex items-center min-w-0">
                                    {isTransfer ? (
                                      <div className="flex items-center gap-1 text-xs whitespace-nowrap truncate font-medium text-zinc-700">
                                        <AccountIcon name={fromIcon} className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                        <span className="truncate max-w-[80px] sm:max-w-[95px]">{fromName}</span>
                                        <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0 mx-0.5" />
                                        <AccountIcon name={toIcon} className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                        <span className="truncate max-w-[80px] sm:max-w-[95px]">{toName}</span>
                                      </div>
                                    ) : accName ? (
                                      <span className="flex items-center gap-1.5 font-medium text-zinc-600 truncate text-xs">
                                        <AccountIcon name={accIcon} className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                                        <span className="truncate">{accName}</span>
                                      </span>
                                    ) : (
                                      <span className="text-zinc-300 text-xs">—</span>
                                    )}
                                  </div>

                                  {/* Column 5: Description Column (aligned) */}
                                  <div className="flex-1 min-w-[80px] truncate">
                                    {tx.note ? (
                                      <span className="text-zinc-500 truncate block text-xs" title={tx.note}>
                                        {tx.note}
                                      </span>
                                    ) : (
                                      <span className="text-zinc-300 text-xs select-none">—</span>
                                    )}
                                  </div>

                                  {/* Right: Subtle 12-hour timestamp and row actions */}
                                  <div className="flex items-center gap-3 shrink-0 ml-auto">
                                    <span className="font-mono text-[11px] text-zinc-400 tabular-nums flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-zinc-300" />
                                      {tx.time}
                                    </span>

                                    <div className="flex items-center opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                      <button
                                        onClick={() =>
                                          setEditingTx({
                                            ...tx,
                                            amount: tx.originalAmount !== undefined ? tx.originalAmount : tx.amount,
                                            currency: tx.originalCurrency || tx.currency || selectedCurrency,
                                          })
                                        }
                                        className="p-1 text-zinc-400 hover:text-zinc-700 rounded-[3px] hover:bg-zinc-200/60 cursor-pointer"
                                        title={isTransfer ? 'Edit transfer' : 'Edit transaction'}
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteClick(tx.id)}
                                        className="p-1 text-zinc-400 hover:text-rose-600 rounded-[3px] hover:bg-rose-50 cursor-pointer"
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
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-semibold text-zinc-900">
                {transferDeleteInfo ? 'Delete this transfer?' : 'Delete this transaction?'}
              </h4>
            </div>

            {transferDeleteInfo ? (
              transferDeleteInfo.sourceAccountExists ? (
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Deleting this transfer will transfer the amount ({transferDeleteInfo.amountFormatted}) back to the previous account (<strong className="font-semibold text-zinc-800">{transferDeleteInfo.sourceAccountName}</strong>).
                </p>
              ) : (
                <p className="text-xs text-zinc-600 leading-relaxed">
                  The previous account is no longer available. Deleting this transfer will automatically transfer the amount ({transferDeleteInfo.amountFormatted}) back to <strong className="font-semibold text-zinc-800">Cash</strong>.
                </p>
              )
            ) : (
              <p className="text-xs text-zinc-600 leading-relaxed">
                Delete this transaction? This can be undone immediately from the notification banner.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 font-medium rounded-[3px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-[3px] transition-colors cursor-pointer"
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
              /* Transfer Edit Form: Currency, Amount, From, To, Description ONLY */
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
                        className={`w-full h-full bg-white border px-2.5 rounded-[4px] font-mono font-semibold tabular-nums text-sm text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:outline-none ${
                          transferAmountValidationError ? 'border-rose-400 focus:border-rose-500' : 'border-zinc-200 focus:border-zinc-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Balance validation helper & alert message */}
                {transferSourceAccount && (
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 px-0.5">
                    <span>
                      Original amount: <strong className="font-mono text-zinc-700">{formatCurrency(existingTransferAmount, currencySymbol)}</strong>
                    </span>
                    <span>
                      {transferSourceAccount.name} balance:{' '}
                      <strong className={`font-mono ${transferSourceBalance >= 0 ? 'text-zinc-700' : 'text-rose-600'}`}>
                        {formatCurrency(transferSourceBalance, currencySymbol)}
                      </strong>
                    </span>
                  </div>
                )}

                {transferAmountValidationError && (
                  <p className="text-xs text-rose-600 font-medium leading-snug">
                    {transferAmountValidationError}
                  </p>
                )}

                {/* Muted Non-Editable Accounts (No account option removed) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">
                      From
                    </label>
                    <div className="relative h-9">
                      <AccountSelect
                        id="edit-transfer-from-account"
                        ariaLabel="From account (not editable)"
                        accounts={transferAccounts}
                        value={editingTx.fromAccountId || editingTx.accountId || ''}
                        onChange={() => {}}
                        allowNone={false}
                        disabled={true}
                        currencySymbol={currencySymbol}
                        className="h-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-500 font-medium mb-1.5 h-4 leading-4">
                      To
                    </label>
                    <div className="relative h-9">
                      <AccountSelect
                        id="edit-transfer-to-account"
                        ariaLabel="To account (not editable)"
                        accounts={transferAccounts}
                        value={editingTx.toAccountId || ''}
                        onChange={() => {}}
                        allowNone={false}
                        disabled={true}
                        currencySymbol={currencySymbol}
                        className="h-full"
                      />
                    </div>
                  </div>
                </div>

                {(editingTx.fromAccountId || editingTx.accountId) &&
                  editingTx.toAccountId &&
                  (editingTx.fromAccountId || editingTx.accountId) === editingTx.toAccountId && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      From and To accounts cannot be the same.
                    </p>
                  )}

                {/* Custom Date & Time Selector */}
                {renderDateTimeSelectors()}

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

                {/* Custom Date & Time Selector */}
                {renderDateTimeSelectors()}

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
                  Boolean(transferAmountValidationError) ||
                  (editingTx.type === 'transfer' &&
                    (!editingTx.amount ||
                      editingTx.amount <= 0 ||
                      !editingTx.toAccountId ||
                      !(editingTx.fromAccountId || editingTx.accountId) ||
                      (editingTx.fromAccountId || editingTx.accountId) === editingTx.toAccountId))
                }
                className="px-3 py-1.5 bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-[3px] cursor-pointer"
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
