import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  ChevronDown,
  Camera,
  Edit2,
  Check,
  X,
  ArrowDownRight,
  ArrowUpRight,
  ReceiptText,
  Image as ImageIcon,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  LogOut,
} from 'lucide-react';
import { UserProfile, DBStatus, AuthUser } from '../types';

interface ProfileDropdownProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  expenseCount: number;
  incomeCount: number;
  dbStatus?: DBStatus;
  onSyncWithDB?: () => Promise<void>;
  isSyncing?: boolean;
  lastSyncedTime?: string | null;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
];

export function ProfileDropdown({
  profile,
  onUpdateProfile,
  expenseCount,
  incomeCount,
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
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');

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
        setShowPhotoOptions(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsEditingNickname(false);
        setShowPhotoOptions(false);
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
      if (file.size > 2 * 1024 * 1024) {
        alert('Please select an image smaller than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onUpdateProfile({ ...profile, avatarUrl: reader.result });
          setShowPhotoOptions(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyPreset = (url: string) => {
    onUpdateProfile({ ...profile, avatarUrl: url });
    setShowPhotoOptions(false);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPhotoUrl.trim()) {
      onUpdateProfile({ ...profile, avatarUrl: customPhotoUrl.trim() });
      setCustomPhotoUrl('');
      setShowPhotoOptions(false);
    }
  };

  const totalTransactions = expenseCount + incomeCount;
  const expensePercentage =
    totalTransactions > 0 ? Math.round((expenseCount / totalTransactions) * 100) : 0;
  const incomePercentage =
    totalTransactions > 0 ? Math.round((incomeCount / totalTransactions) * 100) : 0;

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
                onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                className="absolute bottom-0 right-0 p-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full shadow-xs transition-transform hover:scale-105"
                title="Change profile photo"
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
            </div>
          </div>

          {/* Photo Options Drawer */}
          {showPhotoOptions && (
            <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-[5px] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700">
                <span>Update Photo</span>
                <button
                  onClick={() => setShowPhotoOptions(false)}
                  className="text-zinc-400 hover:text-zinc-600 text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Upload file button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-1.5 px-2 bg-white border border-zinc-200 hover:border-zinc-300 rounded-[4px] text-center text-[11px] font-medium text-zinc-800 transition-colors shadow-2xs"
                >
                  Upload Image
                </button>
              </div>

              {/* Presets */}
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">Or choose a preset:</div>
                <div className="flex items-center gap-1.5">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="w-8 h-8 rounded-full overflow-hidden border border-zinc-200 hover:scale-105 transition-transform"
                    >
                      <img
                        src={preset}
                        alt={`Preset ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom URL */}
              <form onSubmit={handleApplyCustomUrl} className="flex gap-1 pt-1">
                <input
                  type="url"
                  value={customPhotoUrl}
                  onChange={(e) => setCustomPhotoUrl(e.target.value)}
                  placeholder="Or paste image URL"
                  className="flex-1 bg-white border border-zinc-200 rounded-[3px] px-2 py-1 text-[10px]"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-zinc-900 text-white rounded-[3px] text-[10px] font-medium hover:bg-zinc-800"
                >
                  Set
                </button>
              </form>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-zinc-100" />

          {/* Transaction Activity Counters */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-800 tracking-wide uppercase">
              <span className="flex items-center gap-1.5">
                <ReceiptText className="w-3.5 h-3.5 text-zinc-500" />
                Transaction Counters
              </span>
              <span className="font-mono text-zinc-500 font-normal normal-case">
                {totalTransactions} total
              </span>
            </div>

            {/* Grid of counters: Expense & Income */}
            <div className="grid grid-cols-2 gap-2">
              {/* Expense Counter */}
              <div
                id="profile-counter-expense"
                className="p-2.5 rounded-[5px] bg-rose-50/70 border border-rose-100 flex flex-col justify-between space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-rose-800 flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3 text-rose-600" /> Expense
                  </span>
                  <span className="px-1 py-0.2 bg-rose-200/60 text-rose-800 font-mono text-[9px] font-bold rounded-[2px]">
                    OUT
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-lg font-bold text-rose-900 tabular-nums">
                    {expenseCount}
                  </span>
                  <span className="text-[10px] text-rose-700">entries</span>
                </div>
              </div>

              {/* Income Counter */}
              <div
                id="profile-counter-income"
                className="p-2.5 rounded-[5px] bg-emerald-50/70 border border-emerald-100 flex flex-col justify-between space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-emerald-800 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3 text-emerald-600" /> Income
                  </span>
                  <span className="px-1 py-0.2 bg-emerald-200/60 text-emerald-800 font-mono text-[9px] font-bold rounded-[2px]">
                    IN
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-lg font-bold text-emerald-900 tabular-nums">
                    {incomeCount}
                  </span>
                  <span className="text-[10px] text-emerald-700">entries</span>
                </div>
              </div>
            </div>

            {/* Activity Bar Ratio */}
            {totalTransactions > 0 ? (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>{expensePercentage}% Expenses</span>
                  <span>{incomePercentage}% Income</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${expensePercentage}%` }}
                    className="bg-rose-500 transition-all duration-300"
                    title={`Expenses: ${expenseCount}`}
                  />
                  <div
                    style={{ width: `${incomePercentage}%` }}
                    className="bg-emerald-500 transition-all duration-300"
                    title={`Income: ${incomeCount}`}
                  />
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400 text-center py-1">
                No transactions recorded yet
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-100" />

          {/* Database & Cloud Sync Section */}
          <div className="space-y-2 pt-0.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-800 tracking-wide uppercase">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-zinc-500" />
                Database Storage
              </span>
              {dbStatus?.connected ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  MongoDB Atlas
                </span>
              ) : dbStatus?.hasPlaceholder ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Action Required
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                  <HardDrive className="w-2.5 h-2.5" />
                  Local Storage
                </span>
              )}
            </div>

            {dbStatus?.connected ? (
              <div className="p-2.5 rounded-[5px] bg-emerald-50/60 border border-emerald-100 text-[11px] space-y-2">
                <div className="flex items-center justify-between text-emerald-900">
                  <span className="flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Cloud synchronization active
                  </span>
                  {lastSyncedTime && (
                    <span className="text-[10px] font-mono text-emerald-700">
                      {lastSyncedTime}
                    </span>
                  )}
                </div>

                {onSyncWithDB && (
                  <button
                    type="button"
                    onClick={onSyncWithDB}
                    disabled={isSyncing}
                    className="w-full py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[4px] font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing with MongoDB...' : 'Sync Now with Atlas'}</span>
                  </button>
                )}
              </div>
            ) : dbStatus?.hasPlaceholder ? (
              <div className="p-2.5 rounded-[5px] bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 space-y-1.5">
                <div className="flex items-start gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>Password Required</span>
                </div>
                <p className="text-[10px] text-amber-800 leading-relaxed">
                  Your connection string contains <code className="font-mono bg-amber-100 px-1 rounded">&lt;db_password&gt;</code>.
                  Replace it with your MongoDB password in the top Settings panel to enable cloud sync.
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-[5px] bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600 space-y-1.5">
                <p className="text-[11px] text-zinc-700 leading-relaxed">
                  Data is saved securely in your browser's local storage.
                </p>
                <p className="text-[10px] text-zinc-500">
                  Configure <code className="font-mono bg-zinc-200/80 px-1 rounded text-zinc-800">MONGODB_URI</code> in Settings anytime to enable multi-device MongoDB cloud sync.
                </p>
              </div>
            )}
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
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-[5px] text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors group cursor-pointer border border-transparent hover:border-red-100"
            >
              <span className="flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5 text-red-500 group-hover:text-red-600 transition-transform group-hover:-translate-x-0.5" />
                <span>Log Out</span>
              </span>
              {currentUser?.email ? (
                <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[130px]">
                  {currentUser.email}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-400">Exit Session</span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
