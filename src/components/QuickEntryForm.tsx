import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  PlusCircle,
  Check,
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Category, Currency, TransactionType, Account, Transaction } from '../types';
import { CategoryIcon, AccountIcon } from './CategoryIcon';
import {
  getCurrent12HourTime,
  getTodayDateString,
  formatCurrency,
  parseTimeComponents,
  construct12HourTime,
  formatFriendlyDate,
} from '../utils/formatters';
import { CurrencySelect } from './CurrencySelect';
import { SpecularButton } from './ui/SpecularButton';
import { ModalPortal } from './ui/ModalPortal';
import LatticeLoader from './ui/LatticeLoader';

interface QuickEntryFormProps {
  currencies: Currency[];
  categories: Category[];
  accounts?: Account[];
  transactions?: Transaction[];
  selectedCurrency: string;
  onSave: (tx: {
    type: TransactionType;
    amount: number;
    currency: string;
    categoryId: string;
    accountId?: string;
    note: string;
    date: string;
    time: string;
  }) => void;
  onOpenAddCategory: (type: TransactionType) => void;
  onOpenAddAccount?: () => void;
  onOpenCurrencyManager?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export function QuickEntryForm({
  currencies,
  categories,
  accounts = [],
  transactions = [],
  selectedCurrency,
  onSave,
  onOpenAddCategory,
  onOpenAddAccount,
  onOpenCurrencyManager,
  isModal = false,
  onClose,
}: QuickEntryFormProps) {
  const [type, setType] = useState<TransactionType>(() => {
    try {
      const saved = localStorage.getItem('budget_tracker_quick_entry_type_v1');
      if (saved === 'expense' || saved === 'income') return saved as TransactionType;
    } catch {}
    return 'expense';
  });

  useEffect(() => {
    try {
      localStorage.setItem('budget_tracker_quick_entry_type_v1', type);
    } catch {}
  }, [type]);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>(selectedCurrency);
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>(() => {
    return (
      accounts.find((a) => a.id === 'cash' || a.name.toLowerCase() === 'cash')?.id ||
      accounts.find((a) => a.isDefault)?.id ||
      accounts[0]?.id ||
      ''
    );
  });
  const [note, setNote] = useState<string>('');
  const [amountError, setAmountError] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  // Saving lattice loader overlay state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const savingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savingTimeoutRef.current) clearTimeout(savingTimeoutRef.current);
    };
  }, []);

  // Date and Time picker state
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [selectedTime, setSelectedTime] = useState<string>(() => getCurrent12HourTime());
  const [isDateTimeOpen, setIsDateTimeOpen] = useState<boolean>(false);
  const [activePickerTab, setActivePickerTab] = useState<'date' | 'time'>('date');
  const [calYear, setCalYear] = useState<number>(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState<number>(() => new Date().getMonth());

  const dateTimePickerRef = useRef<HTMLDivElement>(null);
  const dateTimeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dateTimePickerRef.current &&
        !dateTimePickerRef.current.contains(e.target as Node) &&
        dateTimeButtonRef.current &&
        !dateTimeButtonRef.current.contains(e.target as Node)
      ) {
        setIsDateTimeOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDateTimeOpen(false);
    };
    if (isDateTimeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDateTimeOpen]);

  // Sync calendar view month with selectedDate if changed
  useEffect(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const [y, m] = selectedDate.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setCalYear(y);
        setCalMonth(m - 1);
      }
    }
  }, [selectedDate]);

  const calMonthTitle = useMemo(() => {
    return new Date(calYear, calMonth, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [calYear, calMonth]);

  const handlePrevMonth = () => {
    setCalMonth((m) => {
      if (m === 0) {
        setCalYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  const handleNextMonth = () => {
    setCalMonth((m) => {
      if (m === 11) {
        setCalYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  const calGrid = useMemo(() => {
    const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
    const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    const leadingDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = calMonth === 0 ? 12 : calMonth;
      const prevY = calMonth === 0 ? calYear - 1 : calYear;
      const dStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      leadingDays.push({ day: d, isCurrentMonth: false, dateStr: dStr });
    }

    const currentDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      currentDays.push({
        day: d,
        isCurrentMonth: true,
        dateStr: `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    const totalSlots = Math.ceil((leadingDays.length + currentDays.length) / 7) * 7;
    const trailingCount = totalSlots - (leadingDays.length + currentDays.length);
    const trailingDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let t = 1; t <= trailingCount; t++) {
      const nextM = calMonth === 11 ? 1 : calMonth + 2;
      const nextY = calMonth === 11 ? calYear + 1 : calYear;
      const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
      trailingDays.push({ day: t, isCurrentMonth: false, dateStr: dStr });
    }

    return [...leadingDays, ...currentDays, ...trailingDays];
  }, [calYear, calMonth]);

  const todayStr = getTodayDateString();
  const isCustomDateTime = selectedDate !== todayStr;

  React.useEffect(() => {
    setCurrency(selectedCurrency);
  }, [selectedCurrency]);

  // Sync accountId if accounts change
  React.useEffect(() => {
    if (!accountId || !accounts.some((a) => a.id === accountId)) {
      if (accounts.length > 0) {
        setAccountId(
          accounts.find((a) => a.id === 'cash' || a.name.toLowerCase() === 'cash')?.id ||
          accounts.find((a) => a.isDefault)?.id ||
          accounts[0].id
        );
      }
    }
  }, [accounts, accountId]);

  // Filter categories strictly by transaction type (expense vs income), never by account
  const availableCategories = React.useMemo(() => {
    return [...categories]
      .filter((c) => c.type === type)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [categories, type]);

  const currencyObj = currencies.find((c) => c.code === currency) || currencies[0];
  const currencySymbol = currencyObj?.symbol || '₱';

  // Calculate balances for each account
  const accountBalances = React.useMemo(() => {
    const balances = new Map<string, number>();
    accounts.forEach((acc) => {
      balances.set(acc.id, acc.initialBalance || 0);
    });

    if (transactions && transactions.length > 0) {
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
    }

    return balances;
  }, [accounts, transactions]);

  // Set default category if none selected or if type changed
  React.useEffect(() => {
    if (!categoryId || !availableCategories.some((c) => c.id === categoryId)) {
      if (availableCategories.length > 0) {
        setCategoryId(availableCategories[0].id);
      }
    }
  }, [type, availableCategories, categoryId]);

  const handleAmountChange = (val: string) => {
    if (val === '') {
      setAmount('');
      setAmountError('');
      return;
    }
    // Limit to up to 9 digits before decimal and max 2 digits after decimal (max 999,999,999.99)
    if (/^\d{0,9}(\.\d{0,2})?$/.test(val)) {
      setAmount(val);
      setAmountError('');
    }
  };

  const isAmountFilled = Boolean(amount && amount.trim().length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setAmountError('Please enter an amount greater than 0.');
      return;
    }
    if (numAmount > 999999999.99) {
      setAmountError('Amount cannot exceed 999,999,999.99.');
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      setAmountError('Amount can only have up to 2 decimal places.');
      return;
    }

    const txDate = selectedDate || getTodayDateString();
    const txTime = selectedTime || getCurrent12HourTime();

    // Immediately commit transaction so it is instantly persisted to state, localStorage, and database
    onSave({
      type,
      amount: numAmount,
      currency,
      categoryId: categoryId || (availableCategories[0]?.id ?? 'other'),
      accountId: accountId || (accounts[0]?.id ?? undefined),
      note: note.slice(0, 100).trim(),
      date: txDate,
      time: txTime,
    });

    // Show the LatticeLoader saving animation overlay
    setIsSaving(true);

    savingTimeoutRef.current = setTimeout(() => {
      // Reset form for next entry
      setAmount('');
      setNote('');
      setSelectedDate(getTodayDateString());
      setSelectedTime(getCurrent12HourTime());
      setAmountError('');
      setIsSaving(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);

      if (isModal && onClose) {
        onClose();
      }
    }, 700);
  };

  return (
    <div
      id="quick-entry-panel"
      className={`bg-white border border-zinc-200 rounded-[5px] shadow-xs ${
        isModal ? 'p-6 max-w-xl w-full' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
            Quick-Entry
          </h2>
          {showSuccessToast && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-[3px] animate-fade-in">
              <Check className="w-3 h-3" /> Saved!
            </span>
          )}
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-[3px]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Horizontal Row: Expense/Income Toggle, Currency, Amount, and Description */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          {/* Type Toggle: Income / Expense */}
          <div className="shrink-0 w-full sm:w-44">
            <div
              role="group"
              aria-label="Transaction Type"
              className="h-9 grid grid-cols-2 p-0.5 bg-zinc-100 rounded-[4px] border border-zinc-200 text-xs font-medium"
            >
              <button
                type="button"
                id="btn-toggle-expense"
                onClick={() => setType('expense')}
                className={`h-full py-1 flex items-center justify-center gap-1.5 rounded-[3px] transition-colors cursor-pointer ${
                  type === 'expense'
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Expense</span>
              </button>
              <button
                type="button"
                id="btn-toggle-income"
                onClick={() => setType('income')}
                className={`h-full py-1 flex items-center justify-center gap-1.5 rounded-[3px] transition-colors cursor-pointer ${
                  type === 'income'
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Income</span>
              </button>
            </div>
          </div>

          {/* Currency Dropdown - Lists all currencies with actual flags, no add/manage */}
          <div className="shrink-0 w-full sm:w-36 h-9">
            <CurrencySelect
              id="select-currency"
              ariaLabel="Select currency"
              currencies={currencies}
              value={currency}
              onChange={setCurrency}
              className="h-full"
            />
          </div>

          {/* Amount Input */}
          <div className="shrink-0 w-full sm:w-36">
            <div className="relative h-9">
              <input
                id="input-amount"
                aria-label="Amount"
                type="text"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                onKeyDown={(e) => {
                  if (['e', 'E', '+', '-'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder="Enter amount"
                className={`w-full h-full bg-white border text-sm font-mono font-medium px-3 rounded-[4px] text-zinc-900 focus:outline-none tabular-nums placeholder:text-zinc-400 placeholder:font-normal placeholder:text-xs placeholder:font-sans ${
                  amountError
                    ? 'border-rose-300 focus:border-rose-500'
                    : 'border-zinc-200 focus:border-zinc-500'
                }`}
              />
            </div>
          </div>

          {/* Description Input & Calendar Selector (Calendar selector placed on the right side of Description) */}
          <div className="flex-1 w-full min-w-0 sm:min-w-[160px] flex items-center gap-2">
            <div className="relative flex-1 h-9 min-w-0">
              <input
                id="input-note"
                aria-label="Description"
                type="text"
                maxLength={100}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Description (optional)"
                className="w-full h-full bg-white border border-zinc-200 text-xs pl-3 pr-14 rounded-[4px] text-zinc-900 placeholder:text-zinc-400 placeholder:text-[11px] sm:placeholder:text-xs focus:outline-none focus:border-zinc-500"
              />
              <span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-zinc-400 pointer-events-none select-none">
                {note.length}/100
              </span>
            </div>

            {/* Calendar Button (Date & Time selector) */}
            <div className="relative shrink-0">
              <button
                ref={dateTimeButtonRef}
                id="btn-quick-entry-calendar"
                type="button"
                onClick={() => setIsDateTimeOpen((prev) => !prev)}
                aria-expanded={isDateTimeOpen}
                className={`h-9 w-9 bg-white border rounded-[4px] flex items-center justify-center text-xs transition-colors cursor-pointer select-none ${
                  isDateTimeOpen
                    ? 'border-zinc-900 ring-1 ring-zinc-900 shadow-2xs'
                    : isCustomDateTime
                    ? 'border-zinc-900 bg-zinc-50 text-zinc-900 shadow-2xs'
                    : 'border-zinc-200 hover:border-zinc-300 text-zinc-600 hover:text-zinc-900'
                }`}
                title={`Selected Date & Time: ${formatFriendlyDate(selectedDate)} at ${selectedTime}`}
                aria-label="Select date and time"
              >
                <CalendarDays className="w-4 h-4 text-zinc-500 shrink-0" />
              </button>

              {/* In-App Popover Calendar & Time Selector */}
              {isDateTimeOpen && (
                <div
                  ref={dateTimePickerRef}
                  className="absolute right-0 top-full mt-2 z-50 bg-white border border-zinc-200 rounded-[6px] shadow-xl p-3.5 w-72 sm:w-80 max-w-[calc(100vw-32px)] animate-in fade-in zoom-in-95 duration-100 cursor-default"
                >
                {/* Header Tabs: Date & Time */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                  <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-[4px]">
                    <button
                      type="button"
                      onClick={() => setActivePickerTab('date')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors cursor-pointer ${
                        activePickerTab === 'date'
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePickerTab('time')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors cursor-pointer ${
                        activePickerTab === 'time'
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      Time
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                    {formatFriendlyDate(selectedDate)} {selectedTime}
                  </span>
                </div>

                {activePickerTab === 'date' ? (
                  <div>
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between pb-2 mb-1.5">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
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
                        onClick={handleNextMonth}
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

                        if (!item.isCurrentMonth) {
                          return (
                            <div
                              key={`qe-pad-${idx}`}
                              className="h-8 flex items-center justify-center text-[11px] text-zinc-300 pointer-events-none select-none"
                            >
                              {item.day}
                            </div>
                          );
                        }

                        return (
                          <button
                            key={`qe-day-${item.dateStr}`}
                            type="button"
                            onClick={() => setSelectedDate(item.dateStr)}
                            className={`h-8 flex items-center justify-center rounded-[4px] text-xs transition-colors cursor-pointer ${
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
                  </div>
                ) : (
                  <div>
                    {(() => {
                      const { hour: curH, minute: curM, period: curP } = parseTimeComponents(selectedTime);
                      const setTime = (h: number, m: string, p: 'AM' | 'PM') => {
                        const newTime = construct12HourTime(h, m, p);
                        setSelectedTime(newTime);
                      };

                      return (
                        <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                          {/* Hour Column */}
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

                          {/* Minute Column */}
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
                  </div>
                )}

                {/* Footer Controls */}
                <div className="pt-2.5 mt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(todayStr);
                      setSelectedTime(getCurrent12HourTime());
                      setCalYear(new Date().getFullYear());
                      setCalMonth(new Date().getMonth());
                    }}
                    className="text-[11px] text-zinc-600 hover:text-zinc-900 font-medium px-2 py-1 rounded-[3px] hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    Reset to Now
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDateTimeOpen(false)}
                    className="text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1 rounded-[3px] transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Amount Validation Feedback */}
        {amountError && (
          <p className="text-[11px] text-rose-600 font-medium -mt-2">
            {amountError}
          </p>
        )}

        {/* Row 2: Category Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Category
            </label>
            <button
              type="button"
              id="btn-add-category-inline"
              onClick={() => onOpenAddCategory(type)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <PlusCircle className="w-3 h-3" />
              <span>Manage Categories</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {availableCategories.map((cat) => {
              const isSelected = categoryId === cat.id;
              if (isSelected) {
                return (
                  <SpecularButton
                    key={cat.id}
                    type="button"
                    id={`cat-chip-${cat.id}`}
                    onClick={() => setCategoryId(cat.id)}
                    size="custom"
                    radius={4}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium shadow-2xs cursor-pointer border border-zinc-900"
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <CategoryIcon name={cat.icon} className="w-3 h-3 shrink-0" />
                    <span>{cat.name}</span>
                  </SpecularButton>
                );
              }
              return (
                <button
                  key={cat.id}
                  type="button"
                  id={`cat-chip-${cat.id}`}
                  onClick={() => setCategoryId(cat.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs transition-colors border bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer"
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <CategoryIcon name={cat.icon} className="w-3 h-3 shrink-0" />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Account / Asset Selection */}
        {accounts && accounts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Account
              </label>
              {onOpenAddAccount && (
                <button
                  type="button"
                  id="btn-add-account-inline"
                  onClick={onOpenAddAccount}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>Manage Accounts</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {accounts.map((acc) => {
                const isSelected = accountId === acc.id;
                const balance = accountBalances.get(acc.id) ?? (acc.initialBalance || 0);
                const formattedBalance = formatCurrency(balance, currencySymbol);

                return (
                  <div key={acc.id} className="relative group">
                    {isSelected ? (
                      <SpecularButton
                        type="button"
                        id={`acc-chip-${acc.id}`}
                        onClick={() => setAccountId(acc.id)}
                        title={`${acc.name}: ${formattedBalance}`}
                        size="custom"
                        radius={4}
                        className="inline-flex items-center h-[29px] gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium shadow-2xs cursor-pointer border border-zinc-900 text-white"
                      >
                        <AccountIcon
                          name={acc.icon}
                          className="w-3.5 h-3.5 shrink-0 text-white"
                        />
                        <span>{acc.name}</span>
                      </SpecularButton>
                    ) : (
                      <button
                        type="button"
                        id={`acc-chip-${acc.id}`}
                        onClick={() => setAccountId(acc.id)}
                        title={`${acc.name}: ${formattedBalance}`}
                        className="inline-flex items-center h-[29px] gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs transition-colors border cursor-pointer select-none bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300"
                      >
                        <AccountIcon
                          name={acc.icon}
                          className="w-3.5 h-3.5 shrink-0 text-zinc-500"
                        />
                        <span>{acc.name}</span>
                      </button>
                    )}

                    {/* Balance Tooltip on Hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-30 drop-shadow-md">
                      <div className="bg-zinc-900 text-white text-[11px] font-mono px-2 py-1 rounded-[4px] whitespace-nowrap flex items-center gap-1.5 border border-zinc-800 shadow-md">
                        <span className="text-zinc-400 font-sans text-[10px]">Balance:</span>
                        <span className={`font-semibold ${balance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {formattedBalance}
                        </span>
                      </div>
                      <div className="w-1.5 h-1.5 bg-zinc-900 rotate-45 -mt-0.5 border-r border-b border-zinc-800" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium rounded-[4px]"
            >
              Cancel
            </button>
          )}
          <SpecularButton
            type="submit"
            id="btn-save-transaction"
            size="sm"
            radius={4}
            disabled={!isAmountFilled || isSaving}
            className="px-4 py-1.5 text-xs font-semibold shadow-xs"
          >
            <span>Save Transaction</span>
          </SpecularButton>
        </div>
      </form>

      {/* Full-screen Loading Overlay with LatticeLoader */}
      {isSaving && (
        <ModalPortal>
          <div
            id="quick-entry-saving-backdrop"
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-white/60 backdrop-blur-xs animate-fade-in select-none cursor-wait"
            aria-live="assertive"
            role="status"
          >
            <LatticeLoader
              status="working"
              label="Saving"
              pattern="orbit"
              grid={3}
              shape="square"
              cellSize={7}
              gap={2}
              fontSize={14}
              step={90}
              idleOpacity={0.15}
              glow
              glowColor="#10B981"
              showTimer={false}
              color="#10B981"
            />
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
