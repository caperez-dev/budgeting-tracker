import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Currency } from '../types';
import { CurrencyFlag } from './CurrencyFlag';

export interface CurrencySelectProps {
  id?: string;
  currencies: Currency[];
  value: string;
  onChange: (code: string) => void;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function CurrencySelect({
  id = 'currency-select',
  currencies,
  value,
  onChange,
  className = '',
  ariaLabel = 'Select currency',
  disabled = false,
}: CurrencySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCurrency =
    currencies.find((c) => c.code === value) || currencies[0] || {
      code: value,
      symbol: '$',
      name: value,
    };

  // Close dropdown on outside click
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

  // Handle escape key
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

  const handleSelect = (code: string) => {
    onChange(code);
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
        className="w-full h-full min-h-[36px] bg-white border border-zinc-200 hover:border-zinc-300 text-xs px-2.5 rounded-[4px] text-zinc-900 focus:outline-none focus:border-zinc-500 flex items-center justify-between gap-1.5 transition-colors font-mono cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <CurrencyFlag code={selectedCurrency.code} flag={selectedCurrency.flag} size="md" />
          <span className="font-semibold text-zinc-900 tracking-tight">
            {selectedCurrency.code}
          </span>
          <span className="text-zinc-500 font-mono text-[11px]">
            {selectedCurrency.symbol}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-zinc-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu - Lists all currencies with actual flags, no add/manage option */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-50 left-0 mt-1 w-full min-w-[210px] max-h-64 overflow-y-auto bg-white border border-zinc-200 rounded-[4px] shadow-lg py-1 divide-y divide-zinc-50 animate-fade-in"
        >
          {currencies.map((curr) => {
            const isSelected = curr.code === selectedCurrency.code;
            return (
              <button
                key={curr.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(curr.code)}
                className={`w-full px-2.5 py-2 flex items-center justify-between text-left text-xs transition-colors hover:bg-zinc-50 cursor-pointer ${
                  isSelected ? 'bg-zinc-100/70 font-semibold text-zinc-900' : 'text-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CurrencyFlag code={curr.code} flag={curr.flag} size="md" />
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="font-mono font-bold text-zinc-900">
                      {curr.code}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500">
                      {curr.symbol}
                    </span>
                    {curr.name && curr.name !== curr.code && (
                      <span className="text-[11px] text-zinc-400 truncate max-w-[90px]">
                        ({curr.name})
                      </span>
                    )}
                  </div>
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
