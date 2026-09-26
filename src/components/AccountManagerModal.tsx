import React, { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Edit2, Check, X, Wallet, Smartphone, Banknote, Landmark, CreditCard, PiggyBank, Coins, AlertCircle } from 'lucide-react';
import { Account, AccountType, Transaction } from '../types';
import { AccountIcon } from './CategoryIcon';
import { formatCurrency } from '../utils/formatters';
import { AccountTypeSelect } from './AccountTypeSelect';
import { AccountIconPicker } from './AccountIconPicker';
import { BANK_LOGOS } from '../data/bankLogos';

interface AccountManagerModalProps {
  accounts: Account[];
  transactions: Transaction[];
  currencySymbol: string;
  onAddAccount: (account: Omit<Account, 'id'>) => void;
  onUpdateAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  onClose: () => void;
}

const ACCOUNT_TYPES: { id: AccountType; label: string }[] = [
  { id: 'ewallet', label: 'E-Wallet' },
  { id: 'cash', label: 'Cash' },
  { id: 'bank', label: 'Bank Account' },
  { id: 'credit_card', label: 'Credit Card' },
  { id: 'other', label: 'Other' },
];

export const isCashAccount = (acc: { id?: string; type?: string; name?: string }): boolean => {
  if (!acc) return false;
  return (
    acc.id === 'cash' ||
    acc.type === 'cash' ||
    (typeof acc.name === 'string' && acc.name.trim().toLowerCase() === 'cash')
  );
};

// Sanitizes starting balance input: allows optional minus, max 10 integer digits, and up to 2 decimal places
const sanitizeBalanceInput = (val: string): string => {
  if (val === '' || val === '-') return val;
  let clean = val.replace(/[^0-9.-]/g, '');
  const isNegative = clean.startsWith('-');
  clean = clean.replace(/-/g, '');
  const parts = clean.split('.');
  const integerPart = parts[0] ? parts[0].slice(0, 10) : '';
  const decimalPart = parts[1] !== undefined ? parts[1].slice(0, 2) : undefined;
  let result = (isNegative ? '-' : '') + integerPart;
  if (decimalPart !== undefined) {
    result += '.' + decimalPart;
  }
  return result;
};

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
  const [editBalance, setEditBalance] = useState<string>('0');
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // New Account State
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('ewallet');
  const [icon, setIcon] = useState('bank-gcash');
  const [initialBalance, setInitialBalance] = useState<string>('0');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const backdropMouseDownRef = useRef(false);

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    backdropMouseDownRef.current = e.target === e.currentTarget;
  };

  const handleBackdropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (backdropMouseDownRef.current && e.target === e.currentTarget) {
      onClose();
    }
    backdropMouseDownRef.current = false;
  };

  // Calculate balances for each account based on transactions
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
          balances.set(fromId, balances.get(fromId)! - tx.amount);
        }
        if (toId && balances.has(toId)) {
          balances.set(toId, balances.get(toId)! + tx.amount);
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

  // Transaction counts per account
  const accountTxCounts = useMemo(() => {
    const counts = new Map<string, number>();
    transactions.forEach((tx) => {
      if (tx.type === 'transfer') {
        const fromId = tx.fromAccountId || tx.accountId;
        const toId = tx.toAccountId;
        if (fromId) counts.set(fromId, (counts.get(fromId) || 0) + 1);
        if (toId) counts.set(toId, (counts.get(toId) || 0) + 1);
      } else if (tx.accountId) {
        counts.set(tx.accountId, (counts.get(tx.accountId) || 0) + 1);
      }
    });
    return counts;
  }, [transactions]);

  // Modifiable accounts: Cash is the permanent core account and hidden from editable list per user request
  const modifiableAccounts = useMemo(() => {
    return accounts.filter((acc) => !isCashAccount(acc));
  }, [accounts]);

  const totalBalanceAllAccounts = useMemo(() => {
    let sum = 0;
    accountBalances.forEach((val) => {
      sum += val;
    });
    return sum;
  }, [accountBalances]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Please provide an account name.');
      return;
    }
    if (trimmedName.length > 30) {
      setErrorMessage('Account name cannot be longer than 30 characters.');
      return;
    }

    const initBal = parseFloat(initialBalance) || 0;
    if (Math.abs(initBal) > 9999999999.99) {
      setErrorMessage('Starting balance is too high (maximum 10 digits).');
      return;
    }

    onAddAccount({
      name: trimmedName.slice(0, 30),
      type,
      color: '#52525B',
      icon,
      initialBalance: initBal,
      isDefault: accounts.length === 0,
    });

    setName('');
    setType('ewallet');
    setIcon('bank-gcash');
    setInitialBalance('0');
    setErrorMessage(null);
    setIsAdding(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const trimmedName = editingAccount.name.trim();
    if (!trimmedName) {
      setEditErrorMessage('Please provide an account name.');
      return;
    }
    if (trimmedName.length > 30) {
      setEditErrorMessage('Account name cannot be longer than 30 characters.');
      return;
    }

    const initBal = parseFloat(editBalance) || 0;
    if (Math.abs(initBal) > 9999999999.99) {
      setEditErrorMessage('Starting balance is too high (maximum 10 digits).');
      return;
    }

    onUpdateAccount({
      ...editingAccount,
      name: trimmedName.slice(0, 30),
      initialBalance: initBal,
    });
    setEditingAccount(null);
    setEditErrorMessage(null);
  };

  return (
    <div
      id="modal-accounts-backdrop"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
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
              <h2 className="text-sm font-semibold text-zinc-900">Accounts</h2>
              <p className="text-xs text-zinc-500">
                Track your money across Cash, E-Wallets, Cards, and Banks.
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
          {!isAdding && (
            <button
              id="btn-show-add-account"
              type="button"
              onClick={() => {
                setIsAdding(true);
                setEditingAccount(null);
                setName('GCash');
                setIcon('bank-gcash');
                setInitialBalance('0');
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-[4px] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Account</span>
            </button>
          )}
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

              {/* Account Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="input-new-account-name"
                    className="text-[11px] font-medium text-zinc-700"
                  >
                    Account Name
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {name.length}/30
                  </span>
                </div>
                <input
                  id="input-new-account-name"
                  type="text"
                  required
                  maxLength={30}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value.slice(0, 30));
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
                  <AccountTypeSelect
                    id="select-new-account-type"
                    value={type}
                    onChange={setType}
                    ariaLabel="New account type"
                  />
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
                    type="text"
                    inputMode="decimal"
                    value={initialBalance}
                    onChange={(e) => {
                      setInitialBalance(sanitizeBalanceInput(e.target.value));
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="0.00"
                    className="w-full bg-white border border-zinc-200 px-3 py-1.5 rounded-[4px] text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {/* Icon Selection */}
              <AccountIconPicker
                value={icon}
                onChange={(newIcon, iconName) => {
                  setIcon(newIcon);
                  if (iconName) {
                    setName(iconName);
                    if (errorMessage) setErrorMessage(null);
                  }
                  // Automatically set account type based on selected logo or symbol
                  const bankItem = BANK_LOGOS.find((b) => b.id === newIcon);
                  if (bankItem) {
                    if (bankItem.category === 'wallet') {
                      setType('ewallet');
                    } else if (bankItem.category === 'bank') {
                      setType('bank');
                    }
                  } else if (newIcon === 'CreditCard') {
                    setType('credit_card');
                  } else if (newIcon === 'Banknote' || newIcon === 'Coins') {
                    setType('cash');
                  } else if (newIcon === 'Landmark' || newIcon === 'PiggyBank' || newIcon === 'Shield') {
                    setType('bank');
                  } else if (newIcon === 'Smartphone' || newIcon === 'Wallet') {
                    setType('ewallet');
                  }
                }}
              />

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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-zinc-700">
                    Account Name
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {editingAccount.name.length}/30
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={editingAccount.name}
                  onChange={(e) => {
                    setEditingAccount({
                      ...editingAccount,
                      name: e.target.value.slice(0, 30),
                    });
                    if (editErrorMessage) setEditErrorMessage(null);
                  }}
                  className="w-full bg-white border border-zinc-200 px-3 py-1.5 rounded-[4px] text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                    Account Type
                  </label>
                  {isCashAccount(editingAccount) ? (
                    <div className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-[4px] text-xs text-zinc-700 font-medium flex items-center justify-between min-h-[34px]">
                      <span>Cash</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-[3px]">
                        Main Account
                      </span>
                    </div>
                  ) : (
                    <AccountTypeSelect
                      id="select-edit-account-type"
                      value={editingAccount.type}
                      onChange={(t) =>
                        setEditingAccount({
                          ...editingAccount,
                          type: t,
                        })
                      }
                      ariaLabel="Edit account type"
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-zinc-700">
                      Starting Balance ({currencySymbol})
                    </label>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Max 10 digits
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editBalance}
                    onChange={(e) => {
                      setEditBalance(sanitizeBalanceInput(e.target.value));
                      if (editErrorMessage) setEditErrorMessage(null);
                    }}
                    className="w-full bg-white border border-zinc-200 px-3 py-1.5 rounded-[4px] text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {/* Icon selection */}
              <AccountIconPicker
                value={editingAccount.icon}
                onChange={(newIcon, iconName) => {
                  const bankItem = BANK_LOGOS.find((b) => b.id === newIcon);
                  setEditingAccount((prev) => {
                    if (!prev) return null;
                    let nextType = prev.type;
                    if (bankItem) {
                      if (bankItem.category === 'wallet') nextType = 'ewallet';
                      else if (bankItem.category === 'bank') nextType = 'bank';
                    } else if (newIcon === 'CreditCard') {
                      nextType = 'credit_card';
                    } else if (newIcon === 'Banknote' || newIcon === 'Coins') {
                      nextType = 'cash';
                    } else if (newIcon === 'Landmark' || newIcon === 'PiggyBank' || newIcon === 'Shield') {
                      nextType = 'bank';
                    } else if (newIcon === 'Smartphone' || newIcon === 'Wallet') {
                      nextType = 'ewallet';
                    }

                    return {
                      ...prev,
                      icon: newIcon,
                      name: iconName || prev.name,
                      type: nextType,
                    };
                  });
                }}
              />

              {editErrorMessage && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-[4px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{editErrorMessage}</span>
                </div>
              )}

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

          {/* List of Accounts (Hidden when adding or editing an account) */}
          {!isAdding && !editingAccount && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-medium text-zinc-700">
                  Active Accounts ({modifiableAccounts.length})
                </span>
              </div>

              {modifiableAccounts.length === 0 ? (
                <div className="p-4 rounded-[5px] border border-dashed border-zinc-200 text-center bg-zinc-50/50">
                  <p className="text-xs text-zinc-600 font-medium">
                    No other accounts added yet.
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    You can add other accounts like e-wallets, cards, or bank accounts above.
                  </p>
                </div>
              ) : (
                modifiableAccounts.map((acc) => {
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
                            <h4 className="text-xs font-semibold text-zinc-900 break-words">
                              {acc.name}
                            </h4>
                            <span className="text-[10px] uppercase font-medium tracking-wider px-1.5 py-0.5 rounded-[3px] bg-zinc-100 text-zinc-600 border border-zinc-200/60 shrink-0">
                              {typeObj?.label || 'Asset'}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {txCount} {txCount === 1 ? 'Transaction' : 'Transactions'}
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
                              setEditBalance(
                                acc.initialBalance !== undefined
                                  ? String(acc.initialBalance)
                                  : '0'
                              );
                              setEditErrorMessage(null);
                              setIsAdding(false);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-[3px] transition-colors cursor-pointer"
                            title="Edit account"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            id={`btn-delete-account-${acc.id}`}
                            onClick={() => setAccountToDelete(acc)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-[3px] transition-colors cursor-pointer"
                            title="Delete account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
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

      {/* Delete Account Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-sm w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h4 className="text-sm font-semibold text-zinc-900">Delete Account</h4>
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="text-zinc-400 hover:text-zinc-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-zinc-900">{accountToDelete.name}</strong>?
              Past entries in your history will keep this account information.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 rounded-[3px] border border-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-account"
                onClick={() => {
                  onDeleteAccount(accountToDelete.id);
                  setAccountToDelete(null);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-[3px] transition-colors cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
