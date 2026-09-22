import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Wallet } from 'lucide-react';
import { Account } from '../types';
import { AccountIcon } from './CategoryIcon';
import { formatCurrency } from '../utils/formatters';

export interface AccountSelectProps {
  id?: string;
  accounts: Account[];
  value?: string;
  onChange: (accountId: string) => void;
  disabled?: boolean;
  allowNone?: boolean;
  noneLabel?: string;
  className?: string;
  ariaLabel?: string;
  accountBalances?: Map<string, number>;
  currencySymbol?: string;
  alignDropdown?: 'left' | 'right';
}

export function AccountSelect({
  id = 'account-select',
  accounts,
  value,
  onChange,
  disabled = false,
  allowNone = true,
  noneLabel = '(No Account)',
  className = '',
  ariaLabel = 'Select account',
  accountBalances,
  currencySymbol = '₱',
  alignDropdown = 'left',
}: AccountSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedAccount = accounts.find((a) => a.id === value) || null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (accId: string) => {
    onChange(accId);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className="w-full h-full min-h-[36px] bg-white border border-zinc-200 hover:border-zinc-300 text-xs px-2.5 rounded-[4px] text-zinc-900 focus:outline-none focus:border-zinc-500 flex items-center justify-between gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedAccount ? (
            <>
              <AccountIcon name={selectedAccount.icon} className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <span className="font-semibold text-zinc-900 tracking-tight truncate">
                {selectedAccount.name}
              </span>
            </>
          ) : (
            <>
              <Wallet className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="text-zinc-500 truncate">{noneLabel}</span>
            </>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-zinc-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute z-50 ${
            alignDropdown === 'right' ? 'right-0' : 'left-0'
          } mt-1 w-full min-w-[200px] max-h-64 overflow-y-auto bg-white border border-zinc-200 rounded-[4px] shadow-lg py-1 divide-y divide-zinc-50 animate-fade-in`}
        >
          {allowNone && (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => handleSelect('')}
              className={`w-full px-2.5 py-2 flex items-center justify-between text-left text-xs transition-colors hover:bg-zinc-50 cursor-pointer ${
                !value ? 'bg-zinc-100/70 font-semibold text-zinc-900' : 'text-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Wallet className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="text-zinc-600 truncate">{noneLabel}</span>
              </div>
              {!value && <Check className="w-3.5 h-3.5 text-zinc-800 shrink-0 ml-1.5" />}
            </button>
          )}

          {accounts.map((acc) => {
            const isSelected = acc.id === value;
            const balance = accountBalances?.get(acc.id);
            return (
              <button
                key={acc.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(acc.id)}
                className={`w-full px-2.5 py-2 flex items-center justify-between text-left text-xs transition-colors hover:bg-zinc-50 cursor-pointer ${
                  isSelected ? 'bg-zinc-100/70 font-semibold text-zinc-900' : 'text-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AccountIcon name={acc.icon} className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  <span className="font-medium text-zinc-900 truncate">{acc.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {balance !== undefined && (
                    <span
                      className={`font-mono text-[11px] ${
                        balance >= 0 ? 'text-zinc-500' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(balance, currencySymbol)}
                    </span>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 text-zinc-800 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
