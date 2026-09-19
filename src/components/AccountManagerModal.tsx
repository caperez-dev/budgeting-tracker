import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Check, X, Wallet, Smartphone, Banknote, Landmark, CreditCard, PiggyBank, Coins, AlertCircle } from 'lucide-react';
import { Account, AccountType, Transaction } from '../types';
import { AccountIcon } from './CategoryIcon';
import { formatCurrency } from '../utils/formatters';
// TESTING
interface AccountManagerModalProps {
  accounts: Account[];
  transactions: Transaction[];
  currencySymbol: string;
  onAddAccount: (account: Omit<Account, 'id'>) => void;
  onUpdateAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  onClose: () => void;
}

const ACCOUNT_ICONS = [
  'Smartphone',
  'Wallet',
  'Banknote',
  'Landmark',
  'CreditCard',
  'PiggyBank',
  'Coins',
  'CircleDollarSign',
  'Shield',
];

const ACCOUNT_TYPES: { id: AccountType; label: string }[] = [
  { id: 'ewallet', label: 'E-Wallet' },
  { id: 'cash', label: 'Cash' },
  { id: 'bank', label: 'Bank Account' },
  { id: 'credit_card', label: 'Credit Card' },
  { id: 'other', label: 'Other' },
];

const QUICK_SUGGESTIONS = [
  { name: 'Cash', type: 'cash' as AccountType, icon: 'Banknote' },
  { name: 'Credit Card', type: 'credit_card' as AccountType, icon: 'CreditCard' },
  { name: 'Bank Account', type: 'bank' as AccountType, icon: 'Landmark' },
  { name: 'Maya', type: 'ewallet' as AccountType, icon: 'Smartphone' },
  { name: 'Savings', type: 'bank' as AccountType, icon: 'PiggyBank' },
];

export function AccountManagerModal({
  accounts,
  transactions,
  currencySymbol,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onClose,
}: AccountManagerModalProps) {
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // New Account State
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('ewallet');
  const [icon, setIcon] = useState('Smartphone');
  const [initialBalance, setInitialBalance] = useState<string>('0');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculate balances for each account based on transactions
  const accountBalances = useMemo(() => {
    const balances = new Map<string, number>();
    accounts.forEach((acc) => {
      balances.set(acc.id, acc.initialBalance || 0);
    });

    transactions.forEach((tx) => {
      if (tx.accountId && balances.has(tx.accountId)) {
        const current = balances.get(tx.accountId)!;
        if (tx.type === 'income') {
          balances.set(tx.accountId, current + tx.amount);
        } else {
          balances.set(tx.accountId, current - tx.amount);
        }
      }
    });

    return balances;
  }, [accounts, transactions]);

  // Transaction counts per account
  const accountTxCounts = useMemo(() => {
    const counts = new Map<string, number>();
    transactions.forEach((tx) => {
      if (tx.accountId) {
        counts.set(tx.accountId, (counts.get(tx.accountId) || 0) + 1);
      }
    });
    return counts;
  }, [transactions]);

  const totalBalanceAllAccounts = useMemo(() => {
    let sum = 0;
    accountBalances.forEach((val) => {
      sum += val;
    });
    return sum;
  }, [accountBalances]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please provide an account name.');
      return;
    }

    const initBal = parseFloat(initialBalance) || 0;

    onAddAccount({
      name: name.trim(),
      type,
      color: '#52525B',
      icon,
      initialBalance: initBal,
      isDefault: accounts.length === 0,
    });

    setName('');
    setType('ewallet');
    setIcon('Smartphone');
    setInitialBalance('0');
    setErrorMessage(null);
    setIsAdding(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editingAccount.name.trim()) return;
    onUpdateAccount(editingAccount);
    setEditingAccount(null);
  };

  const applyQuickSuggestion = (sug: typeof QUICK_SUGGESTIONS[0]) => {
    setName(sug.name);
    setType(sug.type);
    setIcon(sug.icon);
    setErrorMessage(null);
  };

  return (
    <div
      id="modal-accounts-backdrop"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="modal-accounts"
        className="bg-white rounded-[6px] border border-zinc-200 shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[4px] bg-zinc-100 flex items-center justify-center text-zinc-800">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Accounts & Assets</h2>
              <p className="text-xs text-zinc-500">
                Track your money across GCash, E-Wallets, Cash, Cards, and Banks.
              </p>
            </div>
          </div>
          <button
            id="button-close-accounts-modal"
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-[3px] transition-colors cursor-pointer"
            aria-label="Close accounts window"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Summary Bar */}
        <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-600">Total in Accounts:</span>
            <span
              className={`font-mono text-sm font-semibold ${
                totalBalanceAllAccounts >= 0 ? 'text-zinc-900' : 'text-rose-600'
              }`}
            >
              {formatCurrency(totalBalanceAllAccounts, currencySymbol)}
            </span>
          </div>
          <button
            id="btn-show-add-account"
            type="button"
            onClick={() => {
              setIsAdding(!isAdding);
              setEditingAccount(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-[4px] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'Close Form' : 'Add Account'}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Add Account Form */}
          {isAdding && (
            <form
              id="form-add-account"
              onSubmit={handleCreate}
              className="p-4 bg-zinc-50 border border-zinc-200 rounded-[5px] space-y-3.5 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-900">New Account</h3>
                <span className="text-[11px] text-zinc-400">Fill details below</span>
              </div>

              {/* Quick Preset Suggestions */}
              <div>
                <span className="block text-[11px] text-zinc-500 mb-1.5">Quick Suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => applyQuickSuggestion(sug)}
                      className="px-2 py-0.5 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-[3px] text-[11px] transition-colors cursor-pointer"
                    >
                      + {sug.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Name */}
              <div>
                <label
                  htmlFor="input-new-account-name"
                  className="block text-[11px] font-medium text-zinc-700 mb-1"
                >
                  Account Name
                </label>
                <input
                  id="input-new-account-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. Cash, Credit Card, Bank Account..."
                  className="w-full bg-white border border-zinc-200 px-3 py-1.5 rounded-[4px] text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* Account Type & Starting Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="select-new-account-type"
                    className="block text-[11px] font-medium text-zinc-700 mb-1"
                  >
                    Account Type
                  </label>
                  <select
                    id="select-new-account-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as AccountType)}
                    className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="input-new-account-balance"
                    className="block text-[11px] font-medium text-zinc-700 mb-1"
                  >
                    Starting Balance ({currencySymbol})
                  </label>
                  <input
                    id="input-new-account-balance"
                    type="number"
                    step="0.01"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white border border-zinc-200 px-3 py-1.5 rounded-[4px] text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 mb-1.5">
                  Choose Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {ACCOUNT_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`p-2 rounded-[4px] border transition-colors cursor-pointer ${
                        icon === ic
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                      }`}
                      title={ic}
                    >
                      <AccountIcon name={ic} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-[4px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 rounded-[4px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-new-account"
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-[4px] transition-colors cursor-pointer"
                >
                  Save Account
                </button>
              </div>
            </form>
          )}

          {/* Edit Account Modal Row */}
          {editingAccount && (
            <form
              id="form-edit-account"
              onSubmit={handleSaveEdit}
              className="p-4 bg-zinc-50 border border-indigo-200 rounded-[5px] space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-900">
                  Edit Account: {editingAccount.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  value={editingAccount.name}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, name: e.target.value })
                  }
                  className="w-full bg-white border border-zinc-200 px-3 py-1.5 rounded-[4px] text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                    Account Type
                  </label>
                  <select
                    value={editingAccount.type}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        type: e.target.value as AccountType,
                      })
                    }
                    className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                    Starting Balance ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingAccount.initialBalance ?? 0}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        initialBalance: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-white border border-zinc-200 px-3 py-1.5 rounded-[4px] text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {/* Icon selection */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 mb-1.5">
                  Choose Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {ACCOUNT_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() =>
                        setEditingAccount({ ...editingAccount, icon: ic })
                      }
                      className={`p-2 rounded-[4px] border transition-colors cursor-pointer ${
                        editingAccount.icon === ic
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <AccountIcon name={ic} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 rounded-[4px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-[4px] transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* List of Accounts */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-zinc-700">
              Active Accounts ({accounts.length})
            </span>

            {accounts.map((acc) => {
              const currentBalance = accountBalances.get(acc.id) ?? (acc.initialBalance || 0);
              const txCount = accountTxCounts.get(acc.id) || 0;
              const typeObj = ACCOUNT_TYPES.find((t) => t.id === acc.type);

              return (
                <div
                  key={acc.id}
                  id={`account-card-${acc.id}`}
                  className="p-3 bg-white border border-zinc-200 hover:border-zinc-300 rounded-[5px] transition-colors flex items-center justify-between gap-3"
                >
                  {/* Left: Icon & Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[5px] flex items-center justify-center bg-zinc-100 text-zinc-700 shrink-0 border border-zinc-200/60">
                      <AccountIcon name={acc.icon} className="w-4 h-4 text-zinc-700" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-zinc-900 truncate">
                          {acc.name}
                        </h4>
                        <span className="text-[10px] uppercase font-medium tracking-wider px-1.5 py-0.5 rounded-[3px] bg-zinc-100 text-zinc-600 border border-zinc-200/60">
                          {typeObj?.label || 'Asset'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {txCount} {txCount === 1 ? 'transaction' : 'transactions'} logged
                      </p>
                    </div>
                  </div>

                  {/* Right: Balance & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="block text-[10px] uppercase text-zinc-400 font-medium">
                        Balance
                      </span>
                      <span
                        className={`font-mono text-xs font-semibold ${
                          currentBalance >= 0 ? 'text-zinc-900' : 'text-rose-600'
                        }`}
                      >
                        {formatCurrency(currentBalance, currencySymbol)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 border-l border-zinc-100 pl-2">
                      <button
                        type="button"
                        id={`btn-edit-account-${acc.id}`}
                        onClick={() => {
                          setEditingAccount(acc);
                          setIsAdding(false);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-[3px] transition-colors cursor-pointer"
                        title="Edit account"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {accounts.length > 1 && (
                        <button
                          type="button"
                          id={`btn-delete-account-${acc.id}`}
                          onClick={() => onDeleteAccount(acc.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-[3px] transition-colors cursor-pointer"
                          title="Delete account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-zinc-700 hover:text-zinc-900 font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
