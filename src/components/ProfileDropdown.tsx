import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  ChevronDown,
  LogOut,
  Settings,
  Coins,
} from 'lucide-react';
import { UserProfile, DBStatus, AuthUser } from '../types';
import { CurrencyFlag } from './CurrencyFlag';

interface ProfileDropdownProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  expenseCount?: number;
  incomeCount?: number;
  debtCount?: number;
  overallExpenseCount?: number;
  overallIncomeCount?: number;
  overallDebtCount?: number;
  monthlyExpenseCount?: number;
  monthlyIncomeCount?: number;
  monthlyDebtCount?: number;
  selectedMonthYearLabel?: string;
  totalExpense?: number;
  totalIncome?: number;
  totalDebt?: number;
  currencySymbol?: string;
  currentCurrencyCode?: string;
  currentCurrencyFlag?: string;
  dbStatus?: DBStatus;
  onSyncWithDB?: () => Promise<void>;
  isSyncing?: boolean;
  lastSyncedTime?: string | null;
  currentUser?: AuthUser | null;
  isLoading?: boolean;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  onOpenCurrencies?: () => void;
}

export function ProfileDropdown({
  profile,
  onUpdateProfile,
  expenseCount = 0,
  incomeCount = 0,
  debtCount = 0,
  overallExpenseCount,
  overallIncomeCount,
  overallDebtCount,
  monthlyExpenseCount,
  monthlyIncomeCount,
  monthlyDebtCount,
  selectedMonthYearLabel,
  currencySymbol,
  currentCurrencyCode,
  currentCurrencyFlag,
  dbStatus,
  onSyncWithDB,
  isSyncing = false,
  lastSyncedTime,
  currentUser,
  isLoading = false,
  onOpenSettings,
  onLogout,
  onOpenCurrencies,
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const allTimeExpenseCount = overallExpenseCount ?? expenseCount;
  const allTimeIncomeCount = overallIncomeCount ?? incomeCount;
  const allTimeDebtCount = overallDebtCount ?? debtCount;

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isEmailLoading = isLoading || (!currentUser?.email && !profile.email);
  const activeEmail = currentUser?.email || profile.email || '';
  const activeAvatar = profile.avatarUrl !== undefined ? profile.avatarUrl : (currentUser?.avatarUrl || '');
  const activeNickname = profile.nickname || currentUser?.nickname || 'User';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Trigger Button on Header 1 */}
      <button
        id="btn-header-profile"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="rounded-full focus:outline-hidden focus:ring-2 focus:ring-zinc-400/50 transition-transform active:scale-95 flex items-center justify-center p-0.5 cursor-pointer"
        title={`Profile (${activeNickname})`}
      >
        {isEmailLoading ? (
          <div className="w-8 h-8 rounded-full bg-zinc-200 animate-pulse border border-zinc-300/60 shrink-0" />
        ) : activeAvatar ? (
          <img
            key={activeAvatar}
            src={activeAvatar}
            alt={activeNickname}
            className={`w-8 h-8 rounded-full object-cover transition-all shrink-0 ${
              isOpen ? 'ring-2 ring-zinc-900 shadow-xs' : 'hover:ring-2 hover:ring-zinc-300'
            }`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className={`w-8 h-8 rounded-full bg-zinc-900 text-white font-mono text-xs font-semibold flex items-center justify-center shrink-0 transition-all ${
              isOpen ? 'ring-2 ring-zinc-900 shadow-xs' : 'hover:bg-zinc-800'
            }`}
          >
            {activeNickname.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="profile-dropdown-menu"
          className="absolute right-0 top-full mt-2 w-80 bg-white border border-zinc-200 rounded-[8px] shadow-xl z-50 p-4 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Top Section: Avatar & Nickname */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative shrink-0">
              {isEmailLoading ? (
                <div className="w-13 h-13 rounded-full bg-zinc-200 animate-pulse border-2 border-zinc-100 shadow-xs shrink-0" />
              ) : activeAvatar ? (
                <img
                  key={activeAvatar}
                  src={activeAvatar}
                  alt={activeNickname}
                  className="w-13 h-13 rounded-full object-cover border-2 border-zinc-100 shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-13 h-13 rounded-full bg-zinc-900 text-white font-mono text-base font-bold flex items-center justify-center shadow-xs">
                  {activeNickname.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* Nickname & info */}
            <div className="flex-1 min-w-0">
              {isEmailLoading ? (
                <div className="space-y-1.5 py-0.5">
                  <div className="h-4 w-28 bg-zinc-200 rounded animate-pulse" />
                  <div className="h-3 w-40 bg-zinc-100 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <h4 className="font-bold text-sm text-zinc-900 truncate">
                    {activeNickname}
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5 truncate">
                    {activeEmail || 'Personal Account'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-100" />

          {/* Financial Counters: Expense, Income, Debt (All-time) */}
          <div className="grid grid-cols-3 py-1 text-center">
            {/* Expense */}
            <div className="flex flex-col items-center justify-center">
              <span className="font-mono text-sm font-semibold text-zinc-900 tabular-nums">
                {allTimeExpenseCount}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium lowercase mt-0.5">
                expenses
              </span>
            </div>

            {/* Income */}
            <div className="flex flex-col items-center justify-center">
              <span className="font-mono text-sm font-semibold text-zinc-900 tabular-nums">
                {allTimeIncomeCount}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium lowercase mt-0.5">
                income
              </span>
            </div>

            {/* Debt */}
            <div className="flex flex-col items-center justify-center">
              <span className="font-mono text-sm font-semibold text-zinc-900 tabular-nums">
                {allTimeDebtCount}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium lowercase mt-0.5">
                debts
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-100 pt-1" />

          {/* Currencies Navigation Action */}
          {onOpenCurrencies && (
            <button
              type="button"
              id="btn-profile-currencies"
              onClick={() => {
                setIsOpen(false);
                onOpenCurrencies();
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-[5px] text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors group cursor-pointer"
              title={`Manage currencies (Current: ${currentCurrencyCode || 'PHP'})`}
            >
              <div className="flex items-center gap-2">
                <Coins className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-800 transition-transform group-hover:scale-110" />
                <span>Currencies</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-600 font-mono text-[11px] font-semibold">
                <CurrencyFlag
                  code={currentCurrencyCode || 'PHP'}
                  flag={currentCurrencyFlag}
                  size="md"
                />
                <span>{currentCurrencyCode || 'PHP'}</span>
              </div>
            </button>
          )}

          {/* Settings Navigation Action */}
          {onOpenSettings && (
            <button
              type="button"
              id="btn-profile-settings"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[5px] text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors group cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-800 transition-transform group-hover:rotate-45" />
              <span>Settings</span>
            </button>
          )}

          {/* Log Out Action */}
          {onLogout && (
            <button
              type="button"
              id="btn-profile-logout"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[5px] text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors group cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-800 transition-transform group-hover:-translate-x-0.5" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
