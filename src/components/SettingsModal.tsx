import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  Camera,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  Settings,
} from 'lucide-react';
import { AuthUser, UserProfile } from '../types';

interface SettingsModalProps {
  currentUser: AuthUser | null;
  profile: UserProfile;
  onClose: () => void;
  onSave: (data: {
    nickname: string;
    email: string;
    password?: string;
    avatarUrl?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function SettingsModal({
  currentUser,
  profile,
  onClose,
  onSave,
}: SettingsModalProps) {
  const [nickname, setNickname] = useState(profile.nickname || currentUser?.nickname || '');
  const [email, setEmail] = useState(currentUser?.email || profile.email || '');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatarUrl || currentUser?.avatarUrl || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Please choose a photo smaller than 5MB.');
        return;
      }
      setErrorMessage(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedNickname = nickname.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedNickname) {
      setErrorMessage('Username cannot be empty.');
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage('Email address cannot be empty.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onSave({
        nickname: trimmedNickname,
        email: trimmedEmail,
        password: trimmedPassword || undefined,
        avatarUrl,
      });

      if (result.success) {
        setSuccessMessage('Account details updated successfully.');
        setPassword('');
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setErrorMessage(result.error || 'Failed to update account. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mouseDownOnBackdropRef = useRef(false);

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownOnBackdropRef.current = e.target === e.currentTarget;
  };

  const handleBackdropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mouseDownOnBackdropRef.current && e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
    mouseDownOnBackdropRef.current = false;
  };

  const initialLetter = (nickname || email || 'U').charAt(0).toUpperCase();

  return (
    <div
      id="modal-settings-backdrop"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        id="modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="bg-white rounded-[6px] border border-zinc-200 p-6 max-w-md w-full shadow-xl space-y-5 relative"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[4px] bg-zinc-100 text-zinc-800 flex items-center justify-center border border-zinc-200">
              <Settings className="w-4 h-4 text-zinc-700" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-sm font-semibold text-zinc-900">
                Account Settings
              </h2>
              <p className="text-[11px] text-zinc-500">
                Update your username, email, password, and profile picture.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-settings-modal"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close settings"
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div
            id="settings-error-alert"
            className="p-2.5 rounded-[4px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            id="settings-success-alert"
            className="p-2.5 rounded-[4px] bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2"
          >
            <Check className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Picture Section */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-2">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={nickname || 'Profile'}
                    className="w-16 h-16 rounded-full object-cover border border-zinc-200 shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-zinc-900 text-white flex items-center justify-center font-semibold text-xl shadow-2xs">
                    {initialLetter}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Change photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-upload-photo"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-[4px] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 text-zinc-600" />
                    <span>Upload photo</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      id="btn-remove-photo"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-[4px] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Recommended size: JPG or PNG, up to 5MB.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Username Input */}
          <div>
            <label htmlFor="settings-username-input" className="block text-xs font-medium text-zinc-700 mb-1">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400">
                <User className="w-3.5 h-3.5" />
              </div>
              <input
                id="settings-username-input"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your name or nickname"
                required
                className="w-full pl-8 pr-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-[4px] focus:outline-hidden focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
            </div>
          </div>

          {/* Email Address Input */}
          <div>
            <label htmlFor="settings-email-input" className="block text-xs font-medium text-zinc-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <input
                id="settings-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                className="w-full pl-8 pr-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-[4px] focus:outline-hidden focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="settings-password-input" className="block text-xs font-medium text-zinc-700">
                New Password
              </label>
              <span className="text-[10px] text-zinc-400">Optional</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                id="settings-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                autoComplete="new-password"
                className="w-full pl-8 pr-8 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-[4px] focus:outline-hidden focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">
              Must be at least 6 characters if you wish to change it.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
            <button
              type="button"
              id="btn-cancel-settings"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-[4px] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-settings"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-[4px] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
