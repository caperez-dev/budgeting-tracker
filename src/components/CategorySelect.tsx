import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Layers } from 'lucide-react';
import { Category } from '../types';
import { CategoryIcon } from './CategoryIcon';

export interface CategorySelectProps {
  id?: string;
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
  className?: string;
  buttonClassName?: string;
  ariaLabel?: string;
  disabled?: boolean;
  showAllOption?: boolean;
  placeholder?: string;
}

export function CategorySelect({
  id = 'category-select',
  categories,
  value,
  onChange,
  className = '',
  buttonClassName = '',
  ariaLabel = 'Select category',
  disabled = false,
  showAllOption = false,
  placeholder,
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCategory = showAllOption
    ? value === 'all'
      ? null
      : categories.find((c) => c.id === value)
    : categories.find((c) => c.id === value) || categories[0] || null;

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

  const handleSelect = (catId: string) => {
    onChange(catId);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full ${className}`}
    >
      {/* Trigger Button - Designed identically to Quick Entry CurrencySelect */}
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full h-full min-h-[32px] bg-white border border-zinc-200 hover:border-zinc-300 text-xs px-2.5 rounded-[4px] text-zinc-900 focus:outline-none focus:border-zinc-500 flex items-center justify-between gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedCategory ? (
            <>
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs"
                style={{ backgroundColor: selectedCategory.color }}
              />
              <CategoryIcon name={selectedCategory.icon} className="w-3.5 h-3.5 shrink-0 text-zinc-600" />
              <span className="font-semibold text-zinc-900 tracking-tight truncate">
                {selectedCategory.name}
              </span>
            </>
          ) : (
            <>
              <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="font-semibold text-zinc-900 tracking-tight truncate">
                {placeholder || (showAllOption ? 'All Categories' : 'Select Category')}
              </span>
            </>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-zinc-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu - Lists categories matching CurrencySelect styling */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-50 left-0 mt-1 w-full min-w-[210px] max-h-64 overflow-y-auto bg-white border border-zinc-200 rounded-[4px] shadow-lg py-1 divide-y divide-zinc-50 animate-fade-in"
        >
          {/* Option: All Categories (if showAllOption is enabled) */}
          {showAllOption && (
            <button
              type="button"
              role="option"
              aria-selected={value === 'all'}
              onClick={() => handleSelect('all')}
              className={`w-full px-2.5 py-2 flex items-center justify-between text-left text-xs transition-colors hover:bg-zinc-50 cursor-pointer ${
                value === 'all' ? 'bg-zinc-100/70 font-semibold text-zinc-900' : 'text-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="font-medium text-zinc-900">All Categories</span>
              </div>
              {value === 'all' && (
                <Check className="w-3.5 h-3.5 text-zinc-800 shrink-0 ml-1.5" />
              )}
            </button>
          )}

          {/* List of Categories */}
          {categories.map((cat) => {
            const isSelected = cat.id === (selectedCategory?.id ?? value);
            return (
              <button
                key={cat.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(cat.id)}
                className={`w-full px-2.5 py-2 flex items-center justify-between text-left text-xs transition-colors hover:bg-zinc-50 cursor-pointer ${
                  isSelected ? 'bg-zinc-100/70 font-semibold text-zinc-900' : 'text-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs"
                    style={{ backgroundColor: cat.color }}
                  />
                  <CategoryIcon name={cat.icon} className="w-3.5 h-3.5 shrink-0 text-zinc-600" />
                  <span className="font-medium text-zinc-900 truncate">{cat.name}</span>
                  {showAllOption && cat.type && (
                    <span
                      className={`text-[10px] px-1 py-0.5 rounded uppercase font-medium ${
                        cat.type === 'expense'
                          ? 'text-rose-600 bg-rose-50'
                          : 'text-emerald-700 bg-emerald-50'
                      }`}
                    >
                      {cat.type}
                    </span>
                  )}
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
