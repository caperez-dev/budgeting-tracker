import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Wallet, Banknote, Landmark, CreditCard, MoreHorizontal } from 'lucide-react';
import { AccountType } from '../types';

export interface AccountTypeOption {
  id: AccountType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  { id: 'ewallet', label: 'E-Wallet', icon: Wallet },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'bank', label: 'Bank Account', icon: Landmark },
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
];

export interface AccountTypeSelectProps {
  id?: string;
  value: AccountType;
  onChange: (type: AccountType) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function AccountTypeSelect({
  id = 'account-type-select',
  value,
  onChange,
  disabled = false,
  className = '',
  ariaLabel = 'Select account type',
}: AccountTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    ACCOUNT_TYPE_OPTIONS.find((o) => o.id === value) || ACCOUNT_TYPE_OPTIONS[0];
  const IconComp = selectedOption.icon;

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

  const handleSelect = (t: AccountType) => {
    onChange(t);
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
        className="w-full h-full min-h-[34px] bg-white border border-zinc-200 hover:border-zinc-300 text-xs px-2.5 py-1.5 rounded-[4px] text-zinc-900 focus:outline-none focus:border-zinc-500 flex items-center justify-between gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2 min-w-0">
          <IconComp className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <span className="font-semibold text-zinc-900 tracking-tight truncate">
            {selectedOption.label}
          </span>
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
          className="absolute z-50 left-0 mt-1 w-full min-w-[200px] max-h-64 overflow-y-auto bg-white border border-zinc-200 rounded-[4px] shadow-lg py-1 divide-y divide-zinc-50 animate-fade-in"
        >
          {ACCOUNT_TYPE_OPTIONS.map((opt) => {
            const isSelected = opt.id === value;
            const OptIcon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.id)}
                className={`w-full px-2.5 py-2 flex items-center justify-between text-left text-xs transition-colors hover:bg-zinc-50 cursor-pointer ${
                  isSelected ? 'bg-zinc-100/70 font-semibold text-zinc-900' : 'text-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <OptIcon className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  <span className="font-medium text-zinc-900 truncate">
                    {opt.label}
                  </span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-zinc-800 shrink-0 ml-1.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
