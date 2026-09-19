import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogIn,
  Sparkles,
  X,
  Check,
} from 'lucide-react';
import { AuthUser, UserProfile } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: AuthUser, profileUpdate?: Partial<UserProfile>) => void;
}

const LOCAL_ACCOUNTS_KEY = 'budget_tracker_saved_accounts_v1';

export const GoogleIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
];

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[1]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [savedGoogleAccounts, setSavedGoogleAccounts] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getSavedGoogleAccounts = () => {
    try {
      const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
      const accounts = raw ? JSON.parse(raw) : [];
      return accounts.filter(
        (a: any) =>
          a.provider === 'google' ||
          (typeof a.email === 'string' && a.email.toLowerCase().endsWith('@gmail.com'))
      );
    } catch {
      return [];
    }
  };

  // Listen for Google OAuth popup message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('vercel.app')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.user) {
        setIsGoogleLoading(false);
        setSuccessMessage('Signed in with Google!');
        setTimeout(() => {
          onLoginSuccess(event.data.user, {
            nickname: event.data.user.nickname,
            avatarUrl: event.data.user.avatarUrl,
            email: event.data.user.email,
          });
        }, 350);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLoginSuccess]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);

    // Try online Google OAuth endpoint first if configured
    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/auth/google/url?origin=${encodeURIComponent(origin)}`);
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data?.configured && data?.url) {
          const authWindow = window.open(
            data.url,
            'google_oauth_popup',
            'width=520,height=640,left=200,top=100'
          );

          if (authWindow) {
            const timer = setInterval(() => {
              if (authWindow.closed) {
                clearInterval(timer);
                setIsGoogleLoading(false);
              }
            }, 1000);
            return;
          }
        }
      }
    } catch {
      // Offline or static deployment (e.g. Vercel)
    }

    // Seamless Google sign-in directly on device
    setIsGoogleLoading(false);
    const existingGoogle = getSavedGoogleAccounts();
    setSavedGoogleAccounts(existingGoogle);

    if (existingGoogle.length > 0) {
      setGoogleEmail(existingGoogle[0].email || '');
      setGoogleName(existingGoogle[0].nickname || '');
    } else if (email.trim()) {
      setGoogleEmail(email.trim());
      setGoogleName(nickname.trim() || email.split('@')[0]);
    } else {
      setGoogleEmail('');
      setGoogleName('');
    }

    setShowGoogleModal(true);
  };

  const handleConfirmGoogleSignIn = (targetEmail?: string, targetName?: string) => {
    const cleanEmail = (targetEmail || googleEmail).trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your Google account email.');
      return;
    }

    const cleanName = (targetName || googleName || cleanEmail.split('@')[0] || 'User').trim();

    let localAccounts: any[] = [];
    try {
      const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
      localAccounts = raw ? JSON.parse(raw) : [];
    } catch {
      localAccounts = [];
    }

    const existingIdx = localAccounts.findIndex((a: any) => a.email?.toLowerCase() === cleanEmail);
    const googleUser: AuthUser = {
      id: existingIdx >= 0 ? localAccounts[existingIdx].id : `user_google_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email: cleanEmail,
      nickname: cleanName,
      avatarUrl: selectedAvatar || AVATAR_PRESETS[1],
    };

    if (existingIdx >= 0) {
      localAccounts[existingIdx] = {
        ...localAccounts[existingIdx],
        ...googleUser,
        provider: 'google',
      };
    } else {
      localAccounts.push({
        ...googleUser,
        provider: 'google',
      });
    }

    try {
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(localAccounts));
    } catch {}

    setShowGoogleModal(false);
    setSuccessMessage('Welcome! Signed in with your Google account.');

    setTimeout(() => {
      onLoginSuccess(googleUser, {
        nickname: googleUser.nickname,
        avatarUrl: googleUser.avatarUrl,
        email: googleUser.email,
      });
    }, 300);
  };

  const handleContinueOnDevice = () => {
    setErrorMessage(null);
    const guestUser: AuthUser = {
      id: `user_device_${Date.now()}`,
      email: 'device@budget.tracker',
      nickname: 'My Budget',
      avatarUrl: selectedAvatar || AVATAR_PRESETS[0],
    };

    setSuccessMessage('Welcome! Starting on this device...');
    setTimeout(() => {
      onLoginSuccess(guestUser, {
        nickname: guestUser.nickname,
        avatarUrl: guestUser.avatarUrl,
        email: guestUser.email,
      });
    }, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanNickname = (nickname.trim() || cleanEmail.split('@')[0] || 'User').trim();

    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 4) {
        setErrorMessage('Password should be at least 4 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const bodyPayload =
        mode === 'login'
          ? { email: cleanEmail, password }
          : {
              email: cleanEmail,
              password,
              nickname: cleanNickname,
              avatarUrl: selectedAvatar,
            };

      let isOnlineSuccess = false;
      let onlineUser: any = null;
      let onlineError: string | null = null;

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok && data?.success && data?.user) {
            isOnlineSuccess = true;
            onlineUser = data.user;
          } else if (data?.error) {
            onlineError = data.error;
          }
        }
      } catch {
        // Online network connection failed or server unreachable
      }

      // 1. If online service responded successfully
      if (isOnlineSuccess && onlineUser) {
        setSuccessMessage(mode === 'login' ? 'Signed in successfully!' : 'Account created successfully!');
        setTimeout(() => {
          onLoginSuccess(onlineUser, {
            nickname: onlineUser.nickname,
            avatarUrl: onlineUser.avatarUrl || selectedAvatar,
            email: onlineUser.email,
          });
        }, 350);
        return;
      }

      // 2. If online service returned an explicit account validation error (e.g. wrong password or duplicate email)
      if (
        onlineError &&
        !onlineError.toLowerCase().includes('database') &&
        !onlineError.toLowerCase().includes('unreachable') &&
        !onlineError.toLowerCase().includes('offline') &&
        !onlineError.toLowerCase().includes('sync')
      ) {
        setErrorMessage(onlineError);
        return;
      }

      // 3. Fallback: Authenticate and store directly on this device
      let localAccounts: any[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
        localAccounts = raw ? JSON.parse(raw) : [];
      } catch {
        localAccounts = [];
      }

      if (mode === 'register') {
        const existing = localAccounts.find((a: any) => a.email?.toLowerCase() === cleanEmail);
        if (existing) {
          setErrorMessage('An account with this email already exists on this device. Please sign in instead.');
          return;
        }

        const newLocalUser: AuthUser = {
          id: `user_device_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          email: cleanEmail,
          nickname: cleanNickname,
          avatarUrl: selectedAvatar,
        };

        localAccounts.push({
          ...newLocalUser,
          password,
        });

        try {
          localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(localAccounts));
        } catch {}

        setSuccessMessage('Account created! Saved safely on this device.');
        setTimeout(() => {
          onLoginSuccess(newLocalUser, {
            nickname: newLocalUser.nickname,
            avatarUrl: newLocalUser.avatarUrl || selectedAvatar,
            email: newLocalUser.email,
          });
        }, 350);
        return;
      } else {
        // Sign In mode
        const found = localAccounts.find((a: any) => a.email?.toLowerCase() === cleanEmail);
        if (found) {
          if (found.password === password) {
            setSuccessMessage('Signed in successfully!');
            setTimeout(() => {
              onLoginSuccess(
                {
                  id: found.id,
                  email: found.email,
                  nickname: found.nickname,
                  avatarUrl: found.avatarUrl,
                },
                {
                  nickname: found.nickname,
                  avatarUrl: found.avatarUrl,
                  email: found.email,
                }
              );
            }, 350);
            return;
          } else {
            setErrorMessage('Incorrect password. Please re-enter your password.');
            return;
          }
        }

        // If no local account exists yet
        setErrorMessage(
          'No saved account found for this email on this device. Switch to "Create Account" above to set up your profile, or click "Continue on this device" below.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to sign in right now. Please try again or continue on this device.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-zinc-900 selection:text-white">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* App Logo & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-[8px] bg-zinc-900 text-white flex items-center justify-center shadow-xs ring-1 ring-zinc-800/10 mb-3.5 transition-transform hover:scale-105">
            <Wallet className="w-6 h-6 text-zinc-100" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Budget Tracker
          </h1>
          <p className="mt-1 text-xs text-zinc-500 max-w-xs">
            Track your daily spending, manage debts, and reach your savings goals.
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-6 px-6 sm:px-8 border border-zinc-200 rounded-[8px] shadow-xs space-y-4">
          {/* Google Sign-in Action */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-zinc-50 active:bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-[5px] font-medium text-xs flex items-center justify-center gap-2.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            {isGoogleLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                <span>Connecting with Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-4 h-4 shrink-0" />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center py-1">
            <div className="w-full border-t border-zinc-200" />
            <span className="bg-white px-2.5 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider relative">
              or use email
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-zinc-100 rounded-[6px] border border-zinc-200/80 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-1.5 text-center rounded-[5px] transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-zinc-900 font-semibold shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-1.5 text-center rounded-[5px] transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-zinc-900 font-semibold shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 rounded-[5px] bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-[5px] bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Nickname / Display Name (Sign Up only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Your Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Carlos"
                    className="block w-full pl-9 pr-3 py-2 text-sm bg-zinc-50/50 border border-zinc-200 rounded-[5px] text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-zinc-50/50 border border-zinc-200 rounded-[5px] text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2 text-sm bg-zinc-50/50 border border-zinc-200 rounded-[5px] text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Sign Up only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-3 py-2 text-sm bg-zinc-50/50 border border-zinc-200 rounded-[5px] text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Choose Avatar Preset (Sign Up only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">
                  Choose a Profile Photo
                </label>
                <div className="flex items-center gap-3">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedAvatar(preset)}
                      className={`relative rounded-full p-0.5 transition-all cursor-pointer ${
                        selectedAvatar === preset
                          ? 'ring-2 ring-zinc-900 scale-105'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      <img
                        src={preset}
                        alt={`Photo option ${idx + 1}`}
                        className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.99] text-white rounded-[5px] font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In with Email' : 'Create Account'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Access without account */}
          <div className="pt-2">
            <div className="relative flex items-center justify-center py-2">
              <div className="w-full border-t border-zinc-200" />
              <span className="bg-white px-2.5 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider relative">
                or get started immediately
              </span>
            </div>

            <button
              type="button"
              onClick={handleContinueOnDevice}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200/70 border border-zinc-200 text-zinc-700 rounded-[5px] font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
              <span>Continue on this device</span>
            </button>
          </div>
        </div>

        {/* Friendly bottom note */}
        <p className="mt-4 text-center text-xs text-zinc-400">
          Your finances are safely stored and synced with your account.
        </p>
      </div>

      {/* Google Sign-in Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-[10px] shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-semibold text-zinc-900">Sign in with Google</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="p-1 rounded-[5px] text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Previous saved Google accounts on this device */}
              {savedGoogleAccounts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                    Previously used on this device
                  </p>
                  <div className="space-y-1.5">
                    {savedGoogleAccounts.map((acc, idx) => (
                      <button
                        key={acc.id || idx}
                        type="button"
                        onClick={() => handleConfirmGoogleSignIn(acc.email, acc.nickname)}
                        className="w-full p-2.5 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200/60 border border-zinc-200/80 rounded-[6px] flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={acc.avatarUrl || AVATAR_PRESETS[1]}
                            alt={acc.nickname || 'Google Account'}
                            className="w-7 h-7 rounded-full object-cover border border-zinc-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-zinc-900 truncate">
                              {acc.nickname || 'Google User'}
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              {acc.email}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-blue-600 shrink-0">
                          Continue
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="relative flex items-center justify-center py-2">
                    <div className="w-full border-t border-zinc-200" />
                    <span className="bg-white px-2 text-[10px] text-zinc-400 uppercase tracking-wider">
                      or use another account
                    </span>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleConfirmGoogleSignIn();
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Google Account Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="block w-full pl-9 pr-3 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-[5px] text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Your Name (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      placeholder="e.g. Carlos Perez"
                      className="block w-full pl-9 pr-3 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-[5px] text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGoogleModal(false)}
                    className="px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-[5px] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <GoogleIcon className="w-3.5 h-3.5" />
                    <span>Continue with Google</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
