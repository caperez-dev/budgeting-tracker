import React, { useState, useMemo, useEffect } from 'react';
import { X, ArrowRight, ArrowLeftRight, AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import { Account, Transaction } from '../types';
import { AccountSelect } from './AccountSelect';
import { formatCurrency } from '../utils/formatters';

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

  // Initial account selection
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Initialize or reset selections when modal opens
  useEffect(() => {
    if (isOpen && accounts.length >= 2) {
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
      setAmount('');
      setNote('');
      setIsSuccess(false);
    }
  }, [isOpen, accounts]);

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  const handleAmountPreset = (percentage: number) => {
    if (fromBalance > 0) {
      const calculated = Math.min(
        Math.floor(fromBalance * percentage * 100) / 100,
        9999999999.99
      );
      setAmount(calculated > 0 ? calculated.toString() : '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    onTransfer({
      fromAccountId,
      toAccountId,
      amount: parsedAmount,
      note: note.trim(),
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-fade-in"
    >
      <div
        id="transfer-modal-card"
        className="w-full max-w-lg bg-white border border-zinc-200 rounded-[6px] shadow-xl overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[4px] bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700">
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 id="transfer-modal-title" className="text-sm font-semibold text-zinc-900 tracking-tight">
                Transfer Balance
              </h2>
              <p className="text-[11px] text-zinc-500">
                Move money from one account to another
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-transfer-modal"
            onClick={onClose}
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
              <button
                type="button"
                id="btn-transfer-go-to-accounts"
                onClick={() => {
                  onClose();
                  onOpenAddAccount();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-[4px] text-xs font-medium hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Add Another Account</span>
              </button>
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
            <div>
              <div className="flex flex-row items-center gap-2 sm:gap-3 w-full">
                {/* Left: From */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <label className="text-xs font-medium text-zinc-700 truncate">
                      From
                    </label>
                  </div>
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
                  <div className="flex items-center justify-between text-[11px] px-0.5">
                    <span className="text-zinc-500">Available:</span>
                    <span
                      className={`font-mono font-semibold truncate ${
                        fromBalance > 0 ? 'text-zinc-900' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(fromBalance, currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Center: Swap button */}
                <div className="flex items-center justify-center shrink-0">
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

                {/* Right: To */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <label className="text-xs font-medium text-zinc-700 truncate">
                      To
                    </label>
                  </div>
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
                  <div className="flex items-center justify-between text-[11px] px-0.5">
                    <span className="text-zinc-500">Current:</span>
                    <span className="font-mono font-semibold text-zinc-900 truncate">
                      {formatCurrency(toBalance, currencySymbol)}
                    </span>
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
              <div className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-[4px] text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>The selected account has no available balance to transfer.</span>
              </div>
            )}

            {/* Amount Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="transfer-amount-input" className="text-xs font-medium text-zinc-700">
                  Amount
                </label>
                {fromBalance > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleAmountPreset(0.25)}
                      className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAmountPreset(0.5)}
                      className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAmountPreset(1)}
                      className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium transition-colors cursor-pointer"
                    >
                      Max
                    </button>
                  </div>
                )}
              </div>

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
              <input
                id="transfer-note-input"
                type="text"
                maxLength={100}
                placeholder="e.g., Weekly budget, Allowance, Savings"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-zinc-200 rounded-[4px] text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            {/* Balance Preview Card */}
            {isValidAmount && !isInsufficient && !isSameAccount && fromAccount && toAccount && (
              <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-[4px] space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block">
                  New Balances Preview
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-[3px] border border-zinc-200">
                    <span className="text-[11px] text-zinc-500 block truncate">{fromAccount.name}</span>
                    <div className="flex items-center gap-1 mt-0.5 font-mono">
                      <span className="text-zinc-400 line-through text-[11px]">
                        {formatCurrency(fromBalance, currencySymbol)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-zinc-400" />
                      <span className="font-semibold text-zinc-900 text-xs">
                        {formatCurrency(fromBalance - parsedAmount, currencySymbol)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-[3px] border border-zinc-200">
                    <span className="text-[11px] text-zinc-500 block truncate">{toAccount.name}</span>
                    <div className="flex items-center gap-1 mt-0.5 font-mono">
                      <span className="text-zinc-400 line-through text-[11px]">
                        {formatCurrency(toBalance, currencySymbol)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-zinc-400" />
                      <span className="font-semibold text-emerald-700 text-xs">
                        {formatCurrency(toBalance + parsedAmount, currencySymbol)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer / Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                id="btn-cancel-transfer"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 border border-zinc-200 hover:bg-zinc-50 rounded-[4px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-submit-transfer"
                disabled={isSubmitDisabled}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-[4px] transition-all shadow-2xs ${
                  isSubmitDisabled
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-200'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-900 cursor-pointer'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>
                  {isValidAmount && !isInsufficient
                    ? `Transfer ${formatCurrency(parsedAmount, currencySymbol)}`
                    : 'Transfer Balance'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
