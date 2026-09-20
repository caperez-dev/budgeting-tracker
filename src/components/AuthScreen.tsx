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
  ExternalLink,
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

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
];

export const Logo = (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
  <svg
    fill="currentColor"
    height="48"
    viewBox="0 0 40 48"
    width="40"
    {...props}
  >
    <clipPath id="a">
      <path d="m0 0h40v48h-40z" />
    </clipPath>
    <g clipPath="url(#a)">
      <path d="m25.0887 5.05386-3.933-1.05386-3.3145 12.3696-2.9923-11.16736-3.9331 1.05386 3.233 12.0655-8.05262-8.0526-2.87919 2.8792 8.83271 8.8328-10.99975-2.9474-1.05385625 3.933 12.01860625 3.2204c-.1376-.5935-.2104-1.2119-.2104-1.8473 0-4.4976 3.646-8.1436 8.1437-8.1436 4.4976 0 8.1436 3.646 8.1436 8.1436 0 .6313-.0719 1.2459-.2078 1.8359l10.9227 2.9267 1.0538-3.933-12.0664-3.2332 11.0005-2.9476-1.0539-3.933-12.0659 3.233 8.0526-8.0526-2.8792-2.87916-8.7102 8.71026z" />
      <path d="m27.8723 26.2214c-.3372 1.4256-1.0491 2.7063-2.0259 3.7324l7.913 7.9131 2.8792-2.8792z" />
      <path d="m25.7665 30.0366c-.9886 1.0097-2.2379 1.7632-3.6389 2.1515l2.8794 10.746 3.933-1.0539z" />
      <path d="m21.9807 32.2274c-.65.1671-1.3313.2559-2.0334.2559-.7522 0-1.4806-.102-2.1721-.2929l-2.882 10.7558 3.933 1.0538z" />
      <path d="m17.6361 32.1507c-1.3796-.4076-2.6067-1.1707-3.5751-2.1833l-7.9325 7.9325 2.87919 2.8792z" />
      <path d="m13.9956 29.8973c-.9518-1.019-1.6451-2.2826-1.9751-3.6862l-10.95836 2.9363 1.05385 3.933z" />
    </g>
  </svg>
);

export const GoogleIcon = (
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>
) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z" />
  </svg>
);

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password' | 'reset_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[1]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  // Forgot Password & Reset States
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetTokenEmail, setResetTokenEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [simulatedResetEmail, setSimulatedResetEmail] = useState<{ to: string; resetUrl: string } | null>(null);

  // Check URL query parameters for resetToken (e.g. from clicked link)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('resetToken');
      if (token) {
        setResetToken(token);
        setIsVerifyingToken(true);
        fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.valid) {
              setMode('reset_password');
              setResetTokenEmail(data.email || '');
              setSuccessMessage('Reset link verified. Please enter your new password.');
            } else {
              setErrorMessage(data.error || 'This reset link is invalid or has expired. Please request a new one.');
              setMode('forgot_password');
            }
          })
          .catch(() => {
            setErrorMessage('Unable to verify reset link. Please try again.');
            setMode('forgot_password');
          })
          .finally(() => {
            setIsVerifyingToken(false);
          });
      }
    } catch {
      // ignore
    }
  }, []);

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

  const handleForgotPasswordClick = () => {
    setMode('forgot_password');
    setErrorMessage(null);
    setSuccessMessage(null);
    setInfoNotice(null);
    setSimulatedResetEmail(null);
  };

  // Step 1: User enters email to receive reset link
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setInfoNotice(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to send reset link. Please check your email.');
      }

      setSuccessMessage('A reset link has been sent to your email. Please check your inbox.');
      if (data.resetUrl) {
        setSimulatedResetEmail({ to: cleanEmail, resetUrl: data.resetUrl });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 & 3: User sets new password and is redirected to login
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newPassword || newPassword.length < 4) {
      setErrorMessage('Your new password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('The passwords do not match. Please re-enter.');
      return;
    }

    if (!resetToken) {
      setErrorMessage('Reset link is missing or expired. Please request a new one.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password. Please try again.');
      }

      // Clear the query parameter in browser address bar
      if (typeof window !== 'undefined' && window.history) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }

      // Pre-fill email for easy sign in
      if (data.email) {
        setEmail(data.email);
      }
      setPassword('');
      setConfirmPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetToken(null);
      setSimulatedResetEmail(null);

      // Redirect directly to login page
      setMode('login');
      setSuccessMessage('Your password has been updated! You can now sign in with your new password.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Login / Register form submit
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
      setErrorMessage(err.message || 'Unable to connect right now. Please try again.');
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

      {/* Ambient Radial Gradient Glows */}
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
          {/* Header with Icon and Title */}
          <CardHeader className="flex flex-col items-center space-y-2 pb-4 pt-8 text-center">
            <div className="relative mb-1">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-md">
                {mode === 'reset_password' ? (
                  <KeyRound className="w-7 h-7 text-zinc-100" />
                ) : mode === 'forgot_password' ? (
                  <Mail className="w-7 h-7 text-zinc-100" />
                ) : (
                  <Wallet className="w-7 h-7 text-zinc-100" />
                )}
              </div>
            </div>

            <div className="space-y-1 flex flex-col items-center">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                {mode === 'login' && 'Welcome back'}
                {mode === 'register' && 'Create an account'}
                {mode === 'forgot_password' && 'Reset your password'}
                {mode === 'reset_password' && 'Set new password'}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-xs leading-relaxed">
                {mode === 'login' && 'Sign in to access your budget, accounts, and insights.'}
                {mode === 'register' && 'Welcome! Create an account to start tracking your finances.'}
                {mode === 'forgot_password' && 'Enter your email address and we will send you a link to reset your password.'}
                {mode === 'reset_password' && 'Choose a strong new password to regain access to your account.'}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-6 sm:px-8">
            {/* Google Sign-in Button (Shown on Login and Register only) */}
            {(mode === 'login' || mode === 'register') && (
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
            )}

            {/* Token Verification Spinner */}
            {isVerifyingToken && (
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center gap-2.5 text-xs text-zinc-600">
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
                <span>Verifying your reset link...</span>
              </div>
            )}

            {/* Status Notifications */}
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

            {infoNotice && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-800 animate-in fade-in duration-200">
                <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{infoNotice}</span>
              </div>
            )}

            {/* Simulated Email Link Preview (For fast, direct testing without opening an email client) */}
            {simulatedResetEmail && mode === 'forgot_password' && (
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                    <Mail className="w-4 h-4 text-zinc-700" />
                    <span>Reset Link Ready</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">Click to proceed</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  We have generated your password reset link for <span className="font-medium text-zinc-800">{simulatedResetEmail.to}</span>.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    try {
                      const url = new URL(simulatedResetEmail.resetUrl);
                      const token = url.searchParams.get('resetToken');
                      if (token) {
                        setResetToken(token);
                        setResetTokenEmail(simulatedResetEmail.to);
                        setMode('reset_password');
                        setErrorMessage(null);
                        setSuccessMessage('Reset link opened! Please enter your new password below.');
                      }
                    } catch {
                      // fallback
                      setMode('reset_password');
                    }
                  }}
                  className="w-full h-9 rounded-lg bg-zinc-900 text-white font-medium text-xs hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span>Open New Password Page</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* 1. FORGOT PASSWORD FORM */}
            {mode === 'forgot_password' && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">Account email address</Label>
                  <div className="relative">
                    <Input
                      id="forgot-email"
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
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setInfoNotice(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            )}

            {/* 2. SET NEW PASSWORD FORM */}
            {mode === 'reset_password' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                {resetTokenEmail && (
                  <div className="p-2.5 rounded-xl bg-zinc-100/70 border border-zinc-200/80 flex items-center justify-between text-xs text-zinc-600">
                    <span>Account:</span>
                    <span className="font-semibold text-zinc-900">{resetTokenEmail}</span>
                  </div>
                )}

                {/* New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 4 characters"
                      className="ps-10 pe-10"
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
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-new-password"
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
                      {showConfirmNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
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
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <>
                      <span>Set New Password</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setInfoNotice(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Cancel and return to Sign In</span>
                  </button>
                </div>
              </form>
            )}

            {/* 3. SIGN IN & REGISTER FORMS */}
            {(mode === 'login' || mode === 'register') && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name / Display Name (Sign Up only) */}
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="nickname">Full Name or Nickname</Label>
                    <div className="relative">
                      <Input
                        id="nickname"
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

                {/* Email Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Input
                      id="email"
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
                    <Label htmlFor="password">Password</Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={handleForgotPasswordClick}
                        className="text-xs text-zinc-500 hover:text-zinc-900 font-medium hover:underline transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
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
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (Sign Up only) */}
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
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
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Remember Me Checkbox (Sign In) */}
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

                {/* Terms Checkbox (Sign Up) */}
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
                      <span className="text-zinc-900 font-medium hover:underline">
                        Terms
                      </span>{' '}
                      and{' '}
                      <span className="text-zinc-900 font-medium hover:underline">
                        Conditions
                      </span>
                    </label>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-zinc-900 text-white font-medium text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 mt-2 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>
                        {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === 'login' ? 'Sign in' : 'Create free account'}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>

          {/* Footer with Switch Link */}
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
                      setInfoNotice(null);
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
                      setInfoNotice(null);
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
