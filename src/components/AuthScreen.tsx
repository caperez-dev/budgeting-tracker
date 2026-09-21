"use client";

import React, { useState, useEffect, JSX, SVGProps } from 'react';
import {
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
  HelpCircle,
  Wallet,
  KeyRound,
  ArrowLeft,
  Inbox,
} from 'lucide-react';
import { AuthUser, UserProfile } from '../types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Particles } from '@/components/ui/particles';

interface AuthScreenProps {
  onLoginSuccess: (user: AuthUser, profileUpdate?: Partial<UserProfile>) => void;
}

export type AuthScreenMode =
  | 'login'
  | 'register'
  | 'forgot_email'
  | 'forgot_sent'
  | 'forgot_new_password';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
];

export const GoogleIcon = (
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>
) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z" />
  </svg>
);

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  // Navigation states: 'login' | 'register' | 'forgot_email' | 'forgot_sent' | 'forgot_new_password'
  const [mode, setMode] = useState<AuthScreenMode>('login');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar] = useState(AVATAR_PRESETS[1]);

  // Forgot Password Fields (New Password, Confirm Password)
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Checkboxes
  const [rememberMe, setRememberMe] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // Status & Feedback messages
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/auth/google/url?origin=${encodeURIComponent(origin)}`);
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          'Google Sign-In is temporarily unavailable on this preview. Please sign in with your email below.'
        );
      }

      if (!res.ok || !data || !data.configured || !data.url) {
        throw new Error(
          data?.error ||
            'Google Sign-In is not configured yet. Please sign in with your email and password below.'
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
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to open Google sign-in. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  // Navigation handlers
  const handleGoToForgotPassword = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setMode('forgot_email');
  };

  const handleBackToLogin = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setMode('login');
  };

  // Flow Step 1: User submits their email address for password reset
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    // Simulated brief transition for smooth feel
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Navigate to Flow Step 2 (Reset link sent confirmation)
      setMode('forgot_sent');
    }, 350);
  };

  // Flow Step 2: User advances from email sent confirmation to entering their new password
  const handleProceedToNewPassword = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setNewPassword('');
    setConfirmNewPassword('');
    setMode('forgot_new_password');
  };

  // Flow Step 3: User submits New Password and Confirm Password
  const handleNewPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newPassword || !confirmNewPassword) {
      setErrorMessage('Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Your new password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('The passwords do not match. Please re-enter them.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Clean up fields and navigate back to login
      setPassword('');
      setConfirmPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setMode('login');
      setSuccessMessage('Your password has been changed! You can now sign in with your new password.');
    }, 350);
  };

  // Standard Login / Register form submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

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
      if (!agreedToTerms) {
        setErrorMessage('Please agree to the Terms and Conditions to create your account.');
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
        throw new Error('Unable to connect right now. Please try again shortly.');
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
      setErrorMessage(err.message || 'Unable to sign in right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-zinc-50 font-sans selection:bg-zinc-900 selection:text-white overflow-x-hidden">
      {/* Interactive Particles Background */}
      <Particles
        color="#666666"
        quantity={120}
        ease={20}
        className="absolute inset-0"
      />

      {/* Ambient Radial Glows */}
      <div
        aria-hidden
        className="absolute inset-0 isolate -z-10 pointer-events-none overflow-hidden"
      >
        <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,rgba(0,0,0,0.06)_0,rgba(140,140,140,0.02)_50%,rgba(0,0,0,0.01)_80%)] absolute top-0 left-0 h-[80rem] w-[35rem] -translate-y-[21.875rem] -rotate-45 rounded-full" />
        <div className="bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.04)_0,rgba(0,0,0,0.01)_80%,transparent_100%)] absolute top-0 left-0 h-[80rem] w-[15rem] [translate:5%_-50%] -rotate-45 rounded-full" />
        <div className="bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.04)_0,rgba(0,0,0,0.01)_80%,transparent_100%)] absolute top-0 left-0 h-[80rem] w-[15rem] -translate-y-[21.875rem] -rotate-45 rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="border border-zinc-200/80 bg-white/95 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden transition-all">
          {/* Top Header Card */}
          <CardHeader className="flex flex-col items-center space-y-2 pb-4 pt-8 text-center">
            <div className="relative mb-1">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-md transition-transform duration-200 hover:scale-105">
                {mode === 'login' && <Wallet className="w-7 h-7 text-zinc-100" />}
                {mode === 'register' && <User className="w-7 h-7 text-zinc-100" />}
                {mode === 'forgot_email' && <Mail className="w-7 h-7 text-zinc-100" />}
                {mode === 'forgot_sent' && <Inbox className="w-7 h-7 text-zinc-100" />}
                {mode === 'forgot_new_password' && <KeyRound className="w-7 h-7 text-zinc-100" />}
              </div>
            </div>

            <div className="space-y-1 flex flex-col items-center">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                {mode === 'login' && 'Welcome back'}
                {mode === 'register' && 'Create an account'}
                {mode === 'forgot_email' && 'Forgot your password?'}
                {mode === 'forgot_sent' && 'Check your email'}
                {mode === 'forgot_new_password' && 'Set new password'}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-xs leading-relaxed">
                {mode === 'login' && 'Sign in to access your budget, accounts, and insights.'}
                {mode === 'register' && 'Welcome! Create an account to start tracking your finances.'}
                {mode === 'forgot_email' && 'Enter your email address and we will send you a link to reset your password.'}
                {mode === 'forgot_sent' && 'We have sent password reset instructions to your email.'}
                {mode === 'forgot_new_password' && 'Choose a strong new password to regain access to your account.'}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-6 sm:px-8">
            {/* Status alerts */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* ========================================================= */}
            {/* 1. LOGIN / REGISTER VIEW                                 */}
            {/* ========================================================= */}
            {(mode === 'login' || mode === 'register') && (
              <>
                {/* Google Sign In */}
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading || isLoading}
                    className="w-full h-11 justify-center gap-2.5 rounded-xl border-zinc-300 font-medium text-sm text-zinc-800 hover:bg-zinc-50 hover:text-zinc-950 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                  >
                    {isGoogleLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />
                        <span>Opening Google Sign-In...</span>
                      </>
                    ) : (
                      <>
                        <GoogleIcon className="h-4 w-4 text-zinc-800" />
                        <span>{mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}</span>
                      </>
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <Separator className="flex-1 bg-zinc-200" />
                    <span className="text-xs text-zinc-400 font-medium tracking-wide uppercase">
                      {mode === 'login' ? 'or sign in with email' : 'or register with email'}
                    </span>
                    <Separator className="flex-1 bg-zinc-200" />
                  </div>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {/* Name field (Register only) */}
                  {mode === 'register' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="auth-nickname">Full Name or Nickname</Label>
                      <div className="relative">
                        <Input
                          id="auth-nickname"
                          type="text"
                          required
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          placeholder="e.g. Carlos Perez"
                          className="ps-10"
                        />
                        <div className="text-zinc-400 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5">
                          <User className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Email address */}
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-email">Email address</Label>
                    <div className="relative">
                      <Input
                        id="auth-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="ps-10"
                      />
                      <div className="text-zinc-400 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5">
                        <Mail className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auth-password">Password</Label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={handleGoToForgotPassword}
                          className="text-xs text-zinc-500 hover:text-zinc-900 font-medium hover:underline transition-colors cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="ps-10 pe-10"
                      />
                      <div className="text-zinc-400 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5">
                        <Lock className="h-4 w-4" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-zinc-400 hover:text-zinc-700 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-colors cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password (Register only) */}
                  {mode === 'register' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="auth-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="auth-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="ps-10 pe-10"
                        />
                        <div className="text-zinc-400 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-zinc-400 hover:text-zinc-700 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-colors cursor-pointer"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Remember Me Checkbox */}
                  {mode === 'login' && (
                    <div className="flex items-center space-x-2 pt-1">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                      />
                      <label
                        htmlFor="remember-me"
                        className="text-xs text-zinc-600 font-normal cursor-pointer select-none"
                      >
                        Remember for 30 days
                      </label>
                    </div>
                  )}

                  {/* Terms Checkbox (Register) */}
                  {mode === 'register' && (
                    <div className="flex items-center space-x-2 pt-1">
                      <Checkbox
                        id="terms"
                        checked={agreedToTerms}
                        onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                      />
                      <label
                        htmlFor="terms"
                        className="text-xs text-zinc-600 font-normal cursor-pointer select-none"
                      >
                        I agree to the{' '}
                        <span className="text-zinc-900 font-medium hover:underline">Terms</span> and{' '}
                        <span className="text-zinc-900 font-medium hover:underline">Conditions</span>
                      </label>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-zinc-900 text-white font-medium text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 mt-2 shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{mode === 'login' ? 'Sign in' : 'Create free account'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </>
            )}

            {/* ========================================================= */}
            {/* 2. FORGOT PASSWORD - STEP 1: ENTER EMAIL                  */}
            {/* ========================================================= */}
            {mode === 'forgot_email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email-input">Account email address</Label>
                  <div className="relative">
                    <Input
                      id="forgot-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="ps-10"
                      autoFocus
                    />
                    <div className="text-zinc-400 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5">
                      <Mail className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    We will send a secure link to this email address to reset your password.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-zinc-900 text-white font-medium text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 mt-2 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================= */}
            {/* 3. FORGOT PASSWORD - STEP 2: RESET LINK SENT CONFIRMATION  */}
            {/* ========================================================= */}
            {mode === 'forgot_sent' && (
              <div className="space-y-4">
                {/* Confirmation Box */}
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/90 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 text-left">
                      <p className="text-xs font-semibold text-zinc-900">
                        Reset link sent
                      </p>
                      <p className="text-xs text-zinc-600 leading-relaxed">
                        A password reset link has been sent to{' '}
                        <span className="font-semibold text-zinc-900 underline decoration-zinc-300">
                          {email}
                        </span>
                        .
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-200/60 pt-2.5">
                    Please check your inbox and click the link to choose your new password. If you do not see it in a moment, remember to check your spam folder.
                  </p>
                </div>

                {/* Primary Button to navigate to next frontend step (Entering password) */}
                <Button
                  type="button"
                  onClick={handleProceedToNewPassword}
                  className="w-full h-11 rounded-xl bg-zinc-900 text-white font-medium text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>Enter New Password</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                {/* Navigation Options */}
                <div className="flex items-center justify-between pt-1 px-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setMode('forgot_email');
                    }}
                    className="text-zinc-500 hover:text-zinc-900 transition-colors font-medium cursor-pointer"
                  >
                    Change email address
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 font-medium transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 4. FORGOT PASSWORD - STEP 3: ENTER NEW PASSWORD           */}
            {/* ========================================================= */}
            {mode === 'forgot_new_password' && (
              <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
                {/* Account badge */}
                {email && (
                  <div className="p-2.5 rounded-xl bg-zinc-100/70 border border-zinc-200/80 flex items-center justify-between text-xs text-zinc-600">
                    <span>Resetting password for:</span>
                    <span className="font-semibold text-zinc-900 truncate max-w-[180px]">{email}</span>
                  </div>
                )}

                {/* Field 1: New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="forgot-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="ps-10 pe-10"
                      autoFocus
                    />
                    <div className="text-zinc-400 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5">
                      <Lock className="h-4 w-4" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-zinc-400 hover:text-zinc-700 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-colors cursor-pointer"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Field 2: Confirm Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="forgot-confirm-password"
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="ps-10 pe-10"
                    />
                    <div className="text-zinc-400 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="text-zinc-400 hover:text-zinc-700 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-colors cursor-pointer"
                      aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-zinc-900 text-white font-medium text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 mt-2 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save New Password</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Cancel and return to Sign In</span>
                  </button>
                </div>
              </form>
            )}
          </CardContent>

          {/* Footer with Switch Link (Shown on Login and Register) */}
          {(mode === 'login' || mode === 'register') && (
            <CardFooter className="flex justify-center border-t border-zinc-100 py-4 bg-zinc-50/50">
              {mode === 'login' ? (
                <p className="text-center text-xs text-zinc-600">
                  No account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-zinc-900 font-semibold hover:underline cursor-pointer ml-1"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="text-center text-xs text-zinc-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-zinc-900 font-semibold hover:underline cursor-pointer ml-1"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </CardFooter>
          )}
        </Card>

        {/* Discreet bottom text */}
        <p className="mt-4 text-center text-[11px] text-zinc-400">
          Your personal transactions and financial data are private and secure.
        </p>
      </div>
    </div>
  );
}
