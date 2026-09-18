import React, { useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  PlusCircle,
  Check,
} from 'lucide-react';
import { Category, Currency, TransactionType, Account } from '../types';
import { CategoryIcon, AccountIcon } from './CategoryIcon';
import { getCurrent12HourTime, getTodayDateString } from '../utils/formatters';
import { CurrencySelect } from './CurrencySelect';

interface QuickEntryFormProps {
  currencies: Currency[];
  categories: Category[];
  accounts?: Account[];
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
  selectedCurrency,
  onSave,
  onOpenAddCategory,
  onOpenAddAccount,
  onOpenCurrencyManager,
  isModal = false,
  onClose,
}: QuickEntryFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>(selectedCurrency);
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>(() => {
    return accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '';
  });
  const [note, setNote] = useState<string>('');
  const [amountError, setAmountError] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  React.useEffect(() => {
    setCurrency(selectedCurrency);
  }, [selectedCurrency]);

  // Sync accountId if accounts change
  React.useEffect(() => {
    if (!accountId || !accounts.some((a) => a.id === accountId)) {
      if (accounts.length > 0) {
        setAccountId(accounts.find((a) => a.isDefault)?.id || accounts[0].id);
      }
    }
  }, [accounts, accountId]);

  // Filter categories by type
  const availableCategories = categories.filter((c) => c.type === type);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

    // Auto NOW() for date and time as requested
    const currentDate = getTodayDateString();
    const currentTime = getCurrent12HourTime();

    onSave({
      type,
      amount: numAmount,
      currency,
      categoryId: categoryId || (availableCategories[0]?.id ?? 'other'),
      accountId: accountId || (accounts[0]?.id ?? undefined),
      note: note.slice(0, 100).trim(),
      date: currentDate,
      time: currentTime,
    });

    // Reset form for next entry
    setAmount('');
    setNote('');
    setAmountError('');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);

    if (isModal && onClose) {
      onClose();
    }
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
              className="h-9 grid grid-cols-2 p-0.5 bg-zinc-100 rounded-[4px] border border-zinc-200 gap-0.5 box-border"
            >
              <button
                type="button"
                id="btn-toggle-expense"
                onClick={() => setType('expense')}
                className={`h-full flex items-center justify-center gap-1.5 text-xs font-medium rounded-[3px] transition-colors ${
                  type === 'expense'
                    ? 'bg-white text-zinc-900 shadow-2xs border border-zinc-200 font-semibold'
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
                className={`h-full flex items-center justify-center gap-1.5 text-xs font-medium rounded-[3px] transition-colors ${
                  type === 'income'
                    ? 'bg-white text-zinc-900 shadow-2xs border border-zinc-200 font-semibold'
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
                className={`w-full h-full bg-white border text-sm font-mono font-medium px-3 rounded-[4px] text-zinc-900 focus:outline-none tabular-nums placeholder:text-zinc-400 placeholder:font-normal ${
                  amountError
                    ? 'border-rose-300 focus:border-rose-500'
                    : 'border-zinc-200 focus:border-zinc-500'
                }`}
              />
            </div>
          </div>

          {/* Description Input (beside Enter Amount - max 100 characters) */}
          <div className="flex-1 w-full min-w-0 sm:min-w-[160px]">
            <div className="relative h-9">
              <input
                id="input-note"
                aria-label="Description"
                type="text"
                maxLength={100}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Description (optional)"
                className="w-full h-full bg-white border border-zinc-200 text-xs pl-3 pr-14 rounded-[4px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
              />
              <span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-zinc-400 pointer-events-none select-none">
                {note.length}/100
              </span>
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
              <span>Add Category</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {availableCategories.map((cat) => {
              const isSelected = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  id={`cat-chip-${cat.id}`}
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs transition-colors border ${
                    isSelected
                      ? 'bg-zinc-900 text-white border-zinc-900 font-medium shadow-2xs'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'
                  }`}
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
                return (
                  <button
                    key={acc.id}
                    type="button"
                    id={`acc-chip-${acc.id}`}
                    onClick={() => setAccountId(acc.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs transition-colors border cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-900 text-white border-zinc-900 font-medium shadow-2xs'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: acc.color }}
                    />
                    <AccountIcon name={acc.icon} className="w-3.5 h-3.5 shrink-0" />
                    <span>{acc.name}</span>
                  </button>
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
          <button
            type="submit"
            id="btn-save-transaction"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-[4px] transition-colors shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Transaction</span>
          </button>
        </div>
      </form>
    </div>
  );
}
