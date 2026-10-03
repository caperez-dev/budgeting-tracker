import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
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
  Shield,
  UserCircle,
} from 'lucide-react';
import { AuthUser, UserProfile } from '../types';

interface SettingsPageProps {
  currentUser: AuthUser | null;
  profile: UserProfile;
  onBack: () => void;
  onSave: (data: {
    nickname: string;
    email: string;
    password?: string;
    currentPassword?: string;
    avatarUrl?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function SettingsPage({
  currentUser,
  profile,
  onBack,
  onSave,
}: SettingsPageProps) {
  const [nickname, setNickname] = useState(profile.nickname || currentUser?.nickname || '');
  const [email, setEmail] = useState(currentUser?.email || profile.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatarUrl || currentUser?.avatarUrl || '');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, maxSize = 256, quality = 0.85): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to decode image'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width >= height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          try {
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (err) {
            reject(err);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select a valid image file (JPG, PNG, WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Please select a photo smaller than 5MB.');
        return;
      }
      setErrorMessage(null);
      try {
        const compressedDataUrl = await compressImage(file);
        setAvatarUrl(compressedDataUrl);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to process the selected photo.');
      }
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
    const trimmedCurrentPassword = currentPassword.trim();
    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

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

    // Password validation
    if (trimmedNewPassword || trimmedConfirmPassword || trimmedCurrentPassword) {
      if (!trimmedCurrentPassword) {
        setErrorMessage('Please enter your current password to set a new password.');
        return;
      }
      if (!trimmedNewPassword) {
        setErrorMessage('Please enter your new password.');
        return;
      }
      if (trimmedNewPassword.length < 6) {
        setErrorMessage('New password must be at least 6 characters long.');
        return;
      }
      if (trimmedNewPassword !== trimmedConfirmPassword) {
        setErrorMessage('New password and confirm password do not match.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const result = await onSave({
        nickname: trimmedNickname,
        email: trimmedEmail,
        currentPassword: trimmedCurrentPassword || undefined,
        password: trimmedNewPassword || undefined,
        avatarUrl,
      });

      if (result.success) {
        setSuccessMessage('Your account settings have been saved successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMessage(result.error || 'Failed to update settings. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialLetter = (nickname || email || 'U').charAt(0).toUpperCase();

  return (
    <div id="settings-page" className="max-w-2xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
        <button
          type="button"
          id="btn-back-from-settings"
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-[4px] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tracker</span>
        </button>

        <span className="text-[11px] font-mono text-zinc-400">Settings</span>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Account Settings</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Manage your personal details, profile photo, and password.
        </p>
      </div>

      {/* Feedback Alerts */}
      {errorMessage && (
        <div
          id="settings-error-alert"
          className="p-3 rounded-[5px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          id="settings-success-alert"
          className="p-3 rounded-[5px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in"
        >
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Profile Information */}
        <div className="bg-white border border-zinc-200 rounded-[6px] p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <UserCircle className="w-4 h-4 text-zinc-600" />
            <h2 className="text-sm font-semibold text-zinc-900">Profile Information</h2>
          </div>

          {/* Profile Photo - Hover to upload */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-2">
              Profile Photo
            </label>
            <div className="flex items-center gap-4">
              {/* Avatar circle with hover-to-upload overlay */}
              <div
                role="button"
                tabIndex={0}
                id="avatar-hover-upload-container"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className="relative group w-20 h-20 rounded-full shrink-0 cursor-pointer overflow-hidden border-2 border-zinc-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 transition-all"
                title="Click or hover to change photo"
                aria-label="Change profile photo"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={nickname || 'Profile'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900 text-white flex items-center justify-center font-bold text-2xl">
                    {initialLetter}
                  </div>
                )}

                {/* Hover overlay with camera icon and 'Change' text */}
                <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-medium tracking-tight">Change</span>
                </div>
              </div>

              {/* Photo description and remove link */}
              <div className="space-y-1.5 flex-1 text-xs">
                <p className="text-zinc-600 font-medium">
                  Hover over the photo to change it.
                </p>
                <p className="text-[11px] text-zinc-400">
                  Recommended: Square JPG, PNG, or WebP up to 5MB.
                </p>

                {avatarUrl && (
                  <button
                    type="button"
                    id="btn-remove-photo"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 transition-colors cursor-pointer mt-1"
                  >
                    <Trash2 className="w-3 h-3 text-rose-500" />
                    <span>Remove photo</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Upload profile photo file"
                />
              </div>
            </div>
          </div>

          {/* Username */}
          <div>
            <label htmlFor="settings-username-input" className="block text-xs font-medium text-zinc-700 mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <User className="w-3.5 h-3.5" />
              </div>
              <input
                id="settings-username-input"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your username or nickname"
                required
                className="w-full pl-9 pr-3 py-2 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-[4px] focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="settings-email-input" className="block text-xs font-medium text-zinc-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <input
                id="settings-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                className="w-full pl-9 pr-3 py-2 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-[4px] focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Security & Password */}
        <div className="bg-white border border-zinc-200 rounded-[6px] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <Shield className="w-4 h-4 text-zinc-600" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Change Password</h2>
              <p className="text-[11px] text-zinc-400">
                Leave these fields blank if you do not want to change your password.
              </p>
            </div>
          </div>

          {/* Current Password */}
          <div>
            <label htmlFor="settings-current-password-input" className="block text-xs font-medium text-zinc-700 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                id="settings-current-password-input"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                className="w-full pl-9 pr-9 py-2 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-[4px] focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                title={showCurrentPassword ? 'Hide password' : 'Show password'}
              >
                {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="settings-new-password-input" className="block text-xs font-medium text-zinc-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                id="settings-new-password-input"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (at least 6 characters)"
                autoComplete="new-password"
                className="w-full pl-9 pr-9 py-2 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-[4px] focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                title={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="settings-confirm-password-input" className="block text-xs font-medium text-zinc-700 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                id="settings-confirm-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                className="w-full pl-9 pr-9 py-2 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-[4px] focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            id="btn-cancel-settings-page"
            onClick={onBack}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-[4px] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            id="btn-save-settings-page"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving changes...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
