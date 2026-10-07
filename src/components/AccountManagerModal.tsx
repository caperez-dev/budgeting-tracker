import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, Edit2, Check, X, Smartphone, Banknote, Landmark, CreditCard, PiggyBank, Coins, AlertCircle, GripVertical } from 'lucide-react';
import { Account, AccountType, Transaction } from '../types';
import { AccountIcon } from './CategoryIcon';
import { formatCurrency } from '../utils/formatters';
import { AccountTypeSelect } from './AccountTypeSelect';
import { AccountIconPicker } from './AccountIconPicker';
import { SpecularButton } from './ui/SpecularButton';
import { useModalAnimation } from '../utils/useModalAnimation';

interface AccountManagerModalProps {
  accounts: Account[];
  transactions: Transaction[];
  currencySymbol: string;
  onAddAccount: (account: Omit<Account, 'id'>) => void;
  onUpdateAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  onReorderAccounts?: (accounts: Account[]) => void;
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

export const ensureCashAccount = (accList: Account[]): Account[] => {
  if (!Array.isArray(accList) || accList.length === 0) {
    return [
      {
        id: 'cash',
        name: 'Cash',
        type: 'cash',
        color: '#16A34A',
        icon: 'Banknote',
        order: 0,
        isDefault: true,
        initialBalance: 0,
      },
    ];
  }
  const cashAcc = accList.find(isCashAccount);
  const seenIds = new Set<string>();
  if (cashAcc) {
    seenIds.add(cashAcc.id);
    seenIds.add('cash');
  }

  const otherAccs: Account[] = [];
  for (const a of accList) {
    if (!a || !a.id || isCashAccount(a)) continue;
    if (!seenIds.has(a.id)) {
      seenIds.add(a.id);
      otherAccs.push(a);
    }
  }

  const finalCash: Account = cashAcc
    ? { ...cashAcc, order: 0 }
    : {
        id: 'cash',
        name: 'Cash',
        type: 'cash' as const,
        color: '#16A34A',
        icon: 'Banknote',
        order: 0,
        isDefault: otherAccs.every((a) => !a.isDefault),
        initialBalance: 0,
      };

  return [finalCash, ...otherAccs.map((a, idx) => ({ ...a, order: idx + 1 }))];
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
  onReorderAccounts,
  onClose,
}: AccountManagerModalProps) {
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // New Account State
  const [name, setName] = useState('GCash');
  const [type, setType] = useState<AccountType>('ewallet');
  const [icon, setIcon] = useState('bank-gcash');
  const [initialBalance, setInitialBalance] = useState<string>('0');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Reorderable accounts state (includes all accounts, guaranteed single cash at index 0)
  const [items, setItems] = useState<Account[]>(() => ensureCashAccount(accounts));

  useEffect(() => {
    setItems(ensureCashAccount(accounts));
  }, [accounts]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (accountToDelete) {
          setAccountToDelete(null);
        } else if (isAdding) {
          setIsAdding(false);
        } else if (editingAccount) {
          setEditingAccount(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [accountToDelete, isAdding, editingAccount, onClose]);

  // Drag-and-drop vertical-only reordering state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const [currentHoverIndex, setCurrentHoverIndex] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<boolean>(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const startYRef = useRef<number>(0);
  const minDeltaYRef = useRef<number>(0);
  const maxDeltaYRef = useRef<number>(0);
  const activeDragIndexRef = useRef<number | null>(null);
  const currentHoverIndexRef = useRef<number | null>(null);
  const rowHeightRef = useRef<number>(44);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, index: number) => {
    // Cash account (index 0) cannot be dragged, and we need at least 2 non-cash accounts to reorder
    if (index === 0 || isCashAccount(items[index])) return;
    if (items.length <= 2) return;
    if (e.button !== 0) return; // Only primary mouse button

    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    activeDragIndexRef.current = index;
    currentHoverIndexRef.current = index;
    startYRef.current = e.clientY;

    if (rowRefs.current[index] && containerRef.current) {
      const rowRect = rowRefs.current[index]!.getBoundingClientRect();
      const contRect = containerRef.current.getBoundingClientRect();
      const firstNonCashRow = rowRefs.current[1];
      const topLimit = firstNonCashRow
        ? firstNonCashRow.getBoundingClientRect().top
        : contRect.top;

      // Strictly clamp so the dragged row NEVER moves above the first non-cash row (never overlaps Cash)
      minDeltaYRef.current = topLimit - rowRect.top;
      maxDeltaYRef.current = contRect.bottom - rowRect.bottom;
      rowHeightRef.current = rowRect.height || 44;
    }

    setDraggingIndex(index);
    setCurrentHoverIndex(index);
    setDragOffsetY(0);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activeDragIndexRef.current === null || activeDragIndexRef.current === 0 || !containerRef.current) return;

    const deltaY = e.clientY - startYRef.current;
    // Strictly clamp within wrapper vertically so the account never goes out of the box and cannot overlap Cash
    const clampedY = Math.max(minDeltaYRef.current, Math.min(maxDeltaYRef.current, deltaY));

    setDragOffsetY(clampedY);

    // Calculate hover index based on vertical row shifts (strictly clamped between 1 and items.length - 1)
    const rowH = rowHeightRef.current || 44;
    const indexShift = Math.round(clampedY / rowH);
    const targetIdx = Math.max(
      1, // Strictly NEVER 0 - Cash stays in place at index 0!
      Math.min(items.length - 1, activeDragIndexRef.current + indexShift)
    );

    if (targetIdx !== currentHoverIndexRef.current) {
      currentHoverIndexRef.current = targetIdx;
      setCurrentHoverIndex(targetIdx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activeDragIndexRef.current === null || activeDragIndexRef.current === 0) return;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const fromIdx = activeDragIndexRef.current;
    const rawToIdx = currentHoverIndexRef.current;
    const toIdx = rawToIdx !== null ? Math.max(1, Math.min(items.length - 1, rawToIdx)) : fromIdx;

    activeDragIndexRef.current = null;
    currentHoverIndexRef.current = null;
    setDraggingIndex(null);
    setDragOffsetY(0);
    setCurrentHoverIndex(null);

    if (toIdx !== null && toIdx !== fromIdx && fromIdx >= 1 && toIdx >= 1 && toIdx < items.length) {
      const reordered = [...items];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      const clean = ensureCashAccount(reordered);
      setItems(clean);
      onReorderAccounts?.(clean);
      setSaveStatus(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setSaveStatus(false);
      }, 2000);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    activeDragIndexRef.current = null;
    currentHoverIndexRef.current = null;
    setDraggingIndex(null);
    setDragOffsetY(0);
    setCurrentHoverIndex(null);
  };

  const getRowTransform = (index: number) => {
    if (draggingIndex === null) return undefined;
    // Cash NEVER moves or transforms - it stays strictly fixed in place
    if (index === 0 || isCashAccount(items[index])) return undefined;

    if (index === draggingIndex) {
      // Moves ONLY vertically, never horizontally
      return `translate3d(0, ${dragOffsetY}px, 0)`;
    }
    const rowH = rowHeightRef.current || 44;
    if (currentHoverIndex !== null && currentHoverIndex >= 1 && draggingIndex >= 1) {
      if (draggingIndex < currentHoverIndex) {
        if (index > draggingIndex && index <= currentHoverIndex) {
          return `translate3d(0, -${rowH}px, 0)`;
        }
      } else if (draggingIndex > currentHoverIndex) {
        if (index >= currentHoverIndex && index < draggingIndex) {
          return `translate3d(0, ${rowH}px, 0)`;
        }
      }
    }
    return undefined;
  };

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
      setErrorMessage('Starting balance is too high.');
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

    setName('GCash');
    setType('ewallet');
    setIcon('bank-gcash');
    setInitialBalance('0');
    setErrorMessage(null);
    setIsAdding(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || isCashAccount(editingAccount)) return;
    const trimmedName = editingAccount.name.trim();
    if (!trimmedName) {
      setEditErrorMessage('Please provide an account name.');
      return;
    }
    if (trimmedName.length > 30) {
      setEditErrorMessage('Account name cannot be longer than 30 characters.');
      return;
    }

    onUpdateAccount({
      ...editingAccount,
      name: trimmedName.slice(0, 30),
    });
    setEditingAccount(null);
    setEditErrorMessage(null);
  };

  const { requestClose, backdropClass, modalClass } = useModalAnimation({ onClose });

  return (
    <div
      id="modal-accounts-backdrop"
      className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer ${backdropClass}`}
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
      <div
        id="modal-accounts"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-[6px] border border-zinc-200 shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden cursor-default ${modalClass}`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Accounts</h2>
            <p className="text-xs text-zinc-500">
              Track your money across Cash, E-Wallets, Cards, and Banks.
            </p>
          </div>
          <button
            id="button-close-accounts-modal"
            type="button"
            onClick={requestClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-[3px] transition-colors cursor-pointer"
            aria-label="Close accounts window"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Summary Bar (Hidden when editing or adding an account) */}
        {!editingAccount && !isAdding && (
          <div className="px-5 py-3 bg-white flex items-center justify-between shrink-0">
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
              <SpecularButton
                id="btn-show-add-account"
                type="button"
                size="sm"
                radius={4}
                onClick={() => {
                  setName('GCash');
                  setType('ewallet');
                  setIcon('bank-gcash');
                  setInitialBalance('0');
                  setErrorMessage(null);
                  setIsAdding(true);
                  setEditingAccount(null);
                }}
                className="px-3 py-1 text-white text-xs font-medium"
              >
                <span>Add Account</span>
              </SpecularButton>
            )}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Add Account Form */}
          {isAdding && (
            <form
              id="form-add-account"
              onSubmit={handleCreate}
              className="space-y-4 animate-in fade-in duration-150"
            >
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
                onChange={(newIcon, meta) => {
                  setIcon(newIcon);
                  if (meta?.name) {
                    setName(meta.name);
                    if (meta.category === 'wallet') {
                      setType('ewallet');
                    } else if (meta.category === 'bank') {
                      setType('bank');
                    }
                  }
                  if (errorMessage) setErrorMessage(null);
                }}
              />

              {errorMessage && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-[4px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Hidden submit button to support Enter key submission inside input fields */}
              <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
            </form>
          )}

          {/* Edit Account Form */}
          {editingAccount && (
            <form
              id="form-edit-account"
              onSubmit={handleSaveEdit}
              className="space-y-4 animate-in fade-in duration-150"
            >
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

              {/* Icon selection */}
              <AccountIconPicker
                value={editingAccount.icon}
                onChange={(newIcon, meta) => {
                  setEditingAccount((prev) => {
                    if (!prev) return null;
                    const isCash = isCashAccount(prev);
                    return {
                      ...prev,
                      icon: newIcon,
                      name: !isCash && meta?.name ? meta.name : prev.name,
                      type:
                        !isCash && meta?.category === 'wallet'
                          ? 'ewallet'
                          : !isCash && meta?.category === 'bank'
                          ? 'bank'
                          : prev.type,
                    };
                  });
                  if (editErrorMessage) setEditErrorMessage(null);
                }}
              />

              {editErrorMessage && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-[4px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{editErrorMessage}</span>
                </div>
              )}

              {/* Hidden submit button to support Enter key submission inside input fields */}
              <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
            </form>
          )}

          {/* List of Accounts (Hidden when adding or editing an account) */}
          {!isAdding && !editingAccount && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 shrink-0 h-4">
                {saveStatus ? (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 transition-opacity">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Saved</span>
                  </span>
                ) : (
                  <span />
                )}
                <span className="font-mono text-[10px] text-zinc-400">
                  {items.length} {items.length === 1 ? 'account' : 'accounts'}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="p-4 rounded-[4px] border border-dashed border-zinc-200 text-center bg-zinc-50/50">
                  <p className="text-xs text-zinc-600 font-medium">
                    No other accounts added yet.
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    You can add other accounts like e-wallets, cards, or bank accounts above.
                  </p>
                </div>
              ) : (
                <div
                  ref={containerRef}
                  className="border border-zinc-200 rounded-[4px] divide-y divide-zinc-100 bg-white relative overflow-hidden select-none"
                >
                  {items.map((acc, index) => {
                    const isCash = isCashAccount(acc);
                    const currentBalance = accountBalances.get(acc.id) ?? (acc.initialBalance || 0);
                    const typeObj = ACCOUNT_TYPES.find((t) => t.id === acc.type);
                    const isDragging = draggingIndex === index;
                    const transform = getRowTransform(index);

                    return (
                      <div
                        key={acc.id}
                        ref={(el) => {
                          rowRefs.current[index] = el;
                        }}
                        id={`account-card-${acc.id}`}
                        style={{
                          transform,
                          zIndex: isDragging ? 30 : 10,
                          transition: isDragging ? 'none' : 'transform 150ms ease-out',
                        }}
                        className={`py-2.5 px-3 flex items-center justify-between text-xs relative bg-white ${
                          isDragging
                            ? 'shadow-md ring-1 ring-zinc-300 rounded-[3px] bg-zinc-50/95'
                            : 'hover:bg-zinc-50/70'
                        }`}
                      >
                        {/* Left: Drag Handle, Icon & Info */}
                        <div className="flex items-center gap-2 min-w-0">
                          {isCash ? (
                            <div
                              className="w-6 h-6 shrink-0 flex items-center justify-center -ml-1"
                              aria-hidden="true"
                            />
                          ) : (
                            <button
                              type="button"
                              id={`btn-drag-handle-${acc.id}`}
                              onPointerDown={(e) => handlePointerDown(e, index)}
                              onPointerMove={handlePointerMove}
                              onPointerUp={handlePointerUp}
                              onPointerCancel={handlePointerCancel}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown' && index < items.length - 1) {
                                  e.preventDefault();
                                  const reordered = [...items];
                                  const [moved] = reordered.splice(index, 1);
                                  reordered.splice(index + 1, 0, moved);
                                  const clean = ensureCashAccount(reordered);
                                  setItems(clean);
                                  onReorderAccounts?.(clean);
                                  setSaveStatus(true);
                                  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                                  saveTimerRef.current = setTimeout(() => {
                                    setSaveStatus(false);
                                  }, 2000);
                                } else if (e.key === 'ArrowUp' && index > 1) {
                                  e.preventDefault();
                                  const reordered = [...items];
                                  const [moved] = reordered.splice(index, 1);
                                  reordered.splice(index - 1, 0, moved);
                                  const clean = ensureCashAccount(reordered);
                                  setItems(clean);
                                  onReorderAccounts?.(clean);
                                  setSaveStatus(true);
                                  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                                  saveTimerRef.current = setTimeout(() => {
                                    setSaveStatus(false);
                                  }, 2000);
                                }
                              }}
                              className={`p-1 -ml-1 text-zinc-400 hover:text-zinc-700 active:text-zinc-950 flex items-center justify-center rounded-[3px] hover:bg-zinc-100 transition-colors touch-none cursor-grab active:cursor-grabbing shrink-0 ${
                                isDragging ? 'cursor-grabbing text-zinc-900 bg-zinc-100' : ''
                              }`}
                              title="Drag to reorder"
                              aria-label={`Drag to reorder ${acc.name}`}
                            >
                              <GripVertical className="w-4 h-4 shrink-0" />
                            </button>
                          )}

                          <AccountIcon name={acc.icon} className="w-4 h-4 text-zinc-600 shrink-0" />

                          <div className="flex items-center gap-2 min-w-0">
                            <h4 className="font-semibold text-zinc-900 truncate">
                              {acc.name}
                            </h4>
                            <span className="text-[10px] text-zinc-400 shrink-0">
                              • {typeObj?.label || 'Asset'}
                            </span>
                          </div>
                        </div>

                        {/* Right: Balance & Actions */}
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span
                            className={`font-mono text-xs font-semibold ${
                              currentBalance >= 0 ? 'text-zinc-900' : 'text-rose-600'
                            }`}
                          >
                            {formatCurrency(currentBalance, currencySymbol)}
                          </span>

                          <div className="flex items-center gap-1 border-l border-zinc-100 pl-2">
                            {isCash ? (
                              <>
                                <button
                                  type="button"
                                  disabled
                                  className="p-1 text-zinc-300 cursor-not-allowed opacity-40"
                                  title="Default account cannot be edited"
                                  aria-label="Default account cannot be edited"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  disabled
                                  className="p-1 text-zinc-300 cursor-not-allowed opacity-40"
                                  title="Default account cannot be removed"
                                  aria-label="Default account cannot be removed"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  id={`btn-edit-account-${acc.id}`}
                                  onClick={() => {
                                    setEditingAccount(acc);
                                    setEditErrorMessage(null);
                                    setIsAdding(false);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-zinc-700 rounded-[3px] transition-colors cursor-pointer"
                                  title="Edit account"
                                  aria-label={`Edit ${acc.name}`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  id={`btn-delete-account-${acc.id}`}
                                  onClick={() => setAccountToDelete(acc)}
                                  className="p-1 text-zinc-400 hover:text-rose-600 rounded-[3px] transition-colors cursor-pointer"
                                  title="Delete account"
                                  aria-label={`Delete ${acc.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-white border-t border-zinc-100 flex items-center justify-end gap-2 shrink-0">
          {isAdding ? (
            <>
              <button
                type="button"
                id="btn-cancel-add-account"
                onClick={() => {
                  setIsAdding(false);
                  setErrorMessage(null);
                }}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 rounded-[4px] cursor-pointer"
              >
                Cancel
              </button>
              <SpecularButton
                id="btn-save-new-account"
                type="submit"
                form="form-add-account"
                size="sm"
                radius={4}
                className="px-4 py-1.5 text-white text-xs font-semibold"
              >
                Save Account
              </SpecularButton>
            </>
          ) : editingAccount ? (
            <>
              <button
                type="button"
                id="btn-cancel-edit-account"
                onClick={() => {
                  setEditingAccount(null);
                  setEditErrorMessage(null);
                }}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800 rounded-[4px] cursor-pointer"
              >
                Cancel
              </button>
              <SpecularButton
                id="btn-save-edit-account"
                type="submit"
                form="form-edit-account"
                size="sm"
                radius={4}
                className="px-4 py-1.5 text-white text-xs font-semibold"
              >
                Save Changes
              </SpecularButton>
            </>
          ) : (
            <button
              type="button"
              id="btn-done-accounts"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-zinc-700 hover:text-zinc-900 font-medium transition-colors cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {accountToDelete && (
        <div
          className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4 animate-modal-backdrop-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAccountToDelete(null);
            }
          }}
        >
          <div
            className="bg-white rounded-[5px] border border-zinc-200 p-5 max-w-sm w-full shadow-lg space-y-4 animate-modal-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
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
