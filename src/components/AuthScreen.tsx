import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { ImageSlider } from '@/components/ui/image-slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const SLIDER_IMAGES = [
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
];

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Listen for Google OAuth popup message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      const isAllowedOrigin =
        origin === window.location.origin ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost') ||
        origin.includes('vercel.app');

      if (!isAllowedOrigin) return;

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.user) {
        const googleUser = event.data.user;
        setIsGoogleLoading(false);
        setSuccessMessage('Signed in with Google!');

        try {
          const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
          const list = raw ? JSON.parse(raw) : [];
          const idx = list.findIndex(
            (a: any) =>
              a.email?.toLowerCase() === googleUser.email?.toLowerCase() ||
              a.id === googleUser.id
          );
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...googleUser, provider: 'google' };
          } else {
            list.push({ ...googleUser, provider: 'google' });
          }
          localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(list));
        } catch {}

        setTimeout(() => {
          onLoginSuccess(googleUser, {
            nickname: googleUser.nickname,
            avatarUrl: googleUser.avatarUrl,
            email: googleUser.email,
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

    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/auth/google/url?origin=${encodeURIComponent(origin)}`);
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data?.configured && data?.url) {
          const width = 520;
          const height = 640;
          const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
          const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

          const authWindow = window.open(
            data.url,
            'google_oauth_popup',
            `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
          );

          if (authWindow) {
            const timer = setInterval(() => {
              if (authWindow.closed) {
                clearInterval(timer);
                setIsGoogleLoading(false);
              }
            }, 800);
            return;
          } else {
            // If popup was blocked by browser, redirect directly
            window.location.href = data.url;
            return;
          }
        } else if (data?.error) {
          setErrorMessage(data.error);
          setIsGoogleLoading(false);
          return;
        }
      }

      setErrorMessage('Unable to connect to Google sign-in. Please try again.');
      setIsGoogleLoading(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to Google sign-in. Please try again.');
      setIsGoogleLoading(false);
    }
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
        try {
          const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
          const list = raw ? JSON.parse(raw) : [];
          const idx = list.findIndex(
            (a: any) => a.email?.toLowerCase() === onlineUser.email?.toLowerCase() || a.id === onlineUser.id
          );
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...onlineUser };
          } else {
            list.push({ ...onlineUser });
          }
          localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(list));
        } catch {}

        setSuccessMessage(mode === 'login' ? 'Signed in successfully!' : 'Account created successfully!');
        setTimeout(() => {
          onLoginSuccess(onlineUser, {
            nickname: onlineUser.nickname,
            avatarUrl: onlineUser.avatarUrl,
            email: onlineUser.email,
          });
        }, 350);
        return;
      }

      // 2. If online service returned an explicit account validation error
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
          defaultCurrency: 'PHP',
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
            avatarUrl: newLocalUser.avatarUrl,
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
                  defaultCurrency: found.defaultCurrency || 'PHP',
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

        setErrorMessage(
          'No saved account found for this email on this device. Switch to "Create Account" to set up your profile.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to sign in right now. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 12, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 120,
        damping: 14,
      },
    },
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-100/80 p-4 sm:p-6 lg:p-10 font-sans">
      <motion.div
        className="w-full max-w-5xl min-h-[640px] grid grid-cols-1 lg:grid-cols-2 rounded-2xl overflow-hidden shadow-xl border border-zinc-200 bg-white"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        {/* Left Side: Modern Image Slider & Visual Banner */}
        <div className="relative hidden lg:block h-full min-h-[640px]">
          <ImageSlider images={SLIDER_IMAGES} interval={4500} className="h-full" />
          
          <div className="absolute inset-0 flex flex-col justify-between p-10 z-10 text-white pointer-events-none">
            {/* Top Brand Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-sm">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white block">Budget Tracker</span>
                <span className="text-[11px] text-white/70 block">Smart Financial Management</span>
              </div>
            </div>

            {/* Bottom Value Proposition */}
            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-bold tracking-tight text-white leading-tight">
                Control your expenses, debt, and savings effortlessly.
              </h2>
              <p className="text-xs text-white/80 leading-relaxed">
                Seamlessly organize your daily transactions, monitor balances across multiple accounts, and reach your goals in Philippine Peso and world currencies.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Panel */}
        <div className="w-full h-full bg-white flex flex-col justify-center p-6 sm:p-10 md:p-12 overflow-y-auto">
          <motion.div
            className="w-full max-w-md mx-auto space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Mobile Header Logo */}
            <motion.div variants={itemVariants} className="lg:hidden flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-zinc-900 leading-none">Budget Tracker</h1>
                <p className="text-[11px] text-zinc-500 mt-0.5">Your personal financial dashboard</p>
              </div>
            </motion.div>

            {/* Title & Mode Switch */}
            <motion.div variants={itemVariants} className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500">
                {mode === 'login'
                  ? 'Sign in to access your finances and synchronized records.'
                  : 'Start tracking your daily expenses and reaching your savings goals.'}
              </p>
            </motion.div>

            {/* Google Sign-in Option */}
            <motion.div variants={itemVariants} className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="w-full h-11 border-zinc-200 hover:bg-zinc-50 text-zinc-800 font-medium text-xs flex items-center justify-center gap-2.5 shadow-2xs transition-colors cursor-pointer"
              >
                {isGoogleLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
                    <span>Connecting with Google...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                    <span className="font-semibold text-xs text-zinc-800">Continue with Google</span>
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-zinc-200" />
                </div>
                <span className="relative bg-white px-3 text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
                  Or continue with email
                </span>
              </div>
            </motion.div>

            {/* Mode Switcher Tabs */}
            <motion.div variants={itemVariants}>
              <div className="grid grid-cols-2 p-1 bg-zinc-100 rounded-lg border border-zinc-200/70 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 text-center rounded-md transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
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
                  className={`py-2 text-center rounded-md transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Create Account
                </button>
              </div>
            </motion.div>

            {/* Error / Success Feedback */}
            {errorMessage && (
              <motion.div
                variants={itemVariants}
                className="p-3 rounded-md bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                variants={itemVariants}
                className="p-3 rounded-md bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </motion.div>
            )}

            {/* Main Email & Password Form */}
            <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-4">
              {/* Name (Sign Up only) */}
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="nickname">Your Name</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <User className="w-4 h-4" />
                    </div>
                    <Input
                      id="nickname"
                      type="text"
                      required
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="e.g. Carlos Perez"
                      className="pl-9 h-10 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="pl-9 h-10 text-xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-10 h-10 text-xs"
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
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 h-10 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </motion.form>

            {/* Toggle Footer Link */}
            <motion.p variants={itemVariants} className="text-center text-xs text-zinc-500 pt-2">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="font-semibold text-zinc-900 hover:underline cursor-pointer"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="font-semibold text-zinc-900 hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </>
              )}
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
