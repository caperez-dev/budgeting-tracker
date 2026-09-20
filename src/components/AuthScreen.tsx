import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { AuthUser, UserProfile } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: AuthUser, profileUpdate?: Partial<UserProfile>) => void;
}

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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  // Listen for Google OAuth popup message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      const currentOrigin = window.location.origin;
      const isAllowed =
        origin === currentOrigin ||
        origin.endsWith('.run.app') ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost');

      if (!isAllowed) {
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
    setInfoNotice(null);

    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/auth/google/url?origin=${encodeURIComponent(origin)}`);

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          'Google Sign-In is temporarily unavailable on this deployment. Please sign in with your email below.'
        );
      }

      if (!res.ok || !data || !data.configured || !data.url) {
        throw new Error(
          data?.error ||
            'Google Sign-In is not set up on this deployment yet. Please sign in below using your email and password.'
        );
      }

      const authWindow = window.open(
        data.url,
        'google_oauth_popup',
        'width=520,height=640,left=200,top=100'
      );

      if (!authWindow) {
        throw new Error(
          'Your browser blocked the pop-up window. Please allow pop-ups for this site to sign in with Google.'
        );
      }

      const timer = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(timer);
          setIsGoogleLoading(false);
        }
      }, 1000);

      return;
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to open Google sign-in. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    const guestUser: AuthUser = {
      id: 'local_guest',
      email: 'guest@budgettracker.local',
      nickname: 'Guest',
      avatarUrl: AVATAR_PRESETS[0],
    };
    onLoginSuccess(guestUser, {
      nickname: 'Guest',
      avatarUrl: AVATAR_PRESETS[0],
      email: 'guest@budgettracker.local',
    });
  };

  const handleForgotPassword = () => {
    setInfoNotice(
      'To reset your password, please contact support or sign in with Google / continue as guest on this device.'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setInfoNotice(null);

    const cleanEmail = email.trim();
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
              nickname: nickname.trim() || cleanEmail.split('@')[0],
              avatarUrl: selectedAvatar,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Unable to connect right now. You can continue as a guest below or try again shortly.');
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Something went wrong. Please check your details and try again.');
      }

      setSuccessMessage(mode === 'login' ? 'Signed in successfully!' : 'Account created successfully!');

      setTimeout(() => {
        onLoginSuccess(data.user, {
          nickname: data.user.nickname,
          avatarUrl: data.user.avatarUrl || selectedAvatar,
          email: data.user.email,
        });
      }, 350);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Left Panel - Brand / Image Section */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-zinc-950">
        {/* Background visual photo */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=1400&auto=format&fit=crop"
            alt="Budget Tracker Visual"
            className="w-full h-full object-cover opacity-45 mix-blend-luminosity scale-105 transition-transform duration-1000 ease-out hover:scale-100"
            referrerPolicy="no-referrer"
          />
          {/* Gradient overlays for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-transparent" />
        </div>

        {/* Brand header at top */}
        <div className="absolute top-10 left-10 z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md">
            <Wallet className="w-5 h-5 text-zinc-100" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white block">Budget Tracker</span>
            <span className="text-[11px] text-zinc-400 font-medium">Smart Personal Finance</span>
          </div>
        </div>

        {/* Feature showcase at bottom */}
        <div className="relative z-10 flex flex-col justify-end p-12 text-white max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium mb-5 w-fit text-zinc-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Smart Financial Clarity</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white mb-3 leading-tight">
            Take complete control of your spending and savings.
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed mb-8 max-w-md">
            Log transactions in seconds, monitor savings targets, manage debts, and gain confidence with visual analytics.
          </p>

          {/* Value cards */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-xs border border-white/10 rounded-xl p-3">
              <div className="text-xs font-semibold text-white">Accounts & Wallets</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Track GCash, Maya, cash, and banks</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xs border border-white/10 rounded-xl p-3">
              <div className="text-xs font-semibold text-white">Goals & Debts</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Stay on track for targets that matter</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Section */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-white min-h-screen">
        <div className="w-full max-w-md">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-zinc-900 block">Budget Tracker</span>
              <span className="text-[11px] text-zinc-500">Personal Finance</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h1>
            <p className="text-sm text-zinc-600">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setInfoNotice(null);
                    }}
                    className="text-zinc-900 hover:text-black font-semibold hover:underline cursor-pointer"
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
                      setInfoNotice(null);
                    }}
                    className="text-zinc-900 hover:text-black font-semibold hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Google Sign-in Action (No GitHub) */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 active:bg-zinc-100 transition-colors font-medium text-sm text-zinc-700 gap-3 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
                  <span>Opening Google Sign-In...</span>
                </>
              ) : (
                <>
                  {/* Google SVG */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-zinc-400 font-medium">
                or continue with email
              </span>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {infoNotice && (
            <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-800">
              <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{infoNotice}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nickname / Name (Sign Up only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Your Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Carlos Perez"
                    className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-sm text-zinc-900 placeholder:text-zinc-400 transition-all"
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
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-sm text-zinc-900 placeholder:text-zinc-400 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-sm text-zinc-900 placeholder:text-zinc-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
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
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-sm text-zinc-900 placeholder:text-zinc-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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
                          ? 'ring-2 ring-zinc-900 scale-105 shadow-sm'
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

            {/* Remember Me + Forgot Password (Login only) */}
            {mode === 'login' && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs text-zinc-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900 accent-zinc-900 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-zinc-600 hover:text-zinc-900 font-medium transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-zinc-900 hover:bg-zinc-800 active:scale-[0.99] text-white py-3 px-4 rounded-xl font-medium text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
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
            </button>
          </form>

          {/* Guest Mode Option */}
          <div className="pt-5 mt-5 border-t border-zinc-100 text-center">
            <button
              type="button"
              onClick={handleContinueAsGuest}
              className="text-xs text-zinc-500 hover:text-zinc-800 font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 py-1"
            >
              <span>Continue as Guest</span>
              <span className="text-zinc-400 font-normal">(Use locally on this device)</span>
            </button>
          </div>

          {/* Bottom Security Note */}
          <p className="mt-5 text-center text-[11px] text-zinc-400">
            Your transactions and financial data are private and secure.
          </p>
        </div>
      </div>
    </div>
  );
}

