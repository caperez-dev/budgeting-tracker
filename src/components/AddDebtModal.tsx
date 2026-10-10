import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Currency, Debt } from '../types';
import { CurrencySelect } from './CurrencySelect';
import { SpecularButton } from './ui/SpecularButton';
import { ModalPortal } from './ui/ModalPortal';
import { useModalAnimation } from '../utils/useModalAnimation';

export interface AddDebtModalProps {
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
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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

  const isFormValid =
    person.trim().length > 0 &&
    amount.trim().length > 0 &&
    !isNaN(parseFloat(amount)) &&
    parseFloat(amount) > 0;

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
    <ModalPortal>
      <div
        id="modal-add-debt-backdrop"
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer ${backdropClass}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            requestClose();
          }
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            requestClose();
          }
        }}
      >
        <form
          id="modal-add-debt"
          onSubmit={handleSubmit}
          className={`bg-white rounded-[5px] border border-zinc-200 p-5 max-w-md w-full shadow-lg space-y-4 my-auto cursor-default ${modalClass}`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h4 className="text-sm font-semibold text-zinc-900">Add Debt Entry</h4>
            <button
              type="button"
              onClick={requestClose}
              className="text-zinc-400 hover:text-zinc-600 p-1 rounded cursor-pointer transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-[4px] flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            {/* Type Toggle */}
            <div>
              <label className="block text-zinc-500 font-medium mb-1">Type</label>
              <div className="grid grid-cols-2 p-0.5 bg-zinc-100 rounded-[4px] border border-zinc-200 w-full text-xs font-medium">
                <button
                  type="button"
                  id="btn-debt-type-owe"
                  onClick={() => setType('owe')}
                  className={`py-1 rounded-[3px] transition-colors cursor-pointer text-center ${
                    type === 'owe'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Liability
                </button>
                <button
                  type="button"
                  id="btn-debt-type-owed"
                  onClick={() => setType('owed')}
                  className={`py-1 rounded-[3px] transition-colors cursor-pointer text-center ${
                    type === 'owed'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Receivables
                </button>
              </div>
            </div>

            {/* Person / Entity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-zinc-500 font-medium">
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
                placeholder="Person or company name"
                className="w-full h-9 bg-white border border-zinc-200 px-2.5 rounded-[4px] text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-500 font-medium mb-1">Amount</label>
                <input
                  type="text"
                  id="input-debt-amount"
                  inputMode="decimal"
                  required
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-9 bg-white border border-zinc-200 px-2.5 rounded-[4px] font-mono text-xs tabular-nums text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-zinc-500 font-medium mb-1">Currency</label>
                <CurrencySelect
                  currencies={currencies}
                  value={currency}
                  onChange={setCurrency}
                  ariaLabel="Debt currency"
                  className="h-9"
                />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-zinc-500 font-medium mb-1">
                Target Due Date (Optional)
              </label>
              <input
                type="date"
                id="input-debt-due-date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-9 bg-white border border-zinc-200 px-2.5 rounded-[4px] font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Note */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-zinc-500 font-medium">
                  Description / Note (Optional)
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
                placeholder="Reference or note (optional)"
                className="w-full h-9 bg-white border border-zinc-200 px-2.5 rounded-[4px] text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={requestClose}
              className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 rounded-[3px] cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <SpecularButton
              type="submit"
              id="btn-save-debt-record"
              size="sm"
              radius={3}
              disabled={!isFormValid}
              isMuted={!isFormValid}
              className={`px-3.5 py-1.5 text-xs font-semibold transition-all ${
                !isFormValid
                  ? 'opacity-40 cursor-not-allowed bg-zinc-200 text-zinc-400 border border-zinc-200 shadow-none'
                  : 'text-white cursor-pointer'
              }`}
            >
              Save Debt
            </SpecularButton>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
