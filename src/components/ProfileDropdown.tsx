import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  ChevronDown,
  Camera,
  Edit2,
  Check,
  X,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { UserProfile, DBStatus, AuthUser } from '../types';

interface ProfileDropdownProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  expenseCount?: number;
  incomeCount?: number;
  debtCount?: number;
  totalExpense?: number;
  totalIncome?: number;
  totalDebt?: number;
  currencySymbol?: string;
  dbStatus?: DBStatus;
  onSyncWithDB?: () => Promise<void>;
  isSyncing?: boolean;
  lastSyncedTime?: string | null;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export function ProfileDropdown({
  profile,
  onUpdateProfile,
  expenseCount = 0,
  incomeCount = 0,
  debtCount = 0,
  dbStatus,
  onSyncWithDB,
  isSyncing = false,
  lastSyncedTime,
  currentUser,
  onLogout,
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState(profile.nickname);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setUploadError(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsEditingNickname(false);
        setUploadError(null);
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
    if (trimmed) {
      onUpdateProfile({ ...profile, nickname: trimmed });
    } else {
      setTempNickname(profile.nickname);
    }
    setIsEditingNickname(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Please select an image smaller than 5MB.');
        return;
      }
      setUploadError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onUpdateProfile({ ...profile, avatarUrl: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
    // reset input so same file can be re-uploaded if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Trigger Button on Header 1 */}
      <button
        id="btn-header-profile"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="rounded-full focus:outline-hidden focus:ring-2 focus:ring-zinc-400/50 transition-transform active:scale-95 flex items-center justify-center p-0.5"
        title={`Profile (${profile.nickname})`}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.nickname}
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
            {profile.nickname.charAt(0).toUpperCase() || 'U'}
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
            {/* Avatar with edit overlay */}
            <div className="relative group">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.nickname}
                  className="w-13 h-13 rounded-full object-cover border-2 border-zinc-100 shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-13 h-13 rounded-full bg-zinc-900 text-white font-mono text-base font-bold flex items-center justify-center shadow-xs">
                  {profile.nickname.charAt(0).toUpperCase() || 'U'}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full shadow-xs transition-transform hover:scale-105 cursor-pointer"
                title="Upload profile photo"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            {/* Nickname & info */}
            <div className="flex-1 min-w-0">
              {isEditingNickname ? (
                <form onSubmit={handleSaveNickname} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempNickname}
                    onChange={(e) => setTempNickname(e.target.value)}
                    maxLength={25}
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
                    {profile.nickname}
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

              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                {profile.email || 'Personal Account'}
              </p>

              {/* Hidden file input triggered by camera icon */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {profile.avatarUrl && (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => onUpdateProfile({ ...profile, avatarUrl: '' })}
                    className="text-[10px] text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="Remove profile photo"
                  >
                    Remove photo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Upload error notice if any */}
          {uploadError && (
            <div className="p-2 rounded-[4px] bg-red-50 border border-red-200 text-red-700 text-[10px] flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-zinc-100" />

          {/* Financial Counters: Expense, Income, Debt */}
          <div className="grid grid-cols-3 gap-2 py-1 text-center">
            {/* Expense: counter on top, word expense at the bottom */}
            <div id="profile-stat-expense" className="flex flex-col items-center justify-center">
              <span className="font-mono text-sm font-semibold text-zinc-900 tabular-nums">
                {expenseCount}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium lowercase mt-0.5">
                expense
              </span>
            </div>

            {/* Income: counter on top, word income at the bottom */}
            <div id="profile-stat-income" className="flex flex-col items-center justify-center">
              <span className="font-mono text-sm font-semibold text-zinc-900 tabular-nums">
                {incomeCount}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium lowercase mt-0.5">
                income
              </span>
            </div>

            {/* Debt: counter on top, word debt at the bottom */}
            <div id="profile-stat-debt" className="flex flex-col items-center justify-center">
              <span className="font-mono text-sm font-semibold text-zinc-900 tabular-nums">
                {debtCount}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium lowercase mt-0.5">
                debt
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-100 pt-1" />

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
