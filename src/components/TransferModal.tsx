import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  ArrowLeftRight,
  AlertCircle,
  CheckCircle2,
  Wallet,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Account, Transaction } from '../types';
import { AccountSelect } from './AccountSelect';
import {
  formatCurrency,
  getCurrent12HourTime,
  getTodayDateString,
  parseTimeComponents,
  construct12HourTime,
  formatFriendlyDate,
} from '../utils/formatters';
import { SpecularButton } from './ui/SpecularButton';
import { useModalAnimation } from '../utils/useModalAnimation';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  transactions: Transaction[];
  currencySymbol: string;
  defaultCurrency: string;
  onTransfer: (data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    note: string;
    date: string;
    time: string;
  }) => void;
  onOpenAddAccount?: () => void;
}

export function TransferModal({
  isOpen,
  onClose,
  accounts,
  transactions,
  currencySymbol,
  defaultCurrency,
  onTransfer,
  onOpenAddAccount,
}: TransferModalProps) {
  // Compute balances for all accounts
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

  // Initial account selection
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

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
    if (!isDateTimeOpen) return;
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDateTimeOpen]);

  // Sync calendar view month with selectedDate
  useEffect(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const [y, m] = selectedDate.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setCalYear(y);
        setCalMonth(m - 1);
      }
    }
  }, [selectedDate]);

  const calMonthTitle = useMemo(
    () =>
      new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [calYear, calMonth]
  );

  const calGrid = useMemo(() => {
    const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
    const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();
    const cells: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, isCurrentMonth: false, dateStr: `pad-prev-${i}` });
    }
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      cells.push({
        day: d,
        isCurrentMonth: true,
        dateStr: `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }
    const totalSlots = Math.ceil(cells.length / 7) * 7;
    for (let t = 1; cells.length < totalSlots; t++) {
      cells.push({ day: t, isCurrentMonth: false, dateStr: `pad-next-${t}` });
    }
    return cells;
  }, [calYear, calMonth]);

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  const prevIsOpenRef = useRef(false);

  // Initialize or reset selections ONLY when modal opens (transition from closed to open)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (accounts.length >= 2) {
        // Pick Cash as default "from" or first account
        const defaultFrom =
          accounts.find((a) => a.id === 'cash' || a.name.toLowerCase() === 'cash')?.id ||
          accounts[0]?.id ||
          '';

        // Pick another account as "to"
        const defaultTo =
          accounts.find((a) => a.id !== defaultFrom)?.id ||
          accounts[1]?.id ||
          '';

        setFromAccountId(defaultFrom);
        setToAccountId(defaultTo);
      }
      setAmount('');
      setNote('');
      setIsSuccess(false);
      setSelectedDate(getTodayDateString());
      setSelectedTime(getCurrent12HourTime());
      setIsDateTimeOpen(false);
      setActivePickerTab('date');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, accounts]);

  // If accounts change while modal is already open, only preserve validity without wiping user inputs
  useEffect(() => {
    if (!isOpen || accounts.length < 2) return;
    if (fromAccountId && !accounts.some((a) => a.id === fromAccountId)) {
      setFromAccountId(accounts[0]?.id || '');
    }
    if (toAccountId && !accounts.some((a) => a.id === toAccountId)) {
      setToAccountId(accounts.find((a) => a.id !== fromAccountId)?.id || accounts[1]?.id || '');
    }
  }, [isOpen, accounts, fromAccountId, toAccountId]);

  const { isClosing, requestClose, backdropClass, modalClass } = useModalAnimation({
    isOpen,
    onClose,
  });

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && (isOpen || isClosing)) {
        if (isDateTimeOpen) {
          setIsDateTimeOpen(false);
          return;
        }
        requestClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing, requestClose, isDateTimeOpen]);

  if (!isOpen && !isClosing) return null;

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);

  const fromBalance = fromAccountId ? accountBalances.get(fromAccountId) ?? 0 : 0;
  const toBalance = toAccountId ? accountBalances.get(toAccountId) ?? 0 : 0;

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const isAmountTooHigh = isValidAmount && parsedAmount > 9999999999.99;
  const isSameAccount = fromAccountId && toAccountId && fromAccountId === toAccountId;
  const isInsufficient = isValidAmount && parsedAmount > fromBalance;
  const isFromZeroOrNegative = fromBalance <= 0;

  const isSubmitDisabled =
    !isValidAmount ||
    isAmountTooHigh ||
    isSameAccount ||
    isInsufficient ||
    !fromAccountId ||
    !toAccountId ||
    accounts.length < 2;

  const handleSwap = () => {
    setFromAccountId(toAccountId);
    setToAccountId(fromAccountId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    onTransfer({
      fromAccountId,
      toAccountId,
      amount: parsedAmount,
      note: note.trim(),
      date: selectedDate || getTodayDateString(),
      time: selectedTime || getCurrent12HourTime(),
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      requestClose();
    }, 900);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] ${backdropClass}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        id="transfer-modal-card"
        className={`w-full max-w-lg bg-white border border-zinc-200 rounded-[6px] shadow-xl flex flex-col ${modalClass}`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 bg-white">
          <div>
            <h2 id="transfer-modal-title" className="text-sm font-semibold text-zinc-900 tracking-tight">
              Transfer Balance
            </h2>
            <p className="text-[11px] text-zinc-500">
              Move money from one account to another
            </p>
          </div>
          <button
            type="button"
            id="btn-close-transfer-modal"
            onClick={requestClose}
            aria-label="Close transfer modal"
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded-[4px] hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        {accounts.length < 2 ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-900">At least two accounts needed</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                You currently have {accounts.length === 1 ? `only one account (${accounts[0].name})` : 'no accounts'}. You need at least two accounts to transfer balances between them.
              </p>
            </div>
            {onOpenAddAccount && (
              <SpecularButton
                type="button"
                id="btn-transfer-go-to-accounts"
                size="sm"
                radius={4}
                onClick={() => {
                  onClose();
                  onOpenAddAccount();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Add Another Account</span>
              </SpecularButton>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Success Notification */}
            {isSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-[4px] text-emerald-800 text-xs font-medium animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Transfer completed successfully!</span>
              </div>
            )}

            {/* Account Selection: Left (From) and Right (To) - Horizontally aligned */}
            <div className="space-y-1.5">
              {/* Row with From and To labels */}
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className="flex-1 min-w-0">
                  <label htmlFor="transfer-from-account" className="text-xs font-medium text-zinc-700 truncate block">
                    From
                  </label>
                </div>
                {/* Spacer matching swap button width */}
                <div className="w-8 sm:w-9 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <label htmlFor="transfer-to-account" className="text-xs font-medium text-zinc-700 truncate block">
                    To
                  </label>
                </div>
              </div>

              {/* Row with From AccountSelect, Swap Button, and To AccountSelect */}
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className="flex-1 min-w-0">
                  <AccountSelect
                    id="transfer-from-account"
                    ariaLabel="Select from account"
                    accounts={accounts}
                    value={fromAccountId}
                    onChange={(val) => setFromAccountId(val)}
                    allowNone={false}
                    accountBalances={accountBalances}
                    currencySymbol={currencySymbol}
                    alignDropdown="left"
                  />
                </div>

                {/* Center: Swap button */}
                <div className="flex items-center justify-center shrink-0 w-8 sm:w-9">
                  <button
                    type="button"
                    id="btn-swap-transfer-accounts"
                    onClick={handleSwap}
                    title="Swap From and To accounts"
                    aria-label="Swap From and To accounts"
                    className="p-1.5 sm:p-2 text-zinc-500 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-full transition-colors cursor-pointer shrink-0 shadow-2xs"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <AccountSelect
                    id="transfer-to-account"
                    ariaLabel="Select to account"
                    accounts={accounts}
                    value={toAccountId}
                    onChange={(val) => setToAccountId(val)}
                    allowNone={false}
                    accountBalances={accountBalances}
                    currencySymbol={currencySymbol}
                    alignDropdown="right"
                  />
                </div>
              </div>

              {/* Row with Balance Previews below */}
              <div className="flex items-start gap-2 sm:gap-3 w-full">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between text-[11px] px-0.5 min-h-[32px]">
                    <span className="text-zinc-500 pt-0.5">Available:</span>
                    {isValidAmount && !isInsufficient && !isSameAccount ? (
                      <div className="text-right font-mono">
                        <span className="text-zinc-400 line-through text-[11px] block">
                          {formatCurrency(fromBalance, currencySymbol)}
                        </span>
                        <span className="font-semibold text-zinc-900 text-xs block">
                          {formatCurrency(fromBalance - parsedAmount, currencySymbol)}
                        </span>
                      </div>
                    ) : (
                      <span
                        className={`font-mono font-semibold truncate ${
                          fromBalance > 0 ? 'text-zinc-900' : 'text-rose-600'
                        }`}
                      >
                        {formatCurrency(fromBalance, currencySymbol)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Spacer matching swap button width */}
                <div className="w-8 sm:w-9 shrink-0" aria-hidden="true" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between text-[11px] px-0.5 min-h-[32px]">
                    <span className="text-zinc-500 pt-0.5">Current:</span>
                    {isValidAmount && !isInsufficient && !isSameAccount ? (
                      <div className="text-right font-mono">
                        <span className="text-zinc-400 line-through text-[11px] block">
                          {formatCurrency(toBalance, currencySymbol)}
                        </span>
                        <span className="font-semibold text-emerald-700 text-xs block">
                          {formatCurrency(toBalance + parsedAmount, currencySymbol)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono font-semibold text-zinc-900 truncate">
                        {formatCurrency(toBalance, currencySymbol)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Validation warning if same account */}
            {isSameAccount && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-[4px] text-amber-800 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Please select two different accounts to transfer funds.</span>
              </div>
            )}

            {/* Validation warning if from account is empty or negative */}
            {!isSameAccount && isFromZeroOrNegative && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>The selected account has no available balance to transfer.</span>
              </div>
            )}

            {/* Amount Field */}
            <div className="space-y-1.5">
              <label htmlFor="transfer-amount-input" className="block text-xs font-medium text-zinc-700">
                Amount
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 font-semibold select-none">
                  {currencySymbol}
                </span>
                <input
                  id="transfer-amount-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d{0,10}(\.\d{0,2})?$/.test(val)) {
                      setAmount(val);
                    }
                  }}
                  className={`w-full h-9 pl-7 pr-3 bg-white border rounded-[4px] text-xs font-mono text-zinc-900 focus:outline-none transition-colors ${
                    isInsufficient || isAmountTooHigh
                      ? 'border-rose-500 focus:border-rose-600 bg-rose-50/20'
                      : 'border-zinc-200 focus:border-zinc-500'
                  }`}
                />
              </div>

              {/* Insufficient balance error message */}
              {isInsufficient && (
                <div
                  id="transfer-insufficient-error"
                  className="flex items-center gap-1.5 text-xs text-rose-600 font-medium pt-0.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    This account doesn&apos;t have enough balance. Available: {formatCurrency(fromBalance, currencySymbol)}
                  </span>
                </div>
              )}

              {/* Amount too high error message */}
              {isAmountTooHigh && (
                <div
                  id="transfer-amount-high-error"
                  className="flex items-center gap-1.5 text-xs text-rose-600 font-medium pt-0.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Amount is too high (maximum 10 digits).
                  </span>
                </div>
              )}
            </div>

            {/* Note Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="transfer-note-input" className="text-xs font-medium text-zinc-700">
                  Note (Optional)
                </label>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {note.length}/100
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="transfer-note-input"
                  type="text"
                  maxLength={100}
                  placeholder="e.g., Weekly budget, Allowance, Savings"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex-1 min-w-0 h-9 px-3 bg-white border border-zinc-200 rounded-[4px] text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 transition-colors"
                />

                {/* Calendar Button (Date & Time selector) */}
                <div className="relative shrink-0">
                  <button
                    ref={dateTimeButtonRef}
                    id="btn-transfer-calendar"
                    type="button"
                    onClick={() => setIsDateTimeOpen((prev) => !prev)}
                    aria-expanded={isDateTimeOpen}
                    className={`h-9 w-9 bg-white border rounded-[4px] flex items-center justify-center text-xs transition-colors cursor-pointer select-none ${
                      isDateTimeOpen
                        ? 'border-zinc-900 ring-1 ring-zinc-900 shadow-2xs'
                        : selectedDate !== getTodayDateString()
                        ? 'border-zinc-900 bg-zinc-50 text-zinc-900 shadow-2xs'
                        : 'border-zinc-200 hover:border-zinc-300 text-zinc-600 hover:text-zinc-900'
                    }`}
                    title={`Selected Date & Time: ${formatFriendlyDate(selectedDate)} at ${selectedTime}`}
                    aria-label="Select date and time"
                  >
                    <CalendarDays className="w-4 h-4 text-zinc-500 shrink-0" />
                  </button>

                  {/* In-App Popover Calendar & Time Selector (opens upward) */}
                  {isDateTimeOpen && (
                    <div
                      ref={dateTimePickerRef}
                      className="absolute right-0 bottom-full mb-2 z-50 bg-white border border-zinc-200 rounded-[6px] shadow-xl p-3.5 w-72 sm:w-80 max-w-[calc(100vw-32px)] animate-in fade-in zoom-in-95 duration-100 cursor-default"
                    >
                      {/* Header Tabs: Date & Time */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                        <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-[4px]">
                          {(['date', 'time'] as const).map((tab) => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setActivePickerTab(tab)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors cursor-pointer ${
                                activePickerTab === tab
                                  ? 'bg-white text-zinc-900 shadow-2xs'
                                  : 'text-zinc-500 hover:text-zinc-800'
                              }`}
                            >
                              {tab === 'date' ? 'Date' : 'Time'}
                            </button>
                          ))}
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
                            {calGrid.map((item) => {
                              if (!item.isCurrentMonth) {
                                return (
                                  <div
                                    key={item.dateStr}
                                    className="h-8 flex items-center justify-center text-[11px] text-zinc-300 pointer-events-none select-none"
                                  >
                                    {item.day}
                                  </div>
                                );
                              }
                              const isSelected = selectedDate === item.dateStr;
                              const isToday = item.dateStr === getTodayDateString();
                              return (
                                <button
                                  key={item.dateStr}
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
                        (() => {
                          const { hour: curH, minute: curM, period: curP } = parseTimeComponents(selectedTime);
                          const setTime = (h: number, m: string, p: 'AM' | 'PM') =>
                            setSelectedTime(construct12HourTime(h, m, p));
                          const optionClass = (isSelected: boolean) =>
                            `w-full py-1 text-xs rounded-[3px] transition-colors cursor-pointer ${
                              isSelected ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-700 hover:bg-zinc-100'
                            }`;
                          return (
                            <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                              <div>
                                <div className="text-[10px] font-semibold text-zinc-400 uppercase mb-1">Hour</div>
                                <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                    <button key={h} type="button" onClick={() => setTime(h, curM, curP)} className={optionClass(curH === h)}>
                                      {h}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] font-semibold text-zinc-400 uppercase mb-1">Minute</div>
                                <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
                                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                                    <button key={m} type="button" onClick={() => setTime(curH, m, curP)} className={optionClass(curM === m)}>
                                      {m}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] font-semibold text-zinc-400 uppercase mb-1">Period</div>
                                <div className="space-y-1">
                                  {(['AM', 'PM'] as const).map((p) => (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => setTime(curH, curM, p)}
                                      className={`w-full py-2 text-xs rounded-[3px] font-bold transition-colors cursor-pointer ${
                                        curP === p
                                          ? 'bg-zinc-900 text-white shadow-2xs'
                                          : 'text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
                                      }`}
                                    >
                                      {p}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}

                      {/* Footer Controls */}
                      <div className="pt-2.5 mt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(getTodayDateString());
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

            {/* Modal Footer / Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                id="btn-cancel-transfer"
                onClick={requestClose}
                className="px-3.5 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 border border-zinc-200 hover:bg-zinc-50 rounded-[4px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <SpecularButton
                type="submit"
                id="btn-submit-transfer"
                size="sm"
                radius={4}
                disabled={isSubmitDisabled}
                className="px-4 py-1.5 text-xs font-medium shadow-2xs"
              >
                <span>
                  {isValidAmount && !isInsufficient
                    ? `Transfer ${formatCurrency(parsedAmount, currencySymbol)}`
                    : 'Transfer Balance'}
                </span>
              </SpecularButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
