import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Currency, Debt } from '../types';
import { CurrencySelect } from './CurrencySelect';
import { SpecularButton } from './ui/SpecularButton';
import { useModalAnimation } from '../utils/useModalAnimation';

interface AddDebtModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onAddDebt: (debt: Omit<Debt, 'id' | 'createdAt' | 'settled'>) => void;
  currencies: Currency[];
  defaultCurrency: string;
}

export function AddDebtModal({
  isOpen = true,
  onClose,
  onAddDebt,
  currencies,
  defaultCurrency,
}: AddDebtModalProps) {
  const { requestClose, backdropClass, modalClass } = useModalAnimation({ isOpen, onClose });

  const [type, setType] = useState<'owe' | 'owed'>('owe');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setCurrency(defaultCurrency);
  }, [defaultCurrency]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  const handleAmountChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[0].length > 10) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPerson = person.trim().slice(0, 30);
    const numAmount = parseFloat(amount);

    if (!cleanPerson) {
      setErrorMsg('Please enter a person or entity name.');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    if (numAmount > 9999999999.99) {
      setErrorMsg('Amount is too large (maximum 10 digits).');
      return;
    }

    setErrorMsg(null);
    onAddDebt({
      type,
      person: cleanPerson,
      amount: numAmount,
      currency,
      note: note.trim().slice(0, 100),
      dueDate: dueDate || undefined,
    });

    requestClose();
  };

  return (
    <div
      id="modal-add-debt-backdrop"
      className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer select-none ${backdropClass}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        id="modal-add-debt"
        className={`bg-white rounded-[6px] border border-zinc-200 p-5 max-w-md w-full shadow-xl space-y-4 max-h-[92vh] flex flex-col cursor-default select-none ${modalClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Add Debt Record</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Record a personal loan or borrowed amount.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-[3px] transition-colors cursor-pointer"
            aria-label="Close window"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-[4px] flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type Toggle: Owe vs Owed */}
          <div>
            <label className="block text-zinc-500 font-medium mb-1.5 uppercase text-[10px] tracking-wider">
              Type of Record
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-debt-type-owe"
                onClick={() => setType('owe')}
                className={`py-2 px-3 rounded-[4px] border text-xs font-medium transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  type === 'owe'
                    ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold shadow-2xs'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <span>Money You Owe</span>
                <span className="text-[10px] text-rose-600/80 font-normal">Borrowed / Liability</span>
              </button>
              <button
                type="button"
                id="btn-debt-type-owed"
                onClick={() => setType('owed')}
                className={`py-2 px-3 rounded-[4px] border text-xs font-medium transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  type === 'owed'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold shadow-2xs'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <span>Money Owed to You</span>
                <span className="text-[10px] text-emerald-600/80 font-normal">Lent to Someone</span>
              </button>
            </div>
          </div>

          {/* Person / Entity */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-zinc-500 font-medium uppercase text-[10px] tracking-wider">
                Person or Entity
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {person.length}/30
              </span>
            </div>
            <input
              type="text"
              id="input-debt-person"
              required
              maxLength={30}
              value={person}
              onChange={(e) => {
                setPerson(e.target.value.slice(0, 30));
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Name of person, friend, or institution"
              className="w-full h-9 bg-zinc-50 border border-zinc-200 px-2.5 rounded-[4px] text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-zinc-500 font-medium mb-1 uppercase text-[10px] tracking-wider">
                Amount
              </label>
              <input
                type="text"
                id="input-debt-amount"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="w-full h-9 bg-zinc-50 border border-zinc-200 px-2.5 rounded-[4px] font-mono text-xs tabular-nums text-zinc-800 focus:outline-none focus:border-zinc-500 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-500 font-medium mb-1 uppercase text-[10px] tracking-wider">
                Currency
              </label>
              <CurrencySelect
                currencies={currencies}
                value={currency}
                onChange={setCurrency}
                ariaLabel="Debt currency"
                className="h-9"
              />
            </div>
          </div>

          {/* Target Due Date */}
          <div>
            <label className="block text-zinc-500 font-medium mb-1 uppercase text-[10px] tracking-wider">
              Target Due Date (Optional)
            </label>
            <input
              type="date"
              id="input-debt-due-date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-9 bg-zinc-50 border border-zinc-200 px-2.5 rounded-[4px] font-mono text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Note / Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-zinc-500 font-medium uppercase text-[10px] tracking-wider">
                Note or Purpose (Optional)
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {note.length}/100
              </span>
            </div>
            <input
              type="text"
              id="input-debt-note"
              maxLength={100}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 100))}
              placeholder="e.g. Dinner split, equipment advance"
              className="w-full h-9 bg-zinc-50 border border-zinc-200 px-2.5 rounded-[4px] text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 shrink-0">
            <button
              type="button"
              onClick={requestClose}
              className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 font-medium rounded-[3px] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <SpecularButton
              type="submit"
              id="btn-save-debt-record"
              size="sm"
              radius={4}
              disabled={!amount || !person.trim()}
              className="px-4 py-1.5 text-white text-xs font-semibold shadow-xs"
            >
              <span>Add Debt Record</span>
            </SpecularButton>
          </div>
        </form>
      </div>
    </div>
  );
}
