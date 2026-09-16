import React, { useState } from 'react';
import {
  Scale,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Trash2,
  AlertCircle,
  Calendar,
  User,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { Currency, Debt } from '../types';
import { formatCurrency, getTodayDateString } from '../utils/formatters';

interface DebtTrackerProps {
  debts: Debt[];
  currencies: Currency[];
  selectedCurrency: string;
  onAddDebt: (debt: Omit<Debt, 'id' | 'createdAt' | 'settled'>) => void;
  onToggleSettle: (id: string) => void;
  onDeleteDebt: (id: string) => void;
}

export function DebtTracker({
  debts,
  currencies,
  selectedCurrency,
  onAddDebt,
  onToggleSettle,
  onDeleteDebt,
}: DebtTrackerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  const [type, setType] = useState<'owe' | 'owed'>('owe');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(selectedCurrency);
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');

  React.useEffect(() => {
    setCurrency(selectedCurrency);
  }, [selectedCurrency]);

  const currencyObj = currencies.find((c) => c.code === selectedCurrency);
  const currencySymbol = currencyObj?.symbol || '₱';

  const debtsYouOwe = debts.filter((d) => d.type === 'owe');
  const debtsOwedToYou = debts.filter((d) => d.type === 'owed');

  const totalYouOweUnsettled = debtsYouOwe
    .filter((d) => !d.settled)
    .reduce((sum, d) => sum + d.amount, 0);

  const totalOwedToYouUnsettled = debtsOwedToYou
    .filter((d) => !d.settled)
    .reduce((sum, d) => sum + d.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!person.trim() || isNaN(numAmount) || numAmount <= 0) {
      alert('Please provide a person/entity label and a valid amount.');
      return;
    }

    onAddDebt({
      type,
      person: person.trim(),
      amount: numAmount,
      currency,
      note: note.trim(),
      dueDate: dueDate || undefined,
    });

    setPerson('');
    setAmount('');
    setNote('');
    setDueDate('');
    setShowAddModal(false);
  };

  return (
    <div id="debt-tracker-view" className="space-y-5">
      {/* Top Header & Net Debt Overview */}
      <div className="bg-white border border-zinc-200 rounded-[5px] p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
              <Scale className="w-4 h-4 text-zinc-700" />
              Debt & Liabilities Tracker
            </h2>
            <p className="text-xs text-zinc-500">
              Independent record of external debts you owe vs. funds owed to you by others.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            id="btn-add-debt"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-[4px] transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Debt Record</span>
          </button>
        </div>

        {/* 2 Metric Summary Boxes (Debts You Owe & Debts Owed to You) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Debts You Owe */}
          <div className="p-3.5 bg-zinc-50/80 border border-zinc-200 rounded-[4px]">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              <span>Debts You Owe</span>
              <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-lg font-bold font-mono text-rose-700 tabular-nums">
              {formatCurrency(totalYouOweUnsettled, currencySymbol)}
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
              {debtsYouOwe.filter((d) => !d.settled).length} active liabilities
            </div>
          </div>

          {/* Debts Owed to You */}
          <div className="p-3.5 bg-zinc-50/80 border border-zinc-200 rounded-[4px]">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              <span>Debts Owed to You</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg font-bold font-mono text-emerald-700 tabular-nums">
              {formatCurrency(totalOwedToYouUnsettled, currencySymbol)}
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
              {debtsOwedToYou.filter((d) => !d.settled).length} active receivables
            </div>
          </div>
        </div>
      </div>

      {/* Two Independent Lists: Debts You Owe & Debts Owed to You as specified in §7 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* List 1: Debts you owe (to others) */}
        <div className="bg-white border border-zinc-200 rounded-[5px] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Debts You Owe (Payables)
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-rose-700 tabular-nums">
              {formatCurrency(totalYouOweUnsettled, currencySymbol)}
            </span>
          </div>

          {debtsYouOwe.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-xs">
              <ShieldCheck className="w-6 h-6 mx-auto text-emerald-400 mb-1" />
              You have no recorded debts owed to others.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {debtsYouOwe.map((debt) => (
                <div
                  key={debt.id}
                  className={`py-3 flex items-start justify-between gap-3 text-xs transition-colors ${
                    debt.settled ? 'opacity-50 line-through bg-zinc-50/50 px-2 rounded' : ''
                  }`}
                >
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900">{debt.person}</span>
                      {debt.settled && (
                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 font-mono text-[10px] rounded border border-emerald-200 no-underline inline-block">
                          Settled
                        </span>
                      )}
                    </div>
                    {debt.note && <p className="text-zinc-500 text-[11px]">{debt.note}</p>}
                    {debt.dueDate && (
                      <p className="text-zinc-400 text-[10px] font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Due: {debt.dueDate}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-rose-700 tabular-nums text-sm">
                      {formatCurrency(debt.amount, currencySymbol)}
                    </span>
                    <button
                      onClick={() => onToggleSettle(debt.id)}
                      className={`px-2 py-1 text-[11px] font-medium rounded-[3px] border transition-colors ${
                        debt.settled
                          ? 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={debt.settled ? 'Mark as active' : 'Mark as settled/paid'}
                    >
                      {debt.settled ? 'Reopen' : 'Settle'}
                    </button>
                    <button
                      onClick={() => setDebtToDelete(debt)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* List 2: Debts owed to you (by others) */}
        <div className="bg-white border border-zinc-200 rounded-[5px] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Debts Owed to You (Receivables)
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-700 tabular-nums">
              {formatCurrency(totalOwedToYouUnsettled, currencySymbol)}
            </span>
          </div>

          {debtsOwedToYou.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-xs">
              No recorded debts owed to you.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {debtsOwedToYou.map((debt) => (
                <div
                  key={debt.id}
                  className={`py-3 flex items-start justify-between gap-3 text-xs transition-colors ${
                    debt.settled ? 'opacity-50 line-through bg-zinc-50/50 px-2 rounded' : ''
                  }`}
                >
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900">{debt.person}</span>
                      {debt.settled && (
                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 font-mono text-[10px] rounded border border-emerald-200 no-underline inline-block">
                          Received
                        </span>
                      )}
                    </div>
                    {debt.note && <p className="text-zinc-500 text-[11px]">{debt.note}</p>}
                    {debt.dueDate && (
                      <p className="text-zinc-400 text-[10px] font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Due: {debt.dueDate}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-emerald-700 tabular-nums text-sm">
                      {formatCurrency(debt.amount, currencySymbol)}
                    </span>
                    <button
                      onClick={() => onToggleSettle(debt.id)}
                      className={`px-2 py-1 text-[11px] font-medium rounded-[3px] border transition-colors ${
                        debt.settled
                          ? 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={debt.settled ? 'Mark as active' : 'Mark as received'}
                    >
                      {debt.settled ? 'Reopen' : 'Received'}
                    </button>
                    <button
                      onClick={() => setDebtToDelete(debt)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Debt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-md w-full shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h4 className="text-sm font-semibold text-zinc-900">Add Debt Entry</h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Type Toggle */}
              <div>
                <label className="block text-zinc-500 font-medium mb-1">Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('owe')}
                    className={`py-1.5 px-2 rounded-[3px] border text-xs font-medium transition-colors ${
                      type === 'owe'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold'
                        : 'bg-white border-zinc-200 text-zinc-600'
                    }`}
                  >
                    Debt You Owe (Liability)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('owed')}
                    className={`py-1.5 px-2 rounded-[3px] border text-xs font-medium transition-colors ${
                      type === 'owed'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                        : 'bg-white border-zinc-200 text-zinc-600'
                    }`}
                  >
                    Debt Owed to You (Receivable)
                  </button>
                </div>
              </div>

              {/* Person / Entity */}
              <div>
                <label className="block text-zinc-500 font-medium mb-1">
                  Person or Entity
                </label>
                <input
                  type="text"
                  required
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  placeholder="Person or company name"
                  className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-zinc-800 focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-500 font-medium mb-1">Amount</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-[4px] font-mono tabular-nums text-zinc-800 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 font-medium mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-[4px] font-mono text-zinc-800"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-zinc-500 font-medium mb-1">
                  Target Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-[4px] font-mono text-zinc-800"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-zinc-500 font-medium mb-1">
                  Description / Note (Optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reference or note (optional)"
                  className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-zinc-800 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 rounded-[3px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-[3px] transition-colors"
              >
                Save Debt
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Debt Confirmation Modal */}
      {debtToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-sm w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h4 className="text-sm font-semibold text-zinc-900">Delete Debt Entry</h4>
              <button
                type="button"
                onClick={() => setDebtToDelete(null)}
                className="text-zinc-400 hover:text-zinc-600 text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to delete the debt record for{' '}
              <strong className="text-zinc-900">{debtToDelete.person}</strong> of{' '}
              <strong className="font-mono text-zinc-900">
                {formatCurrency(debtToDelete.amount, currencySymbol)}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setDebtToDelete(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 rounded-[3px] border border-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDebt(debtToDelete.id);
                  setDebtToDelete(null);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-[3px] transition-colors"
              >
                Delete Debt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
