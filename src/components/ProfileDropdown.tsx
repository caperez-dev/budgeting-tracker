import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  ChevronDown,
  Edit2,
  Check,
  X,
  LogOut,
  Settings,
  HeartHandshake,
} from 'lucide-react';
import { UserProfile, DBStatus, AuthUser } from '../types';
import { validateUsername } from '../utils/usernameValidation';

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
  dbStatus?: DBStatus;
  onSyncWithDB?: () => Promise<void>;
  isSyncing?: boolean;
  lastSyncedTime?: string | null;
  currentUser?: AuthUser | null;
  isLoading?: boolean;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  onOpenDonate?: () => void;
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
  dbStatus,
  onSyncWithDB,
  isSyncing = false,
  lastSyncedTime,
  currentUser,
  isLoading = false,
  onOpenSettings,
  onLogout,
  onOpenDonate,
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState(profile.nickname);
  const [statScope, setStatScope] = useState<'overall' | 'month'>('overall');

  const displayedExpenseCount =
    statScope === 'overall'
      ? (overallExpenseCount ?? expenseCount)
      : (monthlyExpenseCount ?? expenseCount);

  const displayedIncomeCount =
    statScope === 'overall'
      ? (overallIncomeCount ?? incomeCount)
      : (monthlyIncomeCount ?? incomeCount);

  const displayedDebtCount =
    statScope === 'overall'
      ? (overallDebtCount ?? debtCount)
      : (monthlyDebtCount ?? debtCount);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync temp nickname if prop changes
  useEffect(() => {
    setTempNickname(profile.nickname);
  }, [profile.nickname]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditingNickname(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsEditingNickname(false);
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

  const handleSaveNickname = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = tempNickname.trim();
    const validation = validateUsername(trimmed);
    if (!validation.isValid) {
      setTempNickname(profile.nickname);
      setIsEditingNickname(false);
      return;
    }
    onUpdateProfile({ ...profile, nickname: trimmed });
    setIsEditingNickname(false);
  };

  const isEmailLoading = isLoading || (!currentUser?.email && !profile.email);
  const activeEmail = currentUser?.email || profile.email || '';
  const activeAvatar = profile.avatarUrl || currentUser?.avatarUrl || '';
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
                  {isEditingNickname ? (
                    <form onSubmit={handleSaveNickname} className="flex items-center gap-1">
                      <input
                        type="text"
                        value={tempNickname}
                        onChange={(e) => setTempNickname(e.target.value)}
                        maxLength={30}
                        autoFocus
                        placeholder="Enter nickname"
                        className="w-full bg-zinc-50 border border-zinc-300 rounded-[3px] px-2 py-0.5 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                      <button
                        type="submit"
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTempNickname(profile.nickname);
                          setIsEditingNickname(false);
                        }}
                        className="p-1 text-zinc-400 hover:bg-zinc-100 rounded"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-1.5 group">
                      <h4 className="font-bold text-sm text-zinc-900 truncate">
                        {activeNickname}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsEditingNickname(true)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
                        title="Edit nickname"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5 truncate">
                    {activeEmail || 'Personal Account'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-100" />

          {/* Financial Counters Header with Scope Toggle (Overall vs This Month) */}
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[11px] font-semibold text-zinc-700 tracking-tight">
              Activity {statScope === 'month' ? `(${selectedMonthYearLabel || 'This Month'})` : '(All Time)'}
            </span>
            <div
              id="profile-stat-scope-toggle"
              className="flex items-center bg-zinc-100 p-0.5 rounded-[4px] border border-zinc-200"
            >
              <button
                type="button"
                id="btn-profile-stat-overall"
                onClick={() => setStatScope('overall')}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-[3px] transition-colors cursor-pointer ${
                  statScope === 'overall'
                    ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Overall
              </button>
              <button
                type="button"
                id="btn-profile-stat-month"
                onClick={() => setStatScope('month')}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-[3px] transition-colors cursor-pointer ${
                  statScope === 'month'
                    ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {/* Financial Counters: Expense, Income, Debt (Clickable components toggle between Overall and This Month) */}
          <div
            className="grid grid-cols-3 gap-1.5 py-1 text-center"
            title="Click to toggle between Overall and This Month"
          >
            {/* Expense: counter on top, word expense at the bottom */}
            <button
              type="button"
              id="profile-stat-expense"
              onClick={() => setStatScope((prev) => (prev === 'overall' ? 'month' : 'overall'))}
              className="flex flex-col items-center justify-center p-2 rounded-[5px] hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-colors cursor-pointer group"
              title="Click to toggle between Overall and This Month"
            >
              <span className="font-mono text-sm font-semibold text-zinc-900 tabular-nums group-hover:text-rose-600 transition-colors">
                {displayedExpenseCount}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium lowercase mt-0.5">
                expenses
              </span>
            </button>

            {/* Income: counter on top, word income at the bottom */}
            <button
              type="button"
              id="profile-stat-income"
              onClick={() => setStatScope((prev) => (prev === 'overall' ? 'month' : 'overall'))}
              className="flex flex-col items-center justify-center p-2 rounded-[5px] hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-colors cursor-pointer group"
              title="Click to toggle between Overall and This Month"
            >
              <span className="font-mono text-sm font-semibold text-zinc-900 tabular-nums group-hover:text-emerald-600 transition-colors">
                {displayedIncomeCount}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium lowercase mt-0.5">
                income
              </span>
            </button>

            {/* Debt: counter on top, word debt at the bottom */}
            <button
              type="button"
              id="profile-stat-debt"
              onClick={() => setStatScope((prev) => (prev === 'overall' ? 'month' : 'overall'))}
              className="flex flex-col items-center justify-center p-2 rounded-[5px] hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-colors cursor-pointer group"
              title="Click to toggle between Overall and This Month"
            >
              <span className="font-mono text-sm font-semibold text-zinc-900 tabular-nums group-hover:text-amber-600 transition-colors">
                {displayedDebtCount}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium lowercase mt-0.5">
                debts
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-100 pt-1" />

          {/* Donate Navigation Action */}
          {onOpenDonate && (
            <button
              type="button"
              id="btn-profile-donate"
              onClick={() => {
                setIsOpen(false);
                onOpenDonate();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[5px] text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors group cursor-pointer"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
              <span>Donate</span>
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
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[5px] text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors group cursor-pointer border border-transparent hover:border-red-100"
            >
              <LogOut className="w-3.5 h-3.5 text-red-500 group-hover:text-red-600 transition-transform group-hover:-translate-x-0.5" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
