import React, { useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  PlusCircle,
  Check,
} from 'lucide-react';
import { Category, Currency, TransactionType } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { getCurrent12HourTime, getTodayDateString } from '../utils/formatters';
import { CurrencySelect } from './CurrencySelect';

interface QuickEntryFormProps {
  currencies: Currency[];
  categories: Category[];
  selectedCurrency: string;
  onSave: (tx: {
    type: TransactionType;
    amount: number;
    currency: string;
    categoryId: string;
    note: string;
    date: string;
    time: string;
  }) => void;
  onOpenAddCategory: (type: TransactionType) => void;
  onOpenCurrencyManager?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export function QuickEntryForm({
  currencies,
  categories,
  selectedCurrency,
  onSave,
  onOpenAddCategory,
  onOpenCurrencyManager,
  isModal = false,
  onClose,
}: QuickEntryFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>(selectedCurrency);
  const [categoryId, setCategoryId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  React.useEffect(() => {
    setCurrency(selectedCurrency);
  }, [selectedCurrency]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount greater than 0.');
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
      note: note.trim(),
      date: currentDate,
      time: currentTime,
    });

    // Reset form for next entry
    setAmount('');
    setNote('');
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
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full h-full bg-white border border-zinc-200 text-sm font-mono font-medium px-3 rounded-[4px] text-zinc-900 focus:outline-none focus:border-zinc-500 tabular-nums placeholder:text-zinc-400 placeholder:font-normal"
              />
            </div>
          </div>

          {/* Description Input (beside Enter Amount) */}
          <div className="flex-1 w-full min-w-0 sm:min-w-[160px]">
            <div className="relative h-9">
              <input
                id="input-note"
                aria-label="Description"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Description (optional)"
                className="w-full h-full bg-white border border-zinc-200 text-xs px-3 rounded-[4px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        </div>

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
